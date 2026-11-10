"use client";

import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";

const ACCESS_CODE = "caraga";
const ACCESS_SESSION_KEY = "da-records-access-granted";
const AccessCodeLogoutContext = createContext<(() => void) | null>(null);

export function useAccessCodeLogout() {
  const logout = useContext(AccessCodeLogoutContext);
  if (!logout) throw new Error("useAccessCodeLogout must be used inside AccessCodeGate.");
  return logout;
}

export default function AccessCodeGate({ children }: { children: ReactNode }) {
  const [accessReady, setAccessReady] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(ACCESS_SESSION_KEY);
    } catch {
      // The access gate still closes for this visit if storage is unavailable.
    }
    setCode("");
    setError("");
    setAccessGranted(false);
  }, []);

  useEffect(() => {
    try {
      setAccessGranted(window.sessionStorage.getItem(ACCESS_SESSION_KEY) === "true");
    } catch {
      setAccessGranted(false);
    }
    setAccessReady(true);
  }, []);

  function submitAccessCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim() !== ACCESS_CODE) {
      setError("That access code is not correct. Please try again.");
      return;
    }

    try {
      window.sessionStorage.setItem(ACCESS_SESSION_KEY, "true");
    } catch {
      // Keep this visit unlocked when session storage is unavailable.
    }
    setError("");
    setAccessGranted(true);
  }

  if (accessReady && accessGranted) {
    return <AccessCodeLogoutContext.Provider value={logout}>{children}</AccessCodeLogoutContext.Provider>;
  }

  return (
    <div className="access-code-backdrop">
      <section className="access-code-dialog" role="dialog" aria-modal="true" aria-labelledby="access-code-title" aria-describedby="access-code-description">
        <div className="access-code-mark"><LockKeyhole size={20} /></div>
        <p className="eyebrow">DA Records</p>
        <h1 id="access-code-title">Travel Order Records</h1>
        <p id="access-code-description" className="access-code-description">Enter the access code to continue to the records.</p>
        <form className="access-code-form" onSubmit={submitAccessCode}>
          <label htmlFor="access-code">Access code</label>
          <input
            id="access-code"
            className="field-input"
            type="password"
            autoComplete="off"
            autoFocus
            required
            value={code}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "access-code-error" : undefined}
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError("");
            }}
          />
          {error && <p id="access-code-error" className="access-code-error" role="alert">{error}</p>}
          <button className="button-primary access-code-submit" type="submit"><KeyRound size={16} />Enter records</button>
        </form>
      </section>
    </div>
  );
}
