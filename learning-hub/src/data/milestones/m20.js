export default {
  id: 'launch',
  number: 20,
  title: 'Launch and ownership',
  subject: 'Ownership',
  phase: 'Product',
  estMinutes: 180,
  summary: 'Become the person who can demo WebWatch, explain its architecture and tradeoffs, fix its README, and describe it honestly on a resume.',
  hinglish: [
    'Ownership ka matlab hai: project ke baare mein koi bhi sawaal aaye — "yeh kaise kaam karta hai?", "yeh kyun aise banaya?", "yeh toota to kya karoge?" — tum khud jawab de sako, bina AI ya kisi aur ke.',
    'Launch sirf deploy karna nahi hai. Ismein ek saaf demo, sahi README, privacy aur terms pages, aur ek plan chahiye ki cheezein toot-ein to kya karna hai.',
    'Resume par sirf wahi likho jo tum explain kar sakte ho. Agar interviewer poochhe "lease kaise kaam karti hai?" aur tum atak gaye, to woh bullet tumhare khilaaf jaata hai.',
  ],
  why: 'WebWatch tumhara portfolio project hai. Iski value tabhi hai jab tum iske decisions defend kar sako — jaise "Redis kyun nahi?", "SSRF kaise roka?", "duplicate checks kaise roke?". Yahi cheez ek copied project aur ek owned project mein fark karti hai.',
  prerequisites: [
    'Pichle saare core milestones (1-16) — kam se kam Learning status',
    'Launch Readiness page ka review',
    'Project Gaps list padhi hui',
  ],
  terms: [
    { term: 'Demo script', meaning: 'Pehle se likha hua 3-5 minute ka flow jo tum dikhaoge, taaki demo mein atko nahi.' },
    { term: 'Tradeoff', meaning: 'Ek cheez paane ke liye doosri chhodna. Jaise: GitHub Actions cron free hai, lekin exact time ki guarantee nahi.' },
    { term: 'Architecture diagram', meaning: 'Boxes aur arrows ka chitra jo dikhata hai kaunsa hissa kisse baat karta hai.' },
    { term: 'Known limitation', meaning: 'Woh cheez jo tumhe pata hai abhi kamzor hai, aur tum khud khule taur par batate ho.' },
    { term: 'Postmortem', meaning: 'Kisi incident ke baad likha document: kya hua, kyun hua, kaise theek kiya, aage kaise rokoge.' },
  ],
  flow: [
    'Know every file (Project Map)',
    'Fix README facts',
    'Write demo script',
    'Practice 2-minute architecture talk',
    'List tradeoffs and limitations',
    'Honest resume bullets',
  ],
  files: [
    { path: 'README.md', lines: '5', note: 'Live beta URL: https://webwatch-gamma.vercel.app' },
    { path: 'README.md', lines: '22', note: 'Mentions a future $1-per-monitor plan — differs from the intended $2 / two months offer' },
    { path: 'README.md', lines: '180', note: 'Outdated: asks to add a lease before multiple workers, but checkLeaseUntil already exists' },
    { path: 'Frontend/public/terms.html', lines: '14', note: 'Terms say monitor only sites you own or are authorized to test' },
    { path: 'Frontend/public/privacy.html', lines: '1-19', note: 'Privacy page exists and is linked from the login footer' },
    { path: 'Frontend/src/App.jsx', lines: '101', note: 'Footer links to Privacy, Beta terms and GitHub; there is no "I agree" checkbox at signup' },
  ],
  examples: [
    {
      title: 'A 2-minute architecture explanation (template)',
      code: String.raw`1. What: WebWatch checks a website every 5-15 minutes and emails on downtime and recovery.
2. Stack: React + Vite on Vercel, Express API on Vercel, PostgreSQL on Neon via Prisma.
3. Checks: a scheduler finds due monitors; runMonitor claims a lease so no two
   processes check the same monitor; checkWebsite retries 3 times with a 5s timeout.
4. Safety: URLs are validated against private/reserved IPs, DNS is pinned, redirects re-validated.
5. Incidents: first failed run opens an incident and emails; next successful run closes it.
6. Tradeoff: GitHub Actions cron is free but best-effort; a dedicated worker is the upgrade path.`,
      notes: [
        'Har line ek file se jud-ti hai — agar koi poochhe "kahan?", tum file khol kar dikha sako.',
        'Tradeoff line sabse zaroori hai: yeh dikhata hai tumne soch kar choose kiya.',
      ],
    },
    {
      title: 'Honest vs inflated resume bullet',
      code: String.raw`Inflated: "Built a scalable distributed monitoring platform with Redis queues serving thousands of users."
Honest:   "Built an uptime monitor (React, Express, Prisma, PostgreSQL) with SSRF-safe URL checks,
           lease-based duplicate prevention and downtime/recovery email alerts; deployed on Vercel + Neon."`,
      notes: [
        'Repo mein Redis nahi hai aur user count verified nahi — inflated bullet interview mein pakda jaayega.',
        'Honest bullet mein har claim ka code repo mein hai.',
      ],
    },
  ],
  exercise: {
    title: 'Demo script, README fixes and resume draft',
    minutes: 60,
    goal: 'Ek 3-minute demo script, README ke 3 factual corrections (draft), aur 3 honest resume bullets likho — sab repo evidence ke saath.',
    where: 'playground/20-launch.md (practice folder). README changes only on a local branch after review, never pushed silently.',
    steps: [
      'Demo script likho: signup → add monitor → check now → history → pause/resume. Har step ke saath bolne wali ek line.',
      'Ek "failure demo" plan karo jo safe ho: jaise ek public URL jo 404/500 deta hai, taaki incident dikhe. Private/local URL try karke SSRF rejection bhi dikha sakte ho.',
      'README ke 3 statements dhoondo jo code se match nahi karte (hint: lease, pricing, test command ke liye JWT_SECRET) aur har ek ke liye corrected sentence likho.',
      'Tradeoffs section likho: kam se kam 3 (GitHub cron vs worker, PostgreSQL lease vs Redis, $1 permanent slot vs time-limited plan).',
      '3 resume bullets likho, har bullet ke neeche woh file path jo usko prove karta hai.',
      'Kisi dost ko (ya khud record karke) 2-minute architecture explanation do bina notes ke.',
    ],
    hints: [
      'Concept: har claim ke peeche evidence chahiye — ek file aur line. Jo prove nahi ho sakta, woh "planned" ya "limitation" section mein jaata hai.',
      'Pseudocode: for each README line -> grep code -> match? keep : rewrite. For each resume bullet -> which file proves it? none -> delete bullet.',
      String.raw`Partial:
## README corrections
1. README.md:180 says "add a distributed queue or database claim/lease" —
   Actual: Backend/src/services/monitorRunner.js:14-26 already claims checkLeaseUntil.
   Corrected: "..."
2. README.md:22 ...
3. Verification section: npm test ...`,
    ],
    explanation: [
      { code: 'README.md:180 correction', why: 'Outdated docs naye contributor ko galat kaam karwate hain — woh ek lease dobara bana dega.' },
      { code: 'Tradeoffs section', why: 'Reviewer ko dikhata hai ki limitations tumhe pata hain aur tumne soch kar choose kiya.' },
      { code: 'Resume bullet + file path', why: 'Har bullet interview mein ek sawaal ban sakta hai; file path tumhara jawab hai.' },
      { code: 'Safe failure demo', why: 'Demo mein kisi aur ki site attack ya private network probe nahi karna — terms.html bhi yahi kehta hai.' },
    ],
  },
  checklist: [
    'Demo script likha aur ek baar poora demo bina atke chalaya.',
    'README ke 3 mismatches evidence (file:line) ke saath list kiye.',
    '3 tradeoffs aur 3 known limitations apne shabdon mein likhe.',
    '3 resume bullets likhe aur har ek ke peeche file path hai.',
    '2-minute architecture explanation bina notes ke de paaya.',
    'Launch Readiness page ke "Missing" items ke liye ek priority order likha.',
  ],
  mistakes: [
    { mistake: 'Resume par features likhna jo code mein nahi hain (Slack alerts, Redis, multi-region)', fix: 'Unhe "Planned" mein rakho. Interview mein sirf woh claim karo jo repo mein dikha sako.' },
    { mistake: 'Demo live bina practice ke', fix: 'Pehle se account aur 2-3 monitors ready rakho, backup screen recording bhi.' },
    { mistake: 'Limitations chhupana', fix: 'Khud batao: "abhi email verification nahi hai, yeh mera next task hai." Yeh maturity dikhata hai.' },
    { mistake: 'README ko ek baar likh kar bhool jaana', fix: 'Har feature PR ke saath README ka related section update karo.' },
  ],
  debugging: [
    'Demo se pehle production /health check karo aur ek monitor par Check now chalao.',
    'GitHub Actions tab mein last scheduler run green hai ya nahi dekho.',
    'Demo account ka koi bhi asli secret ya personal email screen par na dikhe, pehle se check karo.',
  ],
  quiz: [
    {
      id: 'launch-1', kind: 'mcq',
      prompt: 'Kaunsa resume bullet WebWatch ke current repo ke hisaab se honest hai?',
      options: [
        'Built a distributed Redis-based monitoring system',
        'Implemented lease-based duplicate prevention for scheduled checks in PostgreSQL via Prisma',
        'Launched multi-region monitoring with Slack and Discord alerts',
        'Processed thousands of paid subscriptions',
      ],
      answer: 1,
      explain: 'checkLeaseUntil aur updateMany claim monitorRunner.js mein hain. Baaki claims repo mein nahi hain.',
      wrong: ['Repo mein Redis nahi hai.', '', 'Sirf email (Resend) hai; regions nahi.', 'Billing disabled hai.'],
    },
    {
      id: 'launch-2', kind: 'bug',
      prompt: 'README.md line 180 mein kya galat hai?',
      code: String.raw`This MVP scheduler is designed for one worker. Before running multiple workers,
add a distributed queue or database claim/lease so two workers cannot execute
the same monitor simultaneously.`,
      options: ['Kuch galat nahi', 'Lease already implemented hai (checkLeaseUntil), yeh line purani hai', 'Worker exist nahi karta', 'Queue already hai'],
      answer: 1,
      explain: 'Migration 20260921110000_add_monitor_check_lease aur monitorRunner.js lines 14-26 lease add kar chuke hain. README line 49 bhi yahi kehti hai — dono lines ek doosre se contradict karti hain.',
      wrong: ['Code aur README match nahi karte.', '', 'Backend/worker.js exist karta hai.', 'Repo mein koi queue library nahi.'],
    },
    {
      id: 'launch-3', kind: 'match',
      prompt: 'Launch item ko uske evidence se jodo:',
      pairs: [
        { left: 'Monitoring consent', right: 'Frontend/public/terms.html' },
        { left: 'Live demo URL', right: 'README.md line 5' },
        { left: 'Duplicate check prevention', right: 'Backend/src/services/monitorRunner.js' },
      ],
      explain: 'Har launch claim ke liye ek file honi chahiye. Note: terms linked hain, lekin signup par "I agree" checkbox nahi hai.',
    },
    {
      id: 'launch-4', kind: 'explain',
      prompt: 'Interviewer poochhta hai: "Aapne Redis kyun use nahi kiya?" 3-4 lines mein jawab do.',
      model: 'Current scale par PostgreSQL lease duplicate checks rok deti hai aur ek extra service chalane ki cost aur complexity bachti hai. Maine measure karne ka plan rakha hai: jab scheduler cycle interval se lamba chalne lage ya multiple workers DB par contention dikhayein, tab BullMQ jaisi queue laaunga.',
      keywords: ['lease', 'PostgreSQL', 'complexity', 'measure', 'when'],
    },
  ],
  reflection: 'WebWatch ka kaunsa hissa tum abhi bhi confidently explain nahi kar sakte? Us par kaunsa milestone dobara karoge?',
  commit: 'docs: correct README facts and add architecture, tradeoffs and limitations',
  resume: [
    'Owned end-to-end delivery of an uptime-monitoring SaaS beta: React/Vite, Express, Prisma, PostgreSQL (Neon), Vercel and a scheduled checker.',
    'Documented architecture, tradeoffs and known limitations, and aligned the README with verified code behavior.',
  ],
  gaps: ['readme-lease-outdated', 'pricing-mismatch', 'no-email-verification', 'free-check-not-in-ui'],
}
