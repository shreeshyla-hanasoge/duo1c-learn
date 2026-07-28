import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Land on the dashboard rather than a bare "#" on first visit.
if (!window.location.hash) window.location.replace("#/dashboard");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
