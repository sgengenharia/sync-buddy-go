
-- 1) Adiciona a coluna "capacidade" em espacos
ALTER TABLE public.espacos
ADD COLUMN IF NOT EXISTS capacidade integer NOT NULL DEFAULT 0;

-- (Opcional e seguro) Garante que capacidade não seja negativa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'espacos_capacidade_nao_negativa'
  ) THEN
    ALTER TABLE public.espacos
    ADD CONSTRAINT espacos_capacidade_nao_negativa CHECK (capacidade >= 0);
  END IF;
END$$;

-- 2) Permite DELETE em espacos para síndicos/admins, seguindo o mesmo padrão das políticas existentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'espacos'
      AND policyname = 'Síndicos podem deletar espaços'
  ) THEN
    CREATE POLICY "Síndicos podem deletar espaços"
      ON public.espacos
      FOR DELETE
      USING (
        (condominio_id IN (
          SELECT c.id
          FROM (public.condominios c
            JOIN public.usuarios u ON (c.sindico_responsavel = u.id))
          WHERE u.email = (auth.jwt() ->> 'email')
        ))
        OR EXISTS (
          SELECT 1 FROM public.usuarios
          WHERE usuarios.email = (auth.jwt() ->> 'email')
            AND usuarios.tipo_acesso = 'admin'::tipo_acesso
        )
      );
  END IF;
END$$;

-- 3) Impede excluir espaço com reservas não canceladas (validação via trigger)
CREATE OR REPLACE FUNCTION public.prevent_delete_espaco_if_reservas()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.reservas r
    WHERE r.espaco_id = OLD.id
      AND r.status <> 'cancelada'
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir o espaço: existem reservas associadas não canceladas.';
  END IF;
  RETURN OLD;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_prevent_delete_espaco_if_reservas'
  ) THEN
    CREATE TRIGGER trg_prevent_delete_espaco_if_reservas
    BEFORE DELETE ON public.espacos
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_delete_espaco_if_reservas();
  END IF;
END$$;
