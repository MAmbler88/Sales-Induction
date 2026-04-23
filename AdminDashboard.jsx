import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ agents: 0, modules: 0, completed: 0, avgProgress: 0 })
  const [recentAgents, setRecentAgents] = useState([])

  useEffect(() => {
    async function load() {
      const [{ count: agentCount }, { count: moduleCount }, { data: progressData }, { data: agents }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent'),
        supabase.from('modules').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase.from('progress').select('quiz_completed, user_id'),
        supabase.from('profiles').select('id, full_name, email, created_at').eq('role', 'agent').order('created_at', { ascending: false }).limit(5),
      ])
      const totalModules = moduleCount || 1
      const userProgress = {}
      ;(progressData || []).forEach(p => {
        if (!userProgress[p.user_id]) userProgress[p.user_id] = { done: 0 }
        if (p.quiz_completed) userProgress[p.user_id].done++
      })
      const progressVals = Object.values(userProgress).map(u => Math.round((u.done / totalModules) * 100))
      const avg = progressVals.length ? Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length) : 0
      const completed = progressVals.filter(v => v === 100).length
      setStats({ agents: agentCount || 0, modules: moduleCount || 0, completed, avgProgress: avg })
      setRecentAgents(agents || [])
    }
    load()
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of your induction program</p>
        </div>

        <div className="card-grid">
          <div className="stat-card">
            <div className="stat-label">Total agents</div>
            <div className="stat-val">{stats.agents}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Published modules</div>
            <div className="stat-val">{stats.modules}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Fully completed</div>
            <div className="stat-val green">{stats.completed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg. progress</div>
            <div className="stat-val">{stats.avgProgress}%</div>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <span className="section-title">Recent agents</span>
          </div>
          {recentAgents.length === 0 ? (
            <p className="text-muted text-sm">No agents yet. <a href="/admin/agents" style={{ color: 'var(--accent)' }}>Add your first agent →</a></p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
                <tbody>
                  {recentAgents.map(a => (
                    <tr key={a.id}>
                      <td><div className="flex items-center gap-2">
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {a.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || a.email[0].toUpperCase()}
                        </div>
                        {a.full_name || '—'}
                      </div></td>
                      <td className="text-muted">{a.email}</td>
                      <td className="text-muted text-sm">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
