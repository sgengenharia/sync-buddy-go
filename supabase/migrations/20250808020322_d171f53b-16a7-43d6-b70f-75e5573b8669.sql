-- 1) Trigger functions to normalize phones to local 11-digit (DDD + number) without +55
-- Preserve NULLs on nullable columns

-- Usuarios.telefone
CREATE OR REPLACE FUNCTION public.tg_normalize_usuarios_phone_local11()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.telefone IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.telefone := public.normalize_br_phone_local11(NEW.telefone);
  RETURN NEW;
END;
$$;

-- Condominios.telefone
CREATE OR REPLACE FUNCTION public.tg_normalize_condominios_phone_local11()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.telefone IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.telefone := public.normalize_br_phone_local11(NEW.telefone);
  RETURN NEW;
END;
$$;

-- Chamados CRM.telefone_contato
CREATE OR REPLACE FUNCTION public.tg_normalize_chamados_crm_phone_local11()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.telefone_contato IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.telefone_contato := public.normalize_br_phone_local11(NEW.telefone_contato);
  RETURN NEW;
END;
$$;

-- 2) (Re)create triggers pointing to the new local11 trigger functions
-- Usuarios
DROP TRIGGER IF EXISTS normalize_usuarios_phone ON public.usuarios;
CREATE TRIGGER normalize_usuarios_phone
BEFORE INSERT OR UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE PROCEDURE public.tg_normalize_usuarios_phone_local11();

-- Condominios
DROP TRIGGER IF EXISTS normalize_condominios_phone ON public.condominios;
CREATE TRIGGER normalize_condominios_phone
BEFORE INSERT OR UPDATE ON public.condominios
FOR EACH ROW
EXECUTE PROCEDURE public.tg_normalize_condominios_phone_local11();

-- Chamados CRM
DROP TRIGGER IF EXISTS normalize_chamados_crm_phone ON public.chamados_crm;
CREATE TRIGGER normalize_chamados_crm_phone
BEFORE INSERT OR UPDATE ON public.chamados_crm
FOR EACH ROW
EXECUTE PROCEDURE public.tg_normalize_chamados_crm_phone_local11();

-- 3) Backfill existing data to 11-digit local format
UPDATE public.usuarios
SET telefone = public.normalize_br_phone_local11(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.condominios
SET telefone = public.normalize_br_phone_local11(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.chamados_crm
SET telefone_contato = public.normalize_br_phone_local11(telefone_contato)
WHERE telefone_contato IS NOT NULL;