
-- 1) Função para normalizar telefone BR em 11 dígitos (DDD + número), sem +55
CREATE OR REPLACE FUNCTION public.normalize_br_phone_local11(v text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  d text;
BEGIN
  d := coalesce(v, '');
  -- remove tudo que não é dígito
  d := regexp_replace(d, '[^0-9]', '', 'g');

  IF d = '' THEN
    RETURN d; -- evita nulo (coluna é NOT NULL)
  END IF;

  -- remove prefixo do Brasil se houver
  IF left(d, 2) = '55' THEN
    d := substr(d, 3);
  END IF;

  -- se ainda sobrou mais que 11, mantemos os 11 dígitos finais
  IF length(d) > 11 THEN
    d := right(d, 11);
  END IF;

  -- resultado pode ter menos de 11 se o dado original não permitir;
  -- manteremos assim para não quebrar inserts/updates existentes.
  -- (o frontend/import pode reforçar a validação depois)
  RETURN d;
END;
$function$;

-- 2) Trigger function dedicada aos moradores, apontando para a função local11
CREATE OR REPLACE FUNCTION public.tg_normalize_moradores_phone_local11()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.telefone := public.normalize_br_phone_local11(NEW.telefone);
  IF length(NEW.telefone) <> 11 THEN
    RAISE EXCEPTION 'Telefone deve conter exatamente 11 dígitos após normalização. Valor: %', NEW.telefone;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2b) (Re)cria o trigger apenas na tabela moradores
DROP TRIGGER IF EXISTS normalize_moradores_phone ON public.moradores;

CREATE TRIGGER normalize_moradores_phone
BEFORE INSERT OR UPDATE ON public.moradores
FOR EACH ROW
EXECUTE PROCEDURE public.tg_normalize_moradores_phone_local11();

-- 3) Reprocessa os telefones já existentes para 11 dígitos
UPDATE public.moradores
SET telefone = public.normalize_br_phone_local11(telefone)
WHERE telefone IS NOT NULL;
