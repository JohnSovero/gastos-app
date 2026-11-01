import { NavLink, Outlet, useLocation } from "react-router-dom";

const ITEMS = [
  { a: "/", texto: "Inicio", icono: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { a: "/movimientos", texto: "Movimientos", icono: "M4 6h16M4 12h16M4 18h10" },
  null,
  { a: "/reportes", texto: "Reportes", icono: "M5 20V10M12 20V4M19 20v-7" },
  { a: "/ajustes", texto: "Ajustes", icono: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" },
] as const;

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const enFormulario = pathname === "/nuevo" || pathname.startsWith("/gasto/");

  return (
    <div className="pt-seguro mx-auto min-h-dvh max-w-xl">
      <main className="px-seguro pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {!enFormulario && (
        <nav
          className="pb-seguro fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie/95 backdrop-blur"
          aria-label="Navegación principal"
        >
          <ul className="mx-auto grid max-w-xl grid-cols-5 items-end">
            {ITEMS.map((it) =>
              it === null ? (
                <li key="nuevo" className="flex justify-center">
                  <NavLink
                    to="/nuevo"
                    aria-label="Nuevo gasto"
                    className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-acento text-acento-tinta shadow-lg active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </NavLink>
                </li>
              ) : (
                <li key={it.a}>
                  <NavLink
                    to={it.a}
                    end={it.a === "/"}
                    className={({ isActive }) =>
                      `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? "text-acento" : "text-tenue"}`
                    }
                  >
                    <Icono d={it.icono} />
                    {it.texto}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
