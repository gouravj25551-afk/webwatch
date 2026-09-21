import { useState } from 'react'
import { FileRef } from '../components/ui.jsx'
import { flows } from '../data/index.js'

export default function Journeys() {
  const [flowId, setFlowId] = useState(flows[0].id)
  const [step, setStep] = useState(0)
  const flow = flows.find((f) => f.id === flowId)
  const pick = (id) => { setFlowId(id); setStep(0) }

  return (
    <div className="page">
      <header className="page-head"><h1>Request journeys</h1></header>

      <div className="tabs" role="tablist" aria-label="Journeys">
        {flows.map((f) => (
          <button key={f.id} role="tab" aria-selected={f.id === flowId} className={f.id === flowId ? 'active' : ''} onClick={() => pick(f.id)}>{f.title}</button>
        ))}
      </div>

      <section className="card" role="tabpanel">
        <h2>{flow.title}</h2>
        <p className="muted">{flow.summary}</p>

        <ol className="journey">
          {flow.steps.map((s, i) => (
            <li key={s.title} className={`${i === step ? 'active' : ''} ${i < step ? 'past' : ''}`}>
              <button className="journey-step" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
                <span className={`layer layer-${s.layer.toLowerCase()}`}>{s.layer}</span>
                <strong>{s.title}</strong>
              </button>
              {i === step && (
                <div className="journey-body">
                  <p>{s.detail}</p>
                  {s.file && <FileRef file={s.file} />}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="row">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</button>
          <span className="muted small">{step + 1} / {flow.steps.length}</span>
          <button className="btn" disabled={step === flow.steps.length - 1} onClick={() => setStep(step + 1)}>Next step</button>
        </div>
      </section>
    </div>
  )
}
