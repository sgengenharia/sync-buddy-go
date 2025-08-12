import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [userType, setUserType] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const getUserType = async () => {
      const { data } = await supabase
        .from('usuarios')
        .select('tipo_acesso')
        .eq('email', user.email)
        .single();

      if (data) {
        setUserType(data.tipo_acesso);
        
        // Redirect based on user type
        switch (data.tipo_acesso) {
          case 'sindico':
            navigate('/painel-sindico');
            break;
          case 'zelador':
            navigate('/painel-zelador');
            break;
          case 'portaria':
            navigate('/painel-portaria');
            break;
          case 'admin':
            navigate('/admin-suporte');
            break;
          default:
            // Check if it's a custom user type, redirect to appropriate panel
            navigate('/painel-personalizado');
            break;
        }
      }
    };

    getUserType();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={handleSignOut} variant="outline">
            Sair
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo ao Sistema</CardTitle>
            <CardDescription>
              Olá, {user?.email}! Você está logado no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userType && (
              <p className="text-sm text-muted-foreground">
                Tipo de acesso: <span className="font-medium">{userType}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}