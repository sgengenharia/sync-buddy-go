
-- 1) Triggers para normalizar telefones automaticamente

-- Moradores: antes de inserir e ao atualizar telefone
DROP TRIGGER IF EXISTS before_insert_moradores_normalize ON public.moradores;
CREATE TRIGGER before_insert_moradores_normalize
BEFORE INSERT ON public.moradores
FOR EACH ROW
EXECUTE FUNCTION public.tg_normalize_moradores_phone();

DROP TRIGGER IF EXISTS before_update_moradores_normalize ON public.moradores;
CREATE TRIGGER before_update_moradores_normalize
BEFORE UPDATE OF telefone ON public.moradores
FOR EACH ROW
EXECUTE FUNCTION public.tg_normalize_moradores_phone();

-- Usuários: antes de inserir e ao atualizar telefone
DROP TRIGGER IF EXISTS before_insert_usuarios_normalize ON public.usuarios;
CREATE TRIGGER before_insert_usuarios_normalize
BEFORE INSERT ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.tg_normalize_usuarios_phone();

DROP TRIGGER IF EXISTS before_update_usuarios_normalize ON public.usuarios;
CREATE TRIGGER before_update_usuarios_normalize
BEFORE UPDATE OF telefone ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.tg_normalize_usuarios_phone();

-- 2) Normalizar dados existentes
UPDATE public.moradores
SET telefone = public.normalize_br_phone(telefone)
WHERE telefone IS NOT NULL;

UPDATE public.usuarios
SET telefone = public.normalize_br_phone(telefone)
WHERE telefone IS NOT NULL;
