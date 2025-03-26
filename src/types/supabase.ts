export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string
          role: string
          balance: number
          name: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: string
          balance?: number
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          balance?: number
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          stripe_transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          amount: number
          stripe_transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          amount?: number
          stripe_transaction_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      free_trial_usage: {
        Row: {
          id: string
          client_ip: string
          user_agent: string | null
          used_at: string
        }
        Insert: {
          id?: string
          client_ip: string
          user_agent?: string | null
          used_at?: string
        }
        Update: {
          id?: string
          client_ip?: string
          user_agent?: string | null
          used_at?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          id: number
          process_id: string
          job_id: string
          user_id: string | null
          status: string
          error: string | null
          created_at: string
          updated_at: string
          acapella_path: string | null
          instrumental_path: string | null
        }
        Insert: {
          id?: number
          process_id: string
          job_id: string
          user_id?: string | null
          status: string
          error?: string | null
          created_at?: string
          updated_at?: string
          acapella_path?: string | null
          instrumental_path?: string | null
        }
        Update: {
          id?: number
          process_id?: string
          job_id?: string
          user_id?: string | null
          status?: string
          error?: string | null
          created_at?: string
          updated_at?: string
          acapella_path?: string | null
          instrumental_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_credit_transaction: {
        Args: {
          p_user_id: string
          p_type: string
          p_amount: number
          p_stripe_transaction_id?: string
        }
        Returns: string
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for Supabase tables
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type FreeTrialUsage = Database['public']['Tables']['free_trial_usage']['Row']
export type ProcessingJob = Database['public']['Tables']['processing_jobs']['Row']

// Helper types for transaction types
export type TransactionType = 'purchase' | 'use' 