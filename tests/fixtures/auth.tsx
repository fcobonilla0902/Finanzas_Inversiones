// Fixture aislado: las pruebas de visibilidad no envían formularios ni credenciales.
import { createRoot } from "react-dom/client";
import { Auth, PasswordRecovery } from "../../src/features/auth";
import "@fontsource-variable/manrope";
import "../../src/design.css";

document.documentElement.dataset.theme = matchMedia(
  "(prefers-color-scheme: dark)",
).matches
  ? "dark"
  : "light";
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("recovery") ? (
    <PasswordRecovery done={() => {}} />
  ) : (
    <Auth />
  ),
);
