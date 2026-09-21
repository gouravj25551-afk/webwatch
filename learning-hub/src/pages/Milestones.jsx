import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Empty, StatusBadge } from '../components/ui.jsx'
import { milestones } from '../data/index.js'
import { formatMinutes, summarize } from '../lib/derive.js'
import { statusOf, useProgress } from '../lib/progress.jsx'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'not-started', label: 'Not started' },
  { value: 'learning', label: 'Learning' },
  { value: 'completed', label: 'Completed' },
]

function matches(m, query) {
  if (!query) return true
  const haystack = [
    m.title, m.summary, m.subject, ...m.terms.map((t) => t.term), ...m.files.map((f) => f.path),
  ].join(' ').toLowerCase()
  return query.toLowerCase().split(/\s+/).every((word) => haystack.includes(word))
}

export default function Milestones() {
  const { state } = useProgress()
  const [params, setParams] = useSearchParams()
  // Local state is the source of truth; the URL mirrors it so a search can be shared or refreshed.
  const [query, setQuery] = useState(params.get('q') || '')
  const [filter, setFilter] = useState(params.get('status') || 'all')
  const current = summarize(state).current

  useEffect(() => {
    const next = {}
    if (query) next.q = query
    if (filter !== 'all') next.status = filter
    setParams(next, { replace: true })
  }, [query, filter, setParams])

  const visible = milestones.filter((m) => matches(m, query) && (filter === 'all' || statusOf(state.milestones[m.id]) === filter))

  return (
    <div className="page">
      <header className="page-head">
        <h1>Milestones</h1>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search milestones</span>
          <input type="search" value={query} placeholder="Search topics, terms, files" onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="segmented" role="radiogroup" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f.value} role="radio" aria-checked={filter === f.value} className={filter === f.value ? 'active' : ''} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="cards">
          {visible.map((m) => {
            const status = statusOf(state.milestones[m.id])
            return (
              <Link key={m.id} to={`/milestones/${m.id}`} className={`card milestone-card ${current?.id === m.id ? 'is-current' : ''}`}>
                <div className="card-top">
                  <span className="num">{String(m.number).padStart(2, '0')}</span>
                  {current?.id === m.id ? <span className="badge badge-current">Recommended</span> : <StatusBadge status={status} />}
                </div>
                <h3>{m.title}</h3>
                <p className="muted">{m.summary}</p>
                <div className="card-meta"><span>{m.phase}</span><span>{formatMinutes(m.estMinutes)}</span></div>
              </Link>
            )
          })}
        </div>
      ) : (
        <Empty title="No milestones match">
          <button className="btn btn-ghost" onClick={() => { setQuery(''); setFilter('all') }}>Clear search and filter</button>
        </Empty>
      )}
    </div>
  )
}
