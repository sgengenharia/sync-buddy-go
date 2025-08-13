-- Inserir dados de exemplo para demonstrar o sistema

-- Condominios de exemplo
INSERT INTO public.condominios (id, nome, endereco, telefone, email) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Residencial Vila Nova', 'Rua das Flores, 123 - Vila Nova', '(11) 3456-7890', 'administracao@vilanotiva.com.br'),
('550e8400-e29b-41d4-a716-446655440002', 'Condomínio Garden Plaza', 'Av. Principal, 456 - Centro', '(11) 2345-6789', 'contato@gardenplaza.com.br'),
('550e8400-e29b-41d4-a716-446655440003', 'Edifício Torres do Sol', 'Rua do Sol, 789 - Jardim América', '(11) 4567-8901', 'sindico@torressol.com.br');

-- Usuários de exemplo (além do admin já criado)
INSERT INTO public.usuarios (id, email, nome, tipo_acesso, ativo) VALUES
('550e8400-e29b-41d4-a716-446655440010', 'sindico@vilanota.com.br', 'João Silva', 'sindico', true),
('550e8400-e29b-41d4-a716-446655440011', 'zelador@gardenplaza.com.br', 'Maria Santos', 'zelador', true),
('550e8400-e29b-41d4-a716-446655440012', 'portaria@torressol.com.br', 'Carlos Oliveira', 'portaria', true);

-- Relacionar usuários com condomínios
INSERT INTO public.usuarios_condominio (usuario_id, condominio_id) VALUES
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440003');

-- Moradores de exemplo
INSERT INTO public.moradores (id, condominio_id, nome, unidade, telefone, email, ativo) VALUES
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001', 'Ana Costa', 'Apto 101', '11987654321', 'ana.costa@email.com', true),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', 'Pedro Almeida', 'Apto 102', '11876543210', 'pedro.almeida@email.com', true),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'Lucia Ferreira', 'Apto 201', '11765432109', 'lucia.ferreira@email.com', true),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440002', 'Roberto Lima', 'Apto 301', '11654321098', 'roberto.lima@email.com', true),
('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440003', 'Sandra Rocha', 'Cobertura 1', '11543210987', 'sandra.rocha@email.com', true);

-- Espaços para reserva
INSERT INTO public.espacos (id, condominio_id, nome, descricao, capacidade_maxima, ativo) VALUES
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440001', 'Salão de Festas', 'Salão para eventos e comemorações', 50, true),
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001', 'Churrasqueira', 'Área com churrasqueira e mesas', 20, true),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440002', 'Piscina', 'Área da piscina para uso exclusivo', 30, true),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440003', 'Quadra Poliesportiva', 'Quadra para esportes diversos', 25, true);

-- Reservas de exemplo
INSERT INTO public.reservas (id, condominio_id, espaco_id, morador_id, data_reserva, hora_inicio, hora_fim, observacoes, status) VALUES
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440020', '2025-01-20', '19:00', '23:00', 'Aniversário de 30 anos', 'confirmada'),
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440021', '2025-01-25', '12:00', '16:00', 'Almoço em família', 'pendente'),
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440022', '2025-01-30', '14:00', '18:00', 'Festa na piscina', 'confirmada');

-- Chamados CRM de exemplo
INSERT INTO public.chamados_crm (id, condominio_id, morador_id, tipo, urgencia, telefone_contato, status, descricao, tags) VALUES
('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', 'Manutenção', 'alta', '11987654321', 'novo', 'Vazamento no banheiro do apartamento 101', ARRAY['hidraulica', 'urgente']),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440021', 'Reclamação', 'media', '11876543210', 'em_andamento', 'Barulho excessivo do apartamento vizinho durante a madrugada', ARRAY['ruido', 'vizinhanca']),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440022', 'Solicitação', 'baixa', '11765432109', 'aguardando', 'Solicitação de segunda via da chave do portão', ARRAY['chave', 'acesso']),
('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440023', 'Manutenção', 'alta', '11654321098', 'resolvido', 'Problema no elevador - parou entre andares', ARRAY['elevador', 'emergencia']),
('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440024', 'Informação', 'baixa', '11543210987', 'novo', 'Dúvida sobre as regras do condomínio para animais', ARRAY['pets', 'regulamento']);

-- Atividades CRM de exemplo
INSERT INTO public.atividades_crm (id, chamado_id, tipo, conteudo, metadata, autor_usuario_id) VALUES
('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440050', 'comentario', 'Chamado recebido via WhatsApp. Agendando visita técnica para amanhã às 14h.', '{}', '550e8400-e29b-41d4-a716-446655440010'),
('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440051', 'status_change', 'Status alterado para em andamento', '{"status_anterior": "novo", "status_novo": "em_andamento"}', '550e8400-e29b-41d4-a716-446655440010'),
('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440051', 'comentario', 'Conversei com o morador reclamante. Orientei sobre horários de silêncio do condomínio.', '{}', '550e8400-e29b-41d4-a716-446655440010'),
('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440053', 'status_change', 'Status alterado para resolvido', '{"status_anterior": "em_andamento", "status_novo": "resolvido"}', '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440064', '550e8400-e29b-41d4-a716-446655440053', 'comentario', 'Técnico do elevador esteve no local. Problema resolvido - cabo estava solto.', '{}', '550e8400-e29b-41d4-a716-446655440011');

-- Integrações WhatsApp de exemplo (desconectadas inicialmente)
INSERT INTO public.whatsapp_integrations (id, condominio_id, instance_id, status, phone_number) VALUES
('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440001', 'vila_nova_instance', 'desconectado', '5511987654321'),
('550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440002', 'garden_plaza_instance', 'desconectado', '5511876543210'),
('550e8400-e29b-41d4-a716-446655440072', '550e8400-e29b-41d4-a716-446655440003', 'torres_sol_instance', 'desconectado', '5511765432109');

-- Mensagens WhatsApp de exemplo
INSERT INTO public.whatsapp_messages (id, condominio_id, morador_id, provider_message_id, sender_phone, text, direction, whatsapp_session_id) VALUES
('550e8400-e29b-41d4-a716-446655440080', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', 'msg_001', '5511987654321', 'Olá, tem um vazamento no meu banheiro!', 'inbound', 'session_001'),
('550e8400-e29b-41d4-a716-446655440081', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', 'msg_002', '5511987654321', 'Olá! Recebemos sua mensagem. Vamos verificar o problema o mais rápido possível.', 'outbound', 'session_001'),
('550e8400-e29b-41d4-a716-446655440082', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440022', 'msg_003', '5511765432109', 'Gostaria de reservar a piscina para o próximo sábado', 'inbound', 'session_002'),
('550e8400-e29b-41d4-a716-446655440083', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440022', 'msg_004', '5511765432109', 'Claro! Vou verificar a disponibilidade da piscina para você.', 'outbound', 'session_002');

-- Sessões WhatsApp de exemplo
INSERT INTO public.whatsapp_sessions (id, condominio_id, morador_id, last_message_at, last_outbound_at) VALUES
('session_001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440020', now() - interval '2 hours', now() - interval '2 hours'),
('session_002', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440022', now() - interval '1 day', now() - interval '1 day'),
('session_003', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440024', now() - interval '3 days', null);