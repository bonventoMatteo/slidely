// Tipos no formato de `supabase gen types typescript`, espelhando supabase/migrations.
// Regenere após alterar o schema:
//   supabase gen types typescript --linked > lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3";
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          admin_email: string;
          admin_id: string | null;
          created_at: string;
          details: Json;
          id: number;
          target_email: string | null;
          target_user_id: string | null;
        };
        Insert: {
          action: string;
          admin_email: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_email?: string | null;
          target_user_id?: string | null;
        };
        Update: {
          action?: string;
          admin_email?: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: never;
          target_email?: string | null;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      brand_kits: {
        Row: {
          colors: Json;
          created_at: string;
          fonts: Json;
          handle: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          user_id: string;
        };
        Insert: {
          colors?: Json;
          created_at?: string;
          fonts?: Json;
          handle?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          user_id: string;
        };
        Update: {
          colors?: Json;
          created_at?: string;
          fonts?: Json;
          handle?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brand_kits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      carousels: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          project_id: string;
          prompt: string;
          slide_count: number;
          source_url: string | null;
          status: "draft" | "generating" | "ready" | "error";
          template_id: string | null;
          theme: Json;
          title: string | null;
          tone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          project_id: string;
          prompt: string;
          slide_count?: number;
          source_url?: string | null;
          status?: "draft" | "generating" | "ready" | "error";
          template_id?: string | null;
          theme?: Json;
          title?: string | null;
          tone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          project_id?: string;
          prompt?: string;
          slide_count?: number;
          source_url?: string | null;
          status?: "draft" | "generating" | "ready" | "error";
          template_id?: string | null;
          theme?: Json;
          title?: string | null;
          tone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carousels_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carousels_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "carousels_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      generations_log: {
        Row: {
          carousel_id: string | null;
          cost_usd: number | null;
          created_at: string;
          id: string;
          kind: "carousel" | "slide";
          model: string;
          tokens_input: number | null;
          tokens_output: number | null;
          user_id: string;
        };
        Insert: {
          carousel_id?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          id?: string;
          kind?: "carousel" | "slide";
          model: string;
          tokens_input?: number | null;
          tokens_output?: number | null;
          user_id: string;
        };
        Update: {
          carousel_id?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          id?: string;
          kind?: "carousel" | "slide";
          model?: string;
          tokens_input?: number | null;
          tokens_output?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_log_carousel_id_fkey";
            columns: ["carousel_id"];
            isOneToOne: false;
            referencedRelation: "carousels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          monthly_generations: number;
          monthly_reset_at: string;
          plan: "free" | "pro" | "business";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          monthly_generations?: number;
          monthly_reset_at?: string;
          plan?: "free" | "pro" | "business";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          monthly_generations?: number;
          monthly_reset_at?: string;
          plan?: "free" | "pro" | "business";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          brand_kit_id: string | null;
          created_at: string;
          id: string;
          niche: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          brand_kit_id?: string | null;
          created_at?: string;
          id?: string;
          niche?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          brand_kit_id?: string | null;
          created_at?: string;
          id?: string;
          niche?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_brand_kit_id_fkey";
            columns: ["brand_kit_id"];
            isOneToOne: false;
            referencedRelation: "brand_kits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_hits: {
        Row: {
          bucket: string;
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          bucket: string;
          created_at?: string;
          id?: never;
          user_id: string;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          id?: never;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rate_limit_hits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      slides: {
        Row: {
          carousel_id: string;
          content: Json;
          id: string;
          image_url: string | null;
          layout: string;
          position: number;
        };
        Insert: {
          carousel_id: string;
          content: Json;
          id?: string;
          image_url?: string | null;
          layout?: string;
          position: number;
        };
        Update: {
          carousel_id?: string;
          content?: Json;
          id?: string;
          image_url?: string | null;
          layout?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "slides_carousel_id_fkey";
            columns: ["carousel_id"];
            isOneToOne: false;
            referencedRelation: "carousels";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          category: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_public: boolean;
          layout_json: Json;
          name: string;
          preview_url: string | null;
          required_plan: "free" | "pro" | "business";
          sort_order: number;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          layout_json: Json;
          name: string;
          preview_url?: string | null;
          required_plan?: "free" | "pro" | "business";
          sort_order?: number;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          layout_json?: Json;
          name?: string;
          preview_url?: string | null;
          required_plan?: "free" | "pro" | "business";
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_daily_usage: {
        Args: { p_days?: number; p_user_id?: string | null };
        Returns: { cost: number; day: string; generations: number }[];
      };
      admin_list_users: {
        Args: { p_limit?: number; p_offset?: number; p_plan?: string | null; p_search?: string | null; p_sort?: string };
        Returns: {
          banned_until: string | null;
          carousels: number;
          cost_30d: number;
          cost_total: number;
          created_at: string;
          email: string;
          full_name: string | null;
          generations_30d: number;
          id: string;
          last_generation_at: string | null;
          last_sign_in_at: string | null;
          monthly_generations: number;
          monthly_reset_at: string;
          plan: string;
          subscription_status: string | null;
          total_count: number;
        }[];
      };
      admin_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          active_users_30d: number;
          active_users_7d: number;
          carousels_total: number;
          cost_30d: number;
          generations_30d: number;
          new_users_30d: number;
          new_users_7d: number;
          plan_business: number;
          plan_free: number;
          plan_pro: number;
          total_users: number;
        }[];
      };
      consume_generation_quota: {
        Args: { p_limit: number; p_user_id: string };
        Returns: {
          allowed: boolean;
          reset_at: string;
          used: number;
        }[];
      };
      consume_rate_limit: {
        Args: {
          p_bucket: string;
          p_limit: number;
          p_user_id: string;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      refund_generation_quota: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      save_carousel_slides: {
        Args: { p_carousel_id: string; p_slides: Json };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
