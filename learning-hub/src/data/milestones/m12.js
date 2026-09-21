export default {
  id: 'workers',
  number: 12,
  title: 'Background workers',
  subject: 'Workers',
  phase: 'Core backend',
  estMinutes: 190,
  summary: 'Why monitoring cannot depend on an open browser, and how WebWatch runs checks from a worker loop, the API process, or a GitHub Actions cron call, with crash recovery and shutdown.',
  hinglish: [
    'Browser tab band hote hi uska JavaScript ruk jaata hai. Agar checks frontend se chalte, to raat ko user ka laptop band = koi monitoring nahi. Isliye checks server pe chalne chahiye, bina kisi request ke. Ise background work kehte hain.',
    'Worker ek alag Node process hai jo HTTP traffic nahi leta, sirf kaam karta hai. WebWatch mein Backend/worker.js yahi hai: npm run worker se chalta hai, database se connect hota hai, aur startScheduler() chala deta hai jo har 30 second due monitors check karta hai (worker loop).',
    'WebWatch mein checks chalane ke teen raaste hain: (1) worker.js, (2) npm start se chala API process bhi index.js mein startScheduler() chalata hai, (3) production (Vercel) pe scheduler khud nahi chalta, isliye GitHub Actions har 5 minute GET /api/cron call karta hai (CRON_SECRET ke saath). Teeno ek hi runDueMonitors() use karte hain, aur lease duplicate rokti hai.',
    'Graceful shutdown matlab band hone se pehle saaf-safai. SIGINT (Ctrl+C) ya SIGTERM (server band kar raha hai) aaye to worker.js stopScheduler() karta hai, Prisma disconnect karta hai, phir exit. Ye chalte hue checks ka intezaar nahi karta; unki lease 2 minute mein expire ho jaati hai, isliye koi monitor hamesha atakta nahi (crash recovery).',
    'Uncaught error ya unhandled promise rejection aaye to worker log karke exit code 1 se band hota hai. Wapas start karna hosting platform (process manager) ka kaam hai. Worker ka apna health endpoint nahi hai; sirf API ka /health aur /api/health hai. Ye repository ka fact hai; worker health check add karna recommendation hai.',
  ],
  why: 'Uptime monitoring ka pura promise hai "jab tum nahi dekh rahe tab bhi hum dekh rahe hain". Ye promise sirf ek reliable background process se poora hota hai.',
  prerequisites: [
    'Monitoring engine aur lease (Milestone 10)',
    'Node process kya hai, npm scripts (Milestone 2)',
    'setInterval, setTimeout, async/await',
  ],
  terms: [
    { term: 'Background worker', meaning: 'Ek alag process jo users ki requests ke bina, peeche kaam karta rehta hai.' },
    { term: 'Process', meaning: 'Chalta hua program. node worker.js ek process hai, node index.js doosra.' },
    { term: 'Polling', meaning: 'Baar-baar fixed time pe puchna "koi kaam hai?". WebWatch har 30 s database poll karta hai.' },
    { term: 'Cron', meaning: 'Time-table based scheduler. "*/5 * * * *" matlab har 5 minute.' },
    { term: 'Signal (SIGINT/SIGTERM)', meaning: 'Operating system ka process ko message: "band ho jao". Ctrl+C SIGINT bhejta hai.' },
    { term: 'Graceful shutdown', meaning: 'Band hone se pehle timers rokna, connections band karna, taaki kuch aadha-adhura na rahe.' },
    { term: 'Crash recovery', meaning: 'Process mar jaaye to system khud theek ho jaaye. WebWatch mein lease expiry isme madad karti hai.' },
    { term: 'Health check', meaning: 'Ek chhota endpoint ya signal jo batata hai "mai zinda hoon". Hosting platform isse restart decide karta hai.' },
  ],
  flow: [
    'npm run worker',
    'prisma.$connect()',
    'startScheduler()',
    'Every 30s: runDueMonitors()',
    'SIGTERM received',
    'stopScheduler()',
    'prisma.$disconnect()',
    'process.exit',
  ],
  files: [
    { path: 'Backend/worker.js', lines: '1-35', note: 'Whole worker: start, signals, uncaught errors, shutdown' },
    { path: 'Backend/index.js', lines: '6-23', note: 'API process also starts the scheduler when run directly' },
    { path: 'Backend/src/services/scheduler.js', lines: '32-40', note: 'setTimeout 1 s first run, then setInterval every CHECK_INTERVAL_MS' },
    { path: 'Backend/src/app.js', lines: '50-66', note: 'GET /api/cron protected by Bearer CRON_SECRET' },
    { path: '.github/workflows/monitor-scheduler.yml', lines: '1-8', note: 'GitHub Actions cron every 5 minutes, calls /api/cron' },
    { path: 'Backend/package.json', lines: '6-8', note: 'start and worker npm scripts' },
  ],
  examples: [
    {
      title: 'Shutdown in worker.js',
      code: String.raw`async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopScheduler();
  await prisma.$disconnect();
  process.exit(exitCode);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));`,
      notes: [
        'shuttingDown flag: do signals ek saath aayein to shutdown do baar na chale.',
        'stopScheduler(): naye scans band. Jo check chal raha hai wo nahi ruk-ta, process.exit use kaat deta hai.',
        '$disconnect(): database connections saaf band.',
        'exitCode 1 crash ke liye, 0 normal band ke liye. Hosting platform isse samajhta hai kya hua.',
      ],
    },
  ],
  exercise: {
    title: 'Build a tiny worker loop with graceful shutdown',
    minutes: 50,
    goal: 'playground mein ek chhota worker banao jo har 2 second ek fake "check" chalaye (1.5 s ka), aur Ctrl+C pe chalte check ke khatam hone ka intezaar karke band ho.',
    where: 'playground/12-worker.js (koi database nahi; fake check sirf setTimeout hai)',
    output: String.raw`worker started
check #1 started
check #1 finished
check #2 started
^C SIGINT received, waiting for check #2
check #2 finished
worker stopped cleanly`,
    steps: [
      'Backend/worker.js aur scheduler.js ka structure copy mat karo, pehle dono padho aur 5 lines mein summary likho.',
      'fakeCheck(n) banao jo 1500 ms baad resolve ho.',
      'setInterval se har 2 s ek check chalao, aur busy flag rakho (schedulerBusy jaisa).',
      'SIGINT pe: interval clear karo, agar check chal raha hai to uske promise ka await karo, phir exit.',
      'Compare karo: WebWatch ka worker.js in-flight check ka wait nahi karta. Kyun ye phir bhi safe hai? (Lease.)',
    ],
    hints: [
      'Concept: chalte kaam ka promise ek variable mein rakho. Shutdown uska await kar sakta hai.',
      'Pseudocode: let current = null; tick -> if current return; current = fakeCheck(n).finally(() => current = null). on SIGINT -> clearInterval; if current await current; exit(0).',
      String.raw`Partial code:
let current = null;
const timer = setInterval(() => {
  if (current) return;
  current = fakeCheck(++n).finally(() => { current = null; });
}, 2000);
process.on('SIGINT', async () => {
  clearInterval(timer);
  // ?
});`,
    ],
    explanation: [
      { code: 'if (current) return;', why: 'schedulerBusy ki tarah: pichla kaam chal raha hai to naya shuru mat karo.' },
      { code: 'current = fakeCheck(++n).finally(() => { current = null; });', why: 'Promise yaad rakhte hain taaki shutdown uska wait kar sake; finally success ya fail dono mein flag saaf karta hai.' },
      { code: 'clearInterval(timer);', why: 'stopScheduler() jaisa: naye kaam band.' },
      { code: 'if (current) await current;', why: 'Ye WebWatch se ek kadam aage hai: aadha check nahi katega. WebWatch mein iski jagah lease expiry safety deti hai.' },
      { code: 'process.exit(0);', why: 'Saaf band hua, isliye 0.' },
    ],
  },
  checklist: [
    'Mai samjha sakta hoon ki monitoring browser pe kyun nahi chal sakti',
    'Mai WebWatch mein checks chalane ke teeno raaste bata sakta hoon aur ye bhi ki lease unhe duplicate kyun nahi hone deti',
    'Mai SIGINT/SIGTERM aur exit code 0/1 ka matlab bata sakta hoon',
    'playground/12-worker.js Ctrl+C pe chalta check poora karke band hota hai',
    'Mai bata sakta hoon ki worker ka health endpoint abhi nahi hai aur uska kya risk hai',
  ],
  mistakes: [
    { mistake: 'Checks ko frontend ke setInterval se chalana', fix: 'Tab band = monitoring band. Checks server process mein chalne chahiye.' },
    { mistake: 'Serverless function mein setInterval pe bharosa karna', fix: 'Serverless function request ke baad ruk jaata hai. Isliye Vercel pe GitHub Actions /api/cron call karta hai.' },
    { mistake: 'Shutdown mein database disconnect bhool jaana', fix: 'Khule connections pool bhar sakte hain. worker.js $disconnect() karta hai.' },
    { mistake: 'Crash ke baad restart ka plan na hona', fix: 'worker.js exit 1 karta hai; platform ya process manager ko restart policy chahiye (recommendation).' },
  ],
  debugging: [
    'Worker start karte hi "WebWatch worker connected to PostgreSQL" aur "Monitor scheduler started" dikhna chahiye. Pehli line nahi to DATABASE_URL check karo.',
    'Worker start hote hi crash? config.js JWT_SECRET 32+ characters maangta hai, worker bhi config load karta hai.',
    'GitHub Actions tab mein "Run WebWatch monitors" workflow ke runs dekho; 401 matlab CRON_SECRET match nahi hua.',
    'Monitors ka lastCheckedAt nahi badal raha to koi bhi scheduler chal nahi raha. Teeno raaste check karo.',
  ],
  quiz: [
    {
      id: 'workers-1', kind: 'mcq',
      prompt: 'Production Vercel pe index.js ka startScheduler() kyun nahi chalta?',
      options: ['Vercel setInterval ban karta hai', 'require.main === module sirf tab true hai jab file seedha node index.js se chale; Vercel app ko import karta hai', 'CRON_SECRET missing hai', 'Bug hai'],
      answer: 1,
      explain: 'index.js line 6 ka condition. Serverless mein app import hota hai, isliye scheduler GitHub Actions ke /api/cron call se chalta hai.',
      wrong: ['Asli wajah import vs direct run hai.', '', 'CRON_SECRET sirf /api/cron ko protect karta hai.', 'Ye jaan-boojh ke hai.'],
    },
    {
      id: 'workers-2', kind: 'predict',
      prompt: 'Worker ek check ke beech SIGTERM paata hai. Us monitor ka kya hota hai?',
      options: ['Check poora hota hai phir exit', 'Process exit hota hai, lease release nahi hoti, 2 minute baad koi aur process check kar sakta hai', 'Monitor DOWN mark hota hai', 'Monitor delete hota hai'],
      answer: 1,
      explain: 'shutdown() in-flight check ka wait nahi karta. finally block nahi chalta, lekin checkLeaseUntil expire ho jaata hai.',
      wrong: ['Code wait nahi karta.', '', 'Result save hi nahi hua.', 'Kuch delete nahi hota.'],
    },
    {
      id: 'workers-3', kind: 'match',
      prompt: 'Trigger ko file se match karo.',
      pairs: [
        { left: 'Har 5 minute cron', right: '.github/workflows/monitor-scheduler.yml' },
        { left: 'Dedicated worker process', right: 'Backend/worker.js' },
        { left: 'Protected cron endpoint', right: 'Backend/src/app.js' },
      ],
      explain: 'Workflow /api/cron ko call karta hai, jo app.js mein hai; worker.js khud scheduler chalata hai.',
    },
    {
      id: 'workers-4', kind: 'explain',
      prompt: 'API process aur worker process ko alag kyun rakhna chahiye?',
      model: 'API ka kaam users ko jaldi jawab dena hai. Checks slow ho sakte hain (5 s timeouts, retries). Alag worker hone se slow checks API ko slow nahi karte, aur dono ko alag scale ya restart kar sakte hain.',
      keywords: ['slow', 'separate', 'restart', 'users'],
    },
  ],
  reflection: 'GitHub Actions cron best-effort hai (kabhi der se chalta hai). Ek dedicated worker kab zaroori ho jaata hai, aur use deploy karne se pehle tum kaunse 3 cheezein verify karoge?',
  commit: 'feat: add playground worker loop with graceful shutdown',
  resume: [
    'Explained how an uptime monitor keeps checking without users online, using a polling worker, an API-embedded scheduler and a protected cron endpoint.',
    'Built a small worker loop that drains in-flight work before shutdown and compared it with lease-based crash recovery.',
  ],
  gaps: ['worker-no-health', 'gh-actions-cron-best-effort', 'readme-lease-outdated'],
}
