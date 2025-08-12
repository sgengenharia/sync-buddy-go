-- 1) Ensure case-insensitive unique emails for usuarios
create unique index if not exists idx_usuarios_email_unique on public.usuarios (lower(email));

-- 2) Add updated_at triggers for all main tables using existing function public.update_updated_at_column()
-- Remove if exists first to avoid duplicates
DROP TRIGGER IF EXISTS trg_update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_update_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_condominios_updated_at ON public.condominios;
CREATE TRIGGER trg_update_condominios_updated_at
BEFORE UPDATE ON public.condominios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_moradores_updated_at ON public.moradores;
CREATE TRIGGER trg_update_moradores_updated_at
BEFORE UPDATE ON public.moradores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_espacos_updated_at ON public.espacos;
CREATE TRIGGER trg_update_espacos_updated_at
BEFORE UPDATE ON public.espacos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_reservas_updated_at ON public.reservas;
CREATE TRIGGER trg_update_reservas_updated_at
BEFORE UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_usuarios_condominio_updated_at ON public.usuarios_condominio;
-- Note: usuarios_condominio currently has no updated_at column; adding one for consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'usuarios_condominio' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.usuarios_condominio
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
CREATE TRIGGER trg_update_usuarios_condominio_updated_at
BEFORE UPDATE ON public.usuarios_condominio
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_chamados_crm_updated_at ON public.chamados_crm;
CREATE TRIGGER trg_update_chamados_crm_updated_at
BEFORE UPDATE ON public.chamados_crm
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_tentativas_login_updated_at ON public.tentativas_login;
-- Add updated_at to tentativas_login as well for observability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tentativas_login' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.tentativas_login
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
CREATE TRIGGER trg_update_tentativas_login_updated_at
BEFORE UPDATE ON public.tentativas_login
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Enable realtime: ensure replica identity and publication
ALTER TABLE public.usuarios REPLICA IDENTITY FULL;
ALTER TABLE public.condominios REPLICA IDENTITY FULL;
ALTER TABLE public.moradores REPLICA IDENTITY FULL;
ALTER TABLE public.espacos REPLICA IDENTITY FULL;
ALTER TABLE public.reservas REPLICA IDENTITY FULL;
ALTER TABLE public.usuarios_condominio REPLICA IDENTITY FULL;
ALTER TABLE public.chamados_crm REPLICA IDENTITY FULL;
ALTER TABLE public.tentativas_login REPLICA IDENTITY FULL;

-- Add these tables to realtime publication if not already
DO $$
BEGIN
  -- Helper function-like block to add table to publication if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'usuarios'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'condominios'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.condominios';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'moradores'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.moradores';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'espacos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.espacos';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservas'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reservas';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'usuarios_condominio'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios_condominio';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chamados_crm'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados_crm';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tentativas_login'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tentativas_login';
  END IF;
END $$;