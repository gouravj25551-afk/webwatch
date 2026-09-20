import { useEffect, useMemo, useState } from 'react'
import './App.css'

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Request failed')
  return data
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 17h6l3-9 6 17 4-12 2 4h5" />
    </svg>
  )
}

function formatDate(value) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status) {
  return { UP: 'Operational', DOWN: 'Down', PAUSED: 'Paused', UNKNOWN: 'Checking' }[status] || status
}

function AuthScreen({ onAuthenticated, apiOnline }) {
  const [mode, setMode] = useState('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      onAuthenticated(data.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="landing-nav">
        <div className="brand"><span className="brand-mark"><PulseIcon /></span><span>WebWatch</span></div>
        <span className={`api-pill ${apiOnline ? 'online' : 'offline'}`}><i />{apiOnline ? 'API online' : 'API offline'}</span>
      </header>
      <main className="auth-layout">
        <section className="auth-copy">
          <span className="eyebrow">Website uptime monitoring</span>
          <h1>Get alerted before your users tell you.</h1>
          <p>WebWatch checks your website automatically, records every response, and alerts you when it goes down or recovers.</p>
          <ul>
            <li><b>5 minute</b> automatic checks</li>
            <li><b>3 attempts</b> before declaring downtime</li>
            <li><b>Email alerts</b> on downtime and recovery</li>
          </ul>
        </section>
        <section className="auth-card">
          <div className="auth-tabs">
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
          </div>
          <h2>{mode === 'register' ? 'Start monitoring for free' : 'Welcome back'}</h2>
          <p className="subtle">{mode === 'register' ? 'Create an account and add your first monitor.' : 'Log in to see your monitors.'}</p>
          <form onSubmit={submit}>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength="8" required /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary wide" disabled={loading || !apiOnline}>{loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}</button>
          </form>
          <p className="tiny">Free beta · Up to 10 monitors · No card required</p>
        </section>
      </main>
    </div>
  )
}

function AddMonitor({ user, onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', alertEmail: user.email, intervalMinutes: 5 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api('/api/monitors', { method: 'POST', body: JSON.stringify(form) })
      onCreated(data.monitor)
      setForm({ name: '', url: '', alertEmail: user.email, intervalMinutes: 5 })
      setOpen(false)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return <button className="primary" onClick={() => setOpen(true)}>+ Add monitor</button>

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
        <button className="icon-button close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        <span className="eyebrow">New monitor</span>
        <h2 id="add-title">Monitor a website or API</h2>
        <form onSubmit={submit}>
          <label>Monitor name <small>optional</small><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="My portfolio" /></label>
          <label>
            Website or API URL
            <input
              type="text"
              inputMode="url"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              placeholder="example.com"
              required
            />
            <small>https:// will be added automatically if you leave it out.</small>
          </label>
          <label>Alert email<input type="email" value={form.alertEmail} onChange={(event) => setForm({ ...form, alertEmail: event.target.value })} required /></label>
          <label>Check every<select value={form.intervalMinutes} onChange={(event) => setForm({ ...form, intervalMinutes: Number(event.target.value) })}><option value="1">1 minute</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button><button className="primary" disabled={loading}>{loading ? 'Creating and checking…' : 'Start monitoring'}</button></div>
        </form>
      </section>
    </div>
  )
}

function MonitorCard({ monitor, busy, onCheck, onToggle, onDelete, onHistory }) {
  return (
    <article className="monitor-card">
      <div className="monitor-head">
        <div className={`status-dot ${monitor.status.toLowerCase()}`} />
        <div className="monitor-title"><h3>{monitor.name}</h3><a href={monitor.url} target="_blank" rel="noreferrer">{monitor.url}</a></div>
        <span className={`status-badge ${monitor.status.toLowerCase()}`}>{statusLabel(monitor.status)}</span>
      </div>
      <div className="monitor-metrics">
        <div><span>30-day uptime</span><strong>{monitor.uptimePercentage == null ? '—' : `${monitor.uptimePercentage}%`}</strong></div>
        <div><span>Response</span><strong>{monitor.lastResponseTimeMs == null ? '—' : `${monitor.lastResponseTimeMs} ms`}</strong></div>
        <div><span>HTTP</span><strong>{monitor.lastStatusCode ?? '—'}</strong></div>
        <div><span>Last checked</span><strong>{formatDate(monitor.lastCheckedAt)}</strong></div>
      </div>
      {monitor.lastError && <p className="monitor-error">{monitor.lastError}</p>}
      <div className="monitor-footer">
        <span>Every {monitor.intervalMinutes} min · Alerts to {monitor.alertEmail}</span>
        <div className="card-actions">
          <button className="text-button" onClick={() => onHistory(monitor)} disabled={busy}>History</button>
          <button className="text-button" onClick={() => onCheck(monitor.id)} disabled={busy || !monitor.enabled}>{busy ? 'Working…' : 'Check now'}</button>
          <button className="text-button" onClick={() => onToggle(monitor)} disabled={busy}>{monitor.enabled ? 'Pause' : 'Resume'}</button>
          <button className="text-button danger" onClick={() => onDelete(monitor)} disabled={busy}>Delete</button>
        </div>
      </div>
    </article>
  )
}

