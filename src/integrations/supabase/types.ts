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
      followup_requests: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          intake_id: string
          message: string | null
          questions: Json
          requested_by: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          intake_id: string
          message?: string | null
          questions?: Json
          requested_by: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          intake_id?: string
          message?: string | null
          questions?: Json
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_requests_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      guideline_versions: {
        Row: {
          change_reason: string
          change_source: string
          changed_at: string
          changed_by: string
          changed_fields: string[] | null
          compliance_framework: string | null
          content_markdown: string
          description: string | null
          guideline_id: string
          id: string
          intake_id: string | null
          name: string
          previous_values: Json | null
          review_frequency_days: number | null
          risk_categories: string[] | null
          severity: string | null
          type: string
          version_number: number
        }
        Insert: {
          change_reason: string
          change_source?: string
          changed_at?: string
          changed_by: string
          changed_fields?: string[] | null
          compliance_framework?: string | null
          content_markdown: string
          description?: string | null
          guideline_id: string
          id?: string
          intake_id?: string | null
          name: string
          previous_values?: Json | null
          review_frequency_days?: number | null
          risk_categories?: string[] | null
          severity?: string | null
          type: string
          version_number?: number
        }
        Update: {
          change_reason?: string
          change_source?: string
          changed_at?: string
          changed_by?: string
          changed_fields?: string[] | null
          compliance_framework?: string | null
          content_markdown?: string
          description?: string | null
          guideline_id?: string
          id?: string
          intake_id?: string | null
          name?: string
          previous_values?: Json | null
          review_frequency_days?: number | null
          risk_categories?: string[] | null
          severity?: string | null
          type?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "guideline_versions_guideline_id_fkey"
            columns: ["guideline_id"]
            isOneToOne: false
            referencedRelation: "guidelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guideline_versions_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      guidelines: {
        Row: {
          applicability_conditions: Json | null
          compliance_framework: string | null
          content_markdown: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_reviewed_at: string | null
          linked_initiative_ids: string[] | null
          name: string
          review_frequency_days: number | null
          reviewed_by: string | null
          risk_categories: string[] | null
          severity: string | null
          type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          applicability_conditions?: Json | null
          compliance_framework?: string | null
          content_markdown: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_reviewed_at?: string | null
          linked_initiative_ids?: string[] | null
          name: string
          review_frequency_days?: number | null
          reviewed_by?: string | null
          risk_categories?: string[] | null
          severity?: string | null
          type: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          applicability_conditions?: Json | null
          compliance_framework?: string | null
          content_markdown?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_reviewed_at?: string | null
          linked_initiative_ids?: string[] | null
          name?: string
          review_frequency_days?: number | null
          reviewed_by?: string | null
          risk_categories?: string[] | null
          severity?: string | null
          type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guidelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_scores: {
        Row: {
          business_value: number
          created_at: string
          effort_estimate: number
          id: string
          intake_id: string
          notes: string | null
          risk_reduction: number
          scored_by: string
          strategic_fit: number
          time_criticality: number
          updated_at: string
          wsjf_score: number | null
        }
        Insert: {
          business_value?: number
          created_at?: string
          effort_estimate?: number
          id?: string
          intake_id: string
          notes?: string | null
          risk_reduction?: number
          scored_by: string
          strategic_fit?: number
          time_criticality?: number
          updated_at?: string
          wsjf_score?: number | null
        }
        Update: {
          business_value?: number
          created_at?: string
          effort_estimate?: number
          id?: string
          intake_id?: string
          notes?: string | null
          risk_reduction?: number
          scored_by?: string
          strategic_fit?: number
          time_criticality?: number
          updated_at?: string
          wsjf_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "impact_scores_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: true
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      initiative_intake_links: {
        Row: {
          callback_url: string | null
          created_at: string
          enrichment_sent_at: string | null
          id: string
          initiative_data: Json | null
          initiative_id: string
          initiative_title: string
          intake_id: string | null
          last_synced_at: string | null
          source_app: string
          sync_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          callback_url?: string | null
          created_at?: string
          enrichment_sent_at?: string | null
          id?: string
          initiative_data?: Json | null
          initiative_id: string
          initiative_title: string
          intake_id?: string | null
          last_synced_at?: string | null
          source_app?: string
          sync_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          callback_url?: string | null
          created_at?: string
          enrichment_sent_at?: string | null
          id?: string
          initiative_data?: Json | null
          initiative_id?: string
          initiative_title?: string
          intake_id?: string | null
          last_synced_at?: string | null
          source_app?: string
          sync_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiative_intake_links_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      innovation_feedback: {
        Row: {
          author_name: string | null
          comment: string
          created_at: string
          feedback_type: string
          id: string
          innovation_id: string
          source_app: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          comment: string
          created_at?: string
          feedback_type?: string
          id?: string
          innovation_id: string
          source_app?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          comment?: string
          created_at?: string
          feedback_type?: string
          id?: string
          innovation_id?: string
          source_app?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "innovation_feedback_innovation_id_fkey"
            columns: ["innovation_id"]
            isOneToOne: false
            referencedRelation: "synced_innovations"
            referencedColumns: ["id"]
          },
        ]
      }
      innovation_feedback_reads: {
        Row: {
          id: string
          innovation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          innovation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          innovation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "innovation_feedback_reads_innovation_id_fkey"
            columns: ["innovation_id"]
            isOneToOne: false
            referencedRelation: "synced_innovations"
            referencedColumns: ["id"]
          },
        ]
      }
      innovation_work_items: {
        Row: {
          acceptance_criteria: string[] | null
          assignee: string | null
          created_at: string
          definition_of_done: string | null
          description: string | null
          external_id: string
          functional_requirements: string[] | null
          id: string
          innovation_id: string
          item_type: Database["public"]["Enums"]["work_item_type"]
          jira_exported_at: string | null
          jira_issue_key: string | null
          jira_issue_url: string | null
          jira_status: string | null
          non_functional_requirements: string[] | null
          parent_id: string | null
          priority: string | null
          source_app: string
          status: string
          story_points: number | null
          synced_at: string
          title: string
          updated_at: string
        }
        Insert: {
          acceptance_criteria?: string[] | null
          assignee?: string | null
          created_at?: string
          definition_of_done?: string | null
          description?: string | null
          external_id: string
          functional_requirements?: string[] | null
          id?: string
          innovation_id: string
          item_type: Database["public"]["Enums"]["work_item_type"]
          jira_exported_at?: string | null
          jira_issue_key?: string | null
          jira_issue_url?: string | null
          jira_status?: string | null
          non_functional_requirements?: string[] | null
          parent_id?: string | null
          priority?: string | null
          source_app?: string
          status?: string
          story_points?: number | null
          synced_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          acceptance_criteria?: string[] | null
          assignee?: string | null
          created_at?: string
          definition_of_done?: string | null
          description?: string | null
          external_id?: string
          functional_requirements?: string[] | null
          id?: string
          innovation_id?: string
          item_type?: Database["public"]["Enums"]["work_item_type"]
          jira_exported_at?: string | null
          jira_issue_key?: string | null
          jira_issue_url?: string | null
          jira_status?: string | null
          non_functional_requirements?: string[] | null
          parent_id?: string | null
          priority?: string | null
          source_app?: string
          status?: string
          story_points?: number | null
          synced_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "innovation_work_items_innovation_id_fkey"
            columns: ["innovation_id"]
            isOneToOne: false
            referencedRelation: "synced_innovations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innovation_work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "innovation_work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      intakes: {
        Row: {
          category: string | null
          created_at: string
          id: string
          jpd_issue_key: string | null
          priority: string | null
          requester_id: string
          status: Database["public"]["Enums"]["intake_status"]
          title: string
          updated_at: string
          value_stream: string | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          jpd_issue_key?: string | null
          priority?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["intake_status"]
          title: string
          updated_at?: string
          value_stream?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          jpd_issue_key?: string | null
          priority?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["intake_status"]
          title?: string
          updated_at?: string
          value_stream?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intakes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_rules: {
        Row: {
          content_markdown: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          content_markdown: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rule_type?: string
          updated_at?: string
        }
        Update: {
          content_markdown?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      interview_topics: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_required: boolean
          name: string
          sample_questions: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_required?: boolean
          name: string
          sample_questions?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_required?: boolean
          name?: string
          sample_questions?: string[] | null
          updated_at?: string
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
          first_name: string | null
          id: string
          last_name: string | null
          preferred_language: string | null
          preferred_theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferred_language?: string | null
          preferred_theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferred_language?: string | null
          preferred_theme?: string | null
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
      spec_amendments: {
        Row: {
          amended_by: string
          amendment_type: string
          created_at: string
          field_name: string | null
          id: string
          intake_id: string
          new_value: string | null
          original_value: string | null
          reason: string
          spec_id: string
        }
        Insert: {
          amended_by: string
          amendment_type: string
          created_at?: string
          field_name?: string | null
          id?: string
          intake_id: string
          new_value?: string | null
          original_value?: string | null
          reason: string
          spec_id: string
        }
        Update: {
          amended_by?: string
          amendment_type?: string
          created_at?: string
          field_name?: string | null
          id?: string
          intake_id?: string
          new_value?: string | null
          original_value?: string | null
          reason?: string
          spec_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_amendments_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_amendments_spec_id_fkey"
            columns: ["spec_id"]
            isOneToOne: false
            referencedRelation: "spec_documents"
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
      synced_innovations: {
        Row: {
          created_at: string
          description: string | null
          effort_estimate: string | null
          expected_outcome: string | null
          external_id: string
          hypothesis: string | null
          id: string
          impact_data: Json | null
          learnings: string | null
          product_name: string | null
          responsible: string | null
          risk_data: Json | null
          source_app: string
          stage: string
          status: string | null
          synced_at: string
          target_date: string | null
          title: string
          trend_data: Json | null
          updated_at: string
          value_proposition: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          effort_estimate?: string | null
          expected_outcome?: string | null
          external_id: string
          hypothesis?: string | null
          id?: string
          impact_data?: Json | null
          learnings?: string | null
          product_name?: string | null
          responsible?: string | null
          risk_data?: Json | null
          source_app?: string
          stage?: string
          status?: string | null
          synced_at?: string
          target_date?: string | null
          title: string
          trend_data?: Json | null
          updated_at?: string
          value_proposition?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          effort_estimate?: string | null
          expected_outcome?: string | null
          external_id?: string
          hypothesis?: string | null
          id?: string
          impact_data?: Json | null
          learnings?: string | null
          product_name?: string | null
          responsible?: string | null
          risk_data?: Json | null
          source_app?: string
          stage?: string
          status?: string | null
          synced_at?: string
          target_date?: string | null
          title?: string
          trend_data?: Json | null
          updated_at?: string
          value_proposition?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "synced_innovations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          external_source: string | null
          external_workspace_id: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          external_source?: string | null
          external_workspace_id?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          external_source?: string | null
          external_workspace_id?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace_with_owner: {
        Args: { _description?: string; _name: string }
        Returns: string
      }
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
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
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
      work_item_type: "epic" | "feature" | "story"
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
      work_item_type: ["epic", "feature", "story"],
    },
  },
} as const
