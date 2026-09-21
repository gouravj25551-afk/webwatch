export default {
  id: 'monitoring-engine',
  number: 10,
  title: 'Monitoring engine',
  subject: 'Monitoring logic',
  phase: 'Core backend',
  estMinutes: 220,
  summary: 'How WebWatch decides which monitors are due, claims them with a database lease so no two processes check the same monitor, records results, and calculates uptime.',
  hinglish: [
    'Monitoring engine do files mein hai: scheduler.js decide karta hai "kaunse monitors ka time ho gaya", aur monitorRunner.js ek monitor ko check karke result save karta hai.',
    'Interval matlab kitni der mein ek check. Monitor ka intervalMinutes 5, 10 ya 15 ho sakta hai. Scheduler har 30 second (CHECK_INTERVAL_MS default 30000) saare enabled monitors padhta hai, aur jiska lastCheckedAt null hai ya interval se purana hai, use "due" maanta hai.',
    'Duplicate work ka khatra: worker.js aur GitHub Actions wala /api/cron dono ek saath chal sakte hain. Dono ne ek hi monitor pakad liya to do Checks, do incidents, do emails. Isliye lease hai.',
    'Lease ek "temporary taala" hai. runMonitor() pehle updateMany se monitor ka checkLeaseUntil = ab + 2 minute set karta hai, sirf tab jab lease khaali (null) ya expire ho chuki ho. Database ek hi update ko jeetne deta hai, isliye claim.count 1 wala process kaam karta hai aur 0 wala chhod deta hai. Kaam ke baad finally block mein lease null ho jaati hai. Process crash ho jaaye to 2 minute baad lease apne aap expire ho jaati hai.',
    'Iske alawa ek process ke andar runningMonitorIds naam ka Set hai, aur scheduler mein schedulerBusy flag. Ye sirf usi process ke andar duplicate rokte hain; alag processes ke beech lease kaam aati hai.',
    'State transition matlab monitor ka status badalna: UNKNOWN (naya ya resume hua), UP, DOWN, PAUSED. Uptime percentage = up checks / total checks x 100. Dashboard card 30 din ke counts use karta hai (monitorWithStats), aur history route latest 500 checks tak se calculate karta hai.',
  ],
  why: 'Ye WebWatch ka dil hai. Agar due logic galat hai to checks miss honge; agar lease nahi hai to multiple processes duplicate alerts bhejenge; agar uptime galat hai to dashboard jhooth bolega.',
  prerequisites: [
    'Prisma findMany, updateMany, transaction (Milestone 6)',
    'URL checking (Milestone 8)',
    'Date aur milliseconds ka hisaab (Date.now(), getTime())',
  ],
  terms: [
    { term: 'Interval', meaning: 'Do checks ke beech ka time. WebWatch mein 5, 10 ya 15 minute.' },
    { term: 'Due monitor', meaning: 'Wo monitor jiska agla check ka time aa gaya hai.' },
    { term: 'Lease', meaning: 'Database mein rakha temporary taala jo ek fixed time baad khud khul jaata hai (yahan 2 minute).' },
    { term: 'Atomic update', meaning: 'Database ka ek operation jo ya to poora hota hai ya bilkul nahi, aur do log ek saath use "jeet" nahi sakte.' },
    { term: 'Duplicate work', meaning: 'Ek hi kaam do baar ho jaana, jaise do processes ek monitor ko ek saath check karein.' },
    { term: 'State transition', meaning: 'Status ka ek value se doosre mein badalna, jaise UP se DOWN.' },
    { term: 'Consecutive failures', meaning: 'Lagatar kitne checks fail hue. Success aate hi 0 ho jaata hai.' },
    { term: 'Uptime percentage', meaning: 'Kitne percent checks up the. 96 mein se 95 up = 98.96%.' },
  ],
  flow: [
    'Timer every 30s',
    'schedulerBusy? skip',
    'findMany enabled monitors',
    'Filter due (lastCheckedAt + interval)',
    'runMonitor(id) for each',
    'Claim lease (updateMany)',
    'checkWebsite 3 attempts',
    'Transaction: Check + status',
    'Release lease',
  ],
  files: [
    { path: 'Backend/src/services/scheduler.js', lines: '8-30', note: 'runDueMonitors(): schedulerBusy flag, due filter, Promise.allSettled' },
    { path: 'Backend/src/services/scheduler.js', lines: '32-40', note: 'startScheduler()/stopScheduler(): first run after 1 s, then every CHECK_INTERVAL_MS' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '5-27', note: 'runningMonitorIds Set and the 2-minute lease claim' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '39-104', note: 'Transaction: create Check, update status, consecutiveFailures' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '115-123', note: 'finally: release lease and clear the in-process Set' },
    { path: 'Backend/prisma/schema.prisma', lines: '43-67', note: 'Monitor model: intervalMinutes, status, consecutiveFailures, checkLeaseUntil, indexes' },
    { path: 'Backend/src/routes/monitors.js', lines: '15-32', note: 'monitorWithStats(): 30-day uptime from two counts' },
    { path: 'Backend/src/routes/monitors.js', lines: '169-192', note: 'History route: uptime from up to 500 latest checks' },
  ],
  examples: [
    {
      title: 'Due filter',
      code: String.raw`const due = monitors.filter((monitor) => {
  if (!monitor.lastCheckedAt) return true;
  return now - monitor.lastCheckedAt.getTime() >= monitor.intervalMinutes * 60_000;
});`,
      notes: [
        'Kabhi check nahi hua (null) to turant due. Resume karne par PATCH route lastCheckedAt null karta hai, isliye resume ke baad jaldi check hota hai.',
        'now - lastCheckedAt = kitne milliseconds beet gaye.',
        'intervalMinutes * 60_000 = interval milliseconds mein. 60_000 mein underscore sirf padhne ke liye hai.',
      ],
    },
    {
      title: 'Lease claim',
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
        'updateMany where-condition aur update ek hi database statement hai, isliye do processes dono nahi jeet sakte.',
        'Condition: lease khaali ho ya expire ho chuki ho (lt = less than).',
        'count 0 matlab kisi aur ke paas taala hai ya monitor disabled hai, to chup-chaap nikal jao.',
      ],
    },
  ],
  exercise: {
    title: 'Simulate the due filter and lease with a fixed clock',
    minutes: 50,
    goal: 'Database ke bina, plain objects se isDue(monitor, now) aur tryClaim(monitor, now) likho aur dikhao ki do "workers" ek monitor ko ek saath claim nahi kar sakte.',
    where: 'playground/10-lease.js',
    input: String.raw`const NOW = new Date('2026-09-21T10:00:00Z').getTime();
const monitors = [
  { id: 'a', intervalMinutes: 5,  lastCheckedAt: null,                           checkLeaseUntil: null },
  { id: 'b', intervalMinutes: 5,  lastCheckedAt: new Date('2026-09-21T09:57:00Z'), checkLeaseUntil: null },
  { id: 'c', intervalMinutes: 10, lastCheckedAt: new Date('2026-09-21T09:49:00Z'), checkLeaseUntil: null },
  { id: 'd', intervalMinutes: 5,  lastCheckedAt: null, checkLeaseUntil: new Date('2026-09-21T10:01:00Z') },
];`,
    output: String.raw`due: a, c, d
worker-1 claims a: true
worker-2 claims a: false
worker-2 claims d: false   (lease until 10:01)
after 2 minutes, worker-2 claims d: true`,
    steps: [
      'scheduler.js lines 18-22 aur monitorRunner.js lines 13-27 dobara padho.',
      'isDue(monitor, now) likho jo scheduler ke filter jaisa ho.',
      'tryClaim(monitor, now) likho: agar lease null ya now se purani hai to checkLeaseUntil = now + 2 min set karo aur true return karo, warna false.',
      'Fixed NOW use karo (Date.now() nahi) taaki output har baar same aaye.',
      'Upar ka output print karke match karo.',
    ],
    hints: [
      'Concept: fixed clock matlab "abhi" ka time hum khud dete hain. Isse test repeatable hota hai. Lease tab free hai jab wo null ho ya uska time beet chuka ho.',
      'Pseudocode: isDue -> if no lastCheckedAt return true; return now - last >= interval*60000. tryClaim -> if lease is null or lease < now: set lease = now + 120000, return true; else return false.',
      String.raw`Partial code:
function tryClaim(monitor, now) {
  const free = monitor.checkLeaseUntil === null || /* ? */;
  if (!free) return false;
  monitor.checkLeaseUntil = new Date(now + 2 * 60_000);
  return true;
}`,
    ],
    explanation: [
      { code: 'if (!monitor.lastCheckedAt) return true;', why: 'Scheduler line 20 jaisa: kabhi check nahi hua to due.' },
      { code: 'return now - monitor.lastCheckedAt.getTime() >= monitor.intervalMinutes * 60_000;', why: 'Beeta hua time interval ke barabar ya zyada ho to due. c: 11 minute beete, interval 10, isliye due.' },
      { code: 'const free = monitor.checkLeaseUntil === null || monitor.checkLeaseUntil.getTime() < now;', why: 'monitorRunner line 18-21 ka OR condition: khaali ya expire.' },
      { code: 'monitor.checkLeaseUntil = new Date(now + 2 * 60_000);', why: 'Taala 2 minute ke liye. Crash hone par bhi itne time baad khul jaayega.' },
    ],
  },
  checklist: [
    'Mai bata sakta hoon ki scheduler kitni der mein scan karta hai aur "due" ka formula kya hai',
    'Mai lease ko ek analogy ke saath samjha sakta hoon aur bata sakta hoon crash ke baad kya hota hai',
    'Mai runningMonitorIds, schedulerBusy aur database lease ka farak bata sakta hoon',
    'playground/10-lease.js fixed clock ke saath expected output deta hai',
    'Mai bata sakta hoon ki consecutiveFailures abhi incident logic mein use nahi hota',
  ],
  mistakes: [
    { mistake: 'Pehle findUnique se lease check karna, phir alag update karna', fix: 'Do alag queries ke beech doosra process ghus sakta hai. WebWatch ek hi updateMany mein condition + update karta hai.' },
    { mistake: 'Sochna ki runningMonitorIds Set multiple workers ko rokta hai', fix: 'Set sirf ek process ki memory mein hai. Doosre process ko ye dikhta hi nahi. Wahan lease kaam karti hai.' },
    { mistake: 'Test mein Date.now() use karna', fix: 'Har run pe result badlega. Fixed clock pass karo.' },
    { mistake: 'Uptime ke liye 0 checks pe 0% dikhana', fix: 'WebWatch null return karta hai (koi data nahi), aur UI "—" dikhata hai. 0% ka matlab hota "hamesha down".' },
  ],
  debugging: [
    'Monitor check nahi ho raha? Prisma Studio (npm run prisma:studio) mein enabled, lastCheckedAt aur checkLeaseUntil dekho.',
    'checkLeaseUntil future mein aur koi process chal nahi raha, to 2 minute ruko: lease expire hogi.',
    'Backend terminal mein "Monitor scheduler started; scanning every 30s" line hai ya nahi, dekho.',
    'CHECK_INTERVAL_MS ko bahut bada set kiya ho to scan dheere honge; .env.example ka default 30000 hai.',
  ],
  quiz: [
    {
      id: 'monitoring-engine-1', kind: 'predict',
      prompt: 'intervalMinutes 10, lastCheckedAt 10:00:00, scheduler scan 10:09:40 aur 10:10:10 pe. Check kab hoga?',
      options: ['10:09:40', '10:10:10', 'Dono scans pe', 'Kabhi nahi'],
      answer: 1,
      explain: '10:09:40 pe sirf 9 min 40 s beete (< 10 min). 10:10:10 pe 10 min 10 s beete, isliye due.',
      wrong: ['Interval abhi poora nahi hua.', '', 'Pehle scan pe due nahi tha.', 'Doosre scan pe due hai.'],
    },
    {
      id: 'monitoring-engine-2', kind: 'mcq',
      prompt: 'Worker process check ke beech crash ho gaya. Us monitor ka kya hoga?',
      options: ['Hamesha ke liye atak jaayega', 'checkLeaseUntil 2 minute mein expire hoga, phir koi bhi process use claim kar sakta hai', 'Monitor delete ho jaayega', 'Status turant DOWN ho jaayega'],
      answer: 1,
      explain: 'finally block nahi chala, isliye lease release nahi hui. Lekin claim condition expire lease ko free maanti hai (checkLeaseUntil < now).',
      wrong: ['Lease ka expiry isi problem ke liye hai.', '', 'Crash se data delete nahi hota.', 'Koi Check save nahi hua, isliye status nahi badla.'],
    },
    {
      id: 'monitoring-engine-3', kind: 'match',
      prompt: 'Duplicate-protection tool ko uske scope se match karo.',
      pairs: [
        { left: 'schedulerBusy', right: 'Ek process mein ek scan ek waqt' },
        { left: 'runningMonitorIds', right: 'Ek process mein ek monitor ek waqt' },
        { left: 'checkLeaseUntil', right: 'Saare processes ke beech ek monitor ek waqt' },
      ],
      explain: 'Pehle do sirf memory mein hain. Lease database mein hai, isliye worker.js aur /api/cron dono ko dikhti hai.',
    },
    {
      id: 'monitoring-engine-4', kind: 'bug',
      prompt: '7 din ke history panel mein "Uptime" kitne data se banta hai? Monitor har 5 minute check hota hai (7 din = 2016 checks).',
      code: String.raw`prisma.check.findMany({ where: { monitorId, checkedAt: { gte: since } }, orderBy: { checkedAt: 'desc' }, take: 500 })
// ...
const uptimePercentage = checks.length ? (upChecks / checks.length) * 100 : null;`,
      options: ['Poore 7 din ke 2016 checks', 'Sirf latest 500 checks (lagbhag 41 ghante)', '30 din', 'Sirf aaj'],
      answer: 1,
      explain: 'take: 500 list ko kaat deta hai, aur uptime usi kati hui list se nikalta hai. Ye repository ka fact hai; fix karna ho to count() queries use karo jaise monitorWithStats karta hai (recommendation).',
      wrong: ['take: 500 ki wajah se nahi.', '', 'days=7 hai, aur 30 din card mein alag se hota hai.', 'Filter 7 din ka hai, par limit 500 hai.'],
    },
    {
      id: 'monitoring-engine-5', kind: 'explain',
      prompt: 'Lease ko ek real-life analogy se samjhao.',
      model: 'Library ki meeting room ki booking jaisa: tum 2 ghante ke liye naam likhte ho. Tab tak koi aur nahi le sakta. Tum jaldi nikle to naam mita dete ho. Tum bhool gaye to bhi 2 ghante baad booking khud khatam, aur agla insaan le sakta hai.',
      keywords: ['temporary', 'expire', 'one', 'release'],
    },
  ],
  reflection: 'Agar ek check 2 minute se zyada chale (lease se lamba), to kya ho sakta hai? WebWatch ka sabse lamba check kitna ho sakta hai (3 attempts, har redirect hop pe 5 s timeout)?',
  commit: 'test: simulate scheduler due checks and lease claims with a fixed clock',
  resume: [
    'Explained and simulated a database-lease scheduler that prevents duplicate checks across multiple worker processes and recovers after crashes.',
    'Identified that a history endpoint computed uptime from a 500-row sample instead of the full time window.',
  ],
  gaps: ['consecutive-failures-unused', 'readme-lease-outdated', 'gh-actions-cron-best-effort'],
}
