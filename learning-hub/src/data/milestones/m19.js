export default {
  id: 'scaling',
  number: 19,
  title: 'Scaling and multiple regions',
  subject: 'Scaling',
  phase: 'Later',
  estMinutes: 160,
  summary: 'Learn to spot real scaling limits in the current WebWatch code, estimate load with numbers, and know which changes (multiple workers, regions, retention, observability) each limit would require.',
  hinglish: [
    'Scaling ka matlab hai zyada users aur zyada monitors ko sambhalna bina system toote. Lekin scaling tab karo jab numbers bolein, feeling se nahi. MVP ke time par scaling ka kaam karna time ki barbaadi hai.',
    'WebWatch ke current code mein kuch cheezein hain jo bade load par pehle toot-engi: scheduler saare due monitors ek saath chalata hai (koi concurrency limit nahi), Check table kabhi saaf nahi hoti (koi retention nahi), aur dashboard har monitor ke liye 3 alag queries chalata hai.',
    'Multiple regions ka matlab hai alag-alag deshon se check karna. Agar sirf ek jagah se site down dikhe, ho sakta hai problem network ki ho, site ki nahi. Do regions agree karein tab incident kholna false alerts kam karta hai. Lekin yeh bahut baad ka feature hai.',
  ],
  why: 'Owner ko pata hona chahiye ki system ki pehli bottleneck kahan hai, taaki sahi waqt par sahi cheez badle. Interview mein "yeh 10x load par kahan tootega?" ka jawab dena strong engineering signal hai.',
  prerequisites: [
    'Monitoring engine aur lease (Milestone 10)',
    'Background workers (Milestone 12)',
    'Redis/BullMQ ka idea (Milestone 18)',
    'Prisma queries aur indexes (Milestone 5-6)',
  ],
  terms: [
    { term: 'Bottleneck', meaning: 'System ka woh hissa jo sabse pehle bhar jaata hai aur baaki sabko dheema kar deta hai.' },
    { term: 'Horizontal scaling', meaning: 'Ek bade server ki jagah kai chhote workers chalana.' },
    { term: 'Concurrency limit', meaning: 'Ek saath kitne kaam chalenge uski had. WebWatch scheduler mein abhi yeh had nahi hai.' },
    { term: 'Data retention', meaning: 'Purana data kitne din rakhna hai aur kab delete karna hai.' },
    { term: 'N+1 queries', meaning: 'Ek list ke liye 1 query, phir har item ke liye alag queries. 100 monitors = 300+ queries.' },
    { term: 'Observability', meaning: 'Logs, metrics aur traces jinse production mein dekh sako andar kya ho raha hai.' },
    { term: 'Connection pool', meaning: 'Database ke khule connections ka set jo requests share karti hain. Har worker apna pool khol-ta hai, aur Neon ki connection limit hoti hai.' },
  ],
  flow: [
    'Measure (cycle time, checks/min, rows/day)',
    'Find bottleneck',
    'Smallest fix (limit, index, retention)',
    'Measure again',
    'Only then: more workers / queue / regions',
  ],
  files: [
    { path: 'Backend/src/services/scheduler.js', lines: '13-24', note: 'Loads all enabled monitors, filters due ones in JS, then runs ALL of them at once with Promise.allSettled' },
    { path: 'Backend/src/routes/monitors.js', lines: '15-32', note: 'monitorWithStats: 3 queries per monitor (two counts and one findFirst)' },
    { path: 'Backend/src/routes/monitors.js', lines: '40', note: 'Promise.all(monitors.map(monitorWithStats)) — N+1 pattern on the dashboard list' },
    { path: 'Backend/prisma/schema.prisma', lines: '69-81', note: 'Check model with @@index([monitorId, checkedAt]); no code deletes old checks' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '14-26', note: 'Lease that already lets several workers run safely' },
    { path: 'Backend/src/lib/prisma.js', lines: '1-5', note: 'One PrismaClient per process — each worker opens its own connection pool' },
  ],
  examples: [
    {
      title: 'Where unlimited concurrency hides (repository fact)',
      code: String.raw`const due = monitors.filter(/* interval elapsed */);
await Promise.allSettled(due.map((monitor) => runMonitor(monitor.id)));`,
      notes: [
        '10 monitors: theek. 2000 monitors due: 2000 HTTP checks aur DB transactions ek saath shuru.',
        'Recommendation: batches (jaise 20-20) mein chalao. Pehle yeh sasta fix, Redis baad mein.',
      ],
    },
    {
      title: 'Back-of-the-envelope capacity math',
      code: String.raw`monitors            = 1000
interval            = 5 min
checks per minute   = 1000 / 5         = 200
Check rows per day  = 1000 * 288       = 288,000
Check rows per 30d  = 288,000 * 30     = 8,640,000
worst case per check = 3 attempts x 5s + 2 x 0.5s wait = 16s (plus redirects)`,
      notes: [
        '288 = ek din mein 5-minute slots (24*60/5).',
        'Rows kabhi delete nahi hote, isliye table har mahine lakhon rows badhegi — retention job zaroori hoga.',
        'Worst case per check se pata chalta hai ek cycle mein kitne slow sites time kha sakti hain.',
      ],
    },
  ],
  exercise: {
    title: 'Capacity report for 100, 1,000 and 10,000 monitors',
    minutes: 45,
    goal: 'Ek chhota Node script likho jo teen load levels ke liye checks/min, Check rows/day, rows/30 days aur dashboard queries count kare, aur har level ke liye pehli bottleneck likho.',
    where: 'playground/19-capacity.js aur playground/19-capacity.md (practice folder, not production code)',
    output: String.raw`monitors=100    checks/min=20    rows/day=28800     dashboardQueries(1 user, 10 monitors)=31
monitors=1000   checks/min=200   rows/day=288000    ...
monitors=10000  checks/min=2000  rows/day=2880000   ...`,
    steps: [
      'function capacity(monitors, intervalMinutes = 5) likho jo object return kare.',
      'checksPerMinute = monitors / intervalMinutes; rowsPerDay = monitors * (1440 / intervalMinutes).',
      'Dashboard queries: 1 (findMany) + 3 * monitorsPerUser — monitorWithStats padh kar confirm karo.',
      'Teen levels ke liye console.table se print karo.',
      'Markdown mein har level ke liye likho: pehli bottleneck kya hogi aur sabse sasta fix kya hai (batching, retention, aggregate query, zyada workers).',
    ],
    hints: [
      'Concept: pehle numbers, phir design. Ek din mein 1440 minute hote hain.',
      'Pseudocode: for n of [100, 1000, 10000] -> perMin = n/5 -> perDay = n*288 -> per30 = perDay*30 -> print; then write bottleneck notes.',
      String.raw`Partial:
function capacity(monitors, intervalMinutes = 5) {
  const slotsPerDay = 1440 / intervalMinutes;
  return {
    monitors,
    checksPerMinute: monitors / intervalMinutes,
    rowsPerDay: /* ? */,
    rowsPer30Days: /* ? */,
  };
}
console.table([100, 1000, 10000].map((n) => capacity(n)));`,
    ],
    explanation: [
      { code: 'const slotsPerDay = 1440 / intervalMinutes', why: '5-minute interval = 288 checks per monitor per day.' },
      { code: 'checksPerMinute: monitors / intervalMinutes', why: 'Average load; isse pata chalta hai workers ko har minute kitne HTTP requests karne hain.' },
      { code: 'rowsPerDay: monitors * slotsPerDay', why: 'Har check ek Check row banata hai (monitorRunner transaction mein tx.check.create).' },
      { code: 'rowsPer30Days: rowsPerDay * 30', why: 'Uptime 30 din par calculate hota hai, lekin data usse zyada bhi kabhi delete nahi hota — storage badhta rehta hai.' },
    ],
  },
  checklist: [
    'Script teen levels ke numbers print karta hai aur formula samjha sakta hoon.',
    'Scheduler ka unlimited Promise.allSettled aur uska risk explain kar sakta hoon.',
    'Dashboard ke N+1 queries ka count monitorWithStats padh kar confirm kiya.',
    'Har level ke liye ek "sabse sasta pehla fix" likha jo Redis ya regions nahi hai.',
    'Multiple regions kab sense banate hain (false alerts, global users) aur kab nahi, likh sakta hoon.',
  ],
  mistakes: [
    { mistake: 'Bina measure kiye architecture badalna', fix: 'Pehle cycle time aur DB query time log karo. Numbers ke bina change guesswork hai.' },
    { mistake: 'Workers badhana lekin DB connections bhool jaana', fix: 'Har worker apna Prisma pool kholta hai. Neon ki connection limit aur pooled connection string dekho.' },
    { mistake: 'Regions add karna jab ek region bhi reliable nahi', fix: 'Pehle ek worker ko healthy, monitored aur alerted banao.' },
    { mistake: 'Purana data kabhi delete na karna', fix: 'Retention policy decide karo (jaise raw checks 30-90 din, uske baad daily summaries).' },
  ],
  debugging: [
    'runDueMonitors ke start aur end par duration log karo; CHECK_INTERVAL_MS (30s) se compare karo.',
    'Prisma query logging (development mein) on karke dekho dashboard ek load par kitni queries chalata hai.',
    'Neon dashboard mein active connections aur storage growth dekho.',
  ],
  quiz: [
    {
      id: 'scaling-1', kind: 'mcq',
      prompt: '1,000 monitors har 5 minute par. Ek din mein kitni Check rows banengi?',
      options: ['1,000', '28,800', '288,000', '1,440,000'],
      answer: 2,
      explain: '1440/5 = 288 checks per monitor per day. 288 × 1000 = 288,000.',
      wrong: ['Yeh sirf ek round hai.', 'Yeh 100 monitors ka number hai.', '', 'Yeh 1-minute interval jaisa hai.'],
    },
    {
      id: 'scaling-2', kind: 'bug',
      prompt: 'Is scheduler code mein scaling risk kya hai?',
      code: String.raw`await Promise.allSettled(due.map((monitor) => runMonitor(monitor.id)));`,
      options: ['allSettled galat function hai', 'Saare due monitors ek saath chalte hain — koi concurrency limit nahi', 'runMonitor async nahi', 'Koi risk nahi'],
      answer: 1,
      explain: 'Hazaaron checks ek saath network aur DB par load daalenge. Batching sabse sasta pehla fix hai.',
      wrong: ['allSettled sahi hai: ek fail hone par baaki nahi rukte.', '', 'runMonitor async hai.', 'Chhote scale par nahi, bade scale par hai.'],
    },
    {
      id: 'scaling-3', kind: 'predict',
      prompt: 'Ek user ke 10 monitors hain. GET /api/monitors kitni Prisma queries chalata hai?',
      options: ['1', '11', '31', '3'],
      answer: 2,
      explain: '1 findMany + har monitor ke liye 3 (do count + ek findFirst) = 31.',
      wrong: ['Stats alag queries se aate hain.', 'monitorWithStats 3 queries karta hai, 1 nahi.', '', 'Yeh sirf ek monitor ka hai.'],
    },
    {
      id: 'scaling-4', kind: 'match',
      prompt: 'Problem ko pehle sahi fix se jodo:',
      pairs: [
        { left: 'Check table grows forever', right: 'Retention job and daily summaries' },
        { left: 'Cycle longer than interval', right: 'Batching, then more workers' },
        { left: 'False alerts from one network path', right: 'Confirm from a second region' },
        { left: 'Cannot see why checks are late', right: 'Structured logs and metrics' },
      ],
      explain: 'Har problem ka apna sasta fix hai. Sab ke liye Redis jawab nahi hai.',
    },
    {
      id: 'scaling-5', kind: 'explain',
      prompt: 'WebWatch ko multiple regions kab chahiye honge? Ek realistic trigger batao.',
      model: 'Jab users false downtime alerts report karein jo sirf ek network path ki wajah se the, ya jab paying customers alag continents mein hon aur latency per region dekhna chahein. Tab do regions ke results compare karke hi incident kholna chahiye.',
      keywords: ['false', 'region', 'users', 'confirm'],
    },
  ],
  reflection: 'Tumhare hisaab se 10x load par WebWatch sabse pehle kahan tootega, aur tum yeh kaise prove karoge?',
  commit: 'docs: add capacity estimates and first scaling bottlenecks',
  resume: [
    'Identified scaling bottlenecks in an uptime monitor (unbounded scheduler concurrency, N+1 dashboard queries, unbounded check history) using capacity estimates.',
    'Proposed incremental fixes ordered by cost: batching, retention, aggregate queries, then horizontal workers.',
  ],
  gaps: ['logging-console-only', 'worker-no-health'],
}
