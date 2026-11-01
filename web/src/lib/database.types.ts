// Tipos de la base de datos. Escritos a mano con el mismo formato que genera
// `npx supabase gen types typescript --linked`; regenéralos con `npm run types`
// (desde la raíz del repo) cuando cambie el esquema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string;
          nombre: string;
          color: string;
          icono: string | null;
          orden: number;
          es_pago_deuda: boolean;
          activa: boolean;
        };
        Insert: {
          id: string;
          nombre: string;
          color: string;
          icono?: string | null;
          orden?: number;
          es_pago_deuda?: boolean;
          activa?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          color?: string;
          icono?: string | null;
          orden?: number;
          es_pago_deuda?: boolean;
          activa?: boolean;
        };
        Relationships: [];
      };
      gastos: {
        Row: {
          id: string;
          user_id: string;
          monto: number;
          categoria_id: string;
          fecha: string;
          medio: string;
          fuente: string;
          descripcion: string | null;
          id_cliente: string | null;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          monto: number;
          categoria_id: string;
          fecha: string;
          medio: string;
          fuente: string;
          descripcion?: string | null;
          id_cliente?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          monto?: number;
          categoria_id?: string;
          fecha?: string;
          medio?: string;
          fuente?: string;
          descripcion?: string | null;
          id_cliente?: string | null;
          creado_en?: string;
          actualizado_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      resumen_por_categoria: {
        Args: { desde: string; hasta: string; incluir_tarjeta?: boolean; medio?: string | null };
        Returns: {
          categoria_id: string;
          nombre: string;
          color: string;
          icono: string | null;
          total: number;
          cantidad: number;
        }[];
      };
      resumen_por_periodo: {
        Args: {
          desde: string;
          hasta: string;
          granularidad: string;
          incluir_tarjeta?: boolean;
          medio?: string | null;
        };
        Returns: { periodo: string; categoria_id: string; total: number }[];
      };
      total_periodo: {
        Args: { desde: string; hasta: string; incluir_tarjeta?: boolean };
        Returns: { total: number; cantidad: number }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
