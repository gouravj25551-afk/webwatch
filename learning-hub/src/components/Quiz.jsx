import { useMemo, useState } from 'react'
import { useProgress } from '../lib/progress.jsx'
import { CodeBlock } from './ui.jsx'

const KIND_LABEL = {
  mcq: 'Multiple choice', predict: 'Predict the output', bug: 'Find the bug',
  trace: 'Trace the request', match: 'Match', explain: 'Explain in your own words',
}

export default function Question({ question, number }) {
  const { state, setQuiz } = useProgress()
  const saved = state.quiz[question.id]
  const record = (correct, extra = {}) => setQuiz(question.id, { correct, answered: true, ...extra })

  return (
    <article className="question">
      <header>
        <span className="eyebrow">{number ? `Q${number} · ` : ''}{KIND_LABEL[question.kind]}</span>
        {saved?.answered && <span className={`result-dot ${saved.correct ? 'ok' : 'bad'}`}>{saved.correct ? 'Correct' : 'Review'}</span>}
      </header>
      <p className="prompt">{question.prompt}</p>
      {question.code && <CodeBlock code={question.code} />}
      {question.kind === 'match' && <Match question={question} onDone={record} />}
      {question.kind === 'explain' && <Explain question={question} saved={saved} onDone={record} />}
      {!['match', 'explain'].includes(question.kind) && <Choice question={question} onDone={record} />}
    </article>
  )
}

function Choice({ question, onDone }) {
  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const correct = picked === question.answer

  return (
    <fieldset className="options" disabled={checked}>
      <legend className="sr-only">{question.prompt}</legend>
      {question.options.map((option, index) => (
        <label key={option} className={`option ${checked && index === question.answer ? 'is-right' : ''} ${checked && index === picked && !correct ? 'is-wrong' : ''}`}>
          <input type="radio" name={question.id} checked={picked === index} onChange={() => setPicked(index)} />
          <span>{option}</span>
        </label>
      ))}
      {!checked ? (
        <button type="button" className="btn" disabled={picked === null} onClick={() => { setChecked(true); onDone(correct) }}>Check answer</button>
      ) : (
        <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
          <strong>{correct ? 'Sahi jawab.' : 'Not quite.'}</strong>
          {!correct && question.wrong?.[picked] && <p>{question.wrong[picked]}</p>}
          <p>{question.explain}</p>
          <button type="button" className="btn btn-ghost" onClick={() => { setChecked(false); setPicked(null) }}>Try again</button>
        </div>
      )}
    </fieldset>
  )
}

function Match({ question, onDone }) {
  const rights = useMemo(() => [...question.pairs.map((p) => p.right)].sort(), [question])
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const allRight = question.pairs.every((pair, i) => answers[i] === pair.right)
  const complete = question.pairs.every((_, i) => answers[i])

  return (
    <div className="match">
      {question.pairs.map((pair, index) => (
        <label key={pair.left} className={`match-row ${checked ? (answers[index] === pair.right ? 'is-right' : 'is-wrong') : ''}`}>
          <span>{pair.left}</span>
          <select value={answers[index] || ''} disabled={checked} onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}>
            <option value="">Choose…</option>
            {rights.map((right) => <option key={right} value={right}>{right}</option>)}
          </select>
          {checked && answers[index] !== pair.right && <small>Correct: {pair.right}</small>}
        </label>
      ))}
      {!checked ? (
        <button type="button" className="btn" disabled={!complete} onClick={() => { setChecked(true); onDone(allRight) }}>Check matches</button>
      ) : (
        <div className={`feedback ${allRight ? 'ok' : 'bad'}`}>
          <strong>{allRight ? 'All matched.' : 'Kuch galat match hue.'}</strong>
          <p>{question.explain}</p>
          <button type="button" className="btn btn-ghost" onClick={() => { setChecked(false); setAnswers({}) }}>Try again</button>
        </div>
      )}
    </div>
  )
}

function Explain({ question, saved, onDone }) {
  const [text, setText] = useState(saved?.text || '')
  const [compared, setCompared] = useState(false)
  const found = (question.keywords || []).filter((word) => text.toLowerCase().includes(word.toLowerCase()))

  return (
    <div className="explain">
      <label className="sr-only" htmlFor={`${question.id}-answer`}>Your answer</label>
      <textarea id={`${question.id}-answer`} rows="4" value={text} placeholder="Apne shabdon mein likho…" onChange={(e) => setText(e.target.value)} />
      {!compared ? (
        <button type="button" className="btn" disabled={text.trim().length < 20} onClick={() => setCompared(true)}>Compare with model answer</button>
      ) : (
        <div className="feedback">
          {question.keywords?.length > 0 && (
            <p className="keywords">
              Key ideas: {question.keywords.map((word) => (
                <span key={word} className={found.includes(word) ? 'kw found' : 'kw'}>{word}</span>
              ))}
            </p>
          )}
          <p><strong>Model answer:</strong> {question.model}</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => onDone(true, { text })}>My answer covers this</button>
            <button type="button" className="btn btn-ghost" onClick={() => { onDone(false, { text }); setCompared(false) }}>Not yet — rewrite</button>
          </div>
        </div>
      )}
    </div>
  )
}
