import { useEffect, useState } from "react";
import { request } from "../../../../src/services/api.js";
import { migrateCashBankBrowserData } from "../../utils/cashBankMigration.js";

export default function CashBankAuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    request("/api/auth")
      .then(async (auth) => {
        if (!active) return;
        setConfigured(Boolean(auth.configured));
        if (auth.authed && auth.activeUser) {
          await finishSignIn(auth.activeUser, active);
        }
      })
      .catch((cause) => {
        if (active) setError(`Could not connect to the backend: ${cause.message}`);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const finishSignIn = async (activeUser, active = true) => {
    if (!activeUser.isAdmin && !activeUser.permissions?.includes("cashbank")) {
      throw new Error("This account does not have Cash & Bank access. Ask an administrator to enable it.");
    }
    const migration = await migrateCashBankBrowserData(activeUser);
    if (!active) return;
    if (migration.migrated) setNotice("Existing browser records were moved to the shared backend.");
    setUser(activeUser);
    setError("");
  };

  const signIn = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const auth = await request("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", pin, remember: true }),
      });
      setConfigured(true);
      await finishSignIn(auth.activeUser);
      setPin("");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await request("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      setUser(null);
      setNotice("");
    } catch (cause) {
      setError(`Could not sign out: ${cause.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <>
        <div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          <span>{user.name}</span>
          <button className="font-semibold text-accent hover:underline" disabled={busy} onClick={signOut} type="button">
            Sign out
          </button>
        </div>
        {notice && <p className="bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-800">{notice}</p>}
        {children(user)}
      </>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4">
      <form className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm" onSubmit={signIn}>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Natheel finance</p>
        <h1 className="mt-2 text-2xl font-bold text-navy">Cash &amp; Bank</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with your TaskFlow PIN to access shared accounting records.</p>
        {!configured && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Configure the admin PIN in TaskFlow before using Cash &amp; Bank.
          </p>
        )}
        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
        <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="cash-bank-pin">PIN</label>
        <input
          autoComplete="current-password"
          className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-accent"
          disabled={busy || !configured}
          id="cash-bank-pin"
          inputMode="numeric"
          maxLength={8}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          required
          type="password"
          value={pin}
        />
        <button
          className="mt-5 h-11 w-full rounded-lg bg-navy font-semibold text-white disabled:opacity-60"
          disabled={busy || !configured || pin.length < 4}
          type="submit"
        >
          {busy ? "Connecting…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
