-- 1) Align chamados_crm to app logic: add tags and harmonize status values
DO $$
BEGIN
  -- Add tags column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chamados_crm' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.chamados_crm
    ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  -- Relax/replace status constraint to match app statuses
  -- Drop any existing CHECK constraints on status
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = con.connamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'chamados_crm' AND con.contype = 'c'
  ) LOOP
    EXECUTE format('ALTER TABLE public.chamados_crm DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  -- Add new CHECK constraint with statuses used by the app
  ALTER TABLE public.chamados_crm
  ADD CONSTRAINT chamados_crm_status_check_v2
  CHECK (status IN ('novo','em_andamento','aguardando','resolvido'));

  -- Optional: map previous statuses to new ones if any rows exist
  UPDATE public.chamados_crm SET status = 'aguardando' WHERE status IN ('aguardando_morador');
  UPDATE public.chamados_crm SET status = 'em_andamento' WHERE status IN ('classificado');
  UPDATE public.chamados_crm SET status = 'resolvido' WHERE status IN ('concluido');
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_chamados_crm_condominio_status ON public.chamados_crm (condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_chamados_crm_created_at ON public.chamados_crm (data_criacao DESC);

-- 2) Create atividades_crm (activities/history for tickets)
CREATE TABLE IF NOT EXISTS public.atividades_crm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES public.chamados_crm(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  conteudo TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  autor_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers to maintain updated_at
DROP TRIGGER IF EXISTS trg_update_atividades_crm_updated_at ON public.atividades_crm;
CREATE TRIGGER trg_update_atividades_crm_updated_at
BEFORE UPDATE ON public.atividades_crm
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.atividades_crm ENABLE ROW LEVEL SECURITY;

-- Policies for atividades_crm: users linked to the chamado's condominio can view/insert; author can update/delete their own
DO $$
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='atividades_crm' AND policyname='Linked users can select atividades'
  ) THEN
    CREATE POLICY "Linked users can select atividades"
    ON public.atividades_crm
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.chamados_crm c
        JOIN public.usuarios u ON u.email = (auth.jwt() ->> 'email')
        LEFT JOIN public.usuarios_condominio uc ON uc.usuario_id = u.id
        WHERE c.id = atividades_crm.chamado_id
          AND (c.condominio_id = uc.condominio_id OR u.tipo_acesso = 'admin')
      )
    );
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='atividades_crm' AND policyname='Linked users can insert atividades'
  ) THEN
    CREATE POLICY "Linked users can insert atividades"
    ON public.atividades_crm
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.chamados_crm c
        JOIN public.usuarios u ON u.email = (auth.jwt() ->> 'email')
        LEFT JOIN public.usuarios_condominio uc ON uc.usuario_id = u.id
        WHERE c.id = atividades_crm.chamado_id
          AND (c.condominio_id = uc.condominio_id OR u.tipo_acesso = 'admin')
      )
    );
  END IF;

  -- UPDATE policy (author or admin)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='atividades_crm' AND policyname='Author or admin can update atividades'
  ) THEN
    CREATE POLICY "Author or admin can update atividades"
    ON public.atividades_crm
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u 
        WHERE u.email = (auth.jwt() ->> 'email')
          AND (u.tipo_acesso = 'admin' OR u.id = atividades_crm.autor_usuario_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.usuarios u 
        WHERE u.email = (auth.jwt() ->> 'email')
          AND (u.tipo_acesso = 'admin' OR u.id = atividades_crm.autor_usuario_id)
      )
    );
  END IF;

  -- DELETE policy (admin only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='atividades_crm' AND policyname='Admin can delete atividades'
  ) THEN
    CREATE POLICY "Admin can delete atividades"
    ON public.atividades_crm
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.usuarios u 
        WHERE u.email = (auth.jwt() ->> 'email') AND u.tipo_acesso = 'admin'
      )
    );
  END IF;
END $$;

-- Realtime support for atividades_crm
ALTER TABLE public.atividades_crm REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='atividades_crm'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades_crm';
  END IF;
END $$;