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
      approvals: {
        Row: {
          architect_id: string
          comments: string | null
          decided_at: string
          decision: string
          guardrails_json: Json | null
          id: string
          intake_id: string
        }
        Insert: {
          architect_id: string
          comments?: string | null
          decided_at?: string
          decision: string
          guardrails_json?: Json | null
          id?: string
          intake_id: string
        }
        Update: {
          architect_id?: string
          comments?: string | null
          decided_at?: string
          decision?: string
          guardrails_json?: Json | null
          id?: string
          intake_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata_json: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata_json?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata_json?: Json | null
        }
        Relationships: []
      }
      intakes: {
        Row: {
          category: string | null
          created_at: string
          id: string
          priority: string | null
          requester_id: string
          status: Database["public"]["Enums"]["intake_status"]
          title: string
          updated_at: string
          value_stream: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["intake_status"]
          title: string
          updated_at?: string
          value_stream?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["intake_status"]
          title?: string
          updated_at?: string
          value_stream?: string | null
        }
        Relationships: []
      }
      jira_exports: {
        Row: {
          created_at: string
          epic_key: string | null
          id: string
          intake_id: string
          jpd_issue_key: string | null
          jsm_request_key: string | null
          logs: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          epic_key?: string | null
          id?: string
          intake_id: string
          jpd_issue_key?: string | null
          jsm_request_key?: string | null
          logs?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          epic_key?: string | null
          id?: string
          intake_id?: string
          jpd_issue_key?: string | null
          jsm_request_key?: string | null
          logs?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_exports_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routing_scores: {
        Row: {
          created_at: string
          explanation_markdown: string | null
          id: string
          intake_id: string
          path: Database["public"]["Enums"]["delivery_path"]
          score: number
          score_json: Json
        }
        Insert: {
          created_at?: string
          explanation_markdown?: string | null
          id?: string
          intake_id: string
          path: Database["public"]["Enums"]["delivery_path"]
          score: number
          score_json: Json
        }
        Update: {
          created_at?: string
          explanation_markdown?: string | null
          id?: string
          intake_id?: string
          path?: Database["public"]["Enums"]["delivery_path"]
          score?: number
          score_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "routing_scores_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_documents: {
        Row: {
          created_at: string
          created_by: string
          id: string
          intake_id: string
          markdown: string | null
          structured_json: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          intake_id: string
          markdown?: string | null
          structured_json: Json
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          intake_id?: string
          markdown?: string | null
          structured_json?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "spec_documents_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          id: string
          intake_id: string
          message: string
          question_key: string | null
          raw_payload: Json | null
          speaker: string
          timestamp: string
        }
        Insert: {
          id?: string
          intake_id: string
          message: string
          question_key?: string | null
          raw_payload?: Json | null
          speaker: string
          timestamp?: string
        }
        Update: {
          id?: string
          intake_id?: string
          message?: string
          question_key?: string | null
          raw_payload?: Json | null
          speaker?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      data_classification: "public" | "internal" | "confidential" | "restricted"
      delivery_path:
        | "BUY"
        | "CONFIG"
        | "AI_DISPOSABLE"
        | "PRODUCT_GRADE"
        | "CRITICAL"
      intake_status:
        | "draft"
        | "gathering_info"
        | "spec_generated"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "exported"
        | "closed"
      user_role: "requester" | "architect" | "engineer_lead" | "admin"
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
      data_classification: ["public", "internal", "confidential", "restricted"],
      delivery_path: [
        "BUY",
        "CONFIG",
        "AI_DISPOSABLE",
        "PRODUCT_GRADE",
        "CRITICAL",
      ],
      intake_status: [
        "draft",
        "gathering_info",
        "spec_generated",
        "pending_approval",
        "approved",
        "rejected",
        "exported",
        "closed",
      ],
      user_role: ["requester", "architect", "engineer_lead", "admin"],
    },
  },
} as const
