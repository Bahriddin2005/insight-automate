export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aida_conversations: {
        Row: {
          created_at: string
          dataset_context: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dataset_context?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dataset_context?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aida_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aida_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "aida_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_connections: {
        Row: {
          auth_config: Json
          auth_type: string
          created_at: string
          custom_headers: Json
          endpoint_url: string
          id: string
          json_root_path: string | null
          last_fetched_at: string | null
          last_row_count: number | null
          last_schema: Json | null
          method: string
          name: string
          pagination_config: Json
          pagination_type: string | null
          request_body: Json | null
          schedule: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_config?: Json
          auth_type?: string
          created_at?: string
          custom_headers?: Json
          endpoint_url: string
          id?: string
          json_root_path?: string | null
          last_fetched_at?: string | null
          last_row_count?: number | null
          last_schema?: Json | null
          method?: string
          name: string
          pagination_config?: Json
          pagination_type?: string | null
          request_body?: Json | null
          schedule?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_config?: Json
          auth_type?: string
          created_at?: string
          custom_headers?: Json
          endpoint_url?: string
          id?: string
          json_root_path?: string | null
          last_fetched_at?: string | null
          last_row_count?: number | null
          last_schema?: Json | null
          method?: string
          name?: string
          pagination_config?: Json
          pagination_type?: string | null
          request_body?: Json | null
          schedule?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_ingestion_logs: {
        Row: {
          connection_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          row_count: number | null
          schema_snapshot: Json | null
          status: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          row_count?: number | null
          schema_snapshot?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          row_count?: number | null
          schema_snapshot?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_ingestion_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "api_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_annotations: {
        Row: {
          chart_key: string
          color: string | null
          created_at: string
          dashboard_id: string
          data_point_label: string
          data_point_value: number | null
          id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chart_key: string
          color?: string | null
          created_at?: string
          dashboard_id: string
          data_point_label: string
          data_point_value?: number | null
          id?: string
          note: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chart_key?: string
          color?: string | null
          created_at?: string
          dashboard_id?: string
          data_point_label?: string
          data_point_value?: number | null
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_configs: {
        Row: {
          analysis_data: Json | null
          chart_order: Json | null
          config: Json
          created_at: string
          file_name: string | null
          id: string
          is_public: boolean
          name: string
          share_token: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          chart_order?: Json | null
          config?: Json
          created_at?: string
          file_name?: string | null
          id?: string
          is_public?: boolean
          name: string
          share_token?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          chart_order?: Json | null
          config?: Json
          created_at?: string
          file_name?: string | null
          id?: string
          is_public?: boolean
          name?: string
          share_token?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tableau_refresh_logs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          resource_id: string
          resource_name: string | null
          resource_type: string
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          resource_id: string
          resource_name?: string | null
          resource_type?: string
          started_at?: string
          status?: string
          triggered_by: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          resource_id?: string
          resource_name?: string | null
          resource_type?: string
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: []
      }
      tableau_vizzes: {
        Row: {
          allowed_roles: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project: string | null
          tags: string[] | null
          updated_at: string
          viz_url: string
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project?: string | null
          tags?: string[] | null
          updated_at?: string
          viz_url: string
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project?: string | null
          tags?: string[] | null
          updated_at?: string
          viz_url?: string
        }
        Relationships: []
      }
      upload_sessions: {
        Row: {
          ai_summary: string | null
          column_count: number
          column_info: Json | null
          created_at: string
          duplicates_removed: number
          file_name: string
          id: string
          missing_percent: number
          quality_score: number
          row_count: number
          user_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          column_count?: number
          column_info?: Json | null
          created_at?: string
          duplicates_removed?: number
          file_name: string
          id?: string
          missing_percent?: number
          quality_score?: number
          row_count?: number
          user_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          column_count?: number
          column_info?: Json | null
          created_at?: string
          duplicates_removed?: number
          file_name?: string
          id?: string
          missing_percent?: number
          quality_score?: number
          row_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
