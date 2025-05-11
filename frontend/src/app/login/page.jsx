// src/app/login/page.jsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, provider } from "../../firebase";
import "./styles.css";

/**
 * LoginPage - Login view ("/login").
 * @module frontend/page/src/app/login/page.jsx
 * @description Allows users to log in with email/password or via Google using Firebase Auth.
 */
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
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      const idToken = await userCredential.user.getIdToken();

      const res = await fetch("http://localhost:8080/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        await res.text();
      }

      const userData = await res.json();
      localStorage.setItem("currentUserId", userData.uid);
      localStorage.setItem("currentUserEmail", userData.email);
      router.push("/");
    } catch (err) {
      setError(err.message || "Errore durante il login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await fetch("http://localhost:8080/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        await res.text();
      }

      const userData = await res.json();
      localStorage.setItem("currentUserId", userData.uid);
      localStorage.setItem("currentUserEmail", userData.email);
      router.push("/");
    } catch (err) {
      setError("Login con Google fallito: " + err.message);
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
              <input type="email" name="email" id="email" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" name="password" id="password" value={form.password} onChange={handleChange} required />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>

          <button onClick={handleGoogleLogin} className="google-button">
            Accedi con Google
          </button>


          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <div className="login-footer">
            <p>Non hai un account? <a href="/register">Registrati</a></p>
          </div>
        </div>
      </div>
  );
}
