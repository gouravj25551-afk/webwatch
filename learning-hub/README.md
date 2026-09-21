# WebWatch Academy

An interactive learning dashboard for understanding, debugging and extending the WebWatch codebase. It lives beside the product and never touches the production frontend, backend or database.

## Run it

```bash
cd learning-hub
npm install
npm run dev
```

Open http://localhost:5180. No database, login or API keys are needed.

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run check:data` | Validate the curriculum and confirm every cited repository file and line range exists |

## What is inside

- **Dashboard**: overall progress, the one recommended milestone, the next task, confidence by subject, recent work, resume lines earned
- **Milestones**: 20 lessons from JavaScript basics to launch, with search and status filters
- **Milestone page**: Hinglish explanation, terms, flow, verified file references, examples, a 20–60 minute exercise with three-level hints, acceptance checklist, quiz, reflection, commit message, resume value
- **Project map**: click any part of the system to see what it does, its inputs and outputs, files, failure modes and how to debug it
- **Request journeys**: step through real flows (signup, add monitor, check now, scheduled check, downtime, recovery, payment webhook)
- **Practice lab**: 12 small exercises on realistic WebWatch data
- **Quiz and review**: every question in one place, filterable by type, with a "needs review" view
- **Launch readiness**: each launch item labelled Implemented, Partially implemented, Missing or Needs verification, plus the project gaps found in the audit
- **Glossary**: beginner definitions with WebWatch examples

Progress is saved in the browser's `localStorage` under `webwatch-academy:v1`. Lessons are never marked complete automatically; a milestone can be completed only after its checklist is ticked. Use **Reset** in the sidebar to clear everything.

## Adding or editing lessons

All content is data in `src/data/`. The format is documented in [`src/data/SCHEMA.md`](src/data/SCHEMA.md).

- New milestone: add `src/data/milestones/m21.js`. It is picked up automatically.
- New practice exercise: add an entry to `src/data/practice.js`.
- New gap or launch item: edit `src/data/gaps.js` or `src/data/launch.js`.

Run `npm run check:data` afterwards. It fails if a file reference points at a missing file or a line that does not exist.

## Accuracy

The content was written against commit `562818e` of this repository. Statements labelled as facts or evidence were checked against the code; anything the repository does not do yet is labelled as a recommendation. When the backend changes, re-run `npm run check:data` and update the affected lessons.
