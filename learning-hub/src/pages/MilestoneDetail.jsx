import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Question from '../components/Quiz.jsx'
import { CodeBlock, Empty, FileRef, FlowDiagram, Hints, StatusBadge } from '../components/ui.jsx'
import { gapById, milestoneById, milestones } from '../data/index.js'
import { CONFIDENCE, formatMinutes, summarize } from '../lib/derive.js'
import { statusOf, useProgress } from '../lib/progress.jsx'

const SECTIONS = [
  ['overview', 'Overview'], ['terms', 'Terms'], ['files', 'Files'], ['examples', 'Examples'],
  ['exercise', 'Exercise'], ['checklist', 'Checklist'], ['debug', 'Debugging'], ['quiz', 'Quiz'], ['wrap', 'Wrap-up'],
]

function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function MilestoneDetail() {
  const { id } = useParams()
  const m = milestoneById[id]
  const { state, milestone, setMilestone } = useProgress()
  if (!m) {
    return <div className="page"><Empty title="Milestone not found"><Link className="btn" to="/milestones">All milestones</Link></Empty></div>
  }

  const entry = milestone(m.id)
  const status = statusOf(entry)
  const checks = entry.checks || {}
  const allChecked = m.checklist.every((_, i) => checks[i])
  const current = summarize(state).current
  const index = milestones.indexOf(m)
  const prev = milestones[index - 1]
  const next = milestones[index + 1]

  return (
    <div className="page detail" key={m.id}>
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/milestones">Milestones</Link><span>/</span><span>{m.number}</span></nav>
      <header className="page-head">
        <div>
          <span className="eyebrow">{m.phase} · {m.subject} · {formatMinutes(m.estMinutes)}</span>
          <h1>{m.title}</h1>
          <p className="lead">{m.summary}</p>
        </div>
        <StatusBadge status={status} />
      </header>

      {current && current.id !== m.id && status !== 'completed' && (
        <p className="notice"><Icon name="warn" size={16} />Recommended order: pehle <Link to={`/milestones/${current.id}`}>{current.number}. {current.title}</Link> finish karo.</p>
      )}

      {status === 'not-started' && (
        <button className="btn btn-primary" onClick={() => setMilestone(m.id, { status: 'learning', startedAt: Date.now() })}>Start learning</button>
      )}

      <div className="section-nav" role="navigation" aria-label="Sections">
        {SECTIONS.map(([sid, label]) => <button key={sid} onClick={() => jump(sid)}>{label}</button>)}
      </div>

      <section id="overview" className="card">
        <h2>Overview</h2>
        {m.hinglish.map((p) => <p key={p}>{p}</p>)}
        <h3>Why WebWatch needs it</h3>
        <p>{m.why}</p>
        {m.prerequisites.length > 0 && (<><h3>Learn first</h3><ul className="bullets">{m.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul></>)}
        <h3>Flow</h3>
        <FlowDiagram steps={m.flow} />
      </section>

      <section id="terms" className="card">
        <h2>Terms</h2>
        <dl className="terms">
          {m.terms.map((t) => <div key={t.term}><dt>{t.term}</dt><dd>{t.meaning}</dd></div>)}
        </dl>
      </section>

      <section id="files" className="card">
        <h2>WebWatch files</h2>
        <ul className="files">
          {m.files.map((f) => <li key={`${f.path}${f.lines}`}><FileRef file={f} /><span>{f.note}</span></li>)}
        </ul>
        {m.gaps?.length > 0 && (
          <div className="gaps-inline">
            <h3>Project gaps here</h3>
            {m.gaps.filter((g) => gapById[g]).map((g) => (
              <Link key={g} to="/launch" className="gap-link"><Icon name="warn" size={14} />{gapById[g].title}</Link>
            ))}
          </div>
        )}
      </section>

      <section id="examples" className="card">
        <h2>Examples</h2>
        {m.examples.map((ex) => (
          <div className="example" key={ex.title}>
            <h3>{ex.title}</h3>
            <CodeBlock code={ex.code} />
            <ul className="bullets">{ex.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        ))}
      </section>

      <section id="exercise" className="card exercise">
        <span className="eyebrow">Practical exercise · {m.exercise.minutes} min</span>
        <h2>{m.exercise.title}</h2>
        <p>{m.exercise.goal}</p>
        <p className="muted"><strong>Where:</strong> {m.exercise.where}</p>
        {m.exercise.input && (<><h3>Input</h3><CodeBlock code={m.exercise.input} /></>)}
        {m.exercise.output && (<><h3>Expected output</h3><CodeBlock code={m.exercise.output} /></>)}
        <h3>Steps</h3>
        <ol className="steps">{m.exercise.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <Hints
          hints={m.exercise.hints}
          shown={entry.hints || 0}
          revealed={entry.revealed}
          explanation={m.exercise.explanation}
          onShow={(n) => setMilestone(m.id, { hints: n })}
          onReveal={() => setMilestone(m.id, { revealed: true })}
        />
      </section>

      <section id="checklist" className="card">
        <h2>Acceptance checklist</h2>
        <ul className="checklist">
          {m.checklist.map((item, i) => (
            <li key={item}>
              <label>
                <input type="checkbox" checked={!!checks[i]} disabled={status === 'completed'}
                  onChange={(e) => setMilestone(m.id, { checks: { ...checks, [i]: e.target.checked }, status: status === 'not-started' ? 'learning' : status })} />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
        <fieldset className="confidence-pick">
          <legend>Confidence</legend>
          {[1, 2, 3].map((n) => (
            <label key={n} className={entry.confidence === n ? 'active' : ''}>
              <input type="radio" name={`conf-${m.id}`} checked={entry.confidence === n} onChange={() => setMilestone(m.id, { confidence: n })} />
              {CONFIDENCE[n]}
            </label>
          ))}
        </fieldset>
        {status === 'completed' ? (
          <div className="complete-box">
            <span className="ok-text"><Icon name="check" size={16} />Completed</span>
            <button className="btn btn-ghost" onClick={() => setMilestone(m.id, { status: 'learning', completedAt: null })}>Reopen</button>
          </div>
        ) : (
          <div className="complete-box">
            <button className="btn btn-primary" disabled={!allChecked} onClick={() => setMilestone(m.id, { status: 'completed', completedAt: Date.now() })}>
              Mark milestone complete
            </button>
            {!allChecked && <span className="muted small">Saare checklist items tick karo pehle.</span>}
          </div>
        )}
      </section>

      <section id="debug" className="card">
        <h2>Common mistakes</h2>
        <dl className="terms">
          {m.mistakes.map((x) => <div key={x.mistake}><dt>{x.mistake}</dt><dd>{x.fix}</dd></div>)}
        </dl>
        <h3>Debugging steps</h3>
        <ol className="steps">{m.debugging.map((d) => <li key={d}>{d}</li>)}</ol>
      </section>

      <section id="quiz" className="card">
        <h2>Quiz</h2>
        {m.quiz.map((q, i) => <Question key={q.id} question={q} number={i + 1} />)}
      </section>

      <section id="wrap" className="card">
        <h2>Reflection</h2>
        <p>{m.reflection}</p>
        <Reflection value={entry.reflection || ''} onSave={(text) => setMilestone(m.id, { reflection: text })} />
        <h3>Suggested commit</h3>
        <CodeBlock code={`git commit -m "${m.commit}"`} />
        <h3>Resume value</h3>
        <ul className="bullets">{m.resume.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>

      <nav className="pager" aria-label="Milestone navigation">
        {prev ? <Link to={`/milestones/${prev.id}`}>← {prev.title}</Link> : <span />}
        {next ? <Link to={`/milestones/${next.id}`}>{next.title} →</Link> : <span />}
      </nav>
    </div>
  )
}

function Reflection({ value, onSave }) {
  const [text, setText] = useState(value)
  const saved = text === value
  return (
    <div className="reflection">
      <label className="sr-only" htmlFor="reflection">Your reflection</label>
      <textarea id="reflection" rows="4" value={text} placeholder="Apne shabdon mein…" onChange={(e) => setText(e.target.value)} />
      <button className="btn" disabled={saved} onClick={() => onSave(text)}>{saved && value ? 'Saved' : 'Save'}</button>
    </div>
  )
}
