import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminModules from './pages/AdminModules'
import AdminAgents from './pages/AdminAgents'
import AdminProgress from './pages/AdminProgress'
import AgentTraining from './pages/AgentTraining'
import './index.css'

function RequireAuth({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-2)', fontFamily: 'var(--font)' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to={profile?.role === 'admin' ? '/admin' : '/training'} replace />
  return children
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/training'} /> : <Login />} />
      <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/modules" element={<RequireAuth role="admin"><AdminModules /></RequireAuth>} />
      <Route path="/admin/agents" element={<RequireAuth role="admin"><AdminAgents /></RequireAuth>} />
      <Route path="/admin/progress" element={<RequireAuth role="admin"><AdminProgress /></RequireAuth>} />
      <Route path="/training" element={<RequireAuth role="agent"><AgentTraining /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
