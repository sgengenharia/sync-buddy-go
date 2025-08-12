import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';

interface Usuario {
  id: string;
  email: string;
  tipo_acesso: string;
  nome_exibicao?: string;
  telefone?: string;
  created_at: string;
}

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  telefone?: string;
  cnpj?: string;
  status: string;
  sindico_responsavel?: string;
  sindico?: Usuario;
}


interface UsuarioCondominio {
  id: string;
  usuario_id: string;
  condominio_id: string;
  paginas_liberadas: string[];
  created_at: string;
}

export default function AdminSuporte() {
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoAcesso, setTipoAcesso] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para gerenciamento de dados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Estados para condomínios
  const [nomeCondominio, setNomeCondominio] = useState('');
  const [enderecoCondominio, setEnderecoCondominio] = useState('');
  const [telefoneCondominio, setTelefoneCondominio] = useState('');
  const [cnpjCondominio, setCnpjCondominio] = useState('');
  const [sindicoResponsavel, setSindicoResponsavel] = useState('');
  

  // Estados para associações usuário-condomínio
  const [assocUsuarioId, setAssocUsuarioId] = useState('');
  const [assocCondominioId, setAssocCondominioId] = useState('');
  const [assocPaginas, setAssocPaginas] = useState<string[]>([]);
  const [associacoes, setAssociacoes] = useState<UsuarioCondominio[]>([]);
  const pageKeys = ['dashboard','crm','moradores','reservas','whatsapp','faq','configuracoes'];
  const [editAssocId, setEditAssocId] = useState<string | null>(null);
  const [editPaginas, setEditPaginas] = useState<string[]>([]);
  
  const sindicos = usuarios.filter((u) => u.tipo_acesso === 'sindico');

  const { signUp, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (e) {
      console.error('Erro ao sair', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setLoadingData(true);
    try {
      // Carregar usuários
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (usuariosData) {
        setUsuarios(usuariosData);
      }

      // Carregar condomínios com síndicos
      const { data: condominiosData } = await supabase
        .from('condominios')
        .select(`
          *,
          sindico:usuarios!sindico_responsavel(id, email, nome_exibicao, tipo_acesso, created_at)
        `)
        .order('created_at', { ascending: false });

      if (condominiosData) {
        setCondominios(condominiosData);
      }

      // Carregar associações de acesso
      const { data: assocData } = await supabase
        .from('usuarios_condominio')
        .select('*')
        .order('created_at', { ascending: false });
      if (assocData) {
        setAssociacoes(assocData as any);
      }
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmitUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('Tentando criar usuário:', { email: novoEmail, tipo: tipoAcesso });
      
      // Create user in Supabase Auth
      const { error: authError } = await signUp(novoEmail, novaSenha);

      if (authError) {
        console.error('Erro na criação do usuário:', authError);
        
        // Provide more specific error messages
        if (authError.message?.includes('email_address_invalid')) {
          setError('Email inválido. Verifique se o email está correto e tente novamente.');
        } else if (authError.message?.includes('already_registered')) {
          setError('Este email já está cadastrado no sistema.');
        } else if (authError.message?.includes('weak_password')) {
          setError('Senha muito fraca. Use pelo menos 6 caracteres.');
        } else {
          setError(`Erro ao criar usuário: ${authError.message}`);
        }
        
        setLoading(false);
        return;
      }

      console.log('Usuário criado no Auth, adicionando na tabela usuarios...');

      // Add user to usuarios table
      const { error: dbError } = await supabase
        .from('usuarios')
        .insert({
          email: novoEmail.toLowerCase(), // Ensure email is lowercase
          tipo_acesso: tipoAcesso as any,
          nome_exibicao: nomeExibicao,
          telefone: telefone
        });

      if (dbError) {
        console.error('Erro ao salvar dados do usuário:', dbError);
        setError(`Usuário criado no sistema de autenticação, mas houve erro ao salvar dados adicionais: ${dbError.message}`);
      } else {
        console.log('Usuário criado com sucesso!');
        setMessage('Usuário criado com sucesso! Um email de confirmação foi enviado.');
        // Reset form
        setNovoEmail('');
        setNovaSenha('');
        setNomeExibicao('');
        setTelefone('');
        setTipoAcesso('');
        loadData();
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError(`Ocorreu um erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCondominio = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase
        .from('condominios')
        .insert({
          nome: nomeCondominio,
          endereco: enderecoCondominio,
          telefone: telefoneCondominio,
          cnpj: cnpjCondominio,
          sindico_responsavel: sindicoResponsavel || null
        });

      if (error) {
        setError('Erro ao criar condomínio.');
      } else {
        setMessage('Condomínio criado com sucesso!');
        setNomeCondominio('');
        setEnderecoCondominio('');
        setTelefoneCondominio('');
        setCnpjCondominio('');
        setSindicoResponsavel('');
        loadData();
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) {
        setError('Erro ao excluir usuário');
      } else {
        setMessage('Usuário excluído com sucesso');
        loadData();
      }
    } catch (err) {
      setError('Erro inesperado');
    }
  };

  const handleDeleteCondominio = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este condomínio? Todos os dados vinculados serão perdidos.')) return;

    try {
      const { error } = await supabase
        .from('condominios')
        .delete()
        .eq('id', id);

      if (error) {
        setError('Erro ao excluir condomínio');
      } else {
        setMessage('Condomínio excluído com sucesso');
        loadData();
      }
    } catch (err) {
      setError('Erro inesperado');
    }
  };

  // Gestão de acessos: helpers
  const togglePagina = (key: string) => {
    setAssocPaginas((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleEditPagina = (key: string) => {
    setEditPaginas((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const startEditAssociacao = (assoc: UsuarioCondominio) => {
    setEditAssocId(assoc.id);
    setEditPaginas(assoc.paginas_liberadas || []);
    setMessage('');
    setError('');
  };

  const cancelEditAssociacao = () => {
    setEditAssocId(null);
    setEditPaginas([]);
  };

  const saveEditAssociacao = async () => {
    if (!editAssocId) return;
    if (!editPaginas || editPaginas.length === 0) {
      setError('Selecione pelo menos uma página.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase
      .from('usuarios_condominio')
      .update({ paginas_liberadas: editPaginas })
      .eq('id', editAssocId);
    if (error) {
      const anyErr: any = error as any;
      const details = `${error.message}${anyErr?.code ? ` (code: ${anyErr.code})` : ''}${anyErr?.details ? ` - ${anyErr.details}` : ''}`;
      const tip = error.message?.toLowerCase().includes('row level security') ? ' Dica: confirme se você é admin ou síndico do condomínio selecionado.' : '';
      setError(`Erro ao atualizar associação: ${details}${tip}`);
    } else {
      setMessage('Associação atualizada com sucesso');
      setEditAssocId(null);
      setEditPaginas([]);
      loadData();
    }
    setLoading(false);
  };
  const handleSubmitAssociacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!assocUsuarioId || !assocCondominioId) {
        setError('Selecione um usuário e um condomínio.');
        return;
      }

      if (!assocPaginas || assocPaginas.length === 0) {
        setError('Selecione pelo menos uma página.');
        return;
      }

      // Evitar duplicidade (também garantido por índice único no banco)
      const jaExiste = associacoes.some(
        (a) => a.usuario_id === assocUsuarioId && a.condominio_id === assocCondominioId
      );
      if (jaExiste) {
        setError('Esta associação já existe.');
        return;
      }

      const { error } = await supabase
        .from('usuarios_condominio')
        .insert({
          usuario_id: assocUsuarioId,
          condominio_id: assocCondominioId,
          paginas_liberadas: assocPaginas,
        });

      if (error) {
        const anyErr: any = error as any;
        const details = `${error.message}${anyErr?.code ? ` (code: ${anyErr.code})` : ''}${anyErr?.details ? ` - ${anyErr.details}` : ''}`;
        const tip = error.message?.toLowerCase().includes('row level security') ? ' Dica: confirme se você é admin ou síndico do condomínio selecionado.' : '';
        const duplicate = anyErr?.code === '23505' ? ' Esta associação já existe.' : '';
        setError(`Erro ao criar associação: ${details}${duplicate}${tip}`);
      } else {
        setMessage('Associação criada com sucesso');
        setAssocUsuarioId('');
        setAssocCondominioId('');
        setAssocPaginas([]);
        loadData();
      }
    } catch (err) {
      setError('Erro inesperado ao criar associação');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssociacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta associação?')) return;
    try {
      const { error } = await supabase
        .from('usuarios_condominio')
        .delete()
        .eq('id', id);
      if (error) {
        setError('Erro ao excluir associação');
      } else {
        setMessage('Associação excluída com sucesso');
        loadData();
      }
    } catch (err) {
      setError('Erro inesperado ao excluir associação');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Painel do Suporte</h1>
            <p className="text-muted-foreground">Gestão completa do sistema</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>

        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="condominios">Condomínios</TabsTrigger>
            <TabsTrigger value="acessos">Gestão de Acessos</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulário de criação de usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Novo Usuário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitUsuario} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="novo-email">Email</Label>
                      <Input
                        id="novo-email"
                        type="email"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value.toLowerCase())}
                        placeholder="usuario@exemplo.com"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Use um formato de email válido
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nova-senha">Senha temporária</Label>
                      <Input
                        id="nova-senha"
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nome-exibicao">Nome</Label>
                      <Input
                        id="nome-exibicao"
                        value={nomeExibicao}
                        onChange={(e) => setNomeExibicao(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo-acesso">Tipo de acesso</Label>
                      <Select value={tipoAcesso} onValueChange={setTipoAcesso} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sindico">Síndico</SelectItem>
                          <SelectItem value="zelador">Zelador</SelectItem>
                          <SelectItem value="portaria">Portaria</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Criando...' : 'Criar Usuário'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Lista de usuários */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuários Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p>Carregando...</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {usuarios.map((usuario) => (
                        <div key={usuario.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <p className="font-medium">{usuario.nome_exibicao || usuario.email}</p>
                            <p className="text-sm text-muted-foreground">{usuario.email}</p>
                            <Badge variant="secondary">{usuario.tipo_acesso}</Badge>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUsuario(usuario.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="condominios" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulário de criação de condomínio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Novo Condomínio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitCondominio} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome-condominio">Nome</Label>
                      <Input
                        id="nome-condominio"
                        value={nomeCondominio}
                        onChange={(e) => setNomeCondominio(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endereco-condominio">Endereço</Label>
                      <Input
                        id="endereco-condominio"
                        value={enderecoCondominio}
                        onChange={(e) => setEnderecoCondominio(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone-condominio">Telefone</Label>
                      <Input
                        id="telefone-condominio"
                        value={telefoneCondominio}
                        onChange={(e) => setTelefoneCondominio(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj-condominio">CNPJ</Label>
                      <Input
                        id="cnpj-condominio"
                        value={cnpjCondominio}
                        onChange={(e) => setCnpjCondominio(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sindico-responsavel">Síndico Responsável</Label>
                      <Select value={sindicoResponsavel} onValueChange={setSindicoResponsavel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um síndico" />
                        </SelectTrigger>
                        <SelectContent>
                          {sindicos.map((sindico) => (
                            <SelectItem key={sindico.id} value={sindico.id}>
                              {sindico.nome_exibicao || sindico.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Criando...' : 'Criar Condomínio'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Lista de condomínios */}
              <Card>
                <CardHeader>
                  <CardTitle>Condomínios Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <p>Carregando...</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {condominios.map((condominio) => (
                        <div key={condominio.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <p className="font-medium">{condominio.nome}</p>
                            <p className="text-sm text-muted-foreground">{condominio.endereco}</p>
                            {condominio.sindico && (
                              <p className="text-xs text-muted-foreground">
                                Síndico: {condominio.sindico.nome_exibicao || condominio.sindico.email}
                              </p>
                            )}
                            <Badge variant={condominio.status === 'ativo' ? 'default' : 'secondary'}>
                              {condominio.status}
                            </Badge>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCondominio(condominio.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="acessos">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Acessos</CardTitle>
                <CardDescription>
                  Atribua condomínios aos usuários e defina permissões de páginas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulário de associação */}
                <form onSubmit={handleSubmitAssociacao} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Usuário</Label>
                      <Select value={assocUsuarioId} onValueChange={setAssocUsuarioId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          {usuarios.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome_exibicao || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Condomínio</Label>
                      <Select value={assocCondominioId} onValueChange={setAssocCondominioId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um condomínio" />
                        </SelectTrigger>
                        <SelectContent>
                          {condominios.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Páginas liberadas</Label>
                      <div className="flex flex-wrap gap-3 border rounded p-3">
                        {pageKeys.map((k) => (
                          <label key={k} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={assocPaginas.includes(k)}
                              onCheckedChange={() => togglePagina(k)}
                            />
                            <span className="capitalize">{k}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Salvando...' : 'Criar Associação'}
                    </Button>
                  </div>
                </form>

                {/* Lista de associações */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Associações existentes</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Condomínio</TableHead>
                        <TableHead>Páginas</TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {associacoes.map((a) => {
                        const userLabel = usuarios.find((u) => u.id === a.usuario_id);
                        const condLabel = condominios.find((c) => c.id === a.condominio_id);
                        return (
                          <TableRow key={a.id}>
                            <TableCell>{userLabel?.nome_exibicao || userLabel?.email || '—'}</TableCell>
                            <TableCell>{condLabel?.nome || '—'}</TableCell>
                            <TableCell>
                              {editAssocId === a.id ? (
                                <div className="flex flex-wrap gap-3 border rounded p-3">
                                  {pageKeys.map((k) => (
                                    <label key={k} className="flex items-center gap-2 text-sm">
                                      <Checkbox
                                        checked={editPaginas.includes(k)}
                                        onCheckedChange={() => toggleEditPagina(k)}
                                      />
                                      <span className="capitalize">{k}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(a.paginas_liberadas || []).map((p) => (
                                    <Badge key={p} variant="secondary">{p}</Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {editAssocId === a.id ? (
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEditAssociacao}>Salvar</Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditAssociacao}>Cancelar</Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => startEditAssociacao(a)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleDeleteAssociacao(a.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mensagens de feedback */}
        {message && (
          <Alert className="mt-6">
            <AlertDescription className="text-green-600">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}