-- Diagnóstico Zapi/Supabase

-- 1. Verificar mensagens recentes (verifique se o campo body está vazio)
SELECT id, direction, body, raw, created_at
FROM public.whatsapp_messages
ORDER BY created_at DESC
LIMIT 20;

-- 2. Verificar integrações Zapi ativas
SELECT *
FROM public.whatsapp_integrations
WHERE provider = 'zapi' AND status = 'ativo';

-- 3. Verificar status das mensagens enviadas
SELECT id, status, body, raw, created_at
FROM public.whatsapp_messages
WHERE direction = 'outbound'
ORDER BY created_at DESC
LIMIT 20;
