"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./styles.css";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        email: form.email,
        password: form.password,
      }).toString();

      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Login fallito: ${text}`);
      }

      const text = await res.text();

      // Cerca il localId (che rappresenta l'UID)
      const match = text.match(/"localId"\s*:\s*"([^"]+)"/);
      if (!match) {
        throw new Error("Impossibile ottenere UID dell'utente");
      }

      const uid = match[1];
      localStorage.setItem("currentUserId", uid);
      localStorage.setItem("currentUserEmail", form.email);
      router.push("/");
    } catch (err) {
      setError(err.message || "Errore durante il login");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Accedi</h1>
            <p>Inserisci le tue credenziali per accedere</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Inserisci la tua email"
                  value={form.email}
                  onChange={handleChange}
                  required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Inserisci la tua password"
                  value={form.password}
                  onChange={handleChange}
                  required
              />
            </div>

            <div className="form-options">
              <div className="remember-me">
                <input type="checkbox" id="remember" name="remember" />
                <label htmlFor="remember">Ricordami</label>
              </div>
              <a href="#" className="forgot-password">Password dimenticata?</a>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <div className="login-footer">
            <p>Non hai un account? <a href="/register">Registrati</a></p>
          </div>
        </div>
      </div>
  );
}
