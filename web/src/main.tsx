import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ProveedorSesion } from "./hooks/estado";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProveedorSesion>
      <App />
    </ProveedorSesion>
  </StrictMode>,
);
