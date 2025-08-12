-- Deduplicate existing associations (keep earliest by created_at)
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY usuario_id, condominio_id ORDER BY created_at ASC) AS rn
  FROM public.usuarios_condominio
), to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.usuarios_condominio
WHERE id IN (SELECT id FROM to_delete);

-- Enforce uniqueness of (usuario_id, condominio_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_condominio_usuario_condominio
ON public.usuarios_condominio (usuario_id, condominio_id);
