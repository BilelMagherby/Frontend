import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import CashBankAuthGate from "./components/auth/CashBankAuthGate";
import "./index.css";

let lastPreloadReloadAt = 0;
window.addEventListener("vite:preloadError", (event) => {
  if (Date.now() - lastPreloadReloadAt < 30_000) return;
  event.preventDefault();
  lastPreloadReloadAt = Date.now();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CashBankAuthGate>
        {(user) => <AppProvider user={user}><App /></AppProvider>}
      </CashBankAuthGate>
    </BrowserRouter>
  </React.StrictMode>,
);
