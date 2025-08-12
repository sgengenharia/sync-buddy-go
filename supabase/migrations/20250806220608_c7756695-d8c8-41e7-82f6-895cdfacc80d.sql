-- Create condominios table
CREATE TABLE public.condominios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  telefone TEXT,
  cnpj TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  sindico_responsavel UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usuarios_condominio table for permissions
CREATE TABLE public.usuarios_condominio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  paginas_liberadas TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, condominio_id)
);

-- Create moradores table
CREATE TABLE public.moradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  unidade TEXT NOT NULL,
  bloco TEXT,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  permissoes JSONB DEFAULT '{"podeReservar": true, "recebeMsg": true, "liberaAcesso": false, "podeVotar": true}',
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create espacos table
CREATE TABLE public.espacos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_diaria NUMERIC(10,2) DEFAULT 0,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservas table
CREATE TABLE public.reservas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  espaco_id UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  morador_id UUID NOT NULL REFERENCES public.moradores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'cancelada')),
  data_reserva DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chamados_crm table
CREATE TABLE public.chamados_crm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  morador_id UUID REFERENCES public.moradores(id) ON DELETE SET NULL,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'geral' CHECK (tipo IN ('manutencao', 'reclamacao', 'reserva', 'geral')),
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'classificado', 'em_andamento', 'aguardando_morador', 'concluido')),
  descricao TEXT NOT NULL,
  telefone_contato TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_condominio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_crm ENABLE ROW LEVEL SECURITY;

-- RLS Policies for condominios
CREATE POLICY "Admins podem ver todos os condomínios" 
ON public.condominios FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.usuarios 
  WHERE usuarios.email = (auth.jwt() ->> 'email') 
  AND usuarios.tipo_acesso = 'admin'
));

CREATE POLICY "Admins podem inserir condomínios" 
ON public.condominios FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.usuarios 
  WHERE usuarios.email = (auth.jwt() ->> 'email') 
  AND usuarios.tipo_acesso = 'admin'
));

CREATE POLICY "Admins podem atualizar condomínios" 
ON public.condominios FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.usuarios 
  WHERE usuarios.email = (auth.jwt() ->> 'email') 
  AND usuarios.tipo_acesso = 'admin'
));

CREATE POLICY "Síndicos podem ver seus condomínios" 
ON public.condominios FOR SELECT 
USING (
  sindico_responsavel IN (
    SELECT id FROM public.usuarios 
    WHERE email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios_condominio uc
    JOIN public.usuarios u ON uc.usuario_id = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
    AND uc.condominio_id = condominios.id
  )
);

-- RLS Policies for usuarios_condominio
CREATE POLICY "Usuários podem ver suas associações" 
ON public.usuarios_condominio FOR SELECT 
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios 
    WHERE email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

-- RLS Policies for moradores
CREATE POLICY "Usuários podem ver moradores dos seus condomínios" 
ON public.moradores FOR SELECT 
USING (
  condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
  OR condominio_id IN (
    SELECT uc.condominio_id FROM public.usuarios_condominio uc
    JOIN public.usuarios u ON uc.usuario_id = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_condominios_updated_at
  BEFORE UPDATE ON public.condominios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moradores_updated_at
  BEFORE UPDATE ON public.moradores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_espacos_updated_at
  BEFORE UPDATE ON public.espacos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chamados_crm_updated_at
  BEFORE UPDATE ON public.chamados_crm
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();