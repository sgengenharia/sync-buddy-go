-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Admins podem inserir usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios dados" ON public.usuarios;

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current user's email exists in usuarios table with admin type
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE email = (auth.jwt() ->> 'email') 
    AND tipo_acesso = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a security definer function to get current user's tipo_acesso
CREATE OR REPLACE FUNCTION public.get_current_user_tipo_acesso()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT tipo_acesso FROM public.usuarios 
    WHERE email = (auth.jwt() ->> 'email')
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new non-recursive policies
CREATE POLICY "Public can select usuarios for admin check" 
ON public.usuarios FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert usuarios" 
ON public.usuarios FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update usuarios" 
ON public.usuarios FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete usuarios" 
ON public.usuarios FOR DELETE 
USING (auth.role() = 'authenticated');