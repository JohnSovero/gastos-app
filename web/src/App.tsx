import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { Cargando } from "./components/ui";
import { ProveedorCategorias, useSesion } from "./hooks/estado";
import { configurado } from "./lib/supabase";
import Ajustes from "./pages/Ajustes";
import Inicio from "./pages/Inicio";
import Login from "./pages/Login";
import Movimientos from "./pages/Movimientos";
import Nuevo from "./pages/Nuevo";
import Reportes from "./pages/Reportes";

/** Aviso breve tras guardar (lo envía Nuevo en el state de la navegación). */
function Aviso() {
  const location = useLocation();
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    const aviso = (location.state as { aviso?: string } | null)?.aviso;
    if (!aviso) return;
    setTexto(aviso);
    const t = setTimeout(() => setTexto(null), 2500);
    return () => clearTimeout(t);
  }, [location]);
  if (!texto) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 mx-auto max-w-sm rounded-xl bg-tinta px-4 py-3 text-center text-sm font-medium text-plano shadow-lg"
    >
      {texto}
    </div>
  );
}

function Rutas() {
  const { sesion, cargando } = useSesion();
  if (cargando) return <Cargando />;
  // Sin sesión se muestra el login en la misma URL, así /nuevo?monto=… se conserva.
  if (!sesion) return <Login />;
  return (
    <ProveedorCategorias>
      <Aviso />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="nuevo" element={<Nuevo />} />
          <Route path="gasto/:id" element={<Nuevo />} />
          <Route path="movimientos" element={<Movimientos />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProveedorCategorias>
  );
}

export default function App() {
  if (!configurado) {
    return (
      <div className="px-seguro pt-seguro mx-auto max-w-sm py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Falta configuración</h1>
        <p className="text-sm text-tinta-2">
          Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en <code>web/.env.local</code> (o
          en Vercel) y vuelve a iniciar.
        </p>
      </div>
    );
  }
  return (
    <BrowserRouter>
      <Rutas />
    </BrowserRouter>
  );
}
