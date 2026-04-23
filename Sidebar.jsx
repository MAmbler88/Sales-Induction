import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: '▦' },
  { to: '/admin/modules', label: 'Modules', icon: '▤' },
  { to: '/admin/agents', label: 'Agents', icon: '◎' },
  { to: '/admin/progress', label: 'Progress', icon: '◈' },
]

const agentNav = [
  { to: '/training', label: 'My Training', icon: '▦' },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const nav = profile?.role === 'admin' ? adminNav : agentNav
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">Onboard<span style={{ color: 'var(--accent)' }}>IQ</span></div>
        <div className="logo-sub">{profile?.role === 'admin' ? 'Admin Console' : 'Training Portal'}</div>
      </div>
      <nav>
        {nav.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || profile?.email}
            </div>
            <div className="user-role">{profile?.role}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={signOut} title="Sign out" style={{ padding: '4px 8px' }}>↩</button>
        </div>
      </div>
    </aside>
  )
}
