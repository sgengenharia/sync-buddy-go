import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarNavigation } from '@/components/ui/sidebar-navigation';
import { Building2 } from 'lucide-react';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  status: string;
}

export default function PainelPortaria() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [selectedCondominio, setSelectedCondominio] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadCondominios();
  }, [user, navigate]);

  const loadCondominios = async () => {
    try {
      const { data: condominiosData } = await supabase
        .from('condominios')
        .select('*')
        .eq('status', 'ativo')
        .order('nome');

      if (condominiosData) {
        setCondominios(condominiosData);
        if (condominiosData.length > 0) setSelectedCondominio(condominiosData[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Painel da Portaria | Dashboard';
  }, []);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        if (!user?.email || !selectedCondominio) return;
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        if (!userData) {
          setUserPermissions([]);
          return;
        }
        const { data: assoc } = await supabase
          .from('usuarios_condominio')
          .select('paginas_liberadas')
          .eq('usuario_id', userData.id)
          .eq('condominio_id', selectedCondominio)
          .maybeSingle();
        if (assoc?.paginas_liberadas && (assoc.paginas_liberadas as string[]).length > 0) {
          setUserPermissions(assoc.paginas_liberadas as string[]);
        } else {
          setUserPermissions([]);
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setUserPermissions([]);
      }
    };

    loadPermissions();
  }, [user, selectedCondominio]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const renderPageContent = () => {
    if (!selectedCondominio) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Selecione um condomínio para continuar</p>
        </div>
      );
    }

    switch (selectedPage) {
      case 'dashboard':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Dashboard da Portaria</CardTitle>
              <CardDescription>Resumo de acessos e ocorrências</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Conteúdo em desenvolvimento.</p>
            </CardContent>
          </Card>
        );
      case 'reservas':
      case 'crm':
      case 'moradores':
      case 'whatsapp':
      case 'faq':
      case 'configuracoes':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Seção: {selectedPage}</CardTitle>
              <CardDescription>Funcionalidade em desenvolvimento.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Aguarde as próximas atualizações.</p>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarNavigation
        condominios={condominios}
        selectedCondominio={selectedCondominio}
        onCondominioSelect={setSelectedCondominio}
        selectedPage={selectedPage}
        onPageSelect={setSelectedPage}
        userPermissions={userPermissions}
      />

      <div className="flex-1 flex flex-col">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold">Painel da Portaria</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button onClick={handleSignOut} variant="outline" size="sm">Sair</Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {userPermissions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Nenhuma página liberada para este condomínio.</p>
            </div>
          ) : (
            renderPageContent()
          )}
        </main>
      </div>
    </div>
  );
}
