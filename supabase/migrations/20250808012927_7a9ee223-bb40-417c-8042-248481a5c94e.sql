-- Fix normalize_br_phone to use proper regex and re-normalize existing data
CREATE OR REPLACE FUNCTION public.normalize_br_phone(v text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  d text;
  orig text;
BEGIN
  orig := coalesce(v, '');
  -- Remove all non-digits using POSIX-compatible class
  d := regexp_replace(orig, '[^0-9]', '', 'g');
  IF d = '' THEN RETURN ''; END IF;
  -- If the original had a leading +, keep it and just append digits
  IF left(orig, 1) = '+' THEN RETURN '+' || d; END IF;
  -- If digits already start with Brazil country code, just prefix with +
  IF left(d, 2) = '55' THEN RETURN '+' || d; END IF;
  -- If it's a BR local/national number (10-11 digits), prefix with +55
  IF length(d) BETWEEN 10 AND 11 THEN RETURN '+55' || d; END IF;
  -- Fallback: just add + to the digits
  RETURN '+' || d;
END;
$function$;

-- Re-normalize existing data
UPDATE public.moradores
SET telefone = public.normalize_br_phone(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.usuarios
SET telefone = public.normalize_br_phone(telefone)
WHERE telefone IS NOT NULL;