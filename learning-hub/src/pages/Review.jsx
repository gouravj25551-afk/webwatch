import { useState } from 'react'
import { Link } from 'react-router-dom'
import Question from '../components/Quiz.jsx'
import { Empty } from '../components/ui.jsx'
import { allQuestions, milestones } from '../data/index.js'
import { useProgress } from '../lib/progress.jsx'

const KINDS = [
  ['all', 'All'], ['mcq', 'Multiple choice'], ['predict', 'Predict'], ['bug', 'Find the bug'],
  ['trace', 'Trace'], ['match', 'Match'], ['explain', 'Explain'],
]

export default function Review() {
  const { state } = useProgress()
  const [kind, setKind] = useState('all')
  const [onlyReview, setOnlyReview] = useState(false)

  const answered = allQuestions.filter((q) => state.quiz[q.id]?.answered)
  const correct = answered.filter((q) => state.quiz[q.id].correct)

  const keep = (q) => (kind === 'all' || q.kind === kind) && (!onlyReview || (state.quiz[q.id]?.answered && !state.quiz[q.id].correct))
  const groups = milestones.map((m) => ({ m, questions: m.quiz.filter(keep) })).filter((g) => g.questions.length)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Quiz & review</h1>
        <span className="muted">{correct.length} correct · {answered.length}/{allQuestions.length} answered</span>
      </header>

      <div className="toolbar">
        <label className="select">
          <span className="sr-only">Question type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} />
          Only answers to review
        </label>
      </div>

      {groups.length ? groups.map(({ m, questions }) => (
        <section key={m.id} className="card">
          <h2><Link to={`/milestones/${m.id}`}>{m.number}. {m.title}</Link></h2>
          {questions.map((q) => <Question key={q.id} question={q} />)}
        </section>
      )) : (
        <Empty title={onlyReview ? 'Nothing to review' : 'No questions of this type'}>
          <p className="muted">{onlyReview ? 'Saare attempted answers sahi hain.' : 'Doosra type chuno.'}</p>
        </Empty>
      )}
    </div>
  )
}
