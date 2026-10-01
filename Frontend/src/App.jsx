import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

function cookieValue(name) {
  return document.cookie.split('; ').find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || ''
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(!['GET', 'HEAD'].includes(options.method || 'GET') ? { 'X-CSRF-Token': cookieValue('webwatch_csrf') } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }
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

function AuthScreen({ onAuthenticated, apiOnline, accountEmailsEnabled }) {
  const [mode, setMode] = useState('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const data = await api('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
        setMessage(data.message)
        return
      }
      const data = await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (data.verificationRequired) {
        setMessage(data.message)
        setMode('login')
      } else {
        onAuthenticated(data.user)
      }
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
          <span className="eyebrow">Always-on website monitoring</span>
          <h1>Keep every important website <em>within reach.</em></h1>
          <p>WebWatch quietly checks your websites around the clock, then alerts you the moment something needs your attention.</p>
          <ul>
            <li><b>5 min</b> checks</li>
            <li><b>Instant</b> email alerts</li>
            <li><b>$1</b> per site / month</li>
          </ul>
          <div className="landing-signal" aria-label="Example operational website status">
            <div className="signal-top"><span><i /> All systems operational</span><small>LIVE</small></div>
            <div className="signal-site"><span className="site-mark">W</span><div><b>yourwebsite.com</b><small>Checked just now</small></div><strong>99.98%</strong></div>
            <div className="signal-bars">{Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ height: `${28 + ((index * 17) % 52)}%` }} />)}</div>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-tabs">
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Log in</button>
          </div>
          <h2>{mode === 'register' ? 'Start site monitoring' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h2>
          <p className="subtle">{mode === 'register' ? 'Create an account to manage your site monitors.' : mode === 'forgot' ? 'We will email you a secure reset link.' : 'Log in to see your monitors.'}</p>
          <form onSubmit={submit}>
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label>
            {mode !== 'forgot' && <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" minLength="10" maxLength="72" required /></label>}
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <button className="primary wide" disabled={loading || !apiOnline}>{loading ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Log in'}</button>
          </form>
          {mode === 'login' && accountEmailsEnabled && <button className="auth-link" onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>Forgot password?</button>}
          {mode === 'forgot' && <button className="auth-link" onClick={() => { setMode('login'); setError(''); setMessage('') }}>Back to login</button>}
          <p className="tiny">Start with the exact number of website slots you need.</p>
        </section>
      </main>
      <footer className="legal-links"><a href="/privacy.html">Privacy</a><a href="/terms.html">Service terms</a><a href="https://github.com/gouravj25551-afk/webwatch" target="_blank" rel="noreferrer">GitHub</a></footer>
    </div>
  )
}

function AccountAction({ type, token, apiOnline, onAuthenticated, onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(type === 'verify' || type === 'alertVerify')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (type !== 'verify' && type !== 'alertVerify') return
    api(type === 'alertVerify' ? '/api/monitors/verify-alert-email' : '/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
      .then((data) => {
        setMessage(data.message)
        if (data.user) onAuthenticated(data.user)
        window.history.replaceState({}, document.title, window.location.pathname)
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [type, token, onAuthenticated])

  async function resetPassword(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const data = await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setMessage(data.message)
      onAuthenticated(data.user)
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="landing-nav"><div className="brand"><span className="brand-mark"><PulseIcon /></span><span>WebWatch</span></div><span className={`api-pill ${apiOnline ? 'online' : 'offline'}`}><i />{apiOnline ? 'API online' : 'API offline'}</span></header>
      <main className="account-action-layout">
        <section className="auth-card account-action-card">
          <span className="eyebrow">Account security</span>
          <h2>{type === 'verify' ? 'Verifying your email' : type === 'alertVerify' ? 'Confirming alert email' : 'Choose a new password'}</h2>
          {(type === 'verify' || type === 'alertVerify') && loading && <p className="subtle">Checking your secure link…</p>}
          {type === 'reset' && !message && (
            <form onSubmit={resetPassword}>
              <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="10" maxLength="72" required /></label>
              <label>Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="10" maxLength="72" required /></label>
              <button className="primary wide" disabled={loading || !apiOnline}>{loading ? 'Updating…' : 'Update password'}</button>
            </form>
          )}
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}{type === 'alertVerify' ? '' : ' Opening your dashboard…'}</p>}
          {error && <button className="auth-link" onClick={onDone}>Back to login</button>}
        </section>
      </main>
    </div>
  )
}

function DodoCheckoutModal({ open, onClose }) {
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)

  if (!open) return null

  async function handleCheckout() {
    setCheckoutLoading(true)
    setError('')
    try {
      const data = await api('/api/billing/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      })

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('Could not initiate checkout session')
      }
    } catch (err) {
      setError(err.message)
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal checkout-modal" role="dialog" aria-modal="true">
        <button className="icon-button close" onClick={onClose} aria-label="Close">×</button>
        <span className="eyebrow">WebWatch monitoring plan</span>
        <h2>Choose your website slots</h2>

        <label>
          Websites to monitor
          <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 10].map((value) => <option key={value} value={value}>{value} website{value === 1 ? '' : 's'}</option>)}
          </select>
        </label>

        <div className="price-hero">
          <div className="price-val">${(quantity * 1).toFixed(2)} <span>USD / month</span></div>
          <p className="price-sub">${quantity}/month for {quantity} website{quantity === 1 ? '' : 's'} · cancel anytime</p>
        </div>

        <ul className="checkout-features">
          <li><i>✓</i> 24/7 Uptime checks every 5 minutes</li>
          <li><i>✓</i> Instant email alerts on downtime</li>
          <li><i>✓</i> 30-day response time & incident tracking</li>
          <li><i>✓</i> Secure payment via Dodo Payments</li>
        </ul>

        {error && <p className="form-error">{error}</p>}

        <button className="buy-slot-btn wide" onClick={handleCheckout} disabled={checkoutLoading}>
          {checkoutLoading ? 'Preparing Dodo Checkout…' : `Continue to secure checkout · $${quantity}/month`}
        </button>

        <div className="dodo-badge">
          <span>🔒 Secured by Dodo Payments MoR</span>
        </div>
      </section>
    </div>
  )
}

