import { useState } from 'react'
import { FileRef } from '../components/ui.jsx'
import { gaps, launch } from '../data/index.js'

const LABEL = { Implemented: 'Implemented', Partial: 'Partially implemented', Missing: 'Missing', Verify: 'Needs verification' }

export default function Launch() {
  const [filter, setFilter] = useState('all')
  const counts = Object.keys(LABEL).map((key) => [key, launch.filter((i) => i.status === key).length])
  const items = launch.filter((i) => filter === 'all' || i.status === filter)

  return (
    <div className="page">
      <header className="page-head"><h1>Launch readiness</h1></header>
      <p className="muted small">Labels come from the repository at commit 562818e. Evidence = fact found in code; Next = recommendation.</p>

      <div className="segmented" role="radiogroup" aria-label="Filter by status">
        <button role="radio" aria-checked={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All {launch.length}</button>
        {counts.map(([key, n]) => (
          <button key={key} role="radio" aria-checked={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{LABEL[key]} {n}</button>
        ))}
      </div>

      <div className="stack">
        {items.map((item) => (
          <article key={item.area} className="card launch-item">
            <header>
              <h3>{item.area}</h3>
              <span className={`badge status-${item.status.toLowerCase()}`}>{LABEL[item.status]}</span>
            </header>
            <p><span className="eyebrow">Evidence</span> {item.evidence}</p>
            {item.next !== '—' && <p className="muted"><span className="eyebrow">Next</span> {item.next}</p>}
            <div className="row wrap">{item.files.map((f) => <FileRef key={f} file={f} />)}</div>
          </article>
        ))}
      </div>

      <h2 className="section-title">Project gaps</h2>
      <div className="stack">
        {gaps.map((gap) => (
          <article key={gap.id} className="card gap" id={gap.id}>
            <header>
              <h3>{gap.title}</h3>
              <span className={`badge sev-${gap.severity.split(' ')[0].toLowerCase()}`}>{gap.severity}</span>
            </header>
            <p><span className="eyebrow">Fact</span> {gap.evidence}</p>
            <p className="muted"><span className="eyebrow">Recommendation</span> {gap.recommendation}</p>
            <div className="row wrap">{gap.files.map((f) => <FileRef key={f} file={f} />)}</div>
          </article>
        ))}
      </div>
    </div>
  )
}
