
-- Primeiro, vamos remover as políticas problemáticas
DROP POLICY IF EXISTS "Admin users can manage all usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Admin users can view all usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios can view their own data" ON public.usuarios;

-- Criar uma política mais simples que não cause recursão
-- Política que permite usuários autenticados verem dados por email
CREATE POLICY "Users can view by email" ON public.usuarios
FOR SELECT 
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Política separada para admins gerenciarem tudo, usando uma abordagem diferente
CREATE POLICY "Admin management" ON public.usuarios
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios admin_check 
    WHERE admin_check.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND admin_check.tipo_acesso = 'admin'
  )
);
