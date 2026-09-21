# Curriculum data format

All course content lives in `src/data`. UI components only render this data, so a
new lesson is added by adding a data file — no component changes needed.

Every file is an ES module with a default export. Code inside strings uses
`String.raw` template literals or plain strings; never interpolate `${}` by
accident (escape it as `\${}`).

## Milestone (`src/data/milestones/mNN.js`)

```js
export default {
  id: 'js-foundations',          // stable kebab-case id, used in URLs and localStorage
  number: 1,
  title: 'JavaScript foundations',
  subject: 'JavaScript',         // groups confidence on the dashboard
  phase: 'Foundations',          // 'Foundations' | 'Core backend' | 'Product' | 'Later'
  estMinutes: 180,               // estimated total learning time
  summary: 'One English sentence.',
  hinglish: ['Paragraph in simple Hinglish (English letters).', '...'],
  why: 'Why WebWatch needs this, in Hinglish.',
  prerequisites: ['Plain text item'],
  terms: [{ term: 'Array', meaning: 'Hinglish definition' }],
  flow: ['Step A', 'Step B', 'Step C'],        // rendered as a left-to-right diagram
  files: [                                      // ONLY verified repository paths
    { path: 'Backend/src/routes/monitors.js', lines: '227-244', note: 'What to look at here' },
  ],
  examples: [
    { title: 'Short title', code: String.raw`const x = 1`, notes: ['Why line 1 exists'] },
  ],
  exercise: {
    title: 'Calculate uptime',
    minutes: 40,                                // 20–60
    goal: 'What you build',
    where: 'playground/01-uptime.js (practice folder, not production code)',
    input: String.raw`...`,                    // optional
    output: String.raw`...`,                   // optional expected output
    steps: ['Step 1', 'Step 2'],
    hints: ['Concept reminder', 'Pseudocode', 'Partial code'],   // exactly 3, in this order
    explanation: [{ code: 'line of code', why: 'why this line exists' }],
  },
  checklist: ['Acceptance criterion the learner ticks manually'],
  mistakes: [{ mistake: 'Common mistake', fix: 'How to notice and fix it' }],
  debugging: ['Debugging step'],
  quiz: [ /* Question objects, see below; 3–5 per milestone */ ],
  reflection: 'Open question the learner answers in their own words',
  commit: 'feat: short conventional commit message',
  resume: ['Honest resume bullet'],
  gaps: ['gap-id'],                             // optional ids from src/data/gaps.js
}
```

## Question

```js
// kind: 'mcq' | 'predict' | 'bug' | 'trace'  → single choice
{ id: 'js-1', kind: 'mcq', prompt: '...', code: 'optional', options: ['a', 'b'], answer: 0,
  explain: 'Why the answer is right', wrong: ['why option a is wrong (optional, same order)'] }

// kind: 'match' → pick the right right-side value for each left item
{ id: 'js-2', kind: 'match', prompt: '...', pairs: [{ left: 'Concept', right: 'Backend/src/app.js' }],
  explain: '...' }

// kind: 'explain' → free text, then compare against a model answer
{ id: 'js-3', kind: 'explain', prompt: '...', model: 'Model answer', keywords: ['lease', 'expire'] }
```

Question ids must be globally unique (prefix with the milestone id).

## Practice exercise (`src/data/practice.js`)

```js
{ id: 'uptime', title: '...', milestone: 'js-foundations', minutes: 30, level: 'Beginner',
  context: 'Where this appears in WebWatch', file: 'Backend/src/routes/monitors.js',
  prompt: 'Task description', starter: String.raw`starter code`,
  expected: 'Expected output', hints: [h1, h2, h3],
  explanation: [{ code, why }], checklist: ['...'] }
```
