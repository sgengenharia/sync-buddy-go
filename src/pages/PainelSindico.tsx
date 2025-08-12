import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarNavigation } from '@/components/ui/sidebar-navigation';
import { Building2, Users, Calendar, MessageSquare, BarChart3, FileText } from 'lucide-react';
import { CRMBoard } from '@/features/crm/CRMBoard';
import { MoradoresModule } from '@/features/moradores/MoradoresModule';
import { ReservasModule } from '@/features/reservas/ReservasModule';
import { WhatsAppModule } from '@/features/whatsapp/WhatsAppModule';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  status: string;
}

export default function PainelSindico() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [selectedCondominio, setSelectedCondominio] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  // Dynamic permissions per condominio (default: all pages for síndico)
  const defaultPermissions = ['dashboard', 'crm', 'moradores', 'reservas', 'whatsapp', 'faq', 'configuracoes'];
  const [userPermissions, setUserPermissions] = useState<string[]>(defaultPermissions);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadCondominios();
  }, [user, navigate]);

  const loadCondominios = async () => {
    try {
      // Get user ID first
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (!userData) return;

      // Load condominiums where user is sindico or has access
      const { data: condominiosData } = await supabase
        .from('condominios')
        .select('*')
        .eq('status', 'ativo')
        .order('nome');

      if (condominiosData) {
        setCondominios(condominiosData);
        if (condominiosData.length > 0) {
          setSelectedCondominio(condominiosData[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set page title for basic SEO
  useEffect(() => {
    document.title = 'Painel do Síndico | Dashboard';
  }, []);

  // Load dynamic page permissions per selected condomínio
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
          setUserPermissions(defaultPermissions);
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
          setUserPermissions(defaultPermissions);
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
        setUserPermissions(defaultPermissions);
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

    const condominioSelecionado = condominios.find(c => c.id === selectedCondominio);

    switch (selectedPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <p className="text-muted-foreground">{condominioSelecionado?.nome}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Moradores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">248</div>
                  <p className="text-xs text-muted-foreground">
                    +12% em relação ao mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chamados Abertos</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    3 críticos, 9 normais
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reservas do Mês</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">34</div>
                  <p className="text-xs text-muted-foreground">
                    15 churrasqueiras, 19 salão
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Satisfação</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">94%</div>
                  <p className="text-xs text-muted-foreground">
                    +2% em relação ao mês anterior
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'crm':
        return selectedCondominio ? (
          <CRMBoard condominioId={selectedCondominio} />
        ) : null;

      case 'moradores':
        return selectedCondominio ? (
          <MoradoresModule condominioId={selectedCondominio} />
        ) : null;

      case 'reservas':
        return selectedCondominio ? (
          <ReservasModule condominioId={selectedCondominio} />
        ) : null;


      case 'whatsapp':
        return selectedCondominio ? (
          <WhatsAppModule condominioId={selectedCondominio} />
        ) : null;

      case 'faq':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">FAQ e Documentos</h2>
              <p className="text-muted-foreground">Documentos, atas e perguntas frequentes</p>
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Funcionalidade em desenvolvimento. Aqui será possível gerenciar FAQs,
                  fazer upload de documentos e disponibilizar atas para os moradores.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'configuracoes':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Configurações</h2>
              <p className="text-muted-foreground">Gerencie usuários e permissões do condomínio</p>
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Funcionalidade em desenvolvimento. Aqui será possível criar usuários
                  (zelador, portaria, personalizados) e definir suas permissões.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Página não encontrada</p>
          </div>
        );
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
        onCondominioSelect={setSelectedCondominio as (id: string) => void}
        selectedPage={selectedPage}
        onPageSelect={setSelectedPage}
        userPermissions={userPermissions}
      />
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-semibold">Painel do Síndico</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.email}
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{renderPageContent()}</main>
      </div>
    </div>
  );
}
