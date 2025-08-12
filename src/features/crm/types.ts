
export type CRMStatus = 'novo' | 'em_andamento' | 'aguardando' | 'resolvido';

export interface CRMChamado {
  id: string;
  condominio_id: string;
  tipo: string;
  urgencia: string;
  telefone_contato: string | null;
  status: CRMStatus;
  descricao: string;
  data_criacao: string;
  updated_at: string;
  morador_id: string | null;
  tags: string[];
}

export interface CRMAtividade {
  id: string;
  chamado_id: string;
  tipo: string; // 'comentario' | 'status_change' | 'tag_change' etc.
  conteudo: string | null;
  metadata: Record<string, any>;
  autor_usuario_id: string | null;
  created_at: string;
  updated_at: string;
}
