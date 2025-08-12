-- Create helper function to avoid recursive RLS checks when validating sindico permissions
CREATE OR REPLACE FUNCTION public.is_sindico_of_condo(_condo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.condominios c
    JOIN public.usuarios u ON c.sindico_responsavel = u.id
    WHERE c.id = _condo_id
      AND u.email = (auth.jwt() ->> 'email')
  );
$$;

-- Replace recursive policies on usuarios_condominio with versions using security definer functions
DROP POLICY IF EXISTS "Admins e síndicos podem atualizar associações" ON public.usuarios_condominio;
DROP POLICY IF EXISTS "Admins e síndicos podem deletar associações" ON public.usuarios_condominio;
DROP POLICY IF EXISTS "Admins e síndicos podem inserir associações" ON public.usuarios_condominio;

CREATE POLICY "Admins e síndicos podem inserir associações"
ON public.usuarios_condominio
FOR INSERT
WITH CHECK (
  public.is_admin() OR public.is_sindico_of_condo(usuarios_condominio.condominio_id)
);

CREATE POLICY "Admins e síndicos podem atualizar associações"
ON public.usuarios_condominio
FOR UPDATE
USING (
  public.is_admin() OR public.is_sindico_of_condo(usuarios_condominio.condominio_id)
);

CREATE POLICY "Admins e síndicos podem deletar associações"
ON public.usuarios_condominio
FOR DELETE
USING (
  public.is_admin() OR public.is_sindico_of_condo(usuarios_condominio.condominio_id)
);
