'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, provider, signInWithPopup } from '@/firebase' // Assicurati che il file esista

export default function RegisterPage() {
    const router = useRouter()
    const [form, setForm] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null) // Per mostrare risposta backend

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Registra utente
            const res = await fetch('http://localhost:8080/api/auth/createUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(`Errore creazione utente: ${res.status} - ${errorText}`)
            }

            const createMsg = await res.text()
            console.log('✅ Utente creato:', createMsg)

            // 2. Invia email di verifica
            const verifyRes = await fetch(`http://localhost:8080/api/auth/verifyUser?email=${encodeURIComponent(form.email)}`, {
                method: 'POST'
            })

            if (!verifyRes.ok) {
                const errorText = await verifyRes.text()
                throw new Error(`Errore invio verifica: ${verifyRes.status} - ${errorText}`)
            }

            const verifyMsg = await verifyRes.text()
            console.log('📧 Email di verifica inviata:', verifyMsg)

            alert("Registrazione completata! Controlla l'email per verificare il tuo account.")
            router.push('/login')

        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }



    const handleGoogleRegister = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const result = await signInWithPopup(auth, provider)
            const idToken = await result.user.getIdToken()

            const res = await fetch('http://localhost:8080/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            })

            const raw = await res.text()
            let data

            try {
                data = raw ? JSON.parse(raw) : {}
            } catch (err) {
                console.error('Errore parsing JSON:', err)
                data = { error: 'Risposta non valida dal server', raw }
            }

            router.push('/login')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Register</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border rounded"
                />
                <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border rounded"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                    {loading ? 'Registering...' : 'Register'}
                </button>
            </form>

            <div className="my-4 text-center text-gray-500">or</div>

            <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
            >
                {loading ? 'Connecting...' : 'Sign up with Google'}
            </button>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            {result && (
                <pre className="mt-4 p-2 bg-gray-100 text-sm whitespace-pre-wrap rounded">
                    {JSON.stringify(result, null, 2)}
                </pre>
            )}
        </div>
    )
}
