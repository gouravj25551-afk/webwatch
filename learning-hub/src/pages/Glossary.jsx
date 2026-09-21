import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Empty, FileRef } from '../components/ui.jsx'
import { glossary } from '../data/index.js'

export default function Glossary() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const items = [...glossary]
    .sort((a, b) => a.term.localeCompare(b.term))
    .filter((g) => !q || `${g.term} ${g.meaning}`.toLowerCase().includes(q))

  return (
    <div className="page">
      <header className="page-head"><h1>Glossary</h1><span className="muted">{glossary.length} terms</span></header>
      <label className="search">
        <Icon name="search" size={16} />
        <span className="sr-only">Search glossary</span>
        <input type="search" value={query} placeholder="Search terms" onChange={(e) => setQuery(e.target.value)} />
      </label>
      {items.length ? (
        <dl className="glossary">
          {items.map((g) => (
            <div key={g.term} className="card">
              <dt>{g.term}</dt>
              <dd>{g.meaning}</dd>
              {g.example && <dd className="muted"><span className="eyebrow">In WebWatch</span> {g.example}</dd>}
              {g.file && <dd><FileRef file={g.file} /></dd>}
            </div>
          ))}
        </dl>
      ) : (
        <Empty title="No matching term"><button className="btn btn-ghost" onClick={() => setQuery('')}>Clear search</button></Empty>
      )}
    </div>
  )
}
