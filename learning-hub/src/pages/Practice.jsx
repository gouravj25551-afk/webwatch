import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CodeBlock, FileRef, Hints } from '../components/ui.jsx'
import { milestoneById, practice } from '../data/index.js'
import { useProgress } from '../lib/progress.jsx'

export default function Practice() {
  const { state, setPractice } = useProgress()
  const { hash } = useLocation()
  const [open, setOpen] = useState(hash.slice(1) || null)

  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView() }, [hash])

  const done = practice.filter((p) => state.practice[p.id]?.done).length

  return (
    <div className="page">
      <header className="page-head">
        <h1>Practice lab</h1>
        <span className="muted">{done}/{practice.length} done</span>
      </header>

      <div className="stack">
        {practice.map((p) => {
          const entry = state.practice[p.id] || {}
          const checks = entry.checks || {}
          const isOpen = open === p.id
          const allChecked = p.checklist.every((_, i) => checks[i])
          return (
            <article key={p.id} id={p.id} className={`card lab ${entry.done ? 'is-done' : ''}`}>
              <button className="lab-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>
                <span>
                  <strong>{p.title}</strong>
                  <span className="muted small"> · {p.minutes} min · {p.level}</span>
                </span>
                {entry.done ? <span className="badge badge-completed">Done</span> : <span className="badge badge-not-started">Open</span>}
              </button>
              {isOpen && (
                <div className="lab-body">
                  <p className="muted">{p.context}</p>
                  <div className="row wrap">
                    <FileRef file={p.file} />
                    {milestoneById[p.milestone] && <Link className="small" to={`/milestones/${p.milestone}`}>Milestone: {milestoneById[p.milestone].title}</Link>}
                  </div>
                  <h3>Task</h3>
                  <p>{p.prompt}</p>
                  {p.starter && (<><h3>Starter</h3><CodeBlock code={p.starter} /></>)}
                  {p.expected && (<><h3>Expected</h3><CodeBlock code={p.expected} /></>)}
                  <Hints hints={p.hints} shown={entry.hints || 0} revealed={entry.revealed} explanation={p.explanation}
                    onShow={(n) => setPractice(p.id, { hints: n })} onReveal={() => setPractice(p.id, { revealed: true })} />
                  <ul className="checklist">
                    {p.checklist.map((item, i) => (
                      <li key={item}><label>
                        <input type="checkbox" checked={!!checks[i]} disabled={entry.done} onChange={(e) => setPractice(p.id, { checks: { ...checks, [i]: e.target.checked } })} />
                        <span>{item}</span>
                      </label></li>
                    ))}
                  </ul>
                  {entry.done ? (
                    <button className="btn btn-ghost" onClick={() => setPractice(p.id, { done: false, doneAt: null })}>Reopen</button>
                  ) : (
                    <button className="btn btn-primary" disabled={!allChecked} onClick={() => setPractice(p.id, { done: true, doneAt: Date.now() })}>Mark done</button>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
