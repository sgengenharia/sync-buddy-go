-- 1) CRM: add urgencia column for filtering/prioritization
ALTER TABLE public.chamados_crm
  ADD COLUMN IF NOT EXISTS urgencia text NOT NULL DEFAULT 'media';

-- 2) Ensure updated_at auto-updates on write operations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_moradores_updated_at') THEN
    CREATE TRIGGER trg_update_moradores_updated_at
    BEFORE UPDATE ON public.moradores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_espacos_updated_at') THEN
    CREATE TRIGGER trg_update_espacos_updated_at
    BEFORE UPDATE ON public.espacos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_reservas_updated_at') THEN
    CREATE TRIGGER trg_update_reservas_updated_at
    BEFORE UPDATE ON public.reservas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_chamados_crm_updated_at') THEN
    CREATE TRIGGER trg_update_chamados_crm_updated_at
    BEFORE UPDATE ON public.chamados_crm
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) Prevent double booking: one active reservation per space/day
CREATE UNIQUE INDEX IF NOT EXISTS reservas_unique_espaco_data_active
ON public.reservas (espaco_id, data_reserva)
WHERE status <> 'cancelada';

-- 4) Realtime for CRM
ALTER TABLE public.chamados_crm REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados_crm;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- table already in publication
  END;
END $$;