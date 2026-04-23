import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function AdminProgress() {
  const [data, setData] = useState([])
  const [modules, setModules] = useState([])

  useEffect(() => {
    async function load() {
      const [{ data: agents }, { data: mods }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').eq('role', 'agent'),
        supabase.from('modules').select('id, title, order_index').eq('published', true).order('order_index'),
        supabase.from('progress').select('*'),
      ])
      setModules(mods || [])
      const progMap = {}
      ;(prog || []).forEach(p => {
        if (!progMap[p.user_id]) progMap[p.user_id] = {}
        progMap[p.user_id][p.module_id] = p
      })
      setData((agents || []).map(a => ({ ...a, progress: progMap[a.id] || {} })))
    }
    load()
  }, [])

  function overallPct(agentProgress) {
    if (!modules.length) return 0
    const done = modules.filter(m => agentProgress[m.id]?.quiz_completed).length
    return Math.round((done / modules.length) * 100)
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Progress tracker</h1>
          <p className="page-sub">See exactly where each agent is in their induction</p>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  {modules.map(m => <th key={m.id} style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</th>)}
                  <th>Overall</th>
                </tr>
              </thead>
              <tbody>
                {data.map(agent => {
                  const pct = overallPct(agent.progress)
                  return (
                    <tr key={agent.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {agent.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || agent.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{agent.full_name || '—'}</div>
                            <div className="text-sm text-muted">{agent.email}</div>
                          </div>
                        </div>
                      </td>
                      {modules.map(m => {
                        const p = agent.progress[m.id]
                        if (!p) return <td key={m.id}><span className="badge badge-gray">—</span></td>
                        if (p.quiz_completed) return <td key={m.id}><span className="badge badge-green">✓ {p.quiz_score}%</span></td>
                        if (p.video_watched) return <td key={m.id}><span className="badge badge-blue">Watching</span></td>
                        return <td key={m.id}><span className="badge badge-amber">Started</span></td>
                      })}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar" style={{ width: 80 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                          <span className="text-sm" style={{ fontWeight: 500 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
