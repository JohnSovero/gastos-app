import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = Boolean(url && anonKey);

export const supabase = createClient<Database>(url ?? "http://localhost", anonKey ?? "sin-configurar", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const URL_EDGE_FUNCTION = `${url ?? ""}/functions/v1/registrar-gasto`;
