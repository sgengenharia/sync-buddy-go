-- Fix security linter: set immutable search_path for newly created functions
CREATE OR REPLACE FUNCTION public.normalize_br_phone(v text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d text;
  orig text;
BEGIN
  orig := coalesce(v, '');
  d := regexp_replace(orig, '\\D', '', 'g');
  IF d = '' THEN RETURN ''; END IF;
  IF left(orig, 1) = '+' THEN RETURN '+' || d; END IF;
  IF left(d, 2) = '55' THEN RETURN '+' || d; END IF;
  IF length(d) BETWEEN 10 AND 11 THEN RETURN '+55' || d; END IF;
  RETURN '+' || d;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_normalize_moradores_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.telefone := public.normalize_br_phone(NEW.telefone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_normalize_usuarios_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.telefone := public.normalize_br_phone(NEW.telefone);
  RETURN NEW;
END;
$$;