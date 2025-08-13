-- Remover política problemática existente
DROP POLICY IF EXISTS "Only admin can manage usuarios" ON public.usuarios;

-- Criar função para verificar se usuário é admin (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
    AND tipo_acesso = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Política para SELECT: admin vê todos, usuário normal vê apenas seus dados
CREATE POLICY "Admin can view all usuarios, users can view own" ON public.usuarios
FOR SELECT TO authenticated
USING (
  public.is_admin_user() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Política para INSERT: apenas admin pode inserir novos usuários
CREATE POLICY "Only admin can insert usuarios" ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_user());

-- Política para UPDATE: admin pode atualizar todos, usuário normal apenas seus dados
CREATE POLICY "Admin can update all, users can update own" ON public.usuarios
FOR UPDATE TO authenticated
USING (
  public.is_admin_user() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  public.is_admin_user() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Política para DELETE: apenas admin pode deletar usuários
CREATE POLICY "Only admin can delete usuarios" ON public.usuarios
FOR DELETE TO authenticated
USING (public.is_admin_user());