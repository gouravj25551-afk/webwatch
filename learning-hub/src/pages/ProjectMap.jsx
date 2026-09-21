import { useState } from 'react'
import { FileRef } from '../components/ui.jsx'
import { edges, nodes } from '../data/index.js'

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))

export default function ProjectMap() {
  const [selected, setSelected] = useState('api')
  const node = byId[selected]
  const linked = new Set(edges.filter((e) => e.includes(selected)).flat())

  return (
    <div className="page">
      <header className="page-head"><h1>Project map</h1></header>

      <div className="map-layout">
        <div className="map" role="group" aria-label="WebWatch components">
          <svg className="map-lines" viewBox="0 0 100 84" preserveAspectRatio="none" aria-hidden="true">
            {edges.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={byId[a].x + 9} y1={byId[a].y} x2={byId[b].x + 9} y2={byId[b].y}
                className={a === selected || b === selected ? 'hot' : ''} />
            ))}
          </svg>
          {nodes.map((n) => (
            <button key={n.id} style={{ left: `${n.x}%`, top: `${(n.y / 84) * 100}%` }}
              className={`map-node ${selected === n.id ? 'active' : ''} ${linked.has(n.id) ? 'linked' : ''}`}
              aria-pressed={selected === n.id} onClick={() => setSelected(n.id)}>
              {n.label}
            </button>
          ))}
        </div>

        <div className="map-list" role="group" aria-label="WebWatch components">
          {nodes.map((n) => (
            <button key={n.id} className={`chip ${selected === n.id ? 'active' : ''}`} aria-pressed={selected === n.id} onClick={() => setSelected(n.id)}>{n.label}</button>
          ))}
        </div>

        <section className="card map-detail" aria-live="polite">
          <h2>{node.label}</h2>
          <p>{node.does}</p>
          <h3>Why it exists</h3>
          <p>{node.why}</p>
          <div className="io">
            <div><span className="eyebrow">Input</span><code>{node.input}</code></div>
            <div><span className="eyebrow">Output</span><code>{node.output}</code></div>
          </div>
          {node.files.length > 0 && (<><h3>Files</h3><ul className="files">{node.files.map((f) => <li key={f}><FileRef file={f} /></li>)}</ul></>)}
          <h3>What can fail</h3>
          <ul className="bullets">{node.fails.map((f) => <li key={f}>{f}</li>)}</ul>
          <h3>How to debug</h3>
          <ul className="bullets">{node.debug.map((d) => <li key={d}>{d}</li>)}</ul>
        </section>
      </div>
    </div>
  )
}
