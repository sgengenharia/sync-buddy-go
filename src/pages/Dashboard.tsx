
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [userType, setUserType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const getUserType = async () => {
      try {
        console.log('Buscando tipo de usuário para:', user.email);
        
        const { data, error } = await supabase
          .from('usuarios')
          .select('tipo_acesso')
          .eq('email', user.email)
          .single();

        if (error) {
          console.error('Erro ao buscar tipo de usuário:', error);
          setLoading(false);
          return;
        }

        if (data) {
          console.log('Tipo de usuário encontrado:', data.tipo_acesso);
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
        } else {
          console.log('Nenhum dado de usuário encontrado');
        }
      } catch (err) {
        console.error('Erro inesperado ao buscar tipo de usuário:', err);
      } finally {
        setLoading(false);
      }
    };

    getUserType();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Verificando permissões do usuário</p>
        </div>
      </div>
    );
  }

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
            {userType ? (
              <p className="text-sm text-muted-foreground">
                Tipo de acesso: <span className="font-medium">{userType}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Verificando permissões...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
