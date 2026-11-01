import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { listarCategorias, type Categoria } from "../lib/api";
import { colorSegunModo } from "../lib/colores";
import { supabase } from "../lib/supabase";

// ---- Sesión ---------------------------------------------------------------

const SesionCtx = createContext<{ sesion: Session | null; cargando: boolean }>({ sesion: null, cargando: true });

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return <SesionCtx.Provider value={{ sesion, cargando }}>{children}</SesionCtx.Provider>;
}

export const useSesion = () => useContext(SesionCtx);

// ---- Modo oscuro ----------------------------------------------------------

const consulta = "(prefers-color-scheme: dark)";

export function useModoOscuro(): boolean {
  const [oscuro, setOscuro] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambio = () => setOscuro(mq.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return oscuro;
}

// ---- Categorías -----------------------------------------------------------

interface CategoriasValor {
  categorias: Categoria[];
  porId: Map<string, Categoria>;
  color: (id: string) => string;
  recargar: () => Promise<void>;
  error: string | null;
}

const CategoriasCtx = createContext<CategoriasValor | null>(null);

export function ProveedorCategorias({ children }: { children: ReactNode }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState<string | null>(null);
  const oscuro = useModoOscuro();

  const recargar = useCallback(async () => {
    try {
      setCategorias(await listarCategorias());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const valor = useMemo(() => {
    const porId = new Map(categorias.map((c) => [c.id, c]));
    return {
      categorias,
      porId,
      color: (id: string) => colorSegunModo(porId.get(id)?.color ?? "#898781", oscuro),
      recargar,
      error,
    };
  }, [categorias, oscuro, recargar, error]);

  return <CategoriasCtx.Provider value={valor}>{children}</CategoriasCtx.Provider>;
}

export function useCategorias(): CategoriasValor {
  const v = useContext(CategoriasCtx);
  if (!v) throw new Error("useCategorias fuera de ProveedorCategorias");
  return v;
}

// ---- Preferencia "Incluir pagos de tarjeta" (compartida por Inicio y Reportes) ----

const CLAVE_TARJETA = "incluir-tarjeta";

export function useIncluirTarjeta(): [boolean, (v: boolean) => void] {
  const [valor, setValor] = useState(() => localStorage.getItem(CLAVE_TARJETA) !== "no");
  const cambiar = useCallback((v: boolean) => {
    localStorage.setItem(CLAVE_TARJETA, v ? "si" : "no");
    setValor(v);
  }, []);
  return [valor, cambiar];
}

// ---- Carga de datos asíncrona con estado ---------------------------------

export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    cargar()
      .then((d) => {
        if (!vigente) return;
        setDatos(d);
        setError(null);
      })
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { datos, error, cargando, recargar: () => setVersion((v) => v + 1) };
}
