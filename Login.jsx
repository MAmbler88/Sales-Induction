import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await signIn(email, password)
    setLoading(false)
    if (error) { setError(error.message); return }
    const role = data.user?.user_metadata?.role
    navigate(role === 'admin' ? '/admin' : '/training')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div className="logo-mark" style={{ fontSize: 22, marginBottom: 4 }}>Onboard<span style={{ color: 'var(--accent)' }}>IQ</span></div>
          <div className="logo-sub">Sales Induction Platform</div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          Contact your administrator to get access.
        </p>
      </div>
    </div>
  )
}