function HistoryPanel({ monitor, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/monitors/${monitor.id}/history?days=7`).then(setData).catch((requestError) => setError(requestError.message))
  }, [monitor.id])

  const chartChecks = data ? [...data.checks].reverse().slice(-36) : []
  const maxTime = Math.max(...chartChecks.map((check) => check.responseTimeMs), 1)

  return (
    <div className="modal-backdrop">
      <section className="modal history-modal" role="dialog" aria-modal="true">
        <button className="icon-button close" onClick={onClose} aria-label="Close">×</button>
        <span className="eyebrow">7-day history</span>
        <h2>{monitor.name}</h2>
        {error && <p className="form-error">{error}</p>}
        {!data && !error && <p className="subtle">Loading history…</p>}
        {data && (
          <>
            <div className="history-summary"><div><span>Uptime</span><strong>{data.uptimePercentage == null ? '—' : `${data.uptimePercentage}%`}</strong></div><div><span>Checks</span><strong>{data.checks.length}</strong></div><div><span>Incidents</span><strong>{data.incidents.length}</strong></div></div>
            <div className="chart-wrap"><div className="chart-label"><span>Response time</span><span>{chartChecks.length} recent checks</span></div><div className="bar-chart">{chartChecks.length ? chartChecks.map((check) => <div key={check.id} className={`bar ${check.isUp ? 'up' : 'down'}`} style={{ height: `${Math.max((check.responseTimeMs / maxTime) * 100, 8)}%` }} title={`${check.responseTimeMs} ms · ${check.statusCode || check.error}`} />) : <p className="empty-small">No checks recorded yet.</p>}</div></div>
            <div className="history-columns">
              <div><h3>Recent checks</h3><div className="event-list">{data.checks.slice(0, 8).map((check) => <div className="event-row" key={check.id}><i className={check.isUp ? 'up' : 'down'} /><span>{formatDate(check.checkedAt)}</span><b>{check.statusCode ?? 'Error'}</b><span>{check.responseTimeMs} ms</span></div>)}</div></div>
              <div><h3>Incidents</h3><div className="incident-list">{data.incidents.length ? data.incidents.map((incident) => <div className="incident" key={incident.id}><b>{incident.resolvedAt ? 'Resolved' : 'Ongoing'}</b><span>Started {formatDate(incident.startedAt)}</span><small>{incident.startReason}</small></div>) : <p className="empty-small">No incidents in this period.</p>}</div></div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Dashboard({ user, onLogout, apiOnline }) {
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [historyMonitor, setHistoryMonitor] = useState(null)

  async function loadMonitors(silent = false) {
    if (!silent) setLoading(true)
    try {
      const data = await api('/api/monitors')
      setMonitors(data.monitors)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    api('/api/monitors')
      .then((data) => {
        if (active) setMonitors(data.monitors)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const timer = setInterval(() => loadMonitors(true), 30_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const stats = useMemo(() => ({
    up: monitors.filter((monitor) => monitor.status === 'UP').length,
    down: monitors.filter((monitor) => monitor.status === 'DOWN').length,
    paused: monitors.filter((monitor) => monitor.status === 'PAUSED').length,
  }), [monitors])

  async function action(id, request) {
    setBusyId(id)
    setError('')
    try {
      await request()
      await loadMonitors(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  function deleteMonitor(monitor) {
    if (!window.confirm(`Delete ${monitor.name} and all its history?`)) return
    action(monitor.id, () => api(`/api/monitors/${monitor.id}`, { method: 'DELETE' }))
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand inverse"><span className="brand-mark"><PulseIcon /></span><span>WebWatch</span></div>
        <nav><a className="active" href="#monitors">Monitors <span>{monitors.length}</span></a><a href="#incidents">Incidents <span>{stats.down}</span></a></nav>
        <div className="sidebar-bottom"><span className={`api-pill dark ${apiOnline ? 'online' : 'offline'}`}><i />{apiOnline ? 'System online' : 'API offline'}</span><p>{user.email}</p><button onClick={onLogout}>Log out</button></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header"><div><span className="eyebrow">Overview</span><h1>Your monitors</h1><p>Automatic checks, incident tracking, and email alerts.</p></div><AddMonitor user={user} onCreated={(monitor) => setMonitors((current) => [monitor, ...current])} /></header>
        <section className="stat-grid"><article><span>Total monitors</span><strong>{monitors.length}</strong></article><article><span>Operational</span><strong className="green">{stats.up}</strong></article><article><span>Down</span><strong className="red">{stats.down}</strong></article><article><span>Paused</span><strong>{stats.paused}</strong></article></section>
        {error && <p className="page-error">{error}</p>}
        <section className="monitor-list" id="monitors">
          {loading && <div className="empty-state"><span className="spinner dark-spinner" /><h2>Loading monitors…</h2></div>}
          {!loading && !monitors.length && <div className="empty-state"><span className="empty-icon"><PulseIcon /></span><h2>No monitors yet</h2><p>Add your first website to start automatic uptime checks.</p></div>}
          {monitors.map((monitor) => <MonitorCard key={monitor.id} monitor={monitor} busy={busyId === monitor.id} onHistory={setHistoryMonitor} onCheck={(id) => action(id, () => api(`/api/monitors/${id}/check`, { method: 'POST' }))} onToggle={(item) => action(item.id, () => api(`/api/monitors/${item.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !item.enabled }) }))} onDelete={deleteMonitor} />)}
        </section>
      </main>
      {historyMonitor && <HistoryPanel monitor={historyMonitor} onClose={() => setHistoryMonitor(null)} />}
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [apiOnline, setApiOnline] = useState(false)

  useEffect(() => {
    Promise.allSettled([fetch('/api/health').then((response) => response.ok), api('/api/auth/me')]).then(([health, session]) => {
      setApiOnline(health.status === 'fulfilled' && health.value)
      if (session.status === 'fulfilled') setUser(session.value.user)
      setBooting(false)
    })
  }, [])

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  if (booting) return <div className="boot-screen"><span className="brand-mark"><PulseIcon /></span><p>Starting WebWatch…</p></div>
  return user ? <Dashboard user={user} onLogout={logout} apiOnline={apiOnline} /> : <AuthScreen onAuthenticated={setUser} apiOnline={apiOnline} />
}

export default App
