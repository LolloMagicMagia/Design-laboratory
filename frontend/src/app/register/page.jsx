'use client'

import './styles.css'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, provider, signInWithPopup } from '@/firebase'

export default function RegisterPage() {
    const router = useRouter()
    const [form, setForm] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const res = await fetch('http://localhost:8080/api/auth/createUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            if (!res.ok) throw new Error(await res.text())

            await fetch(`http://localhost:8080/api/auth/verifyUser?email=${encodeURIComponent(form.email)}`, {
                method: 'POST',
            })

            alert('Registrazione completata! Controlla la tua email.')
            router.push('/login')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleRegister = async () => {
        setLoading(true)
        setError(null)

        try {
            const result = await signInWithPopup(auth, provider)
            const idToken = await result.user.getIdToken()

            const res = await fetch('http://localhost:8080/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            })

            if (!res.ok) throw new Error(await res.text())
            router.push('/login')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

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
                        {loading ? 'Registrazione in corso...' : 'Registrati'}
                    </button>
                </form>

                <div className="form-options" style={{ justifyContent: 'center', marginTop: '10px' }}>
                    <button className="login-button" style={{ backgroundColor: '#db4437' }} onClick={handleGoogleRegister}>
                        {loading ? 'Connessione...' : 'Registrati con Google'}
                    </button>
                </div>

                {error && (
                    <div className="login-footer" style={{ color: 'red', marginTop: '16px' }}>
                        ⚠️ {error}
                    </div>
                )}

                <div className="login-footer">
                    <p>Hai già un account? <a href="/login">Accedi</a></p>
                </div>
            </div>
        </div>
    )
}
