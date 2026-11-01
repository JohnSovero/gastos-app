import { useState, type FormEvent } from "react";
import { Boton, MensajeError } from "../components/ui";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    setEnviando(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message);
    }
  }

  return (
    <div className="pt-seguro px-seguro mx-auto flex min-h-dvh max-w-sm flex-col justify-center">
      <img src="/logo.svg" alt="" className="mx-auto mb-6 h-16 w-16 rounded-2xl" />
      <h1 className="mb-1 text-center text-2xl font-semibold">Mis Gastos</h1>
      <p className="mb-8 text-center text-sm text-tenue">Ingresa con tu cuenta</p>
      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Correo"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-xl border border-borde bg-superficie px-4 outline-none focus:border-acento"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="min-h-12 rounded-xl border border-borde bg-superficie px-4 outline-none focus:border-acento"
        />
        {error && <MensajeError>{error}</MensajeError>}
        <Boton type="submit" disabled={enviando} className="mt-2 min-h-12">
          {enviando ? "Ingresando…" : "Ingresar"}
        </Boton>
      </form>
    </div>
  );
}
