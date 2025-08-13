
-- Criar tabela de moradores
CREATE TABLE public.moradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL,
  bloco TEXT,
  telefone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  permissoes JSONB DEFAULT '{"podeVotar": true, "recebeMsg": true, "liberaAcesso": false, "podeReservar": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de chamados CRM
CREATE TABLE public.chamados_crm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  morador_id UUID REFERENCES public.moradores(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  urgencia TEXT NOT NULL,
  telefone_contato TEXT,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_andamento', 'aguardando', 'resolvido')),
  descricao TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de atividades CRM 
CREATE TABLE public.atividades_crm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados_crm(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  conteudo TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  autor_usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_crm ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para moradores (usuários autenticados podem ver moradores do seu condomínio)
CREATE POLICY "Users can view moradores of their condominio" ON public.moradores
FOR SELECT TO authenticated
USING (
  condominio_id IN (
    SELECT c.id FROM public.condominios c 
    WHERE EXISTS (
      SELECT 1 FROM public.usuarios u 
      WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Admin can manage all moradores" ON public.moradores
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_check.tipo_acesso = 'admin'
  )
);

-- Políticas RLS para chamados CRM (similar às dos moradores)
CREATE POLICY "Users can view chamados of their condominio" ON public.chamados_crm
FOR SELECT TO authenticated
USING (
  condominio_id IN (
    SELECT c.id FROM public.condominios c 
    WHERE EXISTS (
      SELECT 1 FROM public.usuarios u 
      WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Admin can manage all chamados" ON public.chamados_crm
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_check.tipo_acesso = 'admin'
  )
);

-- Políticas RLS para atividades CRM
CREATE POLICY "Users can view atividades of their condominio chamados" ON public.atividades_crm
FOR SELECT TO authenticated
USING (
  chamado_id IN (
    SELECT ch.id FROM public.chamados_crm ch
    WHERE ch.condominio_id IN (
      SELECT c.id FROM public.condominios c 
      WHERE EXISTS (
        SELECT 1 FROM public.usuarios u 
        WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Admin can manage all atividades" ON public.atividades_crm
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_check.tipo_acesso = 'admin'
  )
);

-- Criar triggers para updated_at
CREATE TRIGGER update_moradores_updated_at 
  BEFORE UPDATE ON public.moradores 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chamados_crm_updated_at 
  BEFORE UPDATE ON public.chamados_crm 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atividades_crm_updated_at 
  BEFORE UPDATE ON public.atividades_crm 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns dados de exemplo para o condomínio existente
INSERT INTO public.moradores (condominio_id, nome, unidade, bloco, telefone, status) VALUES
((SELECT id FROM public.condominios LIMIT 1), 'João Silva', '101', 'A', '11987654321', 'ativo'),
((SELECT id FROM public.condominios LIMIT 1), 'Maria Santos', '102', 'A', '11987654322', 'ativo');

INSERT INTO public.chamados_crm (condominio_id, tipo, urgencia, telefone_contato, descricao, tags) VALUES
((SELECT id FROM public.condominios LIMIT 1), 'Manutenção', 'média', '11987654321', 'Vazamento no banheiro', ARRAY['vazamento', 'banheiro']),
((SELECT id FROM public.condominios LIMIT 1), 'Reclamação', 'alta', '11987654322', 'Barulho excessivo', ARRAY['ruído', 'vizinhança']);
