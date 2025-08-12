-- Allow Z-API provider without Meta phone_number_id
ALTER TABLE public.whatsapp_integrations
  ALTER COLUMN phone_number_id DROP NOT NULL;

-- Add provider-specific integrity checks
ALTER TABLE public.whatsapp_integrations
  DROP CONSTRAINT IF EXISTS whatsapp_integrations_chk_meta_phone,
  DROP CONSTRAINT IF EXISTS whatsapp_integrations_chk_zapi_instance;

ALTER TABLE public.whatsapp_integrations
  ADD CONSTRAINT whatsapp_integrations_chk_meta_phone
    CHECK (provider <> 'meta' OR phone_number_id IS NOT NULL),
  ADD CONSTRAINT whatsapp_integrations_chk_zapi_instance
    CHECK (provider <> 'zapi' OR zapi_instance_id IS NOT NULL);