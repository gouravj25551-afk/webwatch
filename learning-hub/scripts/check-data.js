// Validates curriculum data and checks every cited file (and line range) exists in the repository.
// Run: npm run check:data
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hub = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(hub, '..')
const errors = []
const fail = (where, message) => errors.push(`${where}: ${message}`)

const load = async (file) => (await import(join(hub, 'src/data', file))).default
const milestoneFiles = readdirSync(join(hub, 'src/data/milestones')).filter((f) => /^m\d+\.js$/.test(f)).sort()
const milestones = await Promise.all(milestoneFiles.map((f) => load(`milestones/${f}`)))
const practice = await load('practice.js')
const gaps = await load('gaps.js')
const launch = await load('launch.js')
const flows = await load('flows.js')
const glossary = await load('glossary.js')
const { nodes } = await import(join(hub, 'src/data/projectMap.js'))

const gapIds = new Set(gaps.map((g) => g.id))
const milestoneIds = new Set(milestones.map((m) => m.id))
const questionIds = new Set()
const KINDS = new Set(['mcq', 'predict', 'bug', 'trace', 'match', 'explain'])

function checkRef(where, ref) {
  if (!ref) return
  const [path, lines] = typeof ref === 'string' ? ref.split(':') : [ref.path, ref.lines]
  const full = join(repo, path)
  if (!existsSync(full)) return fail(where, `missing file ${path}`)
  if (!lines) return
  if (statSync(full).isDirectory()) return fail(where, `line range on directory ${path}`)
  const total = readFileSync(full, 'utf8').split('\n').length
  for (const n of String(lines).split(/[,-]/).map((x) => Number(x.trim()))) {
    if (!Number.isInteger(n) || n < 1 || n > total) fail(where, `${path}:${lines} is not within ${total} lines`)
  }
}

for (const m of milestones) {
  const at = `milestone ${m.id}`
  for (const key of ['id', 'number', 'title', 'subject', 'phase', 'estMinutes', 'summary', 'why', 'reflection', 'commit']) {
    if (m[key] === undefined || m[key] === '') fail(at, `missing ${key}`)
  }
  for (const key of ['hinglish', 'prerequisites', 'terms', 'flow', 'files', 'examples', 'checklist', 'mistakes', 'debugging', 'quiz', 'resume']) {
    if (!Array.isArray(m[key])) fail(at, `${key} must be an array`)
  }
  if (m.exercise?.hints?.length !== 3) fail(at, 'exercise needs exactly 3 hints')
  if (!m.exercise?.explanation?.length) fail(at, 'exercise needs an explanation')
  if (m.exercise && (m.exercise.minutes < 20 || m.exercise.minutes > 60)) fail(at, 'exercise must take 20–60 minutes')
  m.files.forEach((f) => checkRef(at, f))
  for (const g of m.gaps || []) if (!gapIds.has(g)) fail(at, `unknown gap ${g}`)
  for (const q of m.quiz) {
    if (questionIds.has(q.id)) fail(at, `duplicate question id ${q.id}`)
    questionIds.add(q.id)
    if (!KINDS.has(q.kind)) fail(at, `question ${q.id} has unknown kind ${q.kind}`)
    if (['mcq', 'predict', 'bug', 'trace'].includes(q.kind) && !(q.answer >= 0 && q.answer < q.options?.length)) fail(at, `question ${q.id} answer out of range`)
    if (q.kind === 'match' && !q.pairs?.length) fail(at, `question ${q.id} has no pairs`)
    if (q.kind === 'match' && new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) fail(at, `question ${q.id} has duplicate right values`)
    if (q.kind === 'explain' && !q.model) fail(at, `question ${q.id} needs a model answer`)
  }
}
if (new Set(milestones.map((m) => m.number)).size !== milestones.length) fail('milestones', 'duplicate numbers')

for (const p of practice) {
  const at = `practice ${p.id}`
  if (p.hints?.length !== 3) fail(at, 'needs exactly 3 hints')
  if (!milestoneIds.has(p.milestone)) fail(at, `unknown milestone ${p.milestone}`)
  if (!p.checklist?.length) fail(at, 'needs a checklist')
  checkRef(at, p.file)
}
gaps.forEach((g) => g.files.forEach((f) => checkRef(`gap ${g.id}`, f)))
launch.forEach((l) => l.files.forEach((f) => checkRef(`launch ${l.area}`, f)))
flows.forEach((flow) => flow.steps.forEach((s) => checkRef(`flow ${flow.id}`, s.file)))
nodes.forEach((n) => n.files.forEach((f) => checkRef(`map ${n.id}`, f)))
glossary.forEach((g) => checkRef(`glossary ${g.term}`, g.file))

console.log(`${milestones.length} milestones, ${questionIds.size} questions, ${practice.length} practice, ${glossary.length} terms, ${gaps.length} gaps`)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('All data checks passed.')
