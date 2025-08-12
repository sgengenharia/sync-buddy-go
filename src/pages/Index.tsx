import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Sistema de Gestão Condominial</h1>
        <p className="text-xl text-muted-foreground">
          Faça login para acessar o sistema
        </p>
        <Button asChild size="lg">
          <Link to="/login">Entrar no Sistema</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
