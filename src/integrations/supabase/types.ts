export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      chamados_crm: {
        Row: {
          condominio_id: string
          data_criacao: string
          descricao: string
          id: string
          morador_id: string | null
          status: string
          telefone_contato: string | null
          tipo: string
          updated_at: string
          urgencia: string
        }
        Insert: {
          condominio_id: string
          data_criacao?: string
          descricao: string
          id?: string
          morador_id?: string | null
          status?: string
          telefone_contato?: string | null
          tipo?: string
          updated_at?: string
          urgencia?: string
        }
        Update: {
          condominio_id?: string
          data_criacao?: string
          descricao?: string
          id?: string
          morador_id?: string | null
          status?: string
          telefone_contato?: string | null
          tipo?: string
          updated_at?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_crm_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_crm_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
            referencedColumns: ["id"]
          },
        ]
      }
      condominios: {
        Row: {
          cnpj: string | null
          created_at: string
          endereco: string
          id: string
          nome: string
          sindico_responsavel: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          endereco: string
          id?: string
          nome: string
          sindico_responsavel?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          endereco?: string
          id?: string
          nome?: string
          sindico_responsavel?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominios_sindico_responsavel_fkey"
            columns: ["sindico_responsavel"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      espacos: {
        Row: {
          capacidade: number
          condominio_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          status: string | null
          updated_at: string
          valor_diaria: number | null
        }
        Insert: {
          capacidade?: number
          condominio_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          status?: string | null
          updated_at?: string
          valor_diaria?: number | null
        }
        Update: {
          capacidade?: number
          condominio_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string
          valor_diaria?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "espacos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      moradores: {
        Row: {
          bloco: string | null
          condominio_id: string
          created_at: string
          id: string
          nome: string
          permissoes: Json | null
          status: string | null
          telefone: string
          unidade: string
          updated_at: string
        }
        Insert: {
          bloco?: string | null
          condominio_id: string
          created_at?: string
          id?: string
          nome: string
          permissoes?: Json | null
          status?: string | null
          telefone: string
          unidade: string
          updated_at?: string
        }
        Update: {
          bloco?: string | null
          condominio_id?: string
          created_at?: string
          id?: string
          nome?: string
          permissoes?: Json | null
          status?: string | null
          telefone?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moradores_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          created_at: string
          data_reserva: string
          espaco_id: string
          id: string
          morador_id: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_reserva: string
          espaco_id: string
          id?: string
          morador_id: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_reserva?: string
          espaco_id?: string
          id?: string
          morador_id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "espacos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "moradores"
            referencedColumns: ["id"]
          },
        ]
      }
      tentativas_login: {
        Row: {
          email: string
          quantidade: number
          ultimo_reset: string
          updated_at: string
        }
        Insert: {
          email: string
          quantidade?: number
          ultimo_reset?: string
          updated_at?: string
        }
        Update: {
          email?: string
          quantidade?: number
          ultimo_reset?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          condominios_vinculados: string | null
          created_at: string
          email: string
          id: string
          nome_exibicao: string | null
          telefone: string | null
          tipo_acesso: Database["public"]["Enums"]["tipo_acesso"]
          updated_at: string
        }
        Insert: {
          condominios_vinculados?: string | null
          created_at?: string
          email: string
          id?: string
          nome_exibicao?: string | null
          telefone?: string | null
          tipo_acesso: Database["public"]["Enums"]["tipo_acesso"]
          updated_at?: string
        }
        Update: {
          condominios_vinculados?: string | null
          created_at?: string
          email?: string
          id?: string
          nome_exibicao?: string | null
          telefone?: string | null
          tipo_acesso?: Database["public"]["Enums"]["tipo_acesso"]
          updated_at?: string
        }
        Relationships: []
      }
      usuarios_condominio: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          paginas_liberadas: string[] | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          paginas_liberadas?: string[] | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          paginas_liberadas?: string[] | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_condominio_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_condominio_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_integrations: {
        Row: {
          condominio_id: string
          created_at: string
          display_name: string | null
          id: string
          phone_number_id: string | null
          provider: string
          status: string
          updated_at: string
          zapi_instance_id: string | null
        }
        Insert: {
          condominio_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          zapi_instance_id?: string | null
        }
        Update: {
          condominio_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          zapi_instance_id?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          condominio_id: string
          created_at: string
          direction: string
          id: string
          morador_id: string
          provider_message_id: string | null
          raw: Json | null
          status: string | null
          timestamp: string
          type: string
        }
        Insert: {
          body?: string | null
          condominio_id: string
          created_at?: string
          direction: string
          id?: string
          morador_id: string
          provider_message_id?: string | null
          raw?: Json | null
          status?: string | null
          timestamp?: string
          type?: string
        }
        Update: {
          body?: string | null
          condominio_id?: string
          created_at?: string
          direction?: string
          id?: string
          morador_id?: string
          provider_message_id?: string | null
          raw?: Json | null
          status?: string | null
          timestamp?: string
          type?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          condominio_id: string
          context: Json
          created_at: string
          id: string
          last_message_at: string
          morador_id: string
          state: string
          updated_at: string
        }
        Insert: {
          condominio_id: string
          context?: Json
          created_at?: string
          id?: string
          last_message_at?: string
          morador_id: string
          state?: string
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          context?: Json
          created_at?: string
          id?: string
          last_message_at?: string
          morador_id?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_tipo_acesso: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_sindico_of_condo: {
        Args: { _condo_id: string }
        Returns: boolean
      }
      normalize_br_phone: {
        Args: { v: string }
        Returns: string
      }
      normalize_br_phone_local11: {
        Args: { v: string }
        Returns: string
      }
      sync_usuarios_condominios_vinculados: {
        Args: { _usuario_id: string }
        Returns: undefined
      }
    }
    Enums: {
      tipo_acesso: "sindico" | "zelador" | "portaria" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tipo_acesso: ["sindico", "zelador", "portaria", "admin"],
    },
  },
} as const
