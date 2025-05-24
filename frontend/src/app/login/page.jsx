// src/app/login/page.jsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, provider } from "../../firebase";
import "./styles.css";

/**
 * LoginPage component for user authentication.
 * Allows users to log in with email/password or via Google authentication using Firebase.
 * Manages loading states and handles errors during the login process.
 * @module frontend/page/src/app/login/page.jsx
 * @returns {JSX.Element} The rendered login page.
 */
export default function LoginPage() {
  const router = useRouter();

  /**
   * The form state containing email and password for user login.
   * @constant {Object} form
   * @property {string} email - The email entered by the user.
   * @property {string} password - The password entered by the user.
   */
  const [form, setForm] = useState({ email: "", password: "" });

  /**
   * The loading state indicating whether the login process is in progress.
   * @constant {boolean} loading
   * @default {false}
   */
  const [loading, setLoading] = useState(false);

  /**
   * The error state used to store any error messages during the login process.
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
   * Handles the form submission for user login using email and password.
   * It authenticates the user with Firebase Auth, sends the ID token to the backend,
   * and stores user information in localStorage before redirecting to the homepage.
   *
   * @function handleSubmit
   * @param {Object} e - The event object triggered by the form submission.
   * @returns {Promise<void>} This function does not return anything.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Error during login");
      }

      const userData = await res.json();
      localStorage.setItem("currentUserId", userData.uid);
      localStorage.setItem("currentUserEmail", userData.email);

      router.push("/");
    } catch (err) {
      setError(err.message || "Error during login");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the Google login process using Firebase popup authentication.
   * It sends the Google ID token to the backend for verification,
   * stores user info in localStorage, and redirects to the homepage.
   *
   * @function handleGoogleLogin
   * @returns {Promise<void>} This function does not return anything.
   */
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
      setError("Login with Google failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f9fafb",
        overflow: "hidden"
      }}>
        {/* Header */}
        <header style={{
          backgroundColor: "#990033",
          padding: "0.1rem 1.5rem",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #FFFFFF"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            <h1 style={{
              fontSize: "1.5rem",
              fontWeight: "bold"
            }}>
              BicoChat Login
            </h1>
          </div>

          <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Milano-Bicocca_University_logo_2.svg/2095px-Milano-Bicocca_University_logo_2.svg.png"
              width="60"
              alt="logo"
              style={{ borderRadius: "4px" }}
          />
        </header>

        {/* Main content */}
        <main style={{
          flex: 1,
          padding: "1.5rem",
          overflowY: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "400px",
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            padding: "2rem"
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: "2rem"
            }}>
              <h2 style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "#1f2937",
                marginBottom: "0.5rem"
              }}>
                Log in
              </h2>
              <p style={{
                fontSize: "0.875rem",
                color: "#6b7280"
              }}>
                Enter your credentials to log in
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{
                marginBottom: "1rem"
              }}>
                <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#4b5563",
                      fontWeight: "500"
                    }}
                >
                  Email
                </label>
                <input
                    type="email"
                    name="email"
                    id="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      backgroundColor: "white",
                      boxSizing: "border-box"
                    }}
                />
              </div>

              <div style={{
                marginBottom: "1.5rem"
              }}>
                <label
                    htmlFor="password"
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#4b5563",
                      fontWeight: "500"
                    }}
                >
                  Password
                </label>
                <input
                    type="password"
                    name="password"
                    id="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    style={{
                      width: "100%",
                      padding: "0.625rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      backgroundColor: "white",
                      boxSizing: "border-box"
                    }}
                />
              </div>

              <button
                  id="login-button"
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    backgroundColor: "#990033",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s ease",
                    marginBottom: "1rem",
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = "#660022";
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = "#990033";
                  }}
              >
                {loading ? "Logging in..." : "Log in"}
              </button>

              <button
                  id="google-login-button"
                  onClick={handleGoogleLogin}
                  type="button"
                  disabled={loading}
                  style={{
                    width: "100%",
                    backgroundColor: "white",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem"
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = "white";
                  }}
              >
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Sign in with Google
              </button>
            </form>

            {error && (
                <div style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem"
                }}>
                  {error}
                </div>
            )}

            <div style={{
              marginTop: "1.5rem",
              textAlign: "center",
              fontSize: "0.875rem",
              color: "#6b7280"
            }}>
              Do not have an account?{" "}
              <a
                  href="/register"
                  style={{
                    color: "#990033",
                    fontWeight: "500",
                    textDecoration: "none"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                  }}
              >
                Sign up
              </a>
            </div>
          </div>
        </main>
      </div>
  );
}
