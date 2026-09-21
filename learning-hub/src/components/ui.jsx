import { useState } from 'react'
import Icon from './Icon.jsx'

const REPO = 'https://github.com/gouravj25551-afk/webwatch/blob/main/'
const STATUS_LABEL = { 'not-started': 'Not started', learning: 'Learning', completed: 'Completed' }

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
}

export function ProgressBar({ value, label }) {
  const pct = Math.round(value * 100)
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function CodeBlock({ code, label }) {
  return (
    <pre className="code" aria-label={label}><code>{code.trim()}</code></pre>
  )
}

// Accepts "path", "path:12" or { path, lines, note }.
export function FileRef({ file }) {
  const ref = typeof file === 'string' ? parseRef(file) : file
  // "31-40" → #L31-L40; for a list like "2, 31-40" link to the first entry.
  const first = ref.lines ? String(ref.lines).split(',')[0].trim() : ''
  const anchor = first ? `#L${first.replace('-', '-L')}` : ''
  return (
    <a className="file-ref" href={`${REPO}${ref.path}${anchor}`} target="_blank" rel="noreferrer">
      <Icon name="file" size={14} />
      <code>{ref.path}{ref.lines ? `:${ref.lines}` : ''}</code>
    </a>
  )
}

function parseRef(value) {
  const [path, lines] = value.split(':')
  return { path, lines }
}

export function FlowDiagram({ steps }) {
  return (
    <ol className="flow">
      {steps.map((step, index) => (
        <li key={step}>
          <span className="flow-step">{step}</span>
          {index < steps.length - 1 && <Icon name="arrow" size={16} />}
        </li>
      ))}
    </ol>
  )
}

const HINT_LABELS = ['Concept', 'Pseudocode', 'Partial code']
// Some hints repeat their label ("Pseudocode: ..."); the heading already shows it.
const stripLabel = (hint) => hint.replace(/^\s*(concept( reminder)?|pseudocode|partial code)\s*:\s*/i, '')

export function Hints({ hints, shown = 0, revealed = false, explanation, onShow, onReveal }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="hints">
      {hints.slice(0, shown).map((hint, index) => (
        <div className="hint" key={HINT_LABELS[index]}>
          <span className="hint-label">Hint {index + 1} · {HINT_LABELS[index]}</span>
          {index === 2 ? <CodeBlock code={stripLabel(hint)} /> : <p>{stripLabel(hint)}</p>}
        </div>
      ))}
      <div className="row">
        {shown < hints.length && (
          <button className="btn" onClick={() => onShow(shown + 1)}>
            <Icon name="bulb" size={16} /> Hint {shown + 1}
          </button>
        )}
        {!revealed && !confirming && (
          <button className="btn btn-ghost" onClick={() => setConfirming(true)}>Reveal explanation</button>
        )}
        {confirming && !revealed && (
          <span className="confirm">
            Pehle khud try kiya?
            <button className="btn btn-ghost" onClick={() => { setConfirming(false); onReveal() }}>Yes, reveal</button>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Not yet</button>
          </span>
        )}
      </div>
      {revealed && (
        <div className="explanation">
          <h4>Line by line</h4>
          {explanation.map((line) => (
            <div className="explain-line" key={line.code}>
              <code>{line.code}</code>
              <p>{line.why}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  )
}
