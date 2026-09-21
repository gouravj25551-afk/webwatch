export default {
  id: 'prisma',
  number: 6,
  title: 'Prisma',
  subject: 'Database',
  phase: 'Core backend',
  estMinutes: 210,
  summary: 'How WebWatch talks to PostgreSQL through Prisma: the schema, migrations, the generated client, CRUD queries, relations, select/include, updateMany and transactions.',
  hinglish: [
    'ORM (Object Relational Mapper) ek translator hai: tum JavaScript objects mein likhte ho, wo SQL bana kar database ko bhejta hai. Prisma ek ORM hai.',
    'schema.prisma mein tum models likhte ho. prisma migrate dev un models ko SQL migration files mein badalta hai (prisma/migrations folder) aur database par chalata hai. Migration = database structure mein ek versioned badlaav, jaise Git commit but tables ke liye.',
    'prisma generate schema se Prisma Client banata hai, ek JavaScript library jisme prisma.monitor.findMany jaise functions hote hain. WebWatch ka Backend postinstall script har npm install ke baad ye khud chalata hai.',
    'Main functions: create (naya row), findUnique (unique field se ek row), findFirst (pehla match), findMany (list), update (ek row badlo), updateMany (condition wale saare rows badlo, count wapas milta hai), delete, count. $transaction kai queries ko "sab ya kuch nahi" bana deta hai.',
  ],
  why: 'WebWatch ka har feature (login, monitor list, check save, incident open/close, payment fulfil) Prisma queries se hota hai. Ownership security bhi ek Prisma where clause hai. Aur duplicate checks rokne wali lease ek updateMany hai. Prisma samajhna = WebWatch ka data flow samajhna.',
  prerequisites: ['Milestone 5: tables, keys, relations', 'Milestone 1: async/await and destructuring'],
  terms: [
    { term: 'ORM', meaning: 'Tool jo code objects ko SQL queries mein translate karta hai.' },
    { term: 'Prisma schema', meaning: 'schema.prisma file jisme models, fields aur relations likhe hote hain.' },
    { term: 'Migration', meaning: 'Database structure ka versioned SQL change, prisma/migrations mein saved.' },
    { term: 'Prisma Client', meaning: 'Generated library jisse code queries chalata hai: prisma.monitor.findMany().' },
    { term: 'where', meaning: 'Filter: kaunse rows chahiye.' },
    { term: 'select / include', meaning: 'select = sirf ye fields lao; include = related model bhi saath lao.' },
    { term: 'updateMany', meaning: 'Condition match karne wale saare rows update karta hai aur { count } return karta hai. Match na ho to error nahi, count 0.' },
    { term: 'Transaction', meaning: 'Kai queries ka group jo ya to sab successful hoti hain ya sab cancel (rollback).' },
    { term: 'Singleton client', meaning: 'Poore app mein ek hi PrismaClient object, taaki database connections baar-baar na banein.' },
  ],
  flow: ['schema.prisma', 'prisma migrate → SQL migration', 'prisma generate → client', 'prisma.monitor.create()', 'SQL INSERT', 'PostgreSQL'],
  files: [
    { path: 'Backend/src/lib/prisma.js', lines: '1-5', note: 'One shared PrismaClient for the whole backend.' },
    { path: 'Backend/package.json', lines: '11-14', note: 'postinstall runs prisma generate; prisma:migrate and prisma:studio scripts.' },
    { path: 'Backend/prisma/migrations', note: 'Three migrations: init, add_billing, add_monitor_check_lease. Each one is a folder with migration.sql.' },
    { path: 'Backend/src/routes/monitors.js', lines: '34-44', note: 'findMany with where userId and orderBy createdAt desc.' },
    { path: 'Backend/src/routes/monitors.js', lines: '89-98', note: 'monitor.create with data built from validated input.' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '14-27', note: 'updateMany used as an atomic lease claim; claim.count === 0 means someone else has it.' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '39-104', note: '$transaction: create Check, open/resolve Incident and update Monitor together.' },
  ],
  examples: [
    {
      title: 'Ownership-safe lookup',
      code: String.raw`const monitor = await prisma.monitor.findFirst({
  where: { id: req.params.id, userId: req.user.id },
})
if (!monitor) return res.status(404).json({ success: false, message: 'Monitor not found' })`,
      notes: [
        'where mein id aur userId dono: sirf wahi monitor milega jo is user ka hai.',
        'findFirst use hota hai kyunki (id, userId) combination unique field nahi hai; findUnique sirf @id/@unique fields leta hai.',
        'Doosre user ka id dene par null milta hai → 404.',
      ],
    },
    {
      title: 'select vs include',
      code: String.raw`// only these columns
prisma.user.findUnique({ where: { id }, select: { id: true, email: true, createdAt: true } })

// monitor + a field from the related user
prisma.monitor.findUnique({ where: { id }, include: { user: { select: { email: true } } } })`,
      notes: [
        'select passwordHash ko response se bahar rakhta hai. auth.js /me route yahi karta hai.',
        'include relation ko join karke laata hai. monitorRunner.js user ka email isi tarah laata hai.',
      ],
    },
    {
      title: 'Atomic claim with updateMany',
      code: String.raw`const claim = await prisma.monitor.updateMany({
  where: { id: monitorId, enabled: true, OR: [{ checkLeaseUntil: null }, { checkLeaseUntil: { lt: now } }] },
  data: { checkLeaseUntil: new Date(now.getTime() + 2 * 60_000) },
})
if (claim.count === 0) return null`,
      notes: [
        'Check aur update ek hi SQL statement mein hote hain, isliye do workers ek saath "free" nahi dekh sakte.',
        'count 1 = humne lease le li; count 0 = kisi aur ke paas hai ya monitor disabled hai.',
        'Lease 2 minute ki hai. Worker crash ho jaaye to expire hone ke baad koi aur le sakta hai.',
      ],
    },
  ],
  exercise: {
    title: 'Follow one monitor through every Prisma query',
    minutes: 50,
    goal: 'Trace a monitor from POST /api/monitors to its stored Check and Incident rows by listing every Prisma call in order, translating each into plain English and approximate SQL.',
    where: 'playground/06-prisma-trace.md (reading exercise; optional read-only script if you have a local database)',
    steps: [
      'Start at router.post("/") in Backend/src/routes/monitors.js and list every prisma.* call in the order it runs.',
      'Follow runMonitor(monitor.id) into Backend/src/services/monitorRunner.js and continue the list, including the ones inside $transaction.',
      'For each call write: model, operation, where, data/select/include, and one line of approximate SQL.',
      'Mark which calls are inside the transaction and explain what would break if one failed halfway without a transaction.',
      'Optional, local database only: write playground/06-count.js that uses PrismaClient to print prisma.monitor.count() and prisma.check.count(). Read-only; no create/update/delete.',
    ],
    hints: [
      'Every await prisma.X.Y(...) is one query. Promise.all runs several at once. Inside prisma.$transaction(async (tx) => ...) the queries use tx instead of prisma.',
      'POST /api/monitors:\n  count monitors for user\n  find user (paidMonitorsCount)\n  create monitor\n  runMonitor:\n    updateMany (lease)\n    findUnique monitor + user email\n    transaction: create check → find open incident → (create or update incident) → update monitor\n    findUnique monitor\n    updateMany (release lease)',
      "1. prisma.monitor.count({ where: { userId } })  →  SELECT COUNT(*) FROM \"Monitor\" WHERE \"userId\" = $1\n2. prisma.user.findUnique({ where: { id }, select: { paidMonitorsCount: true } }) → ...\n3. prisma.monitor.create({ data: { userId, name, url, alertEmail, intervalMinutes } }) → INSERT INTO ...",
    ],
    explanation: [
      { code: 'prisma.monitor.count({ where: { userId: req.user.id } })', why: 'Limit check: user ke paas pehle se kitne monitors hain.' },
      { code: 'prisma.monitor.create({ data: {...} })', why: 'Validated input se naya Monitor row, status default UNKNOWN.' },
      { code: 'prisma.monitor.updateMany({ ... checkLeaseUntil ... })', why: 'Lease lena taaki koi aur process isi waqt same monitor check na kare.' },
      { code: 'tx.check.create(...)', why: 'Check history mein ek row; transaction ke andar taaki Monitor state aur history hamesha match karein.' },
      { code: 'tx.incident.findFirst({ where: { monitorId, resolvedAt: null } })', why: 'Kya koi open incident hai? Isi se decide hota hai naya incident banana hai ya purana resolve karna hai.' },
    ],
  },
  checklist: [
    'My trace lists every Prisma call from POST /api/monitors through runMonitor in the right order',
    'Each call has plain English plus approximate SQL',
    'I marked which calls run inside $transaction and why',
    'I can explain why findFirst (not findUnique) is used for ownership checks',
    'I can explain what claim.count === 0 means',
  ],
  mistakes: [
    { mistake: 'Editing the database by hand instead of creating a migration.', fix: 'Change schema.prisma, run npx prisma migrate dev --name something, commit the new migration folder.' },
    { mistake: 'Editing an old migration.sql that is already applied in production.', fix: 'Never edit applied migrations; add a new one.' },
    { mistake: 'Creating new PrismaClient() in every file.', fix: 'Import the shared client from src/lib/prisma.js.' },
    { mistake: 'Returning a full user row to the frontend.', fix: 'Use select so passwordHash never leaves the server.' },
  ],
  debugging: [
    '"@prisma/client did not initialize yet": run npx prisma generate in Backend (postinstall normally does it).',
    '"The table does not exist": migrations were not applied; run npx prisma migrate dev locally or migrate deploy in production.',
    'Use npx prisma studio to see whether a row was really created or updated.',
    'Temporarily create the client with new PrismaClient({ log: ["query"] }) in a playground script to see the SQL.',
  ],
  quiz: [
    {
      id: 'prisma-1',
      kind: 'mcq',
      prompt: 'Why does monitorRunner use updateMany for the lease instead of findUnique followed by update?',
      options: [
        'updateMany is faster to type',
        'Check-and-set in one statement is atomic, so two processes cannot both see the lease as free and both claim it',
        'update does not exist in Prisma',
        'updateMany deletes old checks',
      ],
      answer: 1,
      explain: 'Read-then-write leaves a gap where another worker can read the same "free" state. A conditional updateMany closes that gap.',
      wrong: ['Typing is not the reason.', '', 'update exists and is used elsewhere.', 'It only sets checkLeaseUntil.'],
    },
    {
      id: 'prisma-2',
      kind: 'predict',
      prompt: 'User A calls PATCH /api/monitors/:id with User B\'s monitor id. What does this return?',
      code: String.raw`const monitor = await prisma.monitor.findFirst({ where: { id: req.params.id, userId: req.user.id } })
if (!monitor) return res.status(404).json({ success: false, message: 'Monitor not found' })`,
      options: ['200 and the monitor is updated', '404 Monitor not found', '403 Forbidden', '500'],
      answer: 1,
      explain: 'The where clause requires both id and userId to match. For User A, no row matches, so findFirst returns null and the route answers 404.',
      wrong: ['The update is never reached.', '', 'WebWatch deliberately returns 404 so it does not reveal that the id exists.', 'No error is thrown.'],
    },
    {
      id: 'prisma-3',
      kind: 'match',
      prompt: 'Match the Prisma operation to what WebWatch uses it for.',
      pairs: [
        { left: 'count', right: 'Enforcing the monitor limit' },
        { left: 'create', right: 'Saving a new Check row' },
        { left: 'updateMany', right: 'Claiming and releasing the check lease' },
        { left: '$transaction', right: 'Saving a check and changing incident state together' },
      ],
      explain: 'See routes/monitors.js and services/monitorRunner.js.',
    },
    {
      id: 'prisma-4',
      kind: 'explain',
      prompt: 'What could go wrong if tx.check.create succeeded but tx.monitor.update failed and there was no transaction?',
      model: 'History and current state would disagree: a Check row would say DOWN while the Monitor still shows UP (or an incident could be opened without the monitor status changing). The transaction rolls everything back so the data stays consistent.',
      keywords: ['consistent', 'rollback', 'state'],
    },
  ],
  reflection: 'If you added a notification log table, which Prisma calls would you add to monitorRunner.js, and should they be inside the existing transaction? Why or why not?',
  commit: 'docs(playground): trace Prisma queries from monitor creation to incidents',
  resume: [
    'Traced every Prisma query in a monitor lifecycle, including an atomic database lease and transactional incident updates.',
    'Explained migration workflow and ownership-scoped queries in a Prisma/PostgreSQL backend.',
  ],
}
