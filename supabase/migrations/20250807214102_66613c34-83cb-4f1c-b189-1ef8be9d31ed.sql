-- Ensure unique association between a user and a condominium
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_condominio_unique_user_condo
ON public.usuarios_condominio (usuario_id, condominio_id);
