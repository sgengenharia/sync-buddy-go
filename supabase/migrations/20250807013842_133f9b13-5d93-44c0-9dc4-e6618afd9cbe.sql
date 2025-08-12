-- Add missing columns to usuarios table
ALTER TABLE public.usuarios 
ADD COLUMN nome_exibicao TEXT,
ADD COLUMN telefone TEXT;