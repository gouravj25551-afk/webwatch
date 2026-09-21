export default {
  id: 'express',
  number: 4,
  title: 'Express',
  subject: 'Express',
  phase: 'Core backend',
  estMinutes: 240,
  summary: 'How Backend/src/app.js turns HTTP requests into route handlers: app setup, middleware order, routers, validation, the 404 handler and the error middleware.',
  hinglish: [
    'Express ek Node library hai jo HTTP server banana aasaan karti hai. const app = express() se app banta hai, app.listen(3001) se wo port par requests sunna shuru karta hai (WebWatch mein ye index.js karta hai).',
    'Middleware ek function hai jo request aur final route ke beech chalta hai. Uska signature (req, res, next) hota hai. Wo ya to response bhej deta hai, ya next() call karke request aage bhej deta hai. Airport security jaisa socho: har counter kuch check karta hai, phir aage bhejta hai.',
    'app.use() middleware ya router ko jodta hai. app.get() / app.post() ek specific method + path ke liye handler jodta hai. Order bahut important hai: Express upar se neeche chalta hai aur jo pehle match kare wahi chalta hai.',
    'Router ek chhota mini-app hai. routes/monitors.js ek router banata hai, aur app.js use /api/monitors par mount karta hai. Error middleware ke 4 parameters hote hain (error, req, res, next); jab koi handler next(error) call kare, Express seedha wahan pahunchta hai.',
  ],
  why: 'WebWatch ki har API request app.js ke middleware chain se guzarti hai. Security (helmet, CORS, rate limit), body parsing, cookies, auth aur error handling sab middleware hain. Order galat hua to webhook signature fail hoga, ya req.body undefined hoga, ya errors user ko leak honge.',
  prerequisites: ['Milestone 3: methods, params, status codes', 'Milestone 2: require and module.exports'],
  terms: [
    { term: 'app', meaning: 'Express application object; isi par middleware aur routes jodte hain.' },
    { term: 'Middleware', meaning: '(req, res, next) function jo request aur final route ke beech chalta hai.' },
    { term: 'next()', meaning: 'Request ko agle middleware/route ko bhejna. next(error) seedha error middleware tak.' },
    { term: 'Router', meaning: 'express.Router() se bana mini-app jisme related routes hote hain.' },
    { term: 'Mount', meaning: 'app.use("/api/monitors", router): router ko ek path prefix par lagana.' },
    { term: 'Handler / Controller', meaning: 'Wo function jo final response bhejta hai. WebWatch mein alag controllers folder nahi hai; handlers route files mein inline hain.' },
    { term: 'Body parser', meaning: 'express.json(): JSON text body ko req.body object mein badalta hai.' },
    { term: 'CORS', meaning: 'Browser rule jo decide karta hai kaunsi website tumhari API ko cookies ke saath call kar sakti hai.' },
    { term: 'helmet', meaning: 'Middleware jo security-related response headers set karta hai.' },
    { term: 'Error middleware', meaning: '4 parameter wala middleware (error, req, res, next) jo errors ko ek jagah JSON response mein badalta hai.' },
  ],
  flow: ['helmet', 'cors', '/api/webhooks (raw body)', 'express.json', 'cookieParser', 'rateLimit', 'routes', '404 handler', 'errorHandler'],
  files: [
    { path: 'Backend/src/app.js', lines: '15-31', note: 'Middleware order. Webhooks are mounted before express.json() so the raw body stays intact for signature verification.' },
    { path: 'Backend/src/app.js', lines: '41-48', note: 'POST /api/check: a manual URL check handler with try/catch and next(error).' },
    { path: 'Backend/src/app.js', lines: '67-74', note: 'Routers mounted, then the 404 handler, then errorHandler last.' },
    { path: 'Backend/src/middleware/errorHandler.js', lines: '1-12', note: 'Logs 5xx errors, hides internal messages from users, uses error.statusCode for 4xx.' },
    { path: 'Backend/src/routes/monitors.js', lines: '8-13', note: 'express.Router(), router.use(requireAuth) protects every route in the file, and a validEmail helper.' },
    { path: 'Backend/src/routes/monitors.js', lines: '79-87', note: 'Manual request validation: email format and interval must be 5, 10 or 15.' },
    { path: 'Backend/index.js', lines: '6-10', note: 'app.listen starts the HTTP server and then the in-process scheduler.' },
  ],
  examples: [
    {
      title: 'A tiny middleware',
      code: String.raw`function logRequest(req, res, next) {
  console.log(req.method, req.path)
  next()
}

app.use(logRequest)`,
      notes: [
        'Ye har request ka method aur path print karta hai.',
        'next() ke bina request yahin atak jaati aur browser wait karta rehta.',
        'app.use bina path ke har request par lagta hai.',
      ],
    },
    {
      title: 'The WebWatch handler shape',
      code: String.raw`router.post('/:id/check', async (req, res, next) => {
  try {
    const monitor = await prisma.monitor.findFirst({ where: { id: req.params.id, userId: req.user.id } })
    if (!monitor) return res.status(404).json({ success: false, message: 'Monitor not found' })
    // ...
  } catch (error) {
    return next(error)
  }
})`,
      notes: [
        'async handler: andar database calls await hoti hain.',
        'Expected problems (monitor nahi mila) ka seedha 404 response.',
        'Unexpected errors next(error) se errorHandler tak jaate hain, jo 500 aur ek safe message bhejta hai.',
      ],
    },
    {
      title: 'Why the error handler goes last',
      code: String.raw`app.use('/api/monitors', monitorRoutes)
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }))
app.use(errorHandler)`,
      notes: [
        'Routes pehle: agar match hua to response yahin se.',
        'Koi route match nahi hua to 404 handler.',
        'errorHandler ke 4 parameters hain, isliye Express use sirf errors ke liye use karta hai.',
      ],
    },
  ],
  exercise: {
    title: 'Mini manual URL-check API',
    minutes: 60,
    goal: 'Build a small Express app with a logging middleware, GET /health, POST /check with input validation, a 404 handler and an error middleware. Use a fake checker instead of real network calls.',
    where: 'playground/04-mini-api.js (inside playground run npm init -y and npm install express once; Backend dependencies are not shared with the repo root)',
    input: String.raw`curl -i -X POST http://localhost:4000/check -H "Content-Type: application/json" -d '{"url":"example.com"}'
curl -i -X POST http://localhost:4000/check -H "Content-Type: application/json" -d '{}'
curl -i http://localhost:4000/nope`,
    output: String.raw`200 {"success":true,"url":"example.com","isUp":true,"responseTimeMs":42}
400 {"success":false,"message":"url is required"}
404 {"success":false,"message":"Route not found"}`,
    steps: [
      'Create the app, add express.json() and a middleware that logs method and path.',
      'Add GET /health returning { success: true }.',
      'Add POST /check: if req.body.url is not a non-empty string, respond 400. Otherwise await a fakeCheck(url) that resolves to { isUp: true, responseTimeMs: 42 }.',
      'Add a 404 handler after the routes and an error middleware with 4 parameters at the very end.',
      'Make fakeCheck throw when url is "crash" and confirm your error middleware returns 500 without the internal message.',
    ],
    hints: [
      'Middleware runs in the order you call app.use. Validation errors are expected problems (400, respond directly); crashes are unexpected (next(error) → 500).',
      'app = express()\nuse json parser\nuse logger\nget /health → json\npost /check → validate → try { await fakeCheck } catch → next(error)\nuse 404 handler\nuse error handler (error, req, res, next)',
      "app.post('/check', async (req, res, next) => {\n  const { url } = req.body\n  if (typeof url !== 'string' || !url.trim()) {\n    return res.status(/* ? */).json({ success: false, message: 'url is required' })\n  }\n  try {\n    const result = await fakeCheck(url)\n    // respond\n  } catch (error) { /* ? */ }\n})",
    ],
    explanation: [
      { code: 'app.use(express.json())', why: 'Iske bina req.body undefined rahega.' },
      { code: 'if (typeof url !== \'string\' || !url.trim())', why: 'Validation: sirf non-empty string accept. WebWatch parseHttpUrl mein bhi yahi check karta hai.' },
      { code: 'return res.status(400).json(...)', why: 'return lagana zaroori hai taaki neeche ka code na chale aur do baar response na bheja jaaye.' },
      { code: 'catch (error) { return next(error) }', why: 'Unexpected error ko central error middleware ko dena.' },
      { code: 'app.use((error, req, res, next) => ...)', why: '4 parameters Express ko batate hain ki ye error middleware hai. Ise sabse last mein rakho.' },
    ],
  },
  checklist: [
    'All three curl commands return the expected status codes and JSON',
    'The "crash" URL returns 500 with a generic message, and the real error appears only in the terminal',
    'My logger prints one line per request',
    'I can explain why app.js mounts /api/webhooks before express.json()',
    'I can explain what router.use(requireAuth) does in routes/monitors.js',
  ],
  mistakes: [
    { mistake: 'Forgetting return before res.status(...).json(...) in a validation branch.', fix: 'Without return, the code continues and tries to send a second response: "Cannot set headers after they are sent".' },
    { mistake: 'Putting the error middleware before the routes.', fix: 'Express only reaches it for errors thrown after it is registered. Keep it last, as app.js does.' },
    { mistake: 'Error middleware with 3 parameters.', fix: 'It must be (error, req, res, next); Express decides by counting parameters.' },
    { mistake: 'Sending error.message to users for 500 errors.', fix: 'Internal messages can leak secrets or SQL details. errorHandler.js replaces them with a generic message.' },
  ],
  debugging: [
    'Request hangs forever: some middleware did not call next() or send a response.',
    'req.body is undefined: express.json() is missing, registered after the route, or the Content-Type header is wrong.',
    '"Cannot set headers after they are sent": two responses in one handler; look for a missing return.',
    'Add a temporary console.log at the top of each middleware to see how far the request travels.',
  ],
  quiz: [
    {
      id: 'express-1',
      kind: 'trace',
      prompt: 'A browser sends POST /api/monitors. Which order does it pass through in app.js?',
      options: [
        'helmet → cors → express.json → cookieParser → rateLimit → monitors router (requireAuth → handler)',
        'monitors router → helmet → cors → express.json',
        'errorHandler → cors → monitors router',
        'rateLimit → express.json → helmet → monitors router',
      ],
      answer: 0,
      explain: 'Express runs app.use/app.get registrations top to bottom. /api/webhooks is also passed through but only matches /api/webhooks paths.',
      wrong: ['', 'Routers are registered after the global middleware.', 'errorHandler is last and only runs for errors.', 'helmet and cors are registered first.'],
    },
    {
      id: 'express-2',
      kind: 'mcq',
      prompt: 'Why is app.use("/api/webhooks", webhookRoutes) placed before app.use(express.json())?',
      options: [
        'Webhooks are more important',
        'The Dodo signature is computed over the exact raw bytes, so the body must not be parsed into an object first',
        'express.json() does not work with POST',
        'To skip rate limiting for all routes',
      ],
      answer: 1,
      explain: 'webhooks.js uses express.raw() to keep the body as a Buffer. If express.json() ran first, the original bytes would be gone and signature verification could fail.',
      wrong: ['Order is about body parsing, not importance.', '', 'express.json() is designed for POST bodies.', 'Only webhook routes come before the limiter.'],
    },
    {
      id: 'express-3',
      kind: 'bug',
      prompt: 'What goes wrong with this handler when name is missing?',
      code: String.raw`router.post('/', (req, res) => {
  if (!req.body.name) {
    res.status(400).json({ success: false, message: 'name required' })
  }
  res.status(201).json({ success: true })
})`,
      options: ['Nothing', 'It sends two responses and throws "Cannot set headers after they are sent"', 'It returns 404', 'express.json() is missing'],
      answer: 1,
      explain: 'Without return, execution continues to the 201 response. WebWatch always writes return res.status(...).',
      wrong: ['The missing return is a real bug.', '', 'The route matched, so no 404.', 'Body parsing is not the issue here.'],
    },
    {
      id: 'express-4',
      kind: 'match',
      prompt: 'Match the responsibility to the file.',
      pairs: [
        { left: 'Middleware order and route mounting', right: 'Backend/src/app.js' },
        { left: 'Turning thrown errors into safe JSON', right: 'Backend/src/middleware/errorHandler.js' },
        { left: 'Starting the HTTP server', right: 'Backend/index.js' },
        { left: 'Monitor endpoints behind login', right: 'Backend/src/routes/monitors.js' },
      ],
      explain: 'app.js builds the app, index.js calls listen, route files hold handlers, middleware folder holds reusable middleware.',
    },
    {
      id: 'express-5',
      kind: 'explain',
      prompt: 'Explain middleware to a friend using one WebWatch example.',
      model: 'Middleware is a function that runs between the request and the final handler. For example requireAuth reads the session cookie, verifies the JWT, sets req.user and calls next(); if the token is missing it responds 401 and the monitor handler never runs.',
      keywords: ['between', 'next', 'requireAuth', '401'],
    },
  ],
  reflection: 'WebWatch keeps handlers inside route files instead of a controllers folder. When would you split them out, and when is that overengineering?',
  commit: 'chore(playground): add mini Express URL-check API with error middleware',
  resume: [
    'Explained the Express middleware pipeline of a production API, including why webhook routes need a raw body before JSON parsing.',
    'Built a small Express API with validation, a 404 handler and centralized error middleware.',
  ],
}
