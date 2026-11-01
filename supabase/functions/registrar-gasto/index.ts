// Edge Function "registrar-gasto": recibe gastos desde el atajo de iOS.
// Desplegar con: npx supabase functions deploy registrar-gasto --no-verify-jwt --use-api
import { createClient } from "@supabase/supabase-js";
import { manejar, type NuevoGasto, type Repo } from "../_shared/registrar.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const OWNER = Deno.env.get("OWNER_USER_ID")!;
const COLUMNAS = "id, monto, categoria_id, medio, fecha, descripcion, id_cliente, fuente";

const repo: Repo = {
  async categorias() {
    const { data, error } = await supabase.from("categorias").select("id, nombre, activa");
    if (error) throw error;
    return data;
  },

  async insertar(g: NuevoGasto) {
    const buscarExistente = async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select(COLUMNAS)
        .eq("user_id", OWNER)
        .eq("id_cliente", g.id_cliente!)
        .maybeSingle();
      if (error) throw error;
      return data;
    };

    if (g.id_cliente) {
      const existente = await buscarExistente();
      if (existente) return { gasto: { ...existente, monto: Number(existente.monto) }, duplicado: true };
    }

    const { data, error } = await supabase
      .from("gastos")
      .insert({ ...g, user_id: OWNER })
      .select(COLUMNAS)
      .single();

    if (error?.code === "23505" && g.id_cliente) {
      // Dos envíos simultáneos con el mismo id_cliente: devolver el que ganó.
      const existente = await buscarExistente();
      if (existente) return { gasto: { ...existente, monto: Number(existente.monto) }, duplicado: true };
    }
    if (error) throw error;
    return { gasto: { ...data, monto: Number(data.monto) }, duplicado: false };
  },

  async totalEntre(desde, hasta) {
    const { data, error } = await supabase
      .from("gastos")
      .select("monto")
      .eq("user_id", OWNER)
      .gte("fecha", desde)
      .lt("fecha", hasta);
    if (error) throw error;
    return data.reduce((s, r) => s + Number(r.monto), 0);
  },
};

Deno.serve((req) => manejar(req, { token: Deno.env.get("INGEST_TOKEN"), repo }));
