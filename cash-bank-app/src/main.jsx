import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import "./index.css";

const preloadReloadKey = "vite-preload-error-reload";
window.addEventListener("vite:preloadError", (event) => {
  const lastReload = Number(sessionStorage.getItem(preloadReloadKey) ?? 0);
  if (Date.now() - lastReload < 30_000) return;
  event.preventDefault();
  sessionStorage.setItem(preloadReloadKey, String(Date.now()));
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
