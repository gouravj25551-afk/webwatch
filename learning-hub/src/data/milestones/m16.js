export default {
  id: 'deployment',
  number: 16,
  title: 'Deployment',
  subject: 'Deployment',
  phase: 'Product',
  estMinutes: 200,
  summary: 'Understand exactly how WebWatch runs in production today: Vercel services, Neon PostgreSQL, the GitHub Actions scheduler, the dedicated worker, environment variables and migrations.',
  hinglish: [
    'Deployment ka matlab hai code ko apne laptop se nikaal kar internet par chalana, taaki koi bhi use kar sake. Production woh environment hai jahan asli users hain; development tumhara laptop hai.',
    'WebWatch production mein teen jagah chalta hai: Vercel (React frontend aur Express API), Neon (PostgreSQL database), aur GitHub Actions (har 5 minute /api/cron ko call karta hai). Ek dedicated worker (worker.js) bhi likha hua hai, lekin repo mein yeh nahi likha ki woh kahan host hoga.',
    'Vercel par Express ek serverless function ki tarah chalta hai. Serverless ka matlab: server hamesha on nahi rehta, request aane par thodi der ke liye chalta hai. Isliye wahan setInterval wala scheduler bharose ke saath nahi chal sakta — isi wajah se GitHub Actions cron aur worker.js ki zaroorat padi.',
  ],
  why: 'Local par sab chal jaata hai, lekin production mein galat CLIENT_ORIGIN, missing migration ya missing CRON_SECRET se poora product ruk jaata hai. Owner ko pata hona chahiye ki kaunsa process kahan chalta hai aur kise kaunsa environment variable chahiye.',
  prerequisites: [
    'Environment variables aur config.js (Milestone 2)',
    'Prisma migrations (Milestone 6)',
    'Worker aur scheduler (Milestone 12)',
    'Cookies aur CORS basics (Milestone 7)',
  ],
  terms: [
    { term: 'Production', meaning: 'Asli users wala environment. Yahan galti ka asar asli logon par padta hai.' },
    { term: 'Serverless function', meaning: 'Code jo sirf request aane par chalta hai aur phir so jaata hai. Hamesha chalne wale kaam (loops, timers) ke liye theek nahi.' },
    { term: 'Environment variable', meaning: 'Code ke bahar rakhi setting, jaise DATABASE_URL. Secrets code ya Git mein nahi, yahan rakhe jaate hain.' },
    { term: 'Migration deploy', meaning: 'npx prisma migrate deploy — production database par pending SQL migrations chalana, bina naye migrations banaye.' },
    { term: 'CORS', meaning: 'Browser ka rule jo decide karta hai kaunsi doosri website tumhare API ko cookies ke saath call kar sakti hai. WebWatch sirf CLIENT_ORIGIN ko allow karta hai.' },
    { term: 'Cron', meaning: 'Time table jaisa schedule. */5 * * * * matlab har 5 minute.' },
    { term: 'Rewrite', meaning: 'Vercel ka rule jo URL dekh kar request ko sahi service (frontend ya backend) tak bhejta hai.' },
  ],
  flow: [
    'Browser → webwatch-gamma.vercel.app',
    'vercel.json rewrites',
    '/api/* → backend service (Express)',
    'Everything else → frontend service (Vite build)',
    'Express → Prisma → Neon PostgreSQL',
    'GitHub Actions every 5 min → GET /api/cron',
  ],
  files: [
    { path: 'vercel.json', lines: '3-19', note: 'Two services (frontend, backend) and rewrites that route /api and /health to the backend' },
    { path: '.github/workflows/monitor-scheduler.yml', lines: '5', note: "cron: '*/5 * * * *' — best-effort schedule" },
    { path: '.github/workflows/monitor-scheduler.yml', lines: '19-23', note: 'curl with Authorization: Bearer CRON_SECRET to /api/cron' },
    { path: 'Backend/src/app.js', lines: '50-65', note: '/api/cron: 503 without CRON_SECRET, 401 with wrong token, runs runDueMonitors otherwise' },
    { path: 'Backend/index.js', lines: '6-10', note: 'app.listen and startScheduler only when run directly (not when Vercel imports the app)' },
    { path: 'Backend/src/app.js', lines: '16-18', note: 'trust proxy, helmet, and CORS locked to config.clientOrigin' },
    { path: 'README.md', lines: '174-192', note: 'Deployment notes: NODE_ENV, CLIENT_ORIGIN, env vars, migrate deploy' },
    { path: 'Backend/.env.example', lines: '1-17', note: 'Every variable the backend reads, with placeholder values only' },
  ],
  examples: [
    {
      title: 'How one Vercel project serves both apps',
      code: String.raw`"rewrites": [
  { "source": "/api/(.*)", "destination": { "service": "backend" } },
  { "source": "/health", "destination": { "service": "backend" } },
  { "source": "/(.*)", "destination": { "service": "frontend" } }
]`,
      notes: [
        'Rules upar se neeche check hote hain. /api se shuru hone wali har request backend ko jaati hai.',
        'Baaki sab frontend ko, jo Vite ka build (dist) serve karta hai.',
        'Dono ek hi domain par hain, isliye production mein cookies aur CORS simple rehte hain — development ke Vite proxy jaisa hi asar.',
      ],
    },
    {
      title: 'Why index.js checks require.main',
      code: String.raw`if (require.main === module) {
  const server = app.listen(config.port, () => {
    startScheduler();
  });
}
module.exports = app;`,
      notes: [
        'node index.js chalane par require.main === module true hota hai: server port par sunta hai aur scheduler shuru hota hai.',
        'Vercel app ko import karta hai, directly nahi chalata. Tab yeh block skip hota hai — serverless mein setInterval scheduler nahi chalta.',
        'Isliye production mein checks GitHub Actions cron ya worker.js se trigger hote hain.',
      ],
    },
  ],
  exercise: {
    title: 'Env var map and cron endpoint drill',
    minutes: 45,
    goal: 'Ek table banao jo batati hai har environment variable kis process ko chahiye, aur local par /api/cron ke teeno responses (503, 401, 200) khud dekho.',
    where: 'playground/16-deploy-runbook.md (practice folder). Only local .env changes, never commit .env.',
    steps: [
      'Backend/.env.example aur Backend/src/config.js padho. Har variable ki list banao.',
      'Table banao: Variable | API (Vercel) | Worker | GitHub Actions secret | Secret? (yes/no).',
      'Local Backend/.env mein CRON_SECRET khaali rakh kar npm start karo, phir: curl -i http://localhost:3001/api/cron — status note karo.',
      'CRON_SECRET mein ek local dummy value daalo, restart karo, galat token ke saath curl karo — status note karo.',
      'Sahi token ke saath curl -H "Authorization: Bearer <local-dummy>" karo — status aur backend logs note karo.',
      'Runbook mein likho: production deploy ke baad kaun se 3 commands/checks chalaoge (health, migrate deploy, cron).',
    ],
    output: String.raw`CRON_SECRET empty          -> 503 Cron runner is not configured
Wrong bearer token         -> 401 Invalid cron credentials
Correct bearer token       -> 200 Due monitors processed`,
    hints: [
      'Concept: har process ki apni memory aur apna environment hota hai. Vercel API, worker aur GitHub Actions teen alag jagah hain — ek jagah variable set karne se doosri jagah nahi pahunchta.',
      'Pseudocode: for each variable in config.js -> kaun sa file use padhta hai? -> woh file kaun sa process chalata hai (index.js/app.js on Vercel, worker.js, workflow yml)? -> secret hai to kahin commit nahi.',
      String.raw`Partial table:
| Variable     | API (Vercel) | Worker | GH Actions | Secret |
| DATABASE_URL | yes          | yes    | no         | yes    |
| CRON_SECRET  | yes          | ?      | ?          | ?      |
| CLIENT_ORIGIN| ?            | ?      | no         | no     |`,
    ],
    explanation: [
      { code: 'if (!config.cronSecret) return res.status(503)', why: 'Agar secret set hi nahi, endpoint band rehta hai — koi bhi public user monitors trigger na kar sake.' },
      { code: 'req.headers.authorization !== `Bearer ${config.cronSecret}`', why: 'Sirf woh caller jiske paas secret hai (GitHub Actions) checks chala sakta hai.' },
      { code: 'await runDueMonitors()', why: 'Wahi function jo worker aur local scheduler use karte hain; lease duplicate checks rokti hai.' },
      { code: 'npx prisma migrate deploy --schema Backend/prisma/schema.prisma', why: 'Production DB ka schema code ke schema se match karna chahiye, warna naye columns (jaise checkLeaseUntil) par queries fail hongi.' },
    ],
  },
  checklist: [
    'Har environment variable ke liye bata sakta hoon kaun sa process use padhta hai.',
    '/api/cron ke 503, 401 aur 200 responses local par khud dekhe.',
    'Explain kar sakta hoon ki Vercel par setInterval scheduler kyun nahi chalta (require.main check + serverless).',
    'Explain kar sakta hoon ki CLIENT_ORIGIN galat hone par browser mein kya toot-ta hai.',
    'Runbook mein migrate deploy, health check aur rollback idea likha.',
    'Kisi bhi file mein asli secret commit nahi kiya.',
  ],
  mistakes: [
    { mistake: 'Naya column add kar ke deploy karna lekin migrate deploy bhool jaana', fix: 'Production mein "column does not exist" errors aate hain. Har schema change ke saath migrate deploy chalao.' },
    { mistake: 'CLIENT_ORIGIN mein trailing slash ya galat domain', fix: 'Browser CORS error dikhata hai aur cookies nahi jaati. Exact origin daalo, jaise https://webwatch-gamma.vercel.app.' },
    { mistake: 'NODE_ENV=production na set karna', fix: 'Tab cookie secure nahi hoti aur webhook verifier bina key ke valid maan sakta hai. Production mein hamesha set karo.' },
    { mistake: 'Worker aur GitHub cron dono ko hamesha chalne dena bina soche', fix: 'Lease duplicate check rokti hai, lekin README khud kehta hai worker healthy hone ke baad GitHub scheduler disable karo.' },
  ],
  debugging: [
    'Pehle curl https://<domain>/health — API zinda hai ya nahi.',
    'Vercel function logs mein error message aur stack trace dekho (errorHandler 500 errors console.error karta hai).',
    'GitHub repo → Actions tab → "Run WebWatch monitors" runs mein curl ka status dekho (401 = secret mismatch).',
    'Browser Network tab mein CORS error aaye to response headers mein Access-Control-Allow-Origin compare karo CLIENT_ORIGIN se.',
  ],
  quiz: [
    {
      id: 'deployment-1', kind: 'mcq',
      prompt: 'Vercel par Backend/index.js ka startScheduler() kyun nahi chalta?',
      options: ['Vercel Node support nahi karta', 'Vercel app ko import karta hai, isliye require.main === module false hota hai', 'CRON_SECRET missing hai', 'Prisma serverless mein kaam nahi karta'],
      answer: 1,
      explain: 'index.js sirf direct run hone par listen aur startScheduler karta hai. Serverless mein hamesha chalne wala timer bharosemand bhi nahi hota.',
      wrong: ['Vercel Node functions chalata hai.', '', 'CRON_SECRET sirf /api/cron ko affect karta hai.', 'Prisma wahan chal raha hai; API routes use karte hain.'],
    },
    {
      id: 'deployment-2', kind: 'predict',
      prompt: 'Production mein CRON_SECRET set hai. GitHub Actions secret mein galat value hai. Workflow run ka kya hoga?',
      options: ['200, checks chalenge', 'curl --fail 401 par job fail karega, checks nahi chalenge', '503', 'Worker automatically cover karega'],
      answer: 1,
      explain: '/api/cron 401 dega aur curl --fail non-2xx par error code deta hai. Worker tabhi cover karega agar woh alag se deploy aur chal raha ho.',
      wrong: ['Token match nahi hua.', '', '503 sirf tab jab server par CRON_SECRET hi na ho.', 'Repo mein worker ki hosting configured nahi hai; yeh verify karna padega.'],
    },
    {
      id: 'deployment-3', kind: 'trace',
      prompt: 'Browser se https://webwatch-gamma.vercel.app/api/monitors par request gayi. Pehle kaun decide karta hai ki yeh Express tak jaaye?',
      options: ['Vite proxy', 'vercel.json rewrite /api/(.*) → backend', 'app.use("/api/monitors")', 'GitHub Actions'],
      answer: 1,
      explain: 'Production mein Vite dev server hota hi nahi. Vercel rewrite pehle service chunta hai, phir Express andar route match karta hai.',
      wrong: ['Vite proxy sirf development mein hai.', '', 'Yeh Express ke andar ka step hai, uske baad aata hai.', 'Actions sirf /api/cron ko call karta hai.'],
    },
    {
      id: 'deployment-4', kind: 'match',
      prompt: 'Har cheez ko uski production jagah se jodo:',
      pairs: [
        { left: 'React build (dist)', right: 'Vercel frontend service' },
        { left: 'Express API', right: 'Vercel backend service' },
        { left: 'PostgreSQL', right: 'Neon' },
        { left: 'Every-5-minute trigger', right: 'GitHub Actions workflow' },
      ],
      explain: 'Yeh README aur vercel.json se verified hai. Dedicated worker ki hosting repo mein defined nahi hai.',
    },
    {
      id: 'deployment-5', kind: 'explain',
      prompt: 'GitHub Actions cron ko "best-effort" kyun kaha jaata hai, aur WebWatch ke liye iska kya matlab hai?',
      model: 'GitHub scheduled workflows delay ho sakte hain ya load par skip ho sakte hain, isliye exact 5 minute ki guarantee nahi. WebWatch ke checks late ho sakte hain, isliye paid monitoring ke liye dedicated worker behtar hai aur scheduler ko khud monitor karna chahiye.',
      keywords: ['delay', 'skip', 'guarantee', 'worker'],
    },
  ],
  reflection: 'Agar kal production mein saare monitors "Last checked" 1 ghante purana dikhayein, to tum kin teen jagahon par sabse pehle dekhoge?',
  commit: 'docs: add deployment runbook and environment variable map',
  resume: [
    'Deployed a React + Express monorepo on Vercel services with Neon PostgreSQL and a secret-protected scheduled job endpoint.',
    'Documented environment configuration and migration steps for production releases of an uptime-monitoring service.',
  ],
  gaps: ['gh-actions-cron-best-effort', 'worker-no-health', 'logging-console-only'],
}
