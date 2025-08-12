-- Normalize Brazilian and international phone numbers to E.164-like format
-- 1) Normalization function
CREATE OR REPLACE FUNCTION public.normalize_br_phone(v text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  d text;
  orig text;
BEGIN
  orig := coalesce(v, '');
  -- keep only digits
  d := regexp_replace(orig, '\\D', '', 'g');

  IF d = '' THEN
    RETURN '';
  END IF;

  -- If original already had '+', just ensure only digits follow
  IF left(orig, 1) = '+' THEN
    RETURN '+' || d;
  END IF;

  -- If starts with Brazil country code, prefix with '+'
  IF left(d, 2) = '55' THEN
    RETURN '+' || d;
  END IF;

  -- If typical BR length without DDI (10 or 11), add +55
  IF length(d) BETWEEN 10 AND 11 THEN
    RETURN '+55' || d;
  END IF;

  -- Fallback: prefix '+' (for non-BR numbers when user omitted '+')
  RETURN '+' || d;
END;
$$;

-- 2) Trigger functions to apply normalization on write
CREATE OR REPLACE FUNCTION public.tg_normalize_moradores_phone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.telefone := public.normalize_br_phone(NEW.telefone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_normalize_usuarios_phone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.telefone := public.normalize_br_phone(NEW.telefone);
  RETURN NEW;
END;
$$;

-- 3) Triggers on tables
DROP TRIGGER IF EXISTS trg_moradores_normalize_phone ON public.moradores;
CREATE TRIGGER trg_moradores_normalize_phone
BEFORE INSERT OR UPDATE OF telefone ON public.moradores
FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_moradores_phone();

DROP TRIGGER IF EXISTS trg_usuarios_normalize_phone ON public.usuarios;
CREATE TRIGGER trg_usuarios_normalize_phone
BEFORE INSERT OR UPDATE OF telefone ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_usuarios_phone();

-- 4) Backfill existing data
UPDATE public.moradores SET telefone = public.normalize_br_phone(telefone) WHERE telefone IS NOT NULL;
UPDATE public.usuarios SET telefone = public.normalize_br_phone(telefone) WHERE telefone IS NOT NULL;

-- 5) Helpful indexes for lookups by phone
CREATE INDEX IF NOT EXISTS idx_moradores_telefone ON public.moradores(telefone);
CREATE INDEX IF NOT EXISTS idx_usuarios_telefone ON public.usuarios(telefone);