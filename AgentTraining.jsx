import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)
  return match?.[1] || null
}

function QuizView({ quiz, questions, moduleId, userId, onComplete }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  function select(qId, optId) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qId]: optId }))
  }

  async function submit() {
    let correct = 0
    questions.forEach(q => {
      const chosen = answers[q.id]
      const correctOpt = q.options.find(o => o.correct)
      if (chosen === correctOpt?.id) correct++
    })
    const pct = Math.round((correct / questions.length) * 100)
    setScore(pct)
    setSubmitted(true)
    await supabase.from('progress').upsert({
      user_id: userId,
      module_id: moduleId,
      video_watched: true,
      quiz_completed: true,
      quiz_score: pct,
      completed_at: new Date().toISOString(),
    })
    onComplete(pct)
  }

  if (questions.length === 0) return <p className="text-muted text-sm">No quiz questions have been added yet.</p>

  if (submitted) {
    const passed = score >= (quiz.pass_score || 70)
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{passed ? '🎉' : '📖'}</div>
        <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, color: passed ? 'var(--accent)' : 'var(--warn)' }}>{score}%</div>
        <div style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 20 }}>
          {passed ? 'Well done! You passed this module.' : `You need ${quiz.pass_score}% to pass. Review the content and try again.`}
        </div>
        {!passed && <button className="btn btn-primary" onClick={() => { setSubmitted(false); setAnswers({}) }}>Retry quiz</button>}
      </div>
    )
  }

  const q = questions[current]
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted">Question {current + 1} of {questions.length}</span>
        <div className="progress-bar" style={{ width: 120 }}>
          <div className="progress-fill" style={{ width: `${((current) / questions.length) * 100}%` }} />
        </div>
      </div>
      <p style={{ fontWeight: 500, fontSize: 16, marginBottom: '1rem' }}>{q.question_text}</p>
      {q.options.map(opt => (
        <button
          key={opt.id}
          className={`quiz-option ${answers[q.id] === opt.id ? 'selected' : ''}`}
          onClick={() => select(q.id, opt.id)}
        >{opt.text}</button>
      ))}
      <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        {current > 0 && <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)}>← Back</button>}
        {current < questions.length - 1
          ? <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)} disabled={answers[q.id] === undefined}>Next →</button>
          : <button className="btn btn-primary" onClick={submit} disabled={answers[q.id] === undefined}>Submit answers</button>
        }
      </div>
    </div>
  )
}

function ModuleDetail({ module, progress, userId, onProgressUpdate }) {
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [tab, setTab] = useState('video')
  const videoId = getYouTubeId(module.youtube_url)

  useEffect(() => {
    async function load() {
      const { data: q } = await supabase.from('quizzes').select('*').eq('module_id', module.id).single()
      if (q) {
        setQuiz(q)
        const { data: qs } = await supabase.from('quiz_questions').select('*').eq('quiz_id', q.id).order('order_index')
        setQuestions(qs || [])
      }
    }
    load()
  }, [module.id])

  async function markVideoWatched() {
    await supabase.from('progress').upsert({ user_id: userId, module_id: module.id, video_watched: true })
    onProgressUpdate()
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {module.youtube_url && <button className={`btn ${tab === 'video' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab('video')}>▶ Video</button>}
        {quiz && <button className={`btn ${tab === 'quiz' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab('quiz')}>? Quiz</button>}
      </div>

      {tab === 'video' && (
        <div>
          {videoId ? (
            <>
              <div className="video-container mb-4">
                <iframe src={`https://www.youtube.com/embed/${videoId}`} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
              {!progress?.video_watched && (
                <button className="btn btn-secondary btn-sm" onClick={markVideoWatched}>Mark as watched</button>
              )}
              {progress?.video_watched && <span className="badge badge-green">✓ Watched</span>}
            </>
          ) : (
            <p className="text-muted text-sm">No video added to this module yet.</p>
          )}
        </div>
      )}

      {tab === 'quiz' && quiz && (
        <QuizView quiz={quiz} questions={questions} moduleId={module.id} userId={userId} onComplete={onProgressUpdate} />
      )}
    </div>
  )
}

export default function AgentTraining() {
  const { profile } = useAuth()
  const [modules, setModules] = useState([])
  const [progress, setProgress] = useState({})
  const [selected, setSelected] = useState(null)

  async function load() {
    if (!profile) return
    const [{ data: mods }, { data: prog }] = await Promise.all([
      supabase.from('modules').select('*').eq('published', true).order('order_index'),
      supabase.from('progress').select('*').eq('user_id', profile.id),
    ])
    setModules(mods || [])
    const map = {}
    ;(prog || []).forEach(p => { map[p.module_id] = p })
    setProgress(map)
    if (mods?.length && !selected) setSelected(mods[0])
  }

  useEffect(() => { load() }, [profile])

  const totalDone = modules.filter(m => progress[m.id]?.quiz_completed).length
  const overallPct = modules.length ? Math.round((totalDone / modules.length) * 100) : 0

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Your induction training</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div className="progress-bar" style={{ width: 200 }}>
              <div className="progress-fill" style={{ width: `${overallPct}%` }} />
            </div>
            <span className="text-sm" style={{ fontWeight: 500 }}>{overallPct}% complete</span>
            <span className="text-sm text-muted">{totalDone}/{modules.length} modules</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card" style={{ padding: '1rem 0' }}>
            {modules.length === 0 && <p className="text-muted text-sm" style={{ padding: '0 1.25rem' }}>No modules published yet.</p>}
            {modules.map((m, i) => {
              const p = progress[m.id]
              const isDone = p?.quiz_completed
              const isActive = selected?.id === m.id
              const isLocked = i > 0 && !progress[modules[i - 1]?.id]?.quiz_completed
              return (
                <div
                  key={m.id}
                  onClick={() => !isLocked && setSelected(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 1.25rem',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    background: isActive ? 'var(--accent-light)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    opacity: isLocked ? 0.5 : 1,
                    transition: 'all 0.1s',
                  }}
                >
                  <div className={`module-num ${isDone ? 'done' : isActive ? 'active' : ''}`}>{isDone ? '✓' : i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--accent-text)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                    {isDone && <div style={{ fontSize: 11, color: 'var(--accent)' }}>Scored {p.quiz_score}%</div>}
                    {isLocked && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Complete previous module</div>}
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (
            <div className="card">
              <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{selected.title}</h2>
                {selected.description && <p className="text-muted text-sm">{selected.description}</p>}
              </div>
              <ModuleDetail module={selected} progress={progress[selected.id]} userId={profile?.id} onProgressUpdate={load} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
