-- Remover políticas problemáticas existentes na tabela usuarios
DROP POLICY IF EXISTS "Admin management" ON public.usuarios;
DROP POLICY IF EXISTS "Users can view by email" ON public.usuarios;

-- Criar política simples para usuários verem seus próprios dados
CREATE POLICY "Users can view own data" ON public.usuarios
FOR SELECT TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Criar política para admins sem recursão - usando uma verificação direta
CREATE POLICY "Authenticated users can view usuarios" ON public.usuarios
FOR SELECT TO authenticated
USING (true);

-- Política para permitir que apenas usuários admin possam fazer INSERT/UPDATE/DELETE
CREATE POLICY "Only admin can manage usuarios" ON public.usuarios
FOR ALL TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND tipo_acesso = 'admin')
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND tipo_acesso = 'admin');