function AddMonitor({ user, billingSummary, onCreated, onRefreshBilling }) {
  const [open, setOpen] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', alertEmail: user.email, alertOnDown: true, alertOnRecovery: true, intervalMinutes: 5 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableSlots = billingSummary ? billingSummary.availableSlots : 0
  const billingEnabled = billingSummary?.billingEnabled === true

  function handleOpenClick() {
    if (availableSlots <= 0 && billingEnabled) {
      setShowPaywall(true)
    } else {
      setOpen(true)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api('/api/monitors', { method: 'POST', body: JSON.stringify(form) })
      onCreated(data.monitor)
      if (onRefreshBilling) onRefreshBilling()
      setForm({ name: '', url: '', alertEmail: user.email, alertOnDown: true, alertOnRecovery: true, intervalMinutes: 5 })
      setOpen(false)
    } catch (requestError) {
      if (requestError.status === 402 || (requestError.data && requestError.data.requiresPayment)) {
        setOpen(false)
        setShowPaywall(true)
      } else {
        setError(requestError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {availableSlots === 0 && billingEnabled ? (
          <button className="buy-slot-btn" onClick={() => setShowPaywall(true)}>
            + Add a website slot ($1/month)
          </button>
        ) : (
          <button className="primary" onClick={handleOpenClick}>
            + Add monitor
          </button>
        )}
      </div>

      <DodoCheckoutModal open={showPaywall} onClose={() => setShowPaywall(false)} user={user} />

      {open && (
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
              <label>Alert email <small>Use your account email or another address you control.</small><input type="email" value={form.alertEmail} onChange={(event) => setForm({ ...form, alertEmail: event.target.value })} required /></label>
              <div className="alert-preferences">
                <span>Send me:</span>
                <label><input type="checkbox" checked={form.alertOnDown} onChange={(event) => setForm({ ...form, alertOnDown: event.target.checked })} /> Downtime alerts</label>
                <label><input type="checkbox" checked={form.alertOnRecovery} onChange={(event) => setForm({ ...form, alertOnRecovery: event.target.checked })} /> Recovery alerts</label>
              </div>
              {form.alertEmail.trim().toLowerCase() !== user.email.toLowerCase() && <p className="subtle">We will send a confirmation link to this address. Monitoring starts after it is confirmed.</p>}
              <label>Check every<select value={form.intervalMinutes} onChange={(event) => setForm({ ...form, intervalMinutes: Number(event.target.value) })}><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></label>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button><button className="primary" disabled={loading}>{loading ? 'Creating and checking…' : 'Start monitoring'}</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

function MonitorCard({ monitor, busy, onCheck, onTestAlert, onToggle, onDelete, onHistory }) {
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
        <span>Every {monitor.intervalMinutes} min · Alerts to {monitor.alertEmail}{monitor.alertEmailVerified ? '' : ' (confirmation pending)'}</span>
        <div className="card-actions">
          <button className="text-button" onClick={() => onHistory(monitor)} disabled={busy}>History</button>
          <button className="text-button" onClick={() => onCheck(monitor.id)} disabled={busy || !monitor.enabled}>{busy ? 'Working…' : 'Check now'}</button>
          <button className="text-button" onClick={() => onTestAlert(monitor.id)} disabled={busy || !monitor.alertEmailVerified}>{busy ? 'Working…' : 'Test alert'}</button>
          <button className="text-button" onClick={() => onToggle(monitor)} disabled={busy}>{monitor.enabled ? 'Pause' : 'Resume'}</button>
          <button className="text-button danger" onClick={() => onDelete(monitor)} disabled={busy}>Delete</button>
        </div>
      </div>
    </article>
  )
}

function IntegrationsPanel() {
  const [slack, setSlack] = useState(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await api('/api/integrations')
      setSlack(data.slack)
      setError('')
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function save(event) {
    event.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      await api('/api/integrations/slack', { method: 'PUT', body: JSON.stringify({ webhookUrl }) })
      setWebhookUrl('')
      setMessage('Slack is connected. Use Test alert on any monitor to confirm delivery.')
      await load()
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  async function remove() {
    if (!window.confirm('Disconnect Slack for your account?')) return
    setSaving(true); setError(''); setMessage('')
    try {
      await api('/api/integrations/slack', { method: 'DELETE' })
      setMessage('Slack has been disconnected.')
      await load()
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  return (
    <section className="integrations-panel" id="integrations">
      <div className="integration-heading"><div><span className="eyebrow">Your alert channels</span><h2>Integrations</h2><p>Connect your own Slack channel. Your webhook is encrypted before it is stored.</p></div>{slack?.configured && <span className="status-badge up">Slack connected</span>}</div>
      {loading ? <p className="subtle">Loading integrations…</p> : slack?.configured ? <div className="integration-connected"><span>Slack alerts are on for your monitors.</span><button className="text-button danger" onClick={remove} disabled={saving}>{saving ? 'Working…' : 'Disconnect Slack'}</button></div> : (
        <form className="integration-form" onSubmit={save}>
          <label>Slack Incoming Webhook URL<input type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://hooks.slack.com/services/..." required /></label>
          <button className="primary" disabled={saving}>{saving ? 'Connecting…' : 'Connect Slack'}</button>
        </form>
      )}
      {!slack?.configured && <p className="subtle">In Slack: create an Incoming Webhook, choose your alerts channel, then paste the URL here.</p>}
      {error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
    </section>
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
              <div><h3>Incidents</h3><div className="incident-list">{data.incidents.length ? data.incidents.map((incident) => <div className="incident" key={incident.id}><b>{incident.resolvedAt ? 'Resolved' : 'Ongoing'}</b><span>Started {formatDate(incident.startedAt)}</span><small>{incident.startReason}</small>{incident.notifications?.map((notification) => <small key={notification.id}>Alert {notification.type}: {notification.status.toLowerCase()} · {notification.attempts} attempt(s)</small>)}</div>) : <p className="empty-small">No incidents in this period.</p>}</div></div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Dashboard({ user, onLogout, apiOnline }) {
  const [monitors, setMonitors] = useState([])
  const [billingSummary, setBillingSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [historyMonitor, setHistoryMonitor] = useState(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [notice, setNotice] = useState('')

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    try {
      const [monitorsData, billingData] = await Promise.all([
        api('/api/monitors'),
        api('/api/billing/summary').catch(() => null),
      ])
      setMonitors(monitorsData.monitors)
      if (billingData) setBillingSummary(billingData)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- load remote dashboard data after mount
    loadData(true).finally(() => setLoading(false))
    const timer = setInterval(() => loadData(true), 30_000)
    return () => clearInterval(timer)
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
      const data = await request()
      await loadData(true)
      return data
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

  const billingEnabled = billingSummary?.billingEnabled === true
  const monitorLimit = billingSummary ? billingSummary.monitorLimit : 0
  const availableSlots = billingSummary ? billingSummary.availableSlots : 0

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand inverse"><span className="brand-mark"><PulseIcon /></span><span>WebWatch</span></div>
        <nav>
          <a className="active" href="#monitors">Monitors <span>{monitors.length}</span></a>
          <a href="#incidents">Incidents <span>{stats.down}</span></a>
          <a href="#integrations">Integrations</a>
        </nav>

        <div style={{ marginTop: '24px', padding: '0 8px' }}>
          <div className="slot-badge dark">
            <span>{billingEnabled ? `⚡ Website slots: ${monitors.length} / ${monitorLimit}` : 'Unlimited monitors'}</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <span className={`api-pill dark ${apiOnline ? 'online' : 'offline'}`}><i />{apiOnline ? 'System online' : 'API offline'}</span>
          <p>{user.email}</p>
          <button onClick={onLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">Monitoring workspace</span>
            <h1>Website health, at a glance.</h1>
            <p>Every monitor gets uptime checks, response history, and downtime alerts.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="slot-badge">{billingEnabled ? (availableSlots > 0 ? `${availableSlots} website slot${availableSlots === 1 ? '' : 's'} ready` : '$1 / website / month') : 'Unlimited monitors'}</span>
            <AddMonitor
              user={user}
              billingSummary={billingSummary}
              onCreated={(monitor) => setMonitors((current) => [monitor, ...current])}
              onRefreshBilling={() => loadData(true)}
            />
          </div>
        </header>

        <section className="stat-grid">
          <article><span>Total Monitors</span><strong>{monitors.length}</strong></article>
          <article><span>{billingEnabled ? 'Website slots' : 'Plan'}</span><strong className="green">{billingEnabled ? monitorLimit : 'Unlimited'}</strong></article>
          <article><span>Operational</span><strong className="green">{stats.up}</strong></article>
          <article><span>Down</span><strong className="red">{stats.down}</strong></article>
        </section>

        {error && <p className="page-error">{error}</p>}
        {notice && <p className="form-success page-notice">{notice}</p>}

        <IntegrationsPanel />

        <section className="monitor-list" id="monitors">
          {loading && <div className="empty-state"><span className="spinner dark-spinner" /><h2>Loading monitors…</h2></div>}

          {!loading && !monitors.length && (
            <div className="empty-state">
              <span className="empty-icon"><PulseIcon /></span>
              <h2>No monitors active yet</h2>
              <p>{billingEnabled ? (availableSlots > 0 ? 'Use one of your website slots to start monitoring.' : 'Buy a website slot to begin monitoring.') : 'Add a website or API to start monitoring.'}</p>
              <div style={{ marginTop: '16px' }}>
                {!billingEnabled || availableSlots > 0 ? (
                  <AddMonitor user={user} billingSummary={billingSummary} onCreated={(monitor) => setMonitors((current) => [monitor, ...current])} onRefreshBilling={() => loadData(true)} />
                ) : billingEnabled ? (
                  <button className="buy-slot-btn" onClick={() => setShowBuyModal(true)}>
                    + Add a website slot ($1/month)
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {monitors.map((monitor) => (
            <MonitorCard key={monitor.id} monitor={monitor} busy={busyId === monitor.id} onHistory={setHistoryMonitor} onCheck={(id) => action(id, () => api(`/api/monitors/${id}/check`, { method: 'POST' }))} onTestAlert={(id) => action(id, async () => { const data = await api(`/api/monitors/${id}/test-alert`, { method: 'POST' }); setNotice(data.message); return data })} onToggle={(item) => action(item.id, () => api(`/api/monitors/${item.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !item.enabled }) }))} onDelete={deleteMonitor} />
          ))}
        </section>
      </main>

      {historyMonitor && <HistoryPanel monitor={historyMonitor} onClose={() => setHistoryMonitor(null)} />}
      <DodoCheckoutModal open={showBuyModal} onClose={() => setShowBuyModal(false)} user={user} />
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [apiOnline, setApiOnline] = useState(false)
  const [capabilities, setCapabilities] = useState({ accountEmails: false })
  const [paymentToast, setPaymentToast] = useState(null)
  const [accountAction, setAccountAction] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('verify')) return { type: 'verify', token: params.get('verify') }
    if (params.get('reset')) return { type: 'reset', token: params.get('reset') }
    if (params.get('verify-alert')) return { type: 'alertVerify', token: params.get('verify-alert') }
    return null
  })

  const completeAccountAction = useCallback((authenticatedUser) => {
    setUser(authenticatedUser)
    setAccountAction(null)
  }, [])

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/health').then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) })),
      api('/api/auth/me'),
    ]).then(([health, session]) => {
      setApiOnline(health.status === 'fulfilled' && health.value.ok)
      if (health.status === 'fulfilled' && health.value.data.capabilities) setCapabilities(health.value.data.capabilities)
      if (session.status === 'fulfilled') setUser(session.value.user)
      setBooting(false)
    })

    // Check for Dodo Payments return query params
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'return') {
      const paymentId = params.get('payment_id')

      api('/api/billing/verify-session', {
        method: 'POST',
        body: JSON.stringify({ paymentId }),
      })
        .then((res) => {
          if (res.fulfilled) {
            setPaymentToast('⚡ Payment successful! Your website slot is unlocked.')
          } else {
            setPaymentToast('Payment is processing. Your slot will appear after confirmation.')
          }
        })
        .catch(() => {
          setPaymentToast('We could not confirm this payment yet. Please refresh shortly.')
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname)
        })
    }
  }, [])

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  if (booting) return <div className="boot-screen"><span className="brand-mark"><PulseIcon /></span><p>Starting WebWatch SaaS…</p></div>

  if (accountAction) {
    return <AccountAction {...accountAction} apiOnline={apiOnline} onAuthenticated={completeAccountAction} onDone={() => { setAccountAction(null); window.history.replaceState({}, document.title, window.location.pathname) }} />
  }

  return (
    <>
      {paymentToast && (
        <div className="toast-banner">
          <p>{paymentToast}</p>
          <button onClick={() => setPaymentToast(null)}>Dismiss</button>
        </div>
      )}
      {user ? <Dashboard user={user} onLogout={logout} apiOnline={apiOnline} /> : <AuthScreen onAuthenticated={setUser} apiOnline={apiOnline} accountEmailsEnabled={capabilities.accountEmails} />}
    </>
  )
}

export default App
