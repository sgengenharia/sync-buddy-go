-- Adicionar colunas faltantes na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN nome_exibicao TEXT,
ADD COLUMN telefone TEXT;