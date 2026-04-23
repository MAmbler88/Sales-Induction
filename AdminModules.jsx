import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

function getYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)
  return match?.[1] || null
}

function QuizModal({ moduleId, moduleTitle, onClose }) {
  const [questions, setQuestions] = useState([])
  const [quiz, setQuiz] = useState(null)
  const [newQ, setNewQ] = useState({ question_text: '', options: ['', '', '', ''], correct: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: q } = await supabase.from('quizzes').select('*').eq('module_id', moduleId).single()
      if (q) {
        setQuiz(q)
        const { data: qs } = await supabase.from('quiz_questions').select('*').eq('quiz_id', q.id).order('order_index')
        setQuestions(qs || [])
      }
    }
    load()
  }, [moduleId])

  async function ensureQuiz() {
    if (quiz) return quiz
    const { data } = await supabase.from('quizzes').insert({ module_id: moduleId, title: `${moduleTitle} Quiz` }).select().single()
    setQuiz(data)
    return data
  }

  async function addQuestion() {
    setLoading(true)
    const q = await ensureQuiz()
    const options = newQ.options.map((text, i) => ({ id: i, text, correct: i === newQ.correct }))
    const { data } = await supabase.from('quiz_questions').insert({ quiz_id: q.id, question_text: newQ.question_text, options, order_index: questions.length }).select().single()
    setQuestions(prev => [...prev, data])
    setNewQ({ question_text: '', options: ['', '', '', ''], correct: 0 })
    setLoading(false)
  }

  async function deleteQuestion(id) {
    await supabase.from('quiz_questions').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Quiz — {moduleTitle}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4">
          <div className="section-title text-sm" style={{ marginBottom: 10 }}>Questions ({questions.length})</div>
          {questions.length === 0 && <p className="text-sm text-muted mb-3">No questions yet. Add one below.</p>}
          {questions.map((q, i) => (
            <div key={q.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', marginBottom: 8, fontSize: 14 }}>
              <div className="flex items-center justify-between">
                <span style={{ fontWeight: 500 }}>{i + 1}. {q.question_text}</span>
                <button className="btn btn-ghost btn-sm" style={{ color: '#B91C1C' }} onClick={() => deleteQuestion(q.id)}>✕</button>
              </div>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {q.options.map(o => (
                  <span key={o.id} className={`badge ${o.correct ? 'badge-green' : 'badge-gray'}`}>{o.text}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <hr className="divider" />
        <div className="section-title text-sm mb-3">Add question</div>
        <div className="form-group">
          <label className="form-label">Question</label>
          <input className="form-input" value={newQ.question_text} onChange={e => setNewQ({ ...newQ, question_text: e.target.value })} placeholder="e.g. What is our main product differentiator?" />
        </div>
        {newQ.options.map((opt, i) => (
          <div className="form-group" key={i}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="correct" checked={newQ.correct === i} onChange={() => setNewQ({ ...newQ, correct: i })} style={{ accentColor: 'var(--accent)' }} />
              Option {i + 1} {newQ.correct === i && <span className="badge badge-green">correct</span>}
            </label>
            <input className="form-input" value={opt} onChange={e => { const o = [...newQ.options]; o[i] = e.target.value; setNewQ({ ...newQ, options: o }) }} placeholder={`Answer option ${i + 1}`} />
          </div>
        ))}
        <div className="flex" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
          <button className="btn btn-primary" onClick={addQuestion} disabled={loading || !newQ.question_text || newQ.options.some(o => !o)}>
            {loading ? 'Adding…' : 'Add question'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModuleModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState(existing || { title: '', description: '', youtube_url: '', published: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.youtube_url && !getYouTubeId(form.youtube_url)) { setError('Please enter a valid YouTube URL'); return }
    setLoading(true)
    if (existing) {
      const { error } = await supabase.from('modules').update(form).eq('id', existing.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { data: all } = await supabase.from('modules').select('order_index').order('order_index', { ascending: false }).limit(1)
      const nextOrder = (all?.[0]?.order_index ?? -1) + 1
      const { error } = await supabase.from('modules').insert({ ...form, order_index: nextOrder })
      if (error) { setError(error.message); setLoading(false); return }
    }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit module' : 'New module'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Company Overview" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this module…" />
          </div>
          <div className="form-group">
            <label className="form-label">YouTube URL</label>
            <input className="form-input" value={form.youtube_url || ''} onChange={e => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
            <div className="form-hint">Paste the full YouTube video URL</div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              <span className="form-label" style={{ margin: 0 }}>Published (visible to agents)</span>
            </label>
          </div>
          <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save module'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminModules() {
  const [modules, setModules] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editModule, setEditModule] = useState(null)
  const [quizModule, setQuizModule] = useState(null)
  const [quizCounts, setQuizCounts] = useState({})

  async function load() {
    const { data } = await supabase.from('modules').select('*').order('order_index')
    setModules(data || [])
    if (data?.length) {
      const { data: quizzes } = await supabase.from('quizzes').select('module_id')
      const { data: questions } = await supabase.from('quiz_questions').select('quiz_id, quizzes(module_id)')
      const counts = {}
      ;(questions || []).forEach(q => {
        const mid = q.quizzes?.module_id
        if (mid) counts[mid] = (counts[mid] || 0) + 1
      })
      setQuizCounts(counts)
    }
  }

  useEffect(() => { load() }, [])

  async function deleteModule(id) {
    if (!confirm('Delete this module? This cannot be undone.')) return
    await supabase.from('modules').delete().eq('id', id)
    load()
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Modules</h1>
            <p className="page-sub">Manage training content and quizzes</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New module</button>
        </div>

        <div className="card">
          {modules.length === 0 ? (
            <p className="text-muted text-sm">No modules yet. Click "New module" to create your first training unit.</p>
          ) : modules.map((m, i) => (
            <div key={m.id} className="module-item">
              <div className={`module-num ${m.published ? 'done' : ''}`}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{m.title}</div>
                <div className="text-sm text-muted">{m.description || 'No description'}</div>
                <div className="flex gap-2 mt-1" style={{ flexWrap: 'wrap' }}>
                  <span className={`badge ${m.published ? 'badge-green' : 'badge-amber'}`}>{m.published ? 'Published' : 'Draft'}</span>
                  {m.youtube_url && <span className="badge badge-blue">▶ Video</span>}
                  <span className="badge badge-gray">? {quizCounts[m.id] || 0} questions</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setQuizModule(m)}>Edit quiz</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditModule(m)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteModule(m.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {(showModal || editModule) && (
          <ModuleModal existing={editModule} onClose={() => { setShowModal(false); setEditModule(null) }} onSaved={load} />
        )}
        {quizModule && <QuizModal moduleId={quizModule.id} moduleTitle={quizModule.title} onClose={() => { setQuizModule(null); load() }} />}
      </main>
    </div>
  )
}
