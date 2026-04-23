import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

function Modal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Create user via Supabase admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.password,
      user_metadata: { full_name: form.full_name, role: 'agent' },
      email_confirm: true,
    })
    if (error) { setError(error.message); setLoading(false); return }
    onCreated()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add new agent</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Temporary password</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
            <div className="form-hint">Agent can change this after first login</div>
          </div>
          <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create agent'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminAgents() {
  const [agents, setAgents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [progress, setProgress] = useState({})

  async function load() {
    const [{ data: a }, { data: modules }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'agent').order('created_at', { ascending: false }),
      supabase.from('modules').select('id').eq('published', true),
      supabase.from('progress').select('user_id, quiz_completed'),
    ])
    setAgents(a || [])
    const total = (modules || []).length
    const map = {}
    ;(prog || []).forEach(p => {
      if (!map[p.user_id]) map[p.user_id] = 0
      if (p.quiz_completed) map[p.user_id]++
    })
    const pct = {}
    Object.keys(map).forEach(uid => { pct[uid] = total ? Math.round((map[uid] / total) * 100) : 0 })
    setProgress(pct)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Agents</h1>
            <p className="page-sub">Manage your sales team accounts</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add agent</button>
        </div>

        <div className="card">
          {agents.length === 0 ? (
            <p className="text-muted text-sm">No agents yet. Click "Add agent" to get started.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Progress</th><th>Joined</th></tr></thead>
                <tbody>
                  {agents.map(a => {
                    const pct = progress[a.id] ?? 0
                    return (
                      <tr key={a.id}>
                        <td><div className="flex items-center gap-2">
                          <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                            {a.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || a.email[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{a.full_name || '—'}</span>
                        </div></td>
                        <td className="text-muted">{a.email}</td>
                        <td style={{ minWidth: 140 }}>
                          <div className="flex items-center gap-2">
                            <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                            <span className="text-sm text-muted" style={{ minWidth: 34 }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="text-muted text-sm">{new Date(a.created_at).toLocaleDateString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && <Modal onClose={() => setShowModal(false)} onCreated={load} />}
      </main>
    </div>
  )
}
