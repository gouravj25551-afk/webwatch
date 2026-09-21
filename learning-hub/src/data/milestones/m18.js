export default {
  id: 'redis-bullmq',
  number: 18,
  title: 'Redis and BullMQ',
  subject: 'Queues',
  phase: 'Later',
  estMinutes: 150,
  summary: 'Learn what problem Redis and BullMQ solve, simulate a job queue in plain JavaScript, and decide honestly whether WebWatch needs one yet.',
  hinglish: [
    'Redis ek bahut tez database hai jo data memory (RAM) mein rakhta hai. Key-value store hai: ek naam (key) aur uski value. PostgreSQL disk par permanent records ke liye hai; Redis chhote, tez, temporary kaam ke liye.',
    'Queue ek line hai, jaise bank ki line. Producer kaam (job) line mein daalta hai, consumer (worker) line se kaam uthata hai. BullMQ ek Node.js library hai jo Redis ke upar yeh line banati hai — retries, delay, repeat jobs, concurrency sab ke saath.',
    'Lekin important baat: WebWatch mein abhi duplicate kaam rokne ke liye PostgreSQL lease (checkLeaseUntil) already hai. Kuch dozen ya kuch sau monitors ke liye yeh kaafi hai. Redis ek aur service hai jise chalana, monitor karna aur pay karna padega. Problem aane se pehle Redis lana overengineering hai.',
  ],
  why: 'Tumhe yeh samajhna hai taaki interview ya scaling discussion mein bata sako ki queue kab chahiye aur kab nahi. Aur jab WebWatch sach mein bada ho, to tumhe pata ho ki kaunsi problem ke liye Redis/BullMQ la rahe ho.',
  prerequisites: [
    'Worker aur scheduler (Milestone 12)',
    'Monitoring engine aur lease (Milestone 10)',
    'Promises aur async/await (Milestone 1)',
  ],
  terms: [
    { term: 'Redis', meaning: 'Memory mein data rakhne wala tez key-value database. Restart par data kho sakta hai agar persistence on na ho.' },
    { term: 'Job queue', meaning: 'Kaam ki line. Kaam daalne wala producer, uthane wala consumer.' },
    { term: 'Producer / Consumer', meaning: 'Producer job queue mein daalta hai (jaise scheduler). Consumer job nikaal kar chalata hai (jaise worker).' },
    { term: 'Exponential backoff', meaning: 'Har retry ke beech ka wait double karna: 1s, 2s, 4s — taaki toota hua server aur na dabe.' },
    { term: 'Job ID deduplication', meaning: 'Har job ko unique naam dena (jaise check:monitorId:time) taaki same job do baar line mein na aaye.' },
    { term: 'Concurrency', meaning: 'Ek worker ek saath kitne jobs chala sakta hai.' },
    { term: 'Dead-letter queue', meaning: 'Woh jagah jahan baar-baar fail hone wale jobs rakh diye jaate hain, taaki koi insaan dekh sake.' },
  ],
  flow: [
    'Scheduler (producer) adds job check:<monitorId>',
    'Redis stores the queue',
    'Worker (consumer) takes job',
    'runMonitor()',
    'Success → done',
    'Failure → retry with backoff → dead-letter after N tries',
  ],
  files: [
    { path: 'Backend/src/services/scheduler.js', lines: '8-30', note: 'Current "queue": findMany enabled monitors, filter due ones in memory, run them with Promise.allSettled' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '14-26', note: 'PostgreSQL lease: updateMany sets checkLeaseUntil only if free or expired — this already prevents duplicate work' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '5-9', note: 'In-process Set guard for the same process' },
    { path: 'Backend/package.json', lines: '20-35', note: 'Dependencies — no redis, ioredis or bullmq installed (verified)' },
    { path: 'README.md', lines: '180', note: 'Outdated: says to add a lease before multiple workers, but the lease already exists' },
  ],
  examples: [
    {
      title: 'What WebWatch uses instead of a queue today',
      code: String.raw`const claim = await prisma.monitor.updateMany({
  where: {
    id: monitorId,
    enabled: true,
    OR: [{ checkLeaseUntil: null }, { checkLeaseUntil: { lt: now } }],
  },
  data: { checkLeaseUntil: new Date(now.getTime() + 2 * 60_000) },
});
if (claim.count === 0) return null;`,
      notes: [
        'updateMany ek atomic operation hai: do workers ek saath try karein to sirf ek ka count 1 aayega.',
        'Lease 2 minute ki hai; worker crash ho jaaye to lease expire hoke doosra worker monitor utha leta hai.',
        'Yahi kaam BullMQ job IDs aur locks se karta — lekin yahan bina extra service ke ho raha hai.',
      ],
    },
    {
      title: 'What the same idea looks like in BullMQ (illustration, not in the repo)',
      code: String.raw`// Illustration only. Not installed in WebWatch.
await queue.add('check', { monitorId }, {
  jobId: 'check:' + monitorId + ':' + slot,   // dedupe per 5-minute slot
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
});`,
      notes: [
        'jobId: same slot ka same monitor do baar add nahi hoga.',
        'attempts + backoff: fail hone par 1s, 2s, 4s baad retry.',
        'Isko chalane ke liye Redis server chahiye — ek extra service, extra cost, extra failure point.',
      ],
    },
  ],
  exercise: {
    title: 'Build a tiny in-memory queue',
    minutes: 50,
    goal: 'Plain JavaScript mein ek chhoti queue banao jo jobId dedupe, retries with exponential backoff, aur concurrency 2 support kare. Isse samajh aayega BullMQ andar se kya karta hai. Redis install nahi karna.',
    where: 'playground/18-tiny-queue.js (practice folder, not production code)',
    input: String.raw`// fake check: example-down fails twice, then succeeds
const failuresLeft = { 'example-up': 0, 'example-down': 2 };
async function fakeCheck(monitorId) {
  if (failuresLeft[monitorId] > 0) { failuresLeft[monitorId]--; throw new Error('timeout'); }
  return 'UP';
}`,
    output: String.raw`add check:example-up    -> queued
add check:example-down  -> queued
add check:example-up    -> skipped (duplicate jobId)
check:example-up   attempt 1 -> UP
check:example-down attempt 1 -> failed, retry in 100ms
check:example-down attempt 2 -> failed, retry in 200ms
check:example-down attempt 3 -> UP`,
    steps: [
      'const jobs = new Map() banao (jobId → job).',
      'add(jobId, monitorId): agar jobs.has(jobId) to "skipped" print karo, warna save karo.',
      'runJob(job): try fakeCheck; fail ho to attempt badhao, wait(100 * 2 ** (attempt - 1)), dobara try; max 3 attempts.',
      'Concurrency 2: jobs ko 2-2 ke group mein Promise.all se chalao.',
      '3 attempts ke baad bhi fail ho to deadLetter array mein daalo.',
      'Comment mein likho: WebWatch ka lease is queue ke kis hisse jaisa hai.',
    ],
    hints: [
      'Concept: dedupe = "pehle dekha?" check (Map/Set). Retry = loop with wait. Backoff = har baar wait double.',
      'Pseudocode: for attempt 1..3 { try { result = await fakeCheck(); log; return } catch { if attempt == 3 -> deadLetter; else await wait(100 * 2^(attempt-1)) } }',
      String.raw`Partial:
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jobs = new Map();
const deadLetter = [];

function add(jobId, monitorId) {
  if (jobs.has(jobId)) return console.log('add', jobId, '-> skipped (duplicate jobId)');
  // save and log queued
}

async function runJob(job) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    // try fakeCheck, log, and back off on failure
  }
}`,
    ],
    explanation: [
      { code: 'if (jobs.has(jobId)) return', why: 'Deduplication: same kaam do baar line mein nahi. WebWatch mein yeh kaam lease karti hai.' },
      { code: 'for (let attempt = 1; attempt <= 3; attempt += 1)', why: 'Limited retries — infinite retry ek toote server par hamesha load daalta rahega.' },
      { code: 'await wait(100 * 2 ** (attempt - 1))', why: 'Exponential backoff: 100, 200, 400ms. Temporary problem ko theek hone ka time milta hai.' },
      { code: 'deadLetter.push(job)', why: 'Jo kaam kabhi pass nahi hua use chupchaap mat khoo; baad mein dekhne ke liye rakh do.' },
      { code: 'await Promise.all(batch.map(runJob))', why: 'Concurrency 2: ek saath do jobs, zyada nahi, taaki worker overload na ho.' },
    ],
  },
  checklist: [
    'Tiny queue ka output expected output se match karta hai (dedupe, backoff, success).',
    'Explain kar sakta hoon ki WebWatch ka checkLeaseUntil kaunsi queue problem already solve karta hai.',
    'Kam se kam do realistic signals likh sakta hoon jab Redis/BullMQ sach mein chahiye hoga.',
    'Redis crash hone par kya hota hai (memory data, persistence) apne shabdon mein bata sakta hoon.',
    'Production WebWatch mein Redis install ya add nahi kiya.',
  ],
  mistakes: [
    { mistake: 'Kyunki "real SaaS Redis use karte hain", isliye pehle din Redis lagana', fix: 'Pehle problem measure karo: kya scheduler cycle interval se lamba chal raha hai? Kya DB lease contention dikh raha hai? Tabhi lao.' },
    { mistake: 'Retries bina backoff ke', fix: 'Toote hue target par turant-turant retry sirf load badhata hai. Wait badhate jao.' },
    { mistake: 'Redis ko permanent database samajhna', fix: 'Check history aur incidents PostgreSQL mein hi rahenge. Redis sirf kaam ki line ke liye.' },
    { mistake: 'Queue ke saath bhi idempotency bhool jaana', fix: 'Queue bhi ek job do baar de sakti hai (crash ke baad). runMonitor ko duplicate-safe rehna chahiye.' },
  ],
  debugging: [
    'Queue se pehle measure karo: runDueMonitors ka time log karo aur compare karo CHECK_INTERVAL_MS (30s) se.',
    'Duplicate checks ka shak ho to Check table mein same monitor ke do rows ek hi second mein dhoondo.',
    'Tiny queue mein har attempt par timestamp log karo taaki backoff ka gap dikhe.',
  ],
  quiz: [
    {
      id: 'redis-bullmq-1', kind: 'mcq',
      prompt: 'Aaj WebWatch mein do workers ek hi monitor ek saath check karne se kaun rokta hai?',
      options: ['Redis lock', 'BullMQ jobId', 'PostgreSQL checkLeaseUntil lease via updateMany', 'Kuch nahi'],
      answer: 2,
      explain: 'monitorRunner.js lines 14-26: updateMany sirf free ya expired lease par hi set hota hai; count 0 aaya to worker skip karta hai.',
      wrong: ['Repo mein Redis nahi hai.', 'Repo mein BullMQ nahi hai.', '', 'Lease already hai — README ka line 180 purana hai.'],
    },
    {
      id: 'redis-bullmq-2', kind: 'predict',
      prompt: 'Backoff formula 100 * 2 ** (attempt - 1). Attempt 1, 2, 3 ke baad wait kitna?',
      options: ['100, 100, 100', '100, 200, 400', '200, 400, 800', '0, 100, 200'],
      answer: 1,
      explain: '2**0=1, 2**1=2, 2**2=4 — har baar double.',
      wrong: ['Yeh fixed delay hai, exponential nahi.', '', 'attempt - 1 exponent ko 0 se shuru karta hai.', 'Pehle attempt ka multiplier 1 hai, 0 nahi.'],
    },
    {
      id: 'redis-bullmq-3', kind: 'trace',
      prompt: 'Ek realistic signal chuno jo batata hai ki WebWatch ko queue ki zaroorat aa gayi hai:',
      options: ['Pehla paying user aaya', 'Ek scheduler cycle regularly 30 second se zyada chalne laga aur checks late ho rahe hain', 'Kisi blog ne Redis recommend kiya', 'Frontend slow hai'],
      answer: 1,
      explain: 'Jab ek process due checks time par khatam nahi kar pata, tab kaam ko kai workers mein baantna aur queue lagana sense banata hai.',
      wrong: ['Ek user se load nahi badhta.', '', 'Trend reason nahi hai.', 'Frontend speed ka queue se lena dena nahi.'],
    },
    {
      id: 'redis-bullmq-4', kind: 'match',
      prompt: 'Concept ko role se jodo:',
      pairs: [
        { left: 'Producer', right: 'runDueMonitors deciding which monitors are due' },
        { left: 'Consumer', right: 'runMonitor doing the actual check' },
        { left: 'Deduplication', right: 'checkLeaseUntil claim' },
      ],
      explain: 'WebWatch ke paas queue jaisa design already hai, bas line PostgreSQL mein hai, Redis mein nahi.',
    },
    {
      id: 'redis-bullmq-5', kind: 'explain',
      prompt: 'Agar Redis crash ho jaaye aur persistence off ho, to BullMQ-based WebWatch mein kya hoga?',
      model: 'Queue mein pade jobs kho jaayenge. Monitors aur check history PostgreSQL mein safe hain, lekin kuch checks miss honge jab tak scheduler dobara jobs add na kare. Isliye scheduler ko DB se due monitors dobara nikaalne chahiye aur jobs idempotent hone chahiye.',
      keywords: ['memory', 'lost', 'PostgreSQL', 'scheduler', 'idempotent'],
    },
  ],
  reflection: 'Tum kis number (monitors, checks per minute, cycle time) par decide karoge ki ab Redis lana hai? Wo number kaise measure karoge?',
  commit: 'docs: explain when WebWatch needs a job queue and simulate one in playground',
  resume: [
    'Evaluated Redis/BullMQ for an uptime monitor and justified keeping a PostgreSQL lease-based scheduler until measured load requires a queue.',
    'Built an in-memory job queue prototype with deduplication, exponential backoff and a dead-letter list to understand queue semantics.',
  ],
  gaps: ['readme-lease-outdated'],
}
