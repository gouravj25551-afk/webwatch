import { milestones, practice } from '../data/index.js'
import { statusOf } from './progress.jsx'

export const CONFIDENCE = ['', 'Low', 'Medium', 'High']

export function summarize(state) {
  const statuses = milestones.map((m) => ({ m, status: statusOf(state.milestones[m.id]) }))
  const completed = statuses.filter((s) => s.status === 'completed').map((s) => s.m)
  // One recommended milestone at a time: the first one, in order, that is not completed.
  const current = statuses.find((s) => s.status !== 'completed')?.m || null
  const remainingMinutes = statuses.filter((s) => s.status !== 'completed').reduce((sum, s) => sum + s.m.estMinutes, 0)
  const practiceDone = practice.filter((p) => state.practice[p.id]?.done)

  const subjects = {}
  for (const m of milestones) {
    const value = state.milestones[m.id]?.confidence
    subjects[m.subject] ??= []
    if (value) subjects[m.subject].push(value)
  }
  const confidence = Object.entries(subjects).map(([subject, values]) => ({
    subject,
    level: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
  }))

  const recent = [
    ...completed.map((m) => ({ key: m.id, label: `Milestone ${m.number}: ${m.title}`, at: state.milestones[m.id].completedAt, to: `/milestones/${m.id}` })),
    ...practiceDone.map((p) => ({ key: p.id, label: `Practice: ${p.title}`, at: state.practice[p.id].doneAt, to: `/practice#${p.id}` })),
  ].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 5)

  return {
    completed,
    current,
    remainingMinutes,
    progress: milestones.length ? completed.length / milestones.length : 0,
    tasksDone: completed.length + practiceDone.length,
    tasksTotal: milestones.length + practice.length,
    confidence,
    recent,
    resume: completed.flatMap((m) => m.resume),
  }
}

export function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} min`
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
