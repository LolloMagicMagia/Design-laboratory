"use client";

import "./styles.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, provider, signInWithPopup } from "@/firebase";

/**
 * RegisterPage component for user registration.
 * Users can register with email/password or via Google authentication.
 * Displays loading states and handles errors during the registration process.
 * @module frontend/page/src/app/register/page.jsx
 * @returns {JSX.Element} The rendered registration page.
 */
export default function RegisterPage() {
    const router = useRouter();
    /**
     * The form state containing email and password for user registration.
     * @constant {Object} form
     * @property {string} email - The email entered by the user.
     * @property {string} password - The password entered by the user.
     */
    const [form, setForm] = useState({ email: "", password: "" });
    /**
     * The loading state indicating whether the registration process is in progress.
     * @constant {boolean} loading
     * @default {false}
     */
    const [loading, setLoading] = useState(false);
    /**
     * The error state used to store any error messages during the registration process.
     * @constant {string | null} error
     * @default {null}
     */
    const [error, setError] = useState(null);

    /**
     * Handles changes in the form fields (email and password).
     * It updates the corresponding field in the form state.
     *
     * @function handleChange
     * @param {Object} e - The event object triggered by the input field.
     * @param {string} e.target.name - The name of the input field (either 'email' or 'password').
     * @param {string} e.target.value - The value entered in the input field.
     */
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    /**
     * Handles the form submission for user registration.
     * It sends a POST request to create a new user and verifies the user's email.
     * Upon successful registration, it redirects the user to the login page.
     * In case of an error, an error message is displayed.
     *
     * @function handleSubmit
     * @param {Object} e - The event object triggered by the form submission.
     * @param {string} e.preventDefault() - Prevents the default form submission behavior.
     * @returns {Promise<void>} This function does not return anything. It handles asynchronous operations for user registration.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("http://localhost:8080/api/auth/createUser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (!res.ok) throw new Error(await res.text());

            await fetch(`http://localhost:8080/api/auth/verifyUser?email=${encodeURIComponent(form.email)}`, {
                method: "POST",
            });

            alert("Registrazione completata! Controlla la tua email.");
            router.push("/login");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles the Google registration process.
     * It allows users to sign in using their Google account and send the Google ID token to the backend for verification.
     * Upon successful registration, the user is redirected to the login page.
     * In case of an error, an error message is displayed.
     *
     * @function handleGoogleRegister
     * @returns {Promise<void>} This function does not return anything. It handles asynchronous operations for Google-based user registration.
     */
    const handleGoogleRegister = async () => {
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

            if (!res.ok) throw new Error(await res.text());
            router.push("/login");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Registrati</h1>
                    <p>Crea un nuovo account su BicoChat</p>
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

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Registrazione in corso..." : "Registrati"}
                    </button>
                </form>

                <div className="form-options" style={{ justifyContent: "center", marginTop: "10px" }}>
                    <button className="login-button" style={{ backgroundColor: "#db4437" }} onClick={handleGoogleRegister}>
                        {loading ? "Connessione..." : "Registrati con Google"}
                    </button>
                </div>

                {error && (
                    <div className="login-footer" style={{ color: "red", marginTop: "16px" }}>
                        ⚠️ {error}
                    </div>
                )}

                <div className="login-footer">
                    <p>Hai già un account? <a href="/login">Accedi</a></p>
                </div>
            </div>
        </div>
    );
}
