
-- 1) Remover triggers antigas (formato E.164) que conflitam

-- Moradores
DROP TRIGGER IF EXISTS before_insert_moradores_normalize ON public.moradores;
DROP TRIGGER IF EXISTS before_update_moradores_normalize ON public.moradores;
DROP TRIGGER IF EXISTS trg_moradores_normalize_phone ON public.moradores;

-- Usuários
DROP TRIGGER IF EXISTS before_insert_usuarios_normalize ON public.usuarios;
DROP TRIGGER IF EXISTS before_update_usuarios_normalize ON public.usuarios;
DROP TRIGGER IF EXISTS trg_usuarios_normalize_phone ON public.usuarios;

-- 2) Garantir triggers únicas com normalização local (10–11 dígitos, sem +55)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'moradores'
      AND t.tgname = 'normalize_moradores_phone'
  ) THEN
    CREATE TRIGGER normalize_moradores_phone
    BEFORE INSERT OR UPDATE ON public.moradores
    FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_moradores_phone_local11();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'usuarios'
      AND t.tgname = 'normalize_usuarios_phone'
  ) THEN
    CREATE TRIGGER normalize_usuarios_phone
    BEFORE INSERT OR UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_usuarios_phone_local11();
  END IF;
END$$;

-- 3) Backfill dos dados já existentes para formato local (10–11 dígitos, sem +55)

UPDATE public.moradores
SET telefone = public.normalize_br_phone_local11(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.usuarios
SET telefone = public.normalize_br_phone_local11(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.condominios
SET telefone = public.normalize_br_phone_local11(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.chamados_crm
SET telefone_contato = public.normalize_br_phone_local11(telefone_contato)
WHERE telefone_contato IS NOT NULL;
