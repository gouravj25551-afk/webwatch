import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Empty, ProgressBar, StatusBadge } from '../components/ui.jsx'
import { milestones } from '../data/index.js'
import { CONFIDENCE, formatMinutes, summarize } from '../lib/derive.js'
import { statusOf, useProgress } from '../lib/progress.jsx'

export default function Dashboard() {
  const { state } = useProgress()
  const s = summarize(state)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Dashboard</h1>
      </header>

      <section className="stats">
        <div className="stat">
          <span>Overall progress</span>
          <strong>{Math.round(s.progress * 100)}%</strong>
          <ProgressBar value={s.progress} label="Overall progress" />
        </div>
        <div className="stat"><span>Milestones</span><strong>{s.completed.length}/{milestones.length}</strong></div>
        <div className="stat"><span>Tasks done</span><strong>{s.tasksDone}/{s.tasksTotal}</strong></div>
        <div className="stat"><span>Time left</span><strong>{formatMinutes(s.remainingMinutes)}</strong></div>
      </section>

      {s.current ? (
        <section className="card hero">
          <div>
            <span className="eyebrow">Current milestone · {s.current.number}</span>
            <h2>{s.current.title}</h2>
            <p className="muted">{s.current.summary}</p>
            <div className="next-task">
              <span className="eyebrow">Next task</span>
              <strong>{s.current.exercise.title}</strong>
              <span className="muted"> · {s.current.exercise.minutes} min</span>
            </div>
          </div>
          <Link className="btn btn-primary" to={`/milestones/${s.current.id}`}>
            Continue learning <Icon name="arrow" size={16} />
          </Link>
        </section>
      ) : (
        <section className="card hero done">
          <div>
            <span className="eyebrow">All milestones complete</span>
            <h2>You can explain WebWatch end to end.</h2>
          </div>
          <Link className="btn btn-primary" to="/launch">Launch readiness</Link>
        </section>
      )}

      <div className="grid-2">
        <section className="card">
          <h3>Confidence by subject</h3>
          <ul className="confidence">
            {s.confidence.map(({ subject, level }) => (
              <li key={subject}>
                <span>{subject}</span>
                <span className="meter" aria-label={`${subject}: ${CONFIDENCE[level] || 'not rated'}`}>
                  {[1, 2, 3].map((n) => <i key={n} className={n <= level ? 'on' : ''} />)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h3>Recently completed</h3>
          {s.recent.length ? (
            <ul className="list-links">
              {s.recent.map((item) => <li key={item.key}><Link to={item.to}><Icon name="check" size={14} />{item.label}</Link></li>)}
            </ul>
          ) : (
            <Empty title="Nothing yet">
              <p className="muted">Pehla milestone complete karo — yahan dikhega.</p>
            </Empty>
          )}
        </section>
      </div>

      <section className="card">
        <h3>Milestones</h3>
        <ol className="track">
          {milestones.map((m) => {
            const status = statusOf(state.milestones[m.id])
            return (
              <li key={m.id} className={`track-item ${status} ${s.current?.id === m.id ? 'current' : ''}`}>
                <Link to={`/milestones/${m.id}`} title={m.title} aria-label={`${m.number}. ${m.title}: ${status}`}>{m.number}</Link>
              </li>
            )
          })}
        </ol>
        <p className="muted small">Filled = completed · ring = recommended now</p>
      </section>

      <section className="card">
        <h3>Resume skills earned</h3>
        {s.resume.length ? (
          <ul className="bullets">{s.resume.map((line) => <li key={line}>{line}</li>)}</ul>
        ) : (
          <Empty title="No skills earned yet">
            <p className="muted">Milestone complete karne par uski honest resume lines yahan judengi.</p>
          </Empty>
        )}
      </section>

      {s.completed.length > 0 && (
        <section className="card">
          <h3>Completed milestones</h3>
          <div className="chips">
            {s.completed.map((m) => <Link key={m.id} className="chip" to={`/milestones/${m.id}`}><StatusBadge status="completed" />{m.title}</Link>)}
          </div>
        </section>
      )}
    </div>
  )
}
