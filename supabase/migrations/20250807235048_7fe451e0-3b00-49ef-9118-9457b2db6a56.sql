-- 1) Add provider and zapi_instance_id columns to whatsapp_integrations
ALTER TABLE public.whatsapp_integrations
ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta',
ADD COLUMN IF NOT EXISTS zapi_instance_id text;

-- 2) Extend RLS to allow users linked to the condominium (usuarios_condominio)
-- Keep existing admin/síndico and service_role policies; just add additional permissive policies

-- View policy
DROP POLICY IF EXISTS "Vinculados podem ver integrações" ON public.whatsapp_integrations;
CREATE POLICY "Vinculados podem ver integrações"
ON public.whatsapp_integrations
FOR SELECT
USING (
  condominio_id IN (
    SELECT uc.condominio_id
    FROM public.usuarios_condominio uc
    JOIN public.usuarios u ON u.id = uc.usuario_id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
);

-- Insert policy
DROP POLICY IF EXISTS "Vinculados podem inserir integrações" ON public.whatsapp_integrations;
CREATE POLICY "Vinculados podem inserir integrações"
ON public.whatsapp_integrations
FOR INSERT
WITH CHECK (
  condominio_id IN (
    SELECT uc.condominio_id
    FROM public.usuarios_condominio uc
    JOIN public.usuarios u ON u.id = uc.usuario_id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
);

-- Update policy
DROP POLICY IF EXISTS "Vinculados podem atualizar integrações" ON public.whatsapp_integrations;
CREATE POLICY "Vinculados podem atualizar integrações"
ON public.whatsapp_integrations
FOR UPDATE
USING (
  condominio_id IN (
    SELECT uc.condominio_id
    FROM public.usuarios_condominio uc
    JOIN public.usuarios u ON u.id = uc.usuario_id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  condominio_id IN (
    SELECT uc.condominio_id
    FROM public.usuarios_condominio uc
    JOIN public.usuarios u ON u.id = uc.usuario_id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
);

-- Delete policy
DROP POLICY IF EXISTS "Vinculados podem deletar integrações" ON public.whatsapp_integrations;
CREATE POLICY "Vinculados podem deletar integrações"
ON public.whatsapp_integrations
FOR DELETE
USING (
  condominio_id IN (
    SELECT uc.condominio_id
    FROM public.usuarios_condominio uc
    JOIN public.usuarios u ON u.id = uc.usuario_id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
);