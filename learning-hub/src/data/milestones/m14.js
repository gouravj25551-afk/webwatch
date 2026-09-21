export default {
  id: 'integration',
  number: 14,
  title: 'Frontend and backend integration',
  subject: 'Full stack',
  phase: 'Product',
  estMinutes: 150,
  summary: 'Trace one real button click in the WebWatch dashboard from React, through fetch and Express, into PostgreSQL and back to the screen.',
  hinglish: [
    'Integration ka matlab hai do alag hisson ko jodna. WebWatch mein ek hissa browser mein chalta hai (React frontend) aur doosra server par (Express backend). Dono ek doosre se HTTP requests ke through baat karte hain.',
    'Jab user "Start monitoring" button dabata hai, React ek fetch() request bhejta hai. fetch() browser ka built-in function hai jo server ko request bhejta hai aur response ka wait karta hai. Server JSON wapas bhejta hai, aur React us JSON se screen update karta hai.',
    'Is milestone mein hum AddMonitor form ko shuru se end tak follow karenge: form state, api() helper, Vite proxy, Express middleware, requireAuth, monitors route, Prisma create, pehla check, aur wapas React state.',
  ],
  why: 'WebWatch ka har feature (login, add monitor, check now, pause, history) isi pattern par chalta hai. Agar tum ek flow poora trace kar sakte ho, to baaki sab flows khud debug kar paoge. Bugs aksar do hisson ke beech ke joint par hote hain, jaise cookie na jaana ya galat status code handle karna.',
  prerequisites: [
    'HTTP methods aur status codes (Milestone 3)',
    'Express middleware aur routes (Milestone 4)',
    'Prisma create aur findFirst (Milestone 6)',
    'requireAuth aur cookies (Milestone 7)',
  ],
  terms: [
    { term: 'fetch()', meaning: 'Browser ka function jo server ko HTTP request bhejta hai aur ek Promise return karta hai. Promise matlab "result baad mein aayega".' },
    { term: 'State (React)', meaning: 'Component ki yaad. useState se banti hai. State badalti hai to React screen dobara draw karta hai.' },
    { term: 'credentials: include', meaning: 'fetch ko bolna ki cookies bhi saath bhejo. Iske bina login cookie server tak nahi pahunchegi.' },
    { term: 'Proxy (Vite)', meaning: 'Development mein Vite server /api wali requests ko chupchaap localhost:3001 (Express) par forward kar deta hai, taaki browser ko lage sab ek hi origin se aa raha hai.' },
    { term: 'Origin', meaning: 'Protocol + domain + port ka combination, jaise http://localhost:5173. Alag origin = browser alag website maanta hai.' },
    { term: 'Loading state', meaning: 'Ek boolean jo batata hai request chal rahi hai. Isse button disable hota hai aur "Creating and checking…" dikhta hai.' },
  ],
  flow: [
    'User fills AddMonitor form',
    'submit() calls api("/api/monitors", POST)',
    'Vite proxy forwards to :3001',
    'Express middleware (json, cookieParser)',
    'requireAuth reads cookie',
    'POST / route validates and creates monitor',
    'runMonitor() does first check',
    '201 JSON back to React',
    'onCreated() updates monitor list',
  ],
  files: [
    { path: 'Frontend/src/App.jsx', lines: '4-22', note: 'api() helper: credentials include, JSON header, error with status and data' },
    { path: 'Frontend/src/App.jsx', lines: '165-203', note: 'AddMonitor component: form state, submit(), 402 handling' },
    { path: 'Frontend/vite.config.js', lines: '8-11', note: 'Development proxy for /api and /health to port 3001' },
    { path: 'Backend/src/app.js', lines: '17-31', note: 'Middleware order before routes run' },
    { path: 'Backend/src/app.js', lines: '68', note: 'app.use("/api/monitors", monitorRoutes)' },
    { path: 'Backend/src/routes/monitors.js', lines: '46-104', note: 'POST / handler: limits, validation, prisma.monitor.create, runMonitor, 201 response' },
    { path: 'Frontend/src/App.jsx', lines: '317-350', note: 'Dashboard loadData() and the 30 second refresh timer' },
  ],
  examples: [
    {
      title: 'The api() helper in App.jsx (simplified reading)',
      code: String.raw`async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}`,
      notes: [
        'credentials: include — login cookie har request ke saath jaaye.',
        '...options — caller jo method aur body de, woh yahan mil jaata hai.',
        'Content-Type sirf tab lagta hai jab body ho, warna express.json() body parse nahi karega.',
        'response.json().catch(() => ({})) — agar server ne JSON nahi bheja to crash na ho.',
        'response.ok false hai (status 400+), to Error throw karo, status aur data ke saath. Isi se AddMonitor 402 pehchaan paata hai.',
      ],
    },
    {
      title: 'How AddMonitor reacts to the result',
      code: String.raw`try {
  const data = await api('/api/monitors', { method: 'POST', body: JSON.stringify(form) })
  onCreated(data.monitor)
  setOpen(false)
} catch (requestError) {
  if (requestError.status === 402 || requestError.data?.requiresPayment) {
    setShowPaywall(true)
  } else {
    setError(requestError.message)
  }
} finally {
  setLoading(false)
}`,
      notes: [
        'Success: server ka naya monitor list mein add hota hai, modal band.',
        '402 Payment Required: paywall modal khulta hai (billing enabled hone par hi server 402 bhejta hai).',
        'Baaki errors: server ka message form ke neeche dikhta hai.',
        'finally: success ho ya fail, loading false — button phir se click ho sake.',
      ],
    },
  ],
  exercise: {
    title: 'Trace the Add monitor click end to end',
    minutes: 50,
    goal: 'Ek trace document banao jo Add monitor click ko har file aur line tak follow kare, aur browser Network tab se asli request/response capture kare.',
    where: 'playground/14-add-monitor-trace.md (practice folder, not production code)',
    steps: [
      'Backend (npm start in Backend) aur Frontend (npm run dev in Frontend) chalao, ek test account banao.',
      'Browser DevTools kholo, Network tab, filter "monitors".',
      'Add monitor form mein example.com daalo aur submit karo.',
      'POST /api/monitors request par click karo: Request headers mein Cookie, Payload, Response status aur JSON note karo.',
      'Trace file mein 8-10 steps likho: har step ke liye file, line range, aur us step par data ka shape (form object, req.body, prisma data, response JSON).',
      'Ek galat URL (jaise localhost) daal ke dobara try karo aur note karo kaunsa status aaya aur message kahan se aaya.',
    ],
    output: String.raw`1. Frontend/src/App.jsx:188  submit() -> api('/api/monitors', POST)
   data: { name: '', url: 'example.com', alertEmail: 'me@test.com', intervalMinutes: 5 }
2. Frontend/vite.config.js:8-11  proxy -> http://localhost:3001
...
9. Frontend/src/App.jsx:189  onCreated(data.monitor)  -> new card appears`,
    hints: [
      'Concept: har layer ek cheez input leti hai aur ek cheez aage bhejti hai. Browser -> proxy -> middleware -> route -> Prisma -> DB, phir ulta wapas. Har layer ke liye poocho: "yahan data ka shape kya hai?"',
      'Pseudocode: 1) form state likho  2) api() kya add karta hai (cookie, header)  3) app.js mein kaunse middleware chale  4) requireAuth ne req.user kya banaya  5) route ne kya validate kiya  6) prisma.monitor.create ka data  7) runMonitor  8) res.status(201).json(...)  9) React ne kya kiya.',
      String.raw`Partial: "5. Backend/src/routes/monitors.js:72  validatePublicUrl(req.body.url) -> { parsedUrl }  (localhost par yahan UnsafeUrlError, statusCode 400, errorHandler message bhejta hai)"  — baaki steps isi format mein bharo.`,
    ],
    explanation: [
      { code: 'body: JSON.stringify(form)', why: 'HTTP body sirf text hota hai, isliye object ko JSON string banana padta hai.' },
      { code: "app.use(express.json({ limit: '20kb' }))", why: 'Server par JSON text wapas object ban jaata hai: req.body.' },
      { code: 'requireAuth', why: 'Cookie se JWT verify karke req.user.id set karta hai; bina iske userId pata nahi chalega.' },
      { code: 'prisma.monitor.create({ data: { userId: req.user.id, ... } })', why: 'userId server se aata hai, form se nahi, isliye koi doosre user ke naam par monitor nahi bana sakta.' },
      { code: 'res.status(201).json({ success: true, monitor })', why: '201 = Created. React isi monitor ko list mein daalta hai.' },
    ],
  },
  checklist: [
    'Trace file mein kam se kam 8 steps hain, har step ke saath real file path aur line range.',
    'Network tab se POST /api/monitors ka status, request payload aur response JSON copy kiya.',
    'Explain kar sakta hoon ki credentials: include hata diya to kya hoga (401 Authentication required).',
    'Explain kar sakta hoon ki Vite proxy sirf development mein hai, production mein vercel.json rewrites kaam karte hain.',
    'Ek failing case (localhost URL) trace kiya aur error message ka source dhoondha.',
  ],
  mistakes: [
    { mistake: 'fetch mein credentials: include bhool jaana', fix: 'Network tab mein request headers dekho. Cookie header missing hai to server 401 dega. Hamesha api() helper use karo, direct fetch nahi.' },
    { mistake: 'Content-Type header ke bina JSON bhejna', fix: 'express.json() body parse nahi karega, req.body khaali ho jaayega. api() helper body hone par header khud lagata hai.' },
    { mistake: 'Server fail hone par bhi success message dikhana', fix: 'Success UI sirf await ke baad wali line mein rakho, catch mein nahi. response.ok check karna zaroori hai kyunki fetch 400/500 par throw nahi karta.' },
    { mistake: 'Frontend se userId bhejna aur server par trust karna', fix: 'userId hamesha req.user.id se lo. Frontend ka data user badal sakta hai.' },
  ],
  debugging: [
    'Network tab: status code, request payload aur response body pehle dekho. Problem frontend mein hai ya backend mein, yahin se pata chalta hai.',
    'Status 404 "Route not found" aaye to URL aur method match karo (app.js ka 404 handler).',
    'Status 500 aaye to backend terminal dekho: errorHandler 500 errors console.error karta hai.',
    'Request pending reh jaaye to check karo backend port 3001 par chal raha hai ki nahi (curl http://localhost:3001/health).',
  ],
  quiz: [
    {
      id: 'integration-1', kind: 'mcq',
      prompt: 'fetch() se 400 status aaya. fetch khud kya karta hai?',
      options: ['Error throw karta hai', 'Normal response return karta hai; response.ok false hota hai', 'Request dobara bhejta hai', 'Page reload karta hai'],
      answer: 1,
      explain: 'fetch sirf network failure par reject karta hai. 4xx/5xx par response.ok false hota hai, isliye api() helper khud Error throw karta hai.',
      wrong: ['Yeh common galatfehmi hai; fetch HTTP errors par throw nahi karta.', '', 'fetch kabhi automatic retry nahi karta.', 'fetch ka page reload se koi lena dena nahi.'],
    },
    {
      id: 'integration-2', kind: 'predict',
      prompt: 'Billing enabled hai aur user ke paas koi paid slot nahi. User form submit karta hai. Screen par kya hoga?',
      code: String.raw`if (requestError.status === 402 || (requestError.data && requestError.data.requiresPayment)) {
  setOpen(false)
  setShowPaywall(true)
}`,
      options: ['Form ke neeche red error', 'Add monitor modal band hota hai, paywall modal khulta hai', 'Naya monitor list mein aa jaata hai', 'Kuch nahi hota'],
      answer: 1,
      explain: 'monitors.js 402 aur requiresPayment: true bhejta hai; AddMonitor usko pakad kar paywall dikhata hai.',
      wrong: ['402 ko alag handle kiya gaya hai, isliye generic error nahi dikhta.', '', 'Server ne monitor banaya hi nahi.', 'catch block chalta hai, isliye kuch na kuch hota hai.'],
    },
    {
      id: 'integration-3', kind: 'bug',
      prompt: 'Is code mein bug dhoondo:',
      code: String.raw`const response = await fetch('/api/monitors', {
  method: 'POST',
  body: JSON.stringify(form),
})
setMessage('Monitor created!')`,
      options: ['method galat hai', 'credentials, Content-Type aur response.ok check teeno missing hain', 'JSON.stringify ki zaroorat nahi', 'URL mein /api nahi hona chahiye'],
      answer: 1,
      explain: 'Cookie nahi jaayegi (401), body parse nahi hogi, aur fail hone par bhi "created" dikhega. Yahi reason hai ki WebWatch api() helper use karta hai.',
      wrong: ['POST sahi hai naya resource banane ke liye.', '', 'Body text honi chahiye, isliye stringify zaroori hai.', 'Vite proxy aur Express dono /api prefix expect karte hain.'],
    },
    {
      id: 'integration-4', kind: 'trace',
      prompt: 'POST /api/monitors mein sabse pehle kaunsa code chalta hai jo tumhari cookie padhta hai?',
      options: ['express.json()', 'cookieParser()', 'requireAuth', 'monitorWithStats'],
      answer: 1,
      explain: 'cookieParser() (app.js line 24) Cookie header ko req.cookies object mein badalta hai. Uske baad requireAuth req.cookies se token padhta hai.',
      wrong: ['express.json sirf body parse karta hai.', '', 'requireAuth cookie padhta hai, lekin cookieParser ke banaye req.cookies se — woh pehle chalta hai.', 'Yeh response banane ke time chalta hai.'],
    },
    {
      id: 'integration-5', kind: 'explain',
      prompt: 'Apne shabdon mein samjhao: Vite proxy kyun hai, aur production mein iski jagah kya kaam karta hai?',
      model: 'Development mein frontend 5173 par aur backend 3001 par chalta hai. Proxy /api requests ko 3001 par bhejta hai taaki browser ko ek hi origin dikhe aur cookies simple rahein. Production mein vercel.json ke rewrites /api/(.*) ko backend service par bhejte hain.',
      keywords: ['5173', '3001', 'origin', 'vercel.json', 'rewrite'],
    },
  ],
  reflection: 'Agar dashboard par monitor add karne ke baad card nahi dikhe, to tum sabse pehle kya check karoge aur kyun?',
  commit: 'docs: trace add-monitor request from React to PostgreSQL',
  resume: [
    'Traced and documented the full request lifecycle of a React + Express + Prisma uptime monitor, from form submission to database write and UI update.',
    'Debugged cross-layer issues (cookies, CORS, status handling) using browser Network tools and server logs.',
  ],
  gaps: ['free-check-not-in-ui'],
}
