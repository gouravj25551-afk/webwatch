import flows from './flows.js'
import gaps from './gaps.js'
import glossary from './glossary.js'
import launch from './launch.js'
import practice from './practice.js'
import { edges, nodes } from './projectMap.js'

// Every file in ./milestones is picked up automatically, so a new lesson is one new file.
const modules = import.meta.glob('./milestones/m*.js', { eager: true })

export const milestones = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => a.number - b.number)

export const milestoneById = Object.fromEntries(milestones.map((m) => [m.id, m]))
export const gapById = Object.fromEntries(gaps.map((g) => [g.id, g]))

export const allQuestions = milestones.flatMap((m) => m.quiz.map((q) => ({ ...q, milestoneId: m.id })))

export { edges, flows, gaps, glossary, launch, nodes, practice }
