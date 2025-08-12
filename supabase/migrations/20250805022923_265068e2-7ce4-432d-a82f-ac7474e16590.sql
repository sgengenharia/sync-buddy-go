-- Criar enum para tipos de acesso
CREATE TYPE public.tipo_acesso AS ENUM ('sindico', 'zelador', 'portaria', 'admin');

-- Criar tabela de usuários
CREATE TABLE public.usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  tipo_acesso tipo_acesso NOT NULL,
  condominios_vinculados TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de tentativas de login
CREATE TABLE public.tentativas_login (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  ultimo_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (email)
);

-- Enable RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_login ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela usuarios
CREATE POLICY "Usuários podem ver seus próprios dados" 
ON public.usuarios 
FOR SELECT 
USING (auth.uid()::text IN (
  SELECT u.id::text FROM auth.users u WHERE u.email = usuarios.email
));

CREATE POLICY "Admins podem ver todos os usuários" 
ON public.usuarios 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u2 
    WHERE u2.email = auth.jwt() ->> 'email' 
    AND u2.tipo_acesso = 'admin'
  )
);

CREATE POLICY "Admins podem inserir usuários" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u2 
    WHERE u2.email = auth.jwt() ->> 'email' 
    AND u2.tipo_acesso = 'admin'
  )
);

-- Políticas para tentativas_login (apenas leitura/escrita para autenticados)
CREATE POLICY "Qualquer um pode ler tentativas de login" 
ON public.tentativas_login 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer um pode inserir/atualizar tentativas" 
ON public.tentativas_login 
FOR ALL 
USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();