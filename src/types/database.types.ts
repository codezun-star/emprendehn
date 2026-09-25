// Tipos del esquema de base de datos (supabase/migrations).
// Generado con `supabase gen types typescript` sobre una base local con las
// migraciones aplicadas. Para regenerarlo desde tu proyecto:
//   npx supabase gen types typescript --project-id <PROJECT_ID> --schema public > src/types/database.types.ts
// (Luego vuelve a marcar como `| null` las columnas opcionales de los RPC, ver abajo.)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_auditoria: {
        Row: {
          accion: "crear" | "editar" | "eliminar"
          actor_email: string | null
          actor_id: string | null
          cambios: Json
          created_at: string
          id: number
          registro: string | null
          registro_id: string | null
          tabla: string
        }
        // Solo la escriben triggers de la base (nadie tiene permiso de insertar/editar).
        Insert: never
        Update: never
        Relationships: []
      }
      business_reviews: {
        Row: {
          autor_nombre: string
          business_id: string
          calificacion: number
          comentario: string | null
          created_at: string
          estado: string
          id: string
          reportada: boolean
          respondida_en: string | null
          respuesta: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autor_nombre?: string
          business_id: string
          calificacion: number
          comentario?: string | null
          created_at?: string
          estado?: string
          id?: string
          reportada?: boolean
          respondida_en?: string | null
          respuesta?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          autor_nombre?: string
          business_id?: string
          calificacion?: number
          comentario?: string | null
          created_at?: string
          estado?: string
          id?: string
          reportada?: boolean
          respondida_en?: string | null
          respuesta?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_slug_redirects: {
        Row: { business_id: string; created_at: string; slug: string }
        Insert: { business_id: string; created_at?: string; slug: string }
        Update: { business_id?: string; created_at?: string; slug?: string }
        Relationships: [
          {
            foreignKeyName: "business_slug_redirects_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_stats_daily: {
        Row: {
          business_id: string
          dia: string
          llamadas: number
          mapa: number
          redes: number
          visitas: number
          whatsapp: number
        }
        Insert: {
          business_id: string
          dia: string
          llamadas?: number
          mapa?: number
          redes?: number
          visitas?: number
          whatsapp?: number
        }
        Update: {
          business_id?: string
          dia?: string
          llamadas?: number
          mapa?: number
          redes?: number
          visitas?: number
          whatsapp?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_stats_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reports: {
        Row: {
          business_id: string
          contacto: string | null
          created_at: string
          detalle: string | null
          estado: string
          id: string
          motivo: string
          resuelto_en: string | null
        }
        Insert: {
          business_id: string
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          motivo: string
          resuelto_en?: string | null
        }
        Update: {
          business_id?: string
          contacto?: string | null
          created_at?: string
          detalle?: string | null
          estado?: string
          id?: string
          motivo?: string
          resuelto_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_images: {
        Row: {
          alt_text: string | null
          alto: number | null
          ancho: number | null
          business_id: string
          created_at: string
          id: string
          orden: number
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          alto?: number | null
          ancho?: number | null
          business_id: string
          created_at?: string
          id?: string
          orden?: number
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          alto?: number | null
          ancho?: number | null
          business_id?: string
          created_at?: string
          id?: string
          orden?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          aprobado_en: string | null
          calificacion_promedio: number | null
          cambios_por_revisar: string[]
          cambios_por_revisar_desde: string | null
          category_id: string
          created_at: string
          descripcion: string
          direccion: string | null
          documento_busqueda: unknown | null
          email_contacto: string | null
          enlace_mapa: string | null
          estado: Database["public"]["Enums"]["business_status"]
          horario: Json | null
          id: string
          latitud: number | null
          localidad: string | null
          logo_path: string | null
          longitud: number | null
          motivo_estado: string | null
          municipio_id: number
          nombre: string
          owner_id: string
          plan: string
          redes_sociales: Json
          search_vector: unknown
          slug: string
          telefono: string | null
          total_resenas: number
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          aprobado_en?: string | null
          calificacion_promedio?: number | null
          cambios_por_revisar?: string[]
          cambios_por_revisar_desde?: string | null
          category_id: string
          created_at?: string
          descripcion: string
          direccion?: string | null
          documento_busqueda?: unknown | null
          email_contacto?: string | null
          enlace_mapa?: string | null
          estado?: Database["public"]["Enums"]["business_status"]
          horario?: Json | null
          id?: string
          latitud?: number | null
          localidad?: string | null
          logo_path?: string | null
          longitud?: number | null
          motivo_estado?: string | null
          municipio_id: number
          nombre: string
          owner_id: string
          plan?: string
          redes_sociales?: Json
          search_vector?: unknown
          slug: string
          telefono?: string | null
          total_resenas?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          aprobado_en?: string | null
          calificacion_promedio?: number | null
          cambios_por_revisar?: string[]
          cambios_por_revisar_desde?: string | null
          category_id?: string
          created_at?: string
          descripcion?: string
          direccion?: string | null
          documento_busqueda?: unknown | null
          email_contacto?: string | null
          enlace_mapa?: string | null
          estado?: Database["public"]["Enums"]["business_status"]
          horario?: Json | null
          id?: string
          latitud?: number | null
          localidad?: string | null
          logo_path?: string | null
          longitud?: number | null
          motivo_estado?: string | null
          municipio_id?: number
          nombre?: string
          owner_id?: string
          plan?: string
          redes_sociales?: Json
          search_vector?: unknown
          slug?: string
          telefono?: string | null
          total_resenas?: number
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      categories: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          destacada: boolean
          icono: string | null
          id: string
          nombre: string
          orden: number
          parent_id: string | null
          schema_type: string
          slug: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          destacada?: boolean
          icono?: string | null
          id?: string
          nombre: string
          orden?: number
          parent_id?: string | null
          schema_type?: string
          slug: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          destacada?: boolean
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number
          parent_id?: string | null
          schema_type?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          id: number
          nombre: string
          slug: string
        }
        Insert: {
          id: number
          nombre: string
          slug: string
        }
        Update: {
          id?: number
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      municipios: {
        Row: {
          departamento_id: number
          destacado: boolean
          id: number
          nombre: string
          slug: string
        }
        Insert: {
          departamento_id: number
          destacado?: boolean
          id?: number
          nombre: string
          slug: string
        }
        Update: {
          departamento_id?: number
          destacado?: boolean
          id?: number
          nombre?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipios_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          activo: boolean
          code: string
          created_at: string
          descripcion: string | null
          max_imagenes: number
          nombre: string
          precio_mensual_lps: number | null
          prioridad: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          code: string
          created_at?: string
          descripcion?: string | null
          max_imagenes?: number
          nombre: string
          precio_mensual_lps?: number | null
          prioridad?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          code?: string
          created_at?: string
          descripcion?: string | null
          max_imagenes?: number
          nombre?: string
          precio_mensual_lps?: number | null
          prioridad?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre_completo: string | null
          rol: Database["public"]["Enums"]["user_role"]
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nombre_completo?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre_completo?: string | null
          rol?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_negocios: {
        Args: {
          p_categoria?: string
          p_ciudad?: string
          p_desplazamiento?: number
          p_limite?: number
          p_abierto?: boolean
          p_orden?: string
          p_texto?: string
        }
        Returns: {
          calificacion_promedio: number | null
          categoria_nombre: string
          categoria_slug: string
          departamento_nombre: string
          descripcion: string
          id: string
          localidad: string | null
          logo_path: string | null
          municipio_nombre: string
          municipio_slug: string
          nombre: string
          plan: string
          portada_path: string | null
          slug: string
          total: number
          total_resenas: number
        }[]
      }
      construir_tsquery: { Args: { p_texto: string }; Returns: unknown }
      eliminar_mi_cuenta: { Args: never; Returns: undefined }
      esta_abierto: { Args: { p_horario: Json; p_momento?: string }; Returns: boolean }
      es_contexto_privilegiado: { Args: never; Returns: boolean }
      es_dueno_negocio: { Args: { p_business_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      puedo_eliminar_mi_cuenta: { Args: never; Returns: boolean }
      redes_sociales_validas: { Args: { p_redes: Json }; Returns: boolean }
      tiene_rol_admin: { Args: never; Returns: boolean }
      registrar_evento: { Args: { p_business_id: string; p_evento: string }; Returns: undefined }
      reportar_negocio: {
        Args: { p_business_id: string; p_motivo: string; p_detalle?: string; p_contacto?: string }
        Returns: boolean
      }
      puede_gestionar_archivo_negocio: {
        Args: { p_ruta: string }
        Returns: boolean
      }
      resumen_directorio: {
        Args: { p_categoria?: string }
        Returns: {
          actualizado: string
          categoria_slug: string
          municipio_nombre: string
          municipio_slug: string
          total: number
        }[]
      }
      documento_negocio: {
        Args: { p_categoria: string; p_descripcion: string; p_localidad: string; p_municipio: number; p_nombre: string }
        Returns: unknown
      }
      slug_actual: { Args: { p_slug: string }; Returns: string }
      slug_negocio_libre: { Args: { p_base: string; p_negocio: string }; Returns: string }
      slugify: { Args: { texto: string }; Returns: string }
    }
    Enums: {
      business_status: "pendiente" | "aprobado" | "rechazado" | "suspendido"
      user_role: "business_owner" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      business_status: ["pendiente", "aprobado", "rechazado", "suspendido"],
      user_role: ["business_owner", "admin"],
    },
  },
} as const

