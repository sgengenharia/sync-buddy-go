-- Fix the security functions with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.get_current_user_tipo_acesso()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT tipo_acesso FROM public.usuarios 
    WHERE email = (auth.jwt() ->> 'email')
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';