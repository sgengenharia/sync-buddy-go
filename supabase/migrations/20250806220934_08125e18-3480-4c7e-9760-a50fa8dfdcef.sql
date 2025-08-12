-- Add missing RLS policies for espacos table
CREATE POLICY "Usuários podem ver espaços dos seus condomínios" 
ON public.espacos FOR SELECT 
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

CREATE POLICY "Síndicos podem inserir espaços" 
ON public.espacos FOR INSERT 
WITH CHECK (
  condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

CREATE POLICY "Síndicos podem atualizar espaços" 
ON public.espacos FOR UPDATE 
USING (
  condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

-- Add missing RLS policies for reservas table
CREATE POLICY "Usuários podem ver reservas dos seus condomínios" 
ON public.reservas FOR SELECT 
USING (
  espaco_id IN (
    SELECT e.id FROM public.espacos e
    WHERE e.condominio_id IN (
      SELECT c.id FROM public.condominios c
      JOIN public.usuarios u ON c.sindico_responsavel = u.id
      WHERE u.email = (auth.jwt() ->> 'email')
    )
    OR e.condominio_id IN (
      SELECT uc.condominio_id FROM public.usuarios_condominio uc
      JOIN public.usuarios u ON uc.usuario_id = u.id
      WHERE u.email = (auth.jwt() ->> 'email')
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

CREATE POLICY "Síndicos podem inserir reservas" 
ON public.reservas FOR INSERT 
WITH CHECK (
  espaco_id IN (
    SELECT e.id FROM public.espacos e
    WHERE e.condominio_id IN (
      SELECT c.id FROM public.condominios c
      JOIN public.usuarios u ON c.sindico_responsavel = u.id
      WHERE u.email = (auth.jwt() ->> 'email')
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

CREATE POLICY "Síndicos podem atualizar reservas" 
ON public.reservas FOR UPDATE 
USING (
  espaco_id IN (
    SELECT e.id FROM public.espacos e
    WHERE e.condominio_id IN (
      SELECT c.id FROM public.condominios c
      JOIN public.usuarios u ON c.sindico_responsavel = u.id
      WHERE u.email = (auth.jwt() ->> 'email')
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

-- Add missing RLS policies for chamados_crm table
CREATE POLICY "Usuários podem ver chamados dos seus condomínios" 
ON public.chamados_crm FOR SELECT 
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

CREATE POLICY "Usuários podem inserir chamados" 
ON public.chamados_crm FOR INSERT 
WITH CHECK (
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

CREATE POLICY "Usuários podem atualizar chamados" 
ON public.chamados_crm FOR UPDATE 
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

-- Add missing policies for moradores table
CREATE POLICY "Síndicos podem inserir moradores" 
ON public.moradores FOR INSERT 
WITH CHECK (
  condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

CREATE POLICY "Síndicos podem atualizar moradores" 
ON public.moradores FOR UPDATE 
USING (
  condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

CREATE POLICY "Síndicos podem deletar moradores" 
ON public.moradores FOR DELETE 
USING (
  condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
);

-- Add missing policies for usuarios_condominio table
CREATE POLICY "Admins e síndicos podem inserir associações" 
ON public.usuarios_condominio FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
  OR condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Admins e síndicos podem atualizar associações" 
ON public.usuarios_condominio FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
  OR condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Admins e síndicos podem deletar associações" 
ON public.usuarios_condominio FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.email = (auth.jwt() ->> 'email') 
    AND usuarios.tipo_acesso = 'admin'
  )
  OR condominio_id IN (
    SELECT c.id FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE u.email = (auth.jwt() ->> 'email')
  )
);