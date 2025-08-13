
-- Criar tabela de espaços
CREATE TABLE public.espacos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  capacidade INTEGER DEFAULT 0,
  valor_diaria DECIMAL(10,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de reservas
CREATE TABLE public.reservas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  espaco_id UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
  morador_id UUID NOT NULL REFERENCES public.moradores(id) ON DELETE CASCADE,
  data_reserva DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para espacos
CREATE POLICY "Users can view espacos of their condominio" ON public.espacos
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

CREATE POLICY "Admin can manage all espacos" ON public.espacos
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_check.tipo_acesso = 'admin'
  )
);

-- Políticas RLS para reservas
CREATE POLICY "Users can view reservas of their condominio" ON public.reservas
FOR SELECT TO authenticated
USING (
  espaco_id IN (
    SELECT e.id FROM public.espacos e
    WHERE e.condominio_id IN (
      SELECT c.id FROM public.condominios c 
      WHERE EXISTS (
        SELECT 1 FROM public.usuarios u 
        WHERE u.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Admin can manage all reservas" ON public.reservas
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_check.tipo_acesso = 'admin'
  )
);

-- Criar triggers para updated_at
CREATE TRIGGER update_espacos_updated_at 
  BEFORE UPDATE ON public.espacos 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at 
  BEFORE UPDATE ON public.reservas 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns dados de exemplo
INSERT INTO public.espacos (condominio_id, nome, descricao, capacidade, valor_diaria, status) VALUES
((SELECT id FROM public.condominios LIMIT 1), 'Salão de Festas', 'Espaço para eventos e comemorações', 50, 150.00, 'ativo'),
((SELECT id FROM public.condominios LIMIT 1), 'Churrasqueira', 'Área gourmet com churrasqueira', 20, 80.00, 'ativo'),
((SELECT id FROM public.condominios LIMIT 1), 'Quadra de Tênis', 'Quadra para prática de tênis', 4, 40.00, 'inativo');

-- Inserir algumas reservas de exemplo
INSERT INTO public.reservas (espaco_id, morador_id, data_reserva, status, observacoes) VALUES
((SELECT id FROM public.espacos WHERE nome = 'Salão de Festas' LIMIT 1), 
 (SELECT id FROM public.moradores LIMIT 1),
 '2025-08-20', 'pendente', 'Festa de aniversário'),
((SELECT id FROM public.espacos WHERE nome = 'Churrasqueira' LIMIT 1), 
 (SELECT id FROM public.moradores OFFSET 1 LIMIT 1),
 '2025-08-22', 'aprovada', 'Confraternização familiar');
