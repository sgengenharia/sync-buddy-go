-- Create usuarios table
CREATE TABLE public.usuarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    tipo_acesso TEXT NOT NULL CHECK (tipo_acesso IN ('admin', 'sindico', 'zelador', 'portaria')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create condominios table
CREATE TABLE public.condominios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    email TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tentativas_login table for security tracking
CREATE TABLE public.tentativas_login (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    sucesso BOOLEAN NOT NULL,
    tentativa_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_login ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for usuarios
CREATE POLICY "Usuarios can view their own data" 
ON public.usuarios 
FOR SELECT 
USING (auth.uid()::text IN (
    SELECT auth.users.id::text FROM auth.users WHERE auth.users.email = usuarios.email
));

CREATE POLICY "Admin users can view all usuarios" 
ON public.usuarios 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios admin_user 
        WHERE admin_user.email IN (
            SELECT auth.users.email FROM auth.users WHERE auth.users.id = auth.uid()
        ) 
        AND admin_user.tipo_acesso = 'admin'
    )
);

CREATE POLICY "Admin users can manage all usuarios" 
ON public.usuarios 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios admin_user 
        WHERE admin_user.email IN (
            SELECT auth.users.email FROM auth.users WHERE auth.users.id = auth.uid()
        ) 
        AND admin_user.tipo_acesso = 'admin'
    )
);

-- Create RLS policies for condominios
CREATE POLICY "Admin users can manage all condominios" 
ON public.condominios 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios admin_user 
        WHERE admin_user.email IN (
            SELECT auth.users.email FROM auth.users WHERE auth.users.id = auth.uid()
        ) 
        AND admin_user.tipo_acesso = 'admin'
    )
);

-- Create RLS policies for tentativas_login
CREATE POLICY "Admin users can view all login attempts" 
ON public.tentativas_login 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios admin_user 
        WHERE admin_user.email IN (
            SELECT auth.users.email FROM auth.users WHERE auth.users.id = auth.uid()
        ) 
        AND admin_user.tipo_acesso = 'admin'
    )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_condominios_updated_at
    BEFORE UPDATE ON public.condominios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert admin user
INSERT INTO public.usuarios (email, nome, tipo_acesso) 
VALUES ('comercial@sgeng.com.br', 'Administrador do Sistema', 'admin');

-- Insert a sample condominio for testing
INSERT INTO public.condominios (nome, endereco, telefone, email) 
VALUES ('Condomínio Exemplo', 'Rua Exemplo, 123', '(11) 99999-9999', 'contato@exemplo.com.br');