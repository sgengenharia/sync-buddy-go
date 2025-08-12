-- Sincronização automática do campo usuarios.condominios_vinculados
-- Cria função utilitária para agregar os condomínios vinculados de um usuário
CREATE OR REPLACE FUNCTION public.sync_usuarios_condominios_vinculados(_usuario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  agg text;
BEGIN
  SELECT string_agg(uc.condominio_id::text, ',')
  INTO agg
  FROM public.usuarios_condominio uc
  WHERE uc.usuario_id = _usuario_id;

  UPDATE public.usuarios u
  SET condominios_vinculados = agg
  WHERE u.id = _usuario_id;
END;
$$;

-- Cria função de gatilho para reagir a INSERT/UPDATE/DELETE em usuarios_condominio
CREATE OR REPLACE FUNCTION public.tg_sync_usuarios_condominios_vinculados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.sync_usuarios_condominios_vinculados(NEW.usuario_id);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.sync_usuarios_condominios_vinculados(OLD.usuario_id);
  ELSE
    -- UPDATE: sincroniza o antigo e o novo se o usuario_id mudou
    PERFORM public.sync_usuarios_condominios_vinculados(OLD.usuario_id);
    IF (NEW.usuario_id IS DISTINCT FROM OLD.usuario_id) THEN
      PERFORM public.sync_usuarios_condominios_vinculados(NEW.usuario_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- (Re)cria o gatilho na tabela usuarios_condominio
DROP TRIGGER IF EXISTS tg_sync_usuarios_condominios_vinculados ON public.usuarios_condominio;
CREATE TRIGGER tg_sync_usuarios_condominios_vinculados
AFTER INSERT OR UPDATE OR DELETE ON public.usuarios_condominio
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_usuarios_condominios_vinculados();

-- Backfill inicial: deixa nulo e repovoa com os vínculos atuais
UPDATE public.usuarios SET condominios_vinculados = NULL;
UPDATE public.usuarios u
SET condominios_vinculados = sub.agg
FROM (
  SELECT usuario_id, string_agg(condominio_id::text, ',') AS agg
  FROM public.usuarios_condominio
  GROUP BY usuario_id
) AS sub
WHERE u.id = sub.usuario_id;