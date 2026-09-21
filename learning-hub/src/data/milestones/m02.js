export default {
  id: 'node-foundations',
  number: 2,
  title: 'Node.js foundations',
  subject: 'Node.js',
  phase: 'Foundations',
  estMinutes: 180,
  summary: 'How Node.js runs WebWatch outside the browser: npm, package.json, environment variables, CommonJS modules, files, network requests and process-level errors.',
  hinglish: [
    'Node.js ek runtime hai. Runtime matlab wo program jo tumhara JavaScript chalata hai. Browser bhi JavaScript chalata hai, lekin Node server par chalta hai, jahan window ya document nahi hote, balki files, network aur process hote hain.',
    'npm Node ka package manager hai. package.json project ka "ID card" hai: naam, scripts (npm start, npm test) aur dependencies (bahar se aaye packages jaise express, prisma). npm install in dependencies ko node_modules folder mein download karta hai.',
    'Environment variable ek setting hai jo code ke bahar rakhi jaati hai, jaise DATABASE_URL ya JWT_SECRET. Secret ko code mein likhna galat hai, kyunki code GitHub par jaata hai. WebWatch dotenv package se .env file padh kar process.env mein daalta hai.',
    'Backend CommonJS modules use karta hai: require() se import, module.exports se export. Frontend ES modules use karta hai: import / export. Dono ka kaam same hai, syntax alag.',
  ],
  why: 'WebWatch ka API (index.js) aur worker (worker.js) dono Node processes hain. Config env variables se aata hai, website check Node ki network library (undici) se hota hai, aur crash handling process.on se hoti hai. Node samjhe bina ye pata nahi chalega ki app start kaise hota hai ya kyun crash hua.',
  prerequisites: ['Milestone 1: functions, objects, async/await', 'Terminal basics: cd, ls, running a command'],
  terms: [
    { term: 'Runtime', meaning: 'Wo program jo code ko chalata hai. Node.js server-side JavaScript runtime hai.' },
    { term: 'npm', meaning: 'Node Package Manager: packages install karta hai aur package.json ke scripts chalata hai.' },
    { term: 'package.json', meaning: 'Project ki file jisme naam, scripts aur dependencies likhi hoti hain.' },
    { term: 'Dependency', meaning: 'Bahar ka package jis par tumhara code depend karta hai, jaise express.' },
    { term: 'Workspace', meaning: 'npm feature jisme ek root package.json kai sub-projects (Frontend, Backend) ko manage karta hai.' },
    { term: 'Environment variable', meaning: 'Code ke bahar rakhi setting, process.env.NAME se padhi jaati hai.' },
    { term: 'dotenv', meaning: 'Package jo .env file padh kar values process.env mein daal deta hai.' },
    { term: 'CommonJS', meaning: 'Node ka purana module system: require() aur module.exports.' },
    { term: 'Process', meaning: 'Chalta hua program. WebWatch API ek process hai, worker doosra process.' },
    { term: 'Signal (SIGINT/SIGTERM)', meaning: 'Operating system ka message process ko: "band ho jao". Ctrl+C SIGINT bhejta hai.' },
  ],
  flow: ['npm start', 'node index.js', 'require config.js', 'dotenv loads .env', 'app.listen(3001)'],
  files: [
    { path: 'package.json', lines: '6-17', note: 'Root workspace: Frontend aur Backend dono ko jodta hai; Node 22+ required.' },
    { path: 'Backend/package.json', lines: '6-15', note: 'Scripts: start, worker, dev (node --watch), test (node --test), postinstall (prisma generate).' },
    { path: 'Backend/src/config.js', lines: '1-34', note: 'dotenv load hota hai, env variables padhe jaate hain, aur JWT_SECRET chhota ho to app start hi nahi hota.' },
    { path: 'Backend/.env.example', note: 'Kaunse env variables chahiye, bina asli secrets ke. Asli .env gitignored hai.' },
    { path: 'Backend/index.js', lines: '6-23', note: 'require.main === module: file seedha chalayi gayi ho tabhi server listen karta hai; SIGINT/SIGTERM par graceful shutdown.' },
    { path: 'Backend/worker.js', lines: '21-35', note: 'uncaughtException aur unhandledRejection pakad kar worker ko saaf tarike se band karna.' },
    { path: 'Backend/src/services/websiteChecker.js', lines: '2, 31-40', note: 'Node mein network request: undici ka request() with AbortSignal.timeout aur User-Agent header.' },
  ],
  examples: [
    {
      title: 'Reading an environment variable safely (same idea as config.js)',
      code: String.raw`function numberFromEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const port = numberFromEnv('PORT', 3001)`,
      notes: [
        'process.env ki har value string hoti hai (ya undefined), isliye Number() se convert karte hain.',
        'Number.isFinite galat values (NaN) ko reject karta hai; value > 0 negative ya zero ko.',
        'Galat ya missing value par fallback use hota hai, taaki app sensible default ke saath chale.',
      ],
    },
    {
      title: 'CommonJS export and require',
      code: String.raw`// services/greeting.js
function statusLabel(isUp) {
  return isUp ? 'UP' : 'DOWN'
}
module.exports = { statusLabel }

// other file
const { statusLabel } = require('./services/greeting')`,
      notes: [
        'module.exports ek object export karta hai.',
        'require path relative hota hai (./). Destructuring se sirf chahiye wala function nikaalte hain.',
        'WebWatch backend isi pattern se services jodta hai, jaise require(\'./services/scheduler\').',
      ],
    },
    {
      title: 'Timing a network request with fetch',
      code: String.raw`const startedAt = Date.now()
const response = await fetch('https://example.com', { signal: AbortSignal.timeout(5000) })
console.log(response.status, Date.now() - startedAt, 'ms')`,
      notes: [
        'Date.now() milliseconds deta hai; difference = response time. WebWatch bhi yahi karta hai (websiteChecker.js line 53).',
        'AbortSignal.timeout(5000) 5 second baad request cancel kar deta hai, taaki slow site par hamesha atke na rahein.',
        'Node 22 mein fetch built-in hai. WebWatch production mein undici ka request() use karta hai taaki DNS pinning kar sake.',
      ],
    },
  ],
  exercise: {
    title: 'Environment-driven mini checker',
    minutes: 45,
    goal: 'Write a Node script that reads a URL and a timeout from environment variables, requests the URL, and prints status code and response time, handling errors without crashing.',
    where: 'playground/02-mini-check.js (practice only; do not edit Backend files)',
    output: String.raw`$ CHECK_URL=https://example.com TIMEOUT_MS=5000 node playground/02-mini-check.js
https://example.com -> 200 in 143 ms

$ CHECK_URL=https://does-not-exist.invalid node playground/02-mini-check.js
https://does-not-exist.invalid -> ERROR: fetch failed`,
    steps: [
      'Read process.env.CHECK_URL. If it is missing, print a helpful message and exit with process.exit(1).',
      'Read TIMEOUT_MS with a numberFromEnv-style helper and a fallback of 5000.',
      'Record Date.now() before the request.',
      'Use fetch with AbortSignal.timeout inside try/catch.',
      'Print the status and elapsed ms on success, or the error message on failure.',
    ],
    hints: [
      'Env variables are always strings. Network calls can throw, so they belong inside try/catch. Elapsed time = end - start.',
      'url = env CHECK_URL (exit if missing)\ntimeout = numberFromEnv(TIMEOUT_MS, 5000)\nstart = now\ntry: response = await fetch(url, timeout signal); print status + (now - start)\ncatch: print error message',
      "const url = process.env.CHECK_URL\nif (!url) { console.error('Set CHECK_URL'); process.exit(1) }\nconst startedAt = Date.now()\ntry {\n  const response = await fetch(url, { signal: /* ? */ })\n  // print ...\n} catch (error) { /* ? */ }",
    ],
    explanation: [
      { code: 'const url = process.env.CHECK_URL', why: 'URL code ke bahar se aata hai, jaise WebWatch ke settings .env se aate hain.' },
      { code: 'if (!url) { console.error(...); process.exit(1) }', why: 'Fail fast: galat setup par turant saaf error, jaise config.js JWT_SECRET ke liye karta hai.' },
      { code: 'const startedAt = Date.now()', why: 'Response time naapne ke liye start time.' },
      { code: 'await fetch(url, { signal: AbortSignal.timeout(timeout) })', why: 'Request bhejo, lekin timeout ke baad cancel karo.' },
      { code: 'catch (error) { console.log(`${url} -> ERROR: ${error.message}`) }', why: 'DNS fail ya timeout par script crash nahi hoti, error dikhati hai. WebWatch bhi checkOnce mein error ko result object mein badal deta hai.' },
    ],
  },
  checklist: [
    'The script works for a real public URL and prints status plus ms',
    'A missing CHECK_URL prints a clear message and exits with code 1',
    'A bad hostname prints an error instead of a stack trace',
    'I can explain what npm run worker --workspace=webwatch-backend actually executes',
    'I can explain why JWT_SECRET must live in .env and never in code',
  ],
  mistakes: [
    { mistake: 'Committing a real .env file.', fix: 'Only .env.example goes to Git. Check git status before committing; .env is listed in .gitignore.' },
    { mistake: 'Using process.env.PORT as a number directly.', fix: 'It is a string. Convert it with Number() and validate it, as numberFromEnv does.' },
    { mistake: 'Mixing require and import in the same Backend file.', fix: 'Backend/package.json says "type": "commonjs", so use require/module.exports there.' },
    { mistake: 'Running npm test in Backend without JWT_SECRET and thinking the tests are broken.', fix: 'config.js throws at require time. Create Backend/.env from .env.example first (see Project Gap).' },
  ],
  debugging: [
    'Error "Cannot find module": check the relative path and that npm install ran in the right folder.',
    'Error "JWT_SECRET must be at least 32 characters long": your Backend/.env is missing or the secret is too short.',
    'Print console.log(process.env.NAME) to confirm a variable is really set (never log real secrets in shared logs).',
    'node -v must be 22 or newer; the root package.json engines field requires it.',
  ],
  quiz: [
    {
      id: 'node-foundations-1',
      kind: 'predict',
      prompt: 'PORT is not set. What is config.port?',
      code: String.raw`function numberFromEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}
const port = numberFromEnv('PORT', 3001)`,
      options: ['undefined', 'NaN', '3001', '0'],
      answer: 2,
      explain: 'Number(undefined) is NaN, Number.isFinite(NaN) is false, so the fallback 3001 is returned.',
      wrong: ['The function always returns a value.', 'NaN is filtered by Number.isFinite.', '', '0 would also fail the value > 0 check.'],
    },
    {
      id: 'node-foundations-2',
      kind: 'mcq',
      prompt: 'What does `npm run worker` run inside Backend?',
      options: ['node index.js', 'node worker.js', 'prisma studio', 'vite'],
      answer: 1,
      explain: 'Backend/package.json maps "worker" to "node worker.js", which starts the scheduler without an HTTP server.',
      wrong: ['That is "start".', '', 'That is "prisma:studio".', 'Vite belongs to the Frontend.'],
    },
    {
      id: 'node-foundations-3',
      kind: 'trace',
      prompt: 'You run `npm start` in Backend with no .env file. What happens first?',
      options: ['The server starts on port 3001', 'config.js throws "JWT_SECRET must be at least 32 characters long."', 'Prisma creates the database', 'The frontend opens'],
      answer: 1,
      explain: 'index.js requires app.js, which requires config.js. config.js checks JWT_SECRET at load time and throws before listen() runs.',
      wrong: ['listen() is never reached.', '', 'Prisma never creates databases on start.', 'The backend does not start the frontend.'],
    },
    {
      id: 'node-foundations-4',
      kind: 'explain',
      prompt: 'Why does worker.js listen for SIGTERM and call prisma.$disconnect() before exiting?',
      model: 'SIGTERM is the signal hosting platforms send to stop a process. Handling it lets the worker stop the scheduler and close database connections cleanly instead of being killed mid-work.',
      keywords: ['signal', 'stop', 'database', 'clean'],
    },
  ],
  reflection: 'If you deployed the worker and it kept restarting, which two files would you read first and why?',
  commit: 'chore(playground): add env-driven mini website checker',
  resume: [
    'Explained how WebWatch configures its API and worker processes through environment variables and fails fast on missing secrets.',
    'Wrote a Node.js script that measures HTTP response time with timeouts and error handling.',
  ],
  gaps: ['tests-need-jwt-secret'],
}
