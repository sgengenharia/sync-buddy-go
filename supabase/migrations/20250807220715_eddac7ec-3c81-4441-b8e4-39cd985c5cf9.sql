
-- 1) Enum fixo para status do CRM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_status') THEN
    CREATE TYPE public.crm_status AS ENUM ('novo','em_andamento','aguardando','resolvido');
  END IF;
END$$;

-- 2) Normaliza valores existentes de status (caso haja algo fora do conjunto)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='chamados_crm'
      AND column_name='status'
      AND udt_name <> 'crm_status'
  ) THEN
    UPDATE public.chamados_crm
    SET status = 'novo'
    WHERE status IS NULL OR status NOT IN ('novo','em_andamento','aguardando','resolvido');

    ALTER TABLE public.chamados_crm
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public.chamados_crm
      ALTER COLUMN status TYPE public.crm_status
      USING status::public.crm_status;

    ALTER TABLE public.chamados_crm
      ALTER COLUMN status SET DEFAULT 'novo';
  END IF;
END$$;

-- 3) Tags no chamado + índices úteis
ALTER TABLE public.chamados_crm
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_chamados_crm_condominio_status
  ON public.chamados_crm (condominio_id, status);

CREATE INDEX IF NOT EXISTS idx_chamados_crm_created_at
  ON public.chamados_crm (data_criacao);

-- Índice GIN para filtrar por tags
CREATE INDEX IF NOT EXISTS idx_chamados_crm_tags_gin
  ON public.chamados_crm USING gin (tags);

-- 4) Tabela de atividades dos chamados
CREATE TABLE IF NOT EXISTS public.atividades_crm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados_crm(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'comentario', -- exemplo: 'comentario', 'status_change', 'tag_change'
  conteudo text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  autor_usuario_id uuid, -- opcional: pode referenciar public.usuarios.id enviado pelo frontend
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger de updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_atividades_crm'
  ) THEN
    CREATE TRIGGER set_updated_at_atividades_crm
      BEFORE UPDATE ON public.atividades_crm
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 5) RLS para atividades (espelha o acesso do chamado)
ALTER TABLE public.atividades_crm ENABLE ROW LEVEL SECURITY;

-- SELECT atividades dos meus condomínios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'atividades_crm' AND policyname = 'Usuários podem ver atividades dos seus condomínios'
  ) THEN
    CREATE POLICY "Usuários podem ver atividades dos seus condomínios"
      ON public.atividades_crm
      FOR SELECT
      USING (
        (EXISTS (
          SELECT 1
          FROM public.chamados_crm cc
          JOIN public.condominios c ON cc.condominio_id = c.id
          JOIN public.usuarios u ON c.sindico_responsavel = u.id
          WHERE u.email = (auth.jwt() ->> 'email')
            AND cc.id = atividades_crm.chamado_id
        ))
        OR
        (EXISTS (
          SELECT 1
          FROM public.chamados_crm cc
          JOIN public.usuarios_condominio uc ON uc.condominio_id = cc.condominio_id
          JOIN public.usuarios u ON uc.usuario_id = u.id
          WHERE u.email = (auth.jwt() ->> 'email')
            AND cc.id = atividades_crm.chamado_id
        ))
        OR
        (EXISTS (
          SELECT 1
          FROM public.usuarios
          WHERE (usuarios.email = (auth.jwt() ->> 'email') AND usuarios.tipo_acesso = 'admin'::tipo_acesso)
        ))
      );
  END IF;
END$$;

-- INSERT atividades nos meus condomínios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'atividades_crm' AND policyname = 'Usuários podem inserir atividades'
  ) THEN
    CREATE POLICY "Usuários podem inserir atividades"
      ON public.atividades_crm
      FOR INSERT
      WITH CHECK (
        (EXISTS (
          SELECT 1
          FROM public.chamados_crm cc
          JOIN public.condominios c ON cc.condominio_id = c.id
          JOIN public.usuarios u ON c.sindico_responsavel = u.id
          WHERE u.email = (auth.jwt() ->> 'email')
            AND cc.id = atividades_crm.chamado_id
        ))
        OR
        (EXISTS (
          SELECT 1
          FROM public.chamados_crm cc
          JOIN public.usuarios_condominio uc ON uc.condominio_id = cc.condominio_id
          JOIN public.usuarios u ON uc.usuario_id = u.id
          WHERE u.email = (auth.jwt() ->> 'email')
            AND cc.id = atividades_crm.chamado_id
        ))
        OR
        (EXISTS (
          SELECT 1
          FROM public.usuarios
          WHERE (usuarios.email = (auth.jwt() ->> 'email') AND usuarios.tipo_acesso = 'admin'::tipo_acesso)
        ))
      );
  END IF;
END$$;

-- UPDATE atividades (opcional, para correções de comentários)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'atividades_crm' AND policyname = 'Usuários podem atualizar atividades'
  ) THEN
    CREATE POLICY "Usuários podem atualizar atividades"
      ON public.atividades_crm
      FOR UPDATE
      USING (
        (EXISTS (
          SELECT 1
          FROM public.chamados_crm cc
          JOIN public.condominios c ON cc.condominio_id = c.id
          JOIN public.usuarios u ON c.sindico_responsavel = u.id
          WHERE u.email = (auth.jwt() ->> 'email')
            AND cc.id = atividades_crm.chamado_id
        ))
        OR
        (EXISTS (
          SELECT 1
          FROM public.chamados_crm cc
          JOIN public.usuarios_condominio uc ON uc.condominio_id = cc.condominio_id
          JOIN public.usuarios u ON uc.usuario_id = u.id
          WHERE u.email = (auth.jwt() ->> 'email')
            AND cc.id = atividades_crm.chamado_id
        ))
        OR
        (EXISTS (
          SELECT 1
          FROM public.usuarios
          WHERE (usuarios.email = (auth.jwt() ->> 'email') AND usuarios.tipo_acesso = 'admin'::tipo_acesso)
        ))
      );
  END IF;
END$$;

-- 6) Realtime
-- Garantir dados completos nos eventos
ALTER TABLE public.atividades_crm REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime (só a nova tabela)
ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_crm;
