export default {
  id: 'http-rest',
  number: 3,
  title: 'HTTP and REST APIs',
  subject: 'HTTP & APIs',
  phase: 'Foundations',
  estMinutes: 180,
  summary: 'How the browser and the WebWatch API talk: methods, URLs, params, headers, JSON bodies, status codes and testing endpoints with curl.',
  hinglish: [
    'HTTP ek language hai jisme client (browser, curl, GitHub Actions) server se baat karta hai. Har baat do hisson mein hoti hai: request (maangna) aur response (jawab).',
    'Request mein hota hai: method (GET = padhna, POST = banana, PATCH = thoda badalna, DELETE = hataana), URL, headers (extra info jaise Content-Type ya Cookie) aur kabhi-kabhi body (JSON data).',
    'URL ke andar bhi data aata hai. Route parameter path ka hissa hai: /api/monitors/:id mein id. Query parameter ? ke baad aata hai: /history?days=7 mein days.',
    'Response mein status code hota hai (200 OK, 201 Created, 400 galat input, 401 login nahi, 404 mila nahi, 500 server ki galti) aur body, jo WebWatch mein hamesha JSON hoti hai jisme success: true/false hota hai.',
    'REST ek design style hai: cheezon (resources) ko nouns se naam do (/api/monitors) aur kaam ko HTTP method se batao. Isliye "delete monitor" ka URL /deleteMonitor nahi, balki DELETE /api/monitors/:id hai.',
  ],
  why: 'WebWatch ka React frontend sirf HTTP requests ke through backend se baat karta hai. Har button (Add monitor, Check now, Pause, Delete, History) ek endpoint ko call karta hai. Status codes samjhe bina tum ye nahi bata paoge ki error frontend ki galti hai, input ki, login ki ya server ki.',
  prerequisites: ['Milestone 1: objects and JSON', 'Milestone 2: running commands in the terminal'],
  terms: [
    { term: 'Client / Server', meaning: 'Client request bhejta hai (browser), server jawab deta hai (Express API).' },
    { term: 'Endpoint', meaning: 'Method + path ka ek combination, jaise POST /api/monitors.' },
    { term: 'HTTP method', meaning: 'Request ka irada: GET, POST, PATCH, DELETE.' },
    { term: 'Header', meaning: 'Request/response ke saath extra info, jaise Content-Type: application/json ya Cookie.' },
    { term: 'Body', meaning: 'Request ya response ka main data, WebWatch mein JSON.' },
    { term: 'Route parameter', meaning: 'URL path ka variable hissa, /api/monitors/:id → req.params.id.' },
    { term: 'Query parameter', meaning: 'URL mein ? ke baad key=value, /history?days=7 → req.query.days.' },
    { term: 'Status code', meaning: 'Teen digit ka number jo batata hai result kaisa raha. 2xx success, 4xx client ki galti, 5xx server ki galti.' },
    { term: 'REST', meaning: 'API design style: resources ko nouns se, actions ko methods se represent karna.' },
    { term: 'curl', meaning: 'Terminal tool jo HTTP request bhejta hai. API test karne ke liye.' },
  ],
  flow: ['Client builds request', 'Method + URL + headers + body', 'Express matches route', 'Handler runs', 'Status code + JSON body'],
  files: [
    { path: 'README.md', note: '"API overview" section lists every public and authenticated endpoint.' },
    { path: 'Backend/src/app.js', lines: '33-65', note: 'GET /health, GET /api/health, POST /api/check, GET /api/cron (Authorization header check).' },
    { path: 'Backend/src/routes/monitors.js', lines: '34-196', note: 'REST resource /api/monitors: GET, POST, PATCH /:id, DELETE /:id, POST /:id/check, GET /:id/history?days=.' },
    { path: 'Backend/src/routes/auth.js', lines: '37-101', note: 'Status codes 400 (bad input), 409 (email exists), 201 (created), 401 (wrong password).' },
    { path: 'Frontend/src/App.jsx', lines: '4-22', note: 'api() helper: sends JSON with credentials, throws an Error with the server message when response.ok is false.' },
  ],
  examples: [
    {
      title: 'Endpoints of the monitors resource',
      code: String.raw`GET    /api/monitors                → list my monitors        200
POST   /api/monitors                → create a monitor        201 / 400 / 402 / 403
PATCH  /api/monitors/:id            → update / pause / resume 200 / 400 / 404
DELETE /api/monitors/:id            → delete with history     200 / 404
POST   /api/monitors/:id/check      → check now               200 / 400 / 404
GET    /api/monitors/:id/history?days=7 → checks + incidents  200 / 404`,
      notes: [
        'Ek hi resource (/api/monitors), alag methods alag kaam karte hain. Yahi REST ka idea hai.',
        ':id route parameter hai, ?days=7 query parameter hai.',
        'Status codes monitors.js mein seedhe res.status(...) se set hote hain.',
      ],
    },
    {
      title: 'Testing endpoints with curl',
      code: String.raw`curl -i http://localhost:3001/health

curl -i -X POST http://localhost:3001/api/check \
  -H "Content-Type: application/json" \
  -d '{"url":"example.com"}'`,
      notes: [
        '-i response ke headers aur status line bhi dikhata hai.',
        '-X POST method set karta hai, -H header, -d body.',
        'Content-Type: application/json ke bina express.json() body parse nahi karega aur req.body khaali hoga.',
      ],
    },
    {
      title: 'How the frontend reads a failed response',
      code: String.raw`const data = await response.json().catch(() => ({}))
if (!response.ok) {
  const error = new Error(data.message || 'Request failed')
  error.status = response.status
  throw error
}`,
      notes: [
        'response.ok true hota hai sirf 200-299 ke liye.',
        'Server ka message (jaise "Monitor not found") error mein daala jaata hai taaki UI dikha sake.',
        'error.status rakhne se AddMonitor 402 (payment required) ko alag handle karta hai.',
      ],
    },
  ],
  exercise: {
    title: 'Build an endpoint map and test two endpoints',
    minutes: 50,
    goal: 'Read the route files and produce a table of every WebWatch endpoint with its method, params, body fields, auth requirement and possible status codes. Then call two public endpoints with curl.',
    where: 'playground/03-endpoints.md (notes file; no code changes)',
    output: String.raw`| Method | Path | Auth? | Params / Body | Status codes |
|---|---|---|---|---|
| POST | /api/monitors | yes | body: url, name?, alertEmail?, intervalMinutes? | 201, 400, 401, 402, 403 |
...`,
    steps: [
      'Open Backend/src/app.js and list every app.get / app.post and app.use("/api/...") mount.',
      'Open each file in Backend/src/routes and list router.get/post/patch/delete. Remember: the full path = mount path + router path.',
      'For each endpoint, search for res.status( to find status codes, and req.params / req.query / req.body to find inputs.',
      'Mark which routers use requireAuth (router.use(requireAuth) at the top means every route in the file needs login).',
      'Start the backend locally (or skip if you have no database yet) and run curl -i on GET /health and POST /api/check.',
    ],
    hints: [
      'Full path = the prefix in app.use("/api/monitors", monitorRoutes) + the path in router.get("/:id/history"). A route without an explicit res.status() returns 200.',
      'for each file in routes:\n  prefix = mount path from app.js\n  for each router.METHOD(path):\n    row = METHOD, prefix + path, auth?, inputs, all res.status codes (+200 default, +401 if protected)',
      "| GET | /api/monitors/:id/history | yes | params: id, query: days (1, 7 or 30) | 200, 401, 404 |\n| POST | /api/auth/register | no | body: email, password | 201, 400, 409, 429 |",
    ],
    explanation: [
      { code: "app.use('/api/monitors', monitorRoutes)", why: 'Ye prefix batata hai ki monitors.js ke saare routes /api/monitors se shuru honge.' },
      { code: 'router.use(requireAuth)', why: 'File ke top par hai, isliye is router ke har endpoint ko login chahiye aur 401 possible hai.' },
      { code: "router.get('/:id/history', ...)", why: 'Path mein :id = route param, andar req.query.days = query param.' },
      { code: 'return res.status(404).json(...)', why: 'Har res.status call ek possible status code hai jo table mein jaata hai.' },
      { code: 'authLimiter', why: 'Register/login par 15 minute mein 10 se zyada tries par express-rate-limit 429 deta hai.' },
    ],
  },
  checklist: [
    'My table has every endpoint from app.js and all four route files, including /api/cron and /api/webhooks/dodo',
    'Each row shows whether login is required',
    'Each row lists the status codes found in the code',
    'I ran curl -i on /health and saw the status line and JSON body',
    'I can explain the difference between req.params, req.query and req.body with a WebWatch example',
  ],
  mistakes: [
    { mistake: 'Forgetting the mount prefix and writing /:id/check instead of /api/monitors/:id/check.', fix: 'Always combine the app.use prefix with the router path.' },
    { mistake: 'Sending JSON with curl without the Content-Type header.', fix: 'Add -H "Content-Type: application/json"; otherwise req.body is empty.' },
    { mistake: 'Assuming 200 always means the website is up.', fix: 'POST /api/check returns 200 with isUp: false for failures. The status code describes the API call, not the monitored site.' },
    { mistake: 'Using GET for something that changes data.', fix: 'Creating, updating and deleting use POST, PATCH and DELETE so that browsers, caches and people do not trigger them accidentally.' },
  ],
  debugging: [
    'Open the browser Network tab, click the request, and read Method, Status, Request Payload and Response.',
    '404 "Route not found" means no route matched: check method and exact path.',
    '401 means no valid session cookie reached the server; check credentials: include and that you are logged in.',
    '500 "Something went wrong on the server" hides the real error from users; read the backend terminal for the console.error output.',
  ],
  quiz: [
    {
      id: 'http-rest-1',
      kind: 'mcq',
      prompt: 'In GET /api/monitors/abc123/history?days=30, where does "30" appear inside Express?',
      options: ['req.params.days', 'req.query.days', 'req.body.days', 'req.headers.days'],
      answer: 1,
      explain: 'Values after ? are query parameters, available as req.query. monitors.js reads Number(req.query.days || 7).',
      wrong: ['req.params.id holds abc123, the path part.', '', 'GET requests in WebWatch do not send a body.', 'It is not a header.'],
    },
    {
      id: 'http-rest-2',
      kind: 'predict',
      prompt: 'What does POST /api/check return for {"url": "http://localhost:3000"}?',
      options: ['400 with "Private or local network URLs are not allowed"', '200 with success: true, isUp: false and an error message', '500 server error', '404 route not found'],
      answer: 1,
      explain: 'checkOnce wraps validatePublicUrl in try/catch and turns the UnsafeUrlError into a normal result object. So the API call succeeds (200) while the result says isUp: false with the safety error.',
      wrong: ['That 400 happens in POST /api/monitors, where validatePublicUrl is called directly and the error reaches errorHandler.', '', 'Nothing crashes.', 'The route exists in app.js.'],
    },
    {
      id: 'http-rest-3',
      kind: 'match',
      prompt: 'Match each status code with the WebWatch situation that produces it.',
      pairs: [
        { left: '201', right: 'Account or monitor created' },
        { left: '409', right: 'Registering an email that already exists' },
        { left: '402', right: 'Billing enabled and no free paid slot' },
        { left: '404', right: 'Monitor id not found for this user' },
      ],
      explain: 'All of these are explicit res.status calls in routes/auth.js and routes/monitors.js.',
    },
    {
      id: 'http-rest-4',
      kind: 'bug',
      prompt: 'A classmate designs this endpoint. What is wrong from a REST point of view?',
      code: 'GET /api/deleteMonitor?id=abc123',
      options: ['Nothing, it works', 'A GET request should not change data; use DELETE /api/monitors/:id', 'It should be POST /api/monitors', 'Query parameters are not allowed'],
      answer: 1,
      explain: 'GET must be safe to repeat and prefetch. WebWatch uses DELETE /api/monitors/:id, which states the action through the method.',
      wrong: ['Working is not the same as being safe and predictable.', '', 'POST /api/monitors creates monitors.', 'Query params are fine for reading, like ?days=7.'],
    },
  ],
  reflection: 'Why do you think WebWatch returns 404 (not 403) when you request another user\'s monitor id?',
  commit: 'docs(playground): map every WebWatch API endpoint',
  resume: [
    'Documented every WebWatch REST endpoint with its inputs, authentication requirement and status codes by reading the Express source.',
    'Tested API endpoints with curl and the browser Network tab to diagnose client versus server errors.',
  ],
  gaps: ['free-check-not-in-ui'],
}
