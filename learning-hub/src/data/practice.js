// Practice Lab exercises. Each one is small (20–60 min) and uses WebWatch-shaped data.
// Solutions are never shown in hints; the final explanation is revealed separately.

export default [
  {
    id: 'uptime',
    title: 'Calculate uptime from check results',
    milestone: 'js-foundations',
    minutes: 30,
    level: 'Beginner',
    context: 'Dashboard ka "30-day uptime" number monitorWithStats() mein calculate hota hai: successful checks / total checks * 100, 2 decimal tak.',
    file: 'Backend/src/routes/monitors.js',
    prompt: 'Ek function calculateUptime(checks) likho jo UP checks ka percentage return kare, 2 decimal places tak (Number). Khaali array ke liye null return karo, 0 nahi.',
    starter: String.raw`// playground/01-uptime.js
const checks = [
  { isUp: true,  statusCode: 200,  responseTimeMs: 120 },
  { isUp: true,  statusCode: 200,  responseTimeMs: 95 },
  { isUp: false, statusCode: null, responseTimeMs: 5000 },
  { isUp: true,  statusCode: 301,  responseTimeMs: 210 },
];

function calculateUptime(checks) {
  // your code here
}

console.log('Uptime:', calculateUptime(checks));
console.log('Empty:', calculateUptime([]));`,
    expected: 'Uptime: 75\nEmpty: null',
    hints: [
      'Concept: .filter() ek naya array deta hai jisme sirf wo items hote hain jinke liye condition true ho. .length se count milta hai. Percentage = part / total * 100.',
      'Pseudocode: agar checks khaali hai -> null return. upCount = checks mein se isUp true wale ginn lo. percent = upCount / total * 100. 2 decimal tak round karke Number banao.',
      String.raw`Partial code:
if (checks.length === 0) return null;
const upCount = checks.filter((check) => /* ? */).length;
return Number(((upCount / checks.length) * 100).toFixed(/* ? */));`,
    ],
    explanation: [
      { code: 'if (checks.length === 0) return null;', why: 'Zero se divide karne par NaN aata hai. null ka matlab "abhi data nahi hai" — 0% ka matlab hota "hamesha down", jo galat hai. WebWatch bhi totalChecks 0 hone par null deta hai.' },
      { code: 'const upCount = checks.filter((check) => check.isUp).length;', why: 'Sirf successful checks rakhe aur unki ginti li.' },
      { code: 'const percent = (upCount / checks.length) * 100;', why: 'Fraction ko percentage mein badla.' },
      { code: 'return Number(percent.toFixed(2));', why: 'toFixed(2) string deta hai ("75.00"); Number() use wapas number banata hai, bilkul monitorWithStats ki tarah.' },
    ],
    checklist: [
      'Output 75 aata hai (75.00 string nahi)',
      'Khaali array par null aata hai, error ya NaN nahi',
      'for loop use nahi kiya, .filter() use kiya',
      'Main samjha sakta hoon ki null aur 0 mein kya farak hai',
    ],
  },
  {
    id: 'avg-response',
    title: 'Calculate average response time',
    milestone: 'js-foundations',
    minutes: 25,
    level: 'Beginner',
    context: 'Check table mein har row ka responseTimeMs store hota hai. History panel inhi values se response-time chart banata hai.',
    file: 'Backend/prisma/schema.prisma',
    prompt: 'averageResponseTime(checks) likho jo .reduce() se average nikaale aur Math.round se poora number (ms) return kare. Bonus: sirf UP checks ka average bhi nikaalo, kyunki failed check ka 5000 ms timeout average ko bigaad deta hai.',
    starter: String.raw`const checks = [
  { isUp: true,  responseTimeMs: 120 },
  { isUp: true,  responseTimeMs: 95 },
  { isUp: false, responseTimeMs: 5000 },
  { isUp: true,  responseTimeMs: 210 },
];

function averageResponseTime(checks) {
  // your code here
}

console.log(averageResponseTime(checks));`,
    expected: '1356 (all checks)\n142 (only UP checks, bonus)',
    hints: [
      'Concept: .reduce((total, item) => ..., 0) poore array ko ek value mein "jodta" hai. 0 starting total hai.',
      'Pseudocode: khaali ho to null. sum = har check ka responseTimeMs jodo. average = sum / count. Math.round karo.',
      String.raw`Partial code:
const sum = checks.reduce((total, check) => total + /* ? */, 0);
return Math.round(sum / /* ? */);`,
    ],
    explanation: [
      { code: 'if (!checks.length) return null;', why: 'Khaali list ka average undefined hota hai; divide by zero se bachne ke liye.' },
      { code: 'const sum = checks.reduce((total, check) => total + check.responseTimeMs, 0);', why: 'Har check ka time running total mein joda. Initial value 0 na do to pehla item object ban jaata hai aur result galat aata hai.' },
      { code: 'return Math.round(sum / checks.length);', why: 'Milliseconds mein decimal ka koi practical matlab nahi, isliye round kiya.' },
    ],
    checklist: [
      'Output 1356 aata hai',
      '.reduce() mein initial value 0 di hai',
      'Main bata sakta hoon ki failed checks average ko kyun bigaadte hain',
    ],
  },
  {
    id: 'normalize-url',
    title: 'Normalize a URL like parseHttpUrl',
    milestone: 'url-checking',
    minutes: 40,
    level: 'Beginner',
    context: 'User "example.com" likhta hai, lekin WebWatch "https://example.com/" store karta hai. Ye kaam parseHttpUrl() karta hai.',
    file: 'Backend/src/services/urlSafety.js',
    prompt: 'normalizeUrl(value) likho: trim karo, protocol na ho to https:// lagao, new URL() se parse karo, sirf http/https allow karo, username/password wale URL reject karo (throw Error). Production file mat chhoona — playground mein likho.',
    starter: String.raw`function normalizeUrl(value) {
  // your code here
}

const inputs = ['example.com', '  https://example.com/path ', 'ftp://example.com', 'https://user:pass@example.com', ''];
for (const input of inputs) {
  try {
    console.log(JSON.stringify(input), '->', normalizeUrl(input));
  } catch (error) {
    console.log(JSON.stringify(input), '-> ERROR:', error.message);
  }
}`,
    expected: '"example.com" -> https://example.com/\n"  https://example.com/path " -> https://example.com/path\n"ftp://example.com" -> ERROR: Only HTTP and HTTPS URLs are allowed\n"https://user:pass@example.com" -> ERROR: ...credentials...\n"" -> ERROR: URL is required',
    hints: [
      'Concept: new URL(text) string ko parts mein todta hai (protocol, hostname, username...). Invalid text par ye throw karta hai. Regex /^[a-z][a-z\\d+.-]*:\\/\\//i check karta hai ki protocol diya hai ya nahi.',
      'Pseudocode: string nahi ya khaali -> throw. trim. protocol nahi -> "https://" aage lagao. parse (try/catch). protocol http: ya https: nahi -> throw. username ya password hai -> throw. parsed.toString() return.',
      String.raw`Partial code:
const trimmed = value.trim();
const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed);
const parsed = new URL(hasProtocol ? trimmed : 'https://' + trimmed);
if (!['http:', 'https:'].includes(/* ? */)) throw new Error('Only HTTP and HTTPS URLs are allowed');`,
    ],
    explanation: [
      { code: "if (typeof value !== 'string' || !value.trim()) throw new Error('URL is required');", why: 'req.body.url kuch bhi ho sakta hai (number, undefined). Pehle type check karo.' },
      { code: 'const trimmed = value.trim();', why: 'Copy-paste se aaye extra spaces hatao.' },
      { code: 'const hasProtocol = /^[a-z][a-z\\d+.-]*:\\/\\//i.test(trimmed);', why: 'Pata karo user ne "scheme://" likha ya nahi. ftp:// bhi match hoga taaki baad mein reject ho sake.' },
      { code: "const parsed = new URL(hasProtocol ? trimmed : 'https://' + trimmed);", why: 'Protocol na ho to https default — secure option.' },
      { code: "if (!['http:', 'https:'].includes(parsed.protocol)) throw ...", why: 'file:, ftp:, gopher: jaise protocols se server ki files ya internal services tak pahuncha ja sakta hai.' },
      { code: 'if (parsed.username || parsed.password) throw ...', why: 'URL mein password store karna unsafe hai aur logs/emails mein leak ho sakta hai.' },
      { code: 'return parsed.toString();', why: 'Standard format ("https://example.com/") taaki same site do alag spelling se store na ho.' },
    ],
    checklist: [
      'Paanchon inputs ka output expected jaisa hai',
      'new URL ko try/catch mein rakha',
      'Main bata sakta hoon ki ftp:// kyun block hai',
      'Maine Backend/test/urlSafety.test.js padha aur apne cases usse compare kiye',
    ],
  },
  {
    id: 'validate-monitor-body',
    title: 'Validate a create-monitor request body',
    milestone: 'express',
    minutes: 40,
    level: 'Beginner',
    context: 'POST /api/monitors route body se url, name, alertEmail aur intervalMinutes leta hai aur galat data par 400 bhejta hai.',
    file: 'Backend/src/routes/monitors.js',
    prompt: 'validateMonitorBody(body) likho jo { ok: true, data } ya { ok: false, status: 400, message } return kare. Rules: url string aur non-empty; alertEmail valid email (optional — na ho to "owner@example.com" default); intervalMinutes 5, 10 ya 15 (default 5); name max 80 characters, khaali ho to hostname.',
    starter: String.raw`function validateMonitorBody(body) {
  // your code here
}

console.log(validateMonitorBody({ url: 'example.com' }));
console.log(validateMonitorBody({ url: 'example.com', intervalMinutes: 7 }));
console.log(validateMonitorBody({ url: 'example.com', alertEmail: 'not-an-email' }));
console.log(validateMonitorBody({ intervalMinutes: '10' }));`,
    expected: '1) ok: true, intervalMinutes 5, alertEmail default\n2) ok: false, 400, "Interval must be 5, 10, or 15 minutes"\n3) ok: false, 400, "Enter a valid alert email"\n4) ok: false, 400, "URL is required"',
    hints: [
      'Concept: server kabhi frontend par bharosa nahi karta — koi bhi curl se kuch bhi bhej sakta hai. Har field ka type aur allowed values check karo. Number("10") string ko number banata hai.',
      'Pseudocode: url check -> error. email = body.alertEmail ya default, trim+lowercase, regex test -> error. interval = Number(body.intervalMinutes || 5); [5,10,15] mein nahi -> error. name trim, slice(0, 80). sab ok -> { ok: true, data }.',
      String.raw`Partial code:
const intervalMinutes = Number(body.intervalMinutes || 5);
if (![5, 10, 15].includes(intervalMinutes)) {
  return { ok: false, status: 400, message: 'Interval must be 5, 10, or 15 minutes' };
}
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(/* ? */);`,
    ],
    explanation: [
      { code: "if (typeof body.url !== 'string' || !body.url.trim()) return { ok: false, status: 400, message: 'URL is required' };", why: 'Sabse zaroori field pehle. WebWatch mein ye check validatePublicUrl ke andar hota hai.' },
      { code: "const alertEmail = body.alertEmail ? String(body.alertEmail).trim().toLowerCase() : 'owner@example.com';", why: 'Real route mein default req.user.email hai. lowercase se "A@x.com" aur "a@x.com" ek hi maane jaate hain.' },
      { code: 'if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(alertEmail)) return { ok: false, status: 400, ... };', why: 'Wahi regex jo validEmail() mein hai — basic shape check.' },
      { code: 'const intervalMinutes = Number(body.intervalMinutes || 5);', why: 'Frontend select value string bhej sakta hai; Number() convert karta hai, missing ho to 5.' },
      { code: 'if (![5, 10, 15].includes(intervalMinutes)) return { ok: false, status: 400, ... };', why: 'Allow-list: sirf jaani-pehchaani values. 0 ya 0.1 minute server ko overload kar dete.' },
      { code: 'const name = (body.name || "").trim().slice(0, 80) || hostname;', why: 'Lamba name database aur UI dono bigaadta hai; 80 par kaat diya.' },
      { code: 'return { ok: true, data: { url, name, alertEmail, intervalMinutes } };', why: 'Sirf validated fields aage bhejo, poora body nahi — isse extra fields (jaise userId) sneak nahi ho sakte.' },
    ],
    checklist: [
      'Chaaron test calls ka result expected jaisa hai',
      'intervalMinutes "10" (string) bhi accept hota hai',
      'Main bata sakta hoon ki server-side validation frontend validation se zyada zaroori kyun hai',
    ],
  },
  {
    id: 'status-codes',
    title: 'Classify HTTP status codes',
    milestone: 'http-rest',
    minutes: 25,
    level: 'Beginner',
    context: 'websiteChecker.js mein isUp = statusCode >= 200 && statusCode < 400. Iska matlab 3xx bhi UP hai, 404 aur 500 DOWN.',
    file: 'Backend/src/services/websiteChecker.js',
    prompt: 'classifyStatus(code) likho jo "success" (2xx), "redirect" (3xx), "client-error" (4xx), "server-error" (5xx) ya "no-response" (null) return kare, aur isUp(code) jo WebWatch ka rule follow kare.',
    starter: String.raw`function classifyStatus(code) {
  // your code here
}
function isUp(code) {
  // your code here
}

for (const code of [200, 204, 301, 404, 429, 500, 503, null]) {
  console.log(code, classifyStatus(code), isUp(code));
}`,
    expected: '200 success true\n204 success true\n301 redirect true\n404 client-error false\n429 client-error false\n500 server-error false\n503 server-error false\nnull no-response false',
    hints: [
      'Concept: status code ka pehla digit family batata hai. 2 = theek, 3 = kahin aur jao, 4 = request galat, 5 = server toota.',
      'Pseudocode: null -> "no-response". code < 300 -> success. < 400 -> redirect. < 500 -> client-error. warna server-error. isUp: code number ho aur 200 <= code < 400.',
      String.raw`Partial code:
if (code == null) return 'no-response';
if (code >= 200 && code < 300) return 'success';
// ... baaki ranges
function isUp(code) { return code != null && /* ? */; }`,
    ],
    explanation: [
      { code: "if (code == null) return 'no-response';", why: 'Timeout ya DNS failure mein koi status code nahi hota — WebWatch statusCode null store karta hai.' },
      { code: "if (code < 300) return 'success';", why: '2xx range.' },
      { code: "if (code < 400) return 'redirect';", why: '3xx. Normally checker redirect follow karta hai; agar Location header na ho to 3xx hi final result ban jaata hai.' },
      { code: "if (code < 500) return 'client-error';", why: '4xx — 404 page missing, 429 rate limited.' },
      { code: "return 'server-error';", why: 'Baaki sab 5xx.' },
      { code: 'return code != null && code >= 200 && code < 400;', why: 'WebWatch ka exact rule (websiteChecker.js). Socho: kya 401 wali protected API ko DOWN maanna sahi hai? Ye product decision hai.' },
    ],
    checklist: [
      'Sab 8 codes ka output expected jaisa hai',
      'Main websiteChecker.js mein isUp wali line dhoondh sakta hoon',
      'Main ek example de sakta hoon jab 4xx ko DOWN maanna galat ho sakta hai',
    ],
  },
  {
    id: 'express-route',
    title: 'Create an Express route in a playground app',
    milestone: 'express',
    minutes: 45,
    level: 'Beginner',
    context: 'app.js mein GET /health aur POST /api/check routes hain. Tum ek alag playground server mein inka chhota version banaoge.',
    file: 'Backend/src/app.js',
    prompt: 'playground/server.js mein ek Express app banao (production Backend ko mat chhoona): GET /health -> { success: true }; POST /api/echo-check -> body.url na ho to 400 { success: false, message: "URL is required" }, warna 200 { success: true, url }. Aakhir mein 404 handler. Port 4000. curl se test karo.',
    starter: String.raw`// playground/server.js  (run: node playground/server.js)
const express = require('express');
const app = express();

// 1. JSON body parser

// 2. GET /health

// 3. POST /api/echo-check

// 4. 404 handler (last)

app.listen(4000, () => console.log('Playground on http://localhost:4000'));`,
    expected: 'curl localhost:4000/health -> {"success":true}\ncurl -X POST localhost:4000/api/echo-check -H "Content-Type: application/json" -d "{}" -> 400\ncurl localhost:4000/nope -> 404',
    hints: [
      'Concept: app.use() har request par chalta hai (middleware). app.get/app.post sirf matching method + path par. Route order matter karta hai — 404 handler sabse neeche.',
      'Pseudocode: app.use(express.json()). app.get("/health", send json). app.post("/api/echo-check", url check karo -> 400 ya 200). app.use((req,res) => 404 json).',
      String.raw`Partial code:
app.use(express.json());
app.get('/health', (req, res) => res.json({ success: true }));
app.post('/api/echo-check', (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(/* ? */).json({ success: false, message: 'URL is required' });
  // ...
});`,
    ],
    explanation: [
      { code: 'app.use(express.json());', why: 'Iske bina req.body undefined rahega. WebWatch mein express.json({ limit: "20kb" }) hai — bade body se bachne ke liye.' },
      { code: "app.get('/health', (req, res) => res.json({ success: true }));", why: 'Health endpoint — monitoring tools isse check karte hain ki server zinda hai.' },
      { code: "if (!req.body.url) return res.status(400).json({ success: false, message: 'URL is required' });", why: '400 = client ki galti. return lagana zaroori hai warna code aage chal kar doosra response bhejne ki koshish karega.' },
      { code: 'return res.json({ success: true, url: req.body.url });', why: 'Default status 200.' },
      { code: "app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));", why: 'Koi route match nahi hua to ye chalta hai — isliye sabse aakhir mein. WebWatch app.js mein bhi yahi pattern hai.' },
    ],
    checklist: [
      'Teeno curl commands expected status dete hain',
      '404 handler ko upar move karke dekha ki sab 404 kyun ho jaata hai, phir wapas neeche kiya',
      'Production Backend folder mein koi change nahi hai (git status clean)',
    ],
  },
  {
    id: 'read-prisma-query',
    title: 'Read the monitorWithStats Prisma query',
    milestone: 'prisma',
    minutes: 30,
    level: 'Beginner',
    context: 'GET /api/monitors har monitor ke liye 3 queries chalata hai: total checks, successful checks aur open incident.',
    file: 'Backend/src/routes/monitors.js',
    prompt: 'monitorWithStats() padho aur neeche diye fake data par haath se (ya ek chhote JS function se) answer nikaalo: totalChecks, successfulChecks, uptimePercentage, activeIncident. Phir har Prisma call ko ek line SQL jaisi English mein likho.',
    starter: String.raw`// "Today" is 2026-09-21. Only checks in the last 30 days count.
const checks = [
  { monitorId: 'm1', isUp: true,  checkedAt: '2026-09-20T10:00:00Z' },
  { monitorId: 'm1', isUp: false, checkedAt: '2026-09-20T10:05:00Z' },
  { monitorId: 'm1', isUp: true,  checkedAt: '2026-08-01T10:00:00Z' }, // older than 30 days
  { monitorId: 'm2', isUp: true,  checkedAt: '2026-09-20T10:00:00Z' },
];
const incidents = [
  { id: 'i1', monitorId: 'm1', startedAt: '2026-09-20T10:05:00Z', resolvedAt: null },
];
// For monitor m1: totalChecks = ?, successfulChecks = ?, uptimePercentage = ?, activeIncident = ?`,
    expected: 'totalChecks 2, successfulChecks 1, uptimePercentage 50, activeIncident i1',
    hints: [
      'Concept: prisma.check.count({ where }) ek number deta hai. where ke andar sab conditions AND hoti hain. gte = greater than or equal.',
      'Pseudocode: since = aaj - 30 din. m1 ke checks jinka checkedAt >= since -> total. unme se isUp true -> successful. incident jahan monitorId m1 aur resolvedAt null.',
      String.raw`Partial answer:
prisma.check.count({ where: { monitorId: monitor.id, checkedAt: { gte: since } } })
// ~ SELECT COUNT(*) FROM "Check" WHERE "monitorId" = ? AND "checkedAt" >= ?
// Ab doosri query ka SQL khud likho (isUp = true add hota hai).`,
    ],
    explanation: [
      { code: 'const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);', why: '30 din milliseconds mein. August wala check isse purana hai, isliye count nahi hoga.' },
      { code: 'prisma.check.count({ where: { monitorId, checkedAt: { gte: since } } })', why: 'm1 ke last 30 din ke checks = 2. m2 ka check monitorId filter se bahar.' },
      { code: '... isUp: true', why: 'Same query + ek extra condition = 1 successful.' },
      { code: 'prisma.incident.findFirst({ where: { monitorId, resolvedAt: null }, orderBy: { startedAt: "desc" } })', why: 'resolvedAt null matlab incident abhi khula hai. findFirst ek row ya null deta hai.' },
      { code: 'Promise.all([...])', why: 'Teeno queries ek saath chalti hain, ek-ek karke nahi — response jaldi aata hai.' },
      { code: 'Number(((1 / 2) * 100).toFixed(2)) // 50', why: 'Wahi formula jo Practice "uptime" mein likha tha.' },
    ],
    checklist: [
      'Mera answer 2 / 1 / 50 / i1 hai',
      'Maine teeno Prisma calls ka SQL-jaisa version likha',
      'Main bata sakta hoon ki schema.prisma mein @@index([monitorId, checkedAt]) is query ko fast kyun banata hai',
    ],
  },
  {
    id: 'ownership',
    title: 'Trace monitor ownership',
    milestone: 'auth',
    minutes: 30,
    level: 'Intermediate',
    context: 'PATCH, DELETE, check-now aur history — sab routes pehle findFirst({ where: { id: req.params.id, userId: req.user.id } }) chalate hain.',
    file: 'Backend/src/routes/monitors.js',
    prompt: 'Ek in-memory version banao: findOwnedMonitor(monitors, monitorId, userId) aur deleteMonitorRoute(req) jo { status, body } return kare. Asha ka token lekar Ravi ka monitor delete karne ki koshish 404 deni chahiye, 403 nahi.',
    starter: String.raw`const monitors = [
  { id: 'mon-1', userId: 'asha', url: 'https://asha.dev/' },
  { id: 'mon-2', userId: 'ravi', url: 'https://ravi.dev/' },
];

function findOwnedMonitor(monitors, monitorId, userId) {
  // your code here
}

function deleteMonitorRoute(req) {
  // req = { params: { id }, user: { id } }  (req.user comes from requireAuth)
}

console.log(deleteMonitorRoute({ params: { id: 'mon-1' }, user: { id: 'asha' } }));
console.log(deleteMonitorRoute({ params: { id: 'mon-2' }, user: { id: 'asha' } }));
console.log(deleteMonitorRoute({ params: { id: 'mon-9' }, user: { id: 'asha' } }));`,
    expected: '{ status: 200, body: { success: true } }\n{ status: 404, body: { success: false, message: "Monitor not found" } }\n{ status: 404, ... }',
    hints: [
      'Concept: authentication = "tum kaun ho" (requireAuth req.user set karta hai). Authorization = "kya ye cheez tumhari hai". Dono conditions ek hi query mein.',
      'Pseudocode: monitor = list mein wo jiska id match kare AUR userId bhi match kare. nahi mila -> 404. mila -> delete, 200.',
      String.raw`Partial code:
return monitors.find((m) => m.id === monitorId && /* ? */) || null;`,
    ],
    explanation: [
      { code: 'monitors.find((m) => m.id === monitorId && m.userId === userId)', why: 'Ye findFirst({ where: { id, userId } }) ka JS version hai — dono AND.' },
      { code: 'if (!monitor) return { status: 404, body: { success: false, message: "Monitor not found" } };', why: '404 (403 nahi) — attacker ko pata bhi nahi chalna chahiye ki mon-2 exist karta hai.' },
      { code: 'const userId = req.user.id; // never req.body.userId', why: 'userId hamesha verified JWT se aata hai. Body se liya to koi bhi apna userId badal ke bhej dega.' },
      { code: 'return { status: 200, body: { success: true } };', why: 'Sirf owner hi yahan tak pahunchta hai.' },
    ],
    checklist: [
      'Teeno calls expected status dete hain',
      'Maine monitors.js mein ye pattern kitni jagah hai wo gina (check-now, PATCH, DELETE, history)',
      'Main samjha sakta hoon ki 403 ke bajaye 404 kyun',
    ],
  },
  {
    id: 'incident-state',
    title: 'Model incident state changes',
    milestone: 'incidents',
    minutes: 50,
    level: 'Intermediate',
    context: 'runMonitor() ke transaction mein: UP result + open incident -> resolve + recovery alert. DOWN result + koi open incident nahi -> naya incident + down alert. DOWN + already open -> sirf status update, koi naya alert nahi.',
    file: 'Backend/src/services/monitorRunner.js',
    prompt: 'Pure function applyResult(state, result) likho. state = { status, openIncident, consecutiveFailures }. result = { isUp }. Return { state: newState, alert: "down" | "recovery" | null }. Database nahi, sirf objects.',
    starter: String.raw`function applyResult(state, result) {
  // your code here
}

let state = { status: 'UNKNOWN', openIncident: false, consecutiveFailures: 0 };
const results = [{ isUp: true }, { isUp: false }, { isUp: false }, { isUp: true }, { isUp: true }];
for (const result of results) {
  const out = applyResult(state, result);
  console.log(result.isUp ? 'UP  ' : 'DOWN', '->', out.state.status, 'alert:', out.alert);
  state = out.state;
}`,
    expected: 'UP   -> UP alert: null\nDOWN -> DOWN alert: down\nDOWN -> DOWN alert: null\nUP   -> UP alert: recovery\nUP   -> UP alert: null',
    hints: [
      'Concept: state machine — har naya result current state ke saath milkar next state decide karta hai. Alert sirf transition par, har check par nahi (warna spam).',
      'Pseudocode: agar UP: alert = openIncident ? "recovery" : null; incident band; failures 0. agar DOWN: alert = openIncident ? null : "down"; incident khula; failures + 1.',
      String.raw`Partial code:
if (result.isUp) {
  return {
    state: { status: 'UP', openIncident: false, consecutiveFailures: 0 },
    alert: state.openIncident ? 'recovery' : null,
  };
}
// DOWN branch khud likho`,
    ],
    explanation: [
      { code: 'if (result.isUp) {', why: 'Do hi raaste — WebWatch mein bhi if (result.isUp) { ... } else { ... }.' },
      { code: "alert: state.openIncident ? 'recovery' : null", why: 'Recovery email sirf tab jab pehle incident khula tha.' },
      { code: 'consecutiveFailures: 0', why: 'UP par counter reset — runner bhi yahi karta hai.' },
      { code: "alert: state.openIncident ? null : 'down'", why: 'Deduplication: pehli failure par hi alert. Agle DOWN checks par sirf state update.' },
      { code: 'consecutiveFailures: state.consecutiveFailures + 1', why: 'Runner { increment: 1 } karta hai. Note: WebWatch abhi incident banane ke liye is counter ka use nahi karta (Project Gap).' },
    ],
    checklist: [
      'Output expected sequence se match karta hai',
      'Function pure hai — bahar ka koi variable modify nahi karta',
      'Main monitorRunner.js mein transaction ke dono branches point kar sakta hoon',
      'Main bata sakta hoon ki consecutiveFailures abhi incident logic mein kyun use nahi ho raha',
    ],
  },
  {
    id: 'retries',
    title: 'Simulate retries like checkWebsite',
    milestone: 'url-checking',
    minutes: 35,
    level: 'Intermediate',
    context: 'checkWebsite() max 3 attempts karta hai, har fail ke baad 500 ms wait, aur pehla UP result milte hi ruk jaata hai. attempts field batata hai kitni koshish lagi.',
    file: 'Backend/src/services/websiteChecker.js',
    prompt: 'checkWithRetries(fakeResults, attempts) async function likho. fakeResults ek array hai jo har attempt ka result deta hai (network ki jagah). Return last result + attempts count. setTimeout promise se 500 ms wait karo.',
    starter: String.raw`const { setTimeout: wait } = require('node:timers/promises');

async function checkWithRetries(fakeResults, attempts = 3) {
  // your code here
}

(async () => {
  console.log(await checkWithRetries([{ isUp: false }, { isUp: true }]));
  console.log(await checkWithRetries([{ isUp: false }, { isUp: false }, { isUp: false }]));
  console.log(await checkWithRetries([{ isUp: true }]));
})();`,
    expected: '{ isUp: true, attempts: 2 }\n{ isUp: false, attempts: 3 }\n{ isUp: true, attempts: 1 }',
    hints: [
      'Concept: retry = temporary glitch (network blip) ko asli downtime se alag karna. Loop + early return. await wait(500) code ko 500 ms rok deta hai bina server block kiye.',
      'Pseudocode: for attempt 1..attempts: result = fakeResults[attempt-1]; result.attempts = attempt; UP -> return. aakhri attempt nahi -> wait 500. loop ke baad last result return.',
      String.raw`Partial code:
let lastResult;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  lastResult = { ...fakeResults[attempt - 1], attempts: attempt };
  if (lastResult.isUp) return lastResult;
  // ?
}
return lastResult;`,
    ],
    explanation: [
      { code: 'let lastResult;', why: 'Loop ke bahar chahiye taaki saare attempts fail hone par return kar sakein.' },
      { code: 'for (let attempt = 1; attempt <= attempts; attempt += 1) {', why: 'checkWebsite bhi 1 se count karta hai, taaki attempts field human-readable ho.' },
      { code: 'if (lastResult.isUp) return lastResult;', why: 'Site UP mil gayi to aur koshish bekaar — time aur target site ka load bachao.' },
      { code: 'if (attempt < attempts) await wait(500);', why: 'Aakhri attempt ke baad wait ka koi fayda nahi.' },
      { code: 'return lastResult;', why: 'Teeno fail -> DOWN result, attempts 3. Isi se incident banta hai.' },
    ],
    checklist: [
      'Teeno outputs expected hain',
      'Maine note kiya ki 3-fail wala case ~1 second leta hai',
      'Main bata sakta hoon ki POST /api/check attempts: 1 kyun use karta hai aur runner attempts: 3',
    ],
  },
  {
    id: 'diagnose-api-error',
    title: 'Diagnose an API error',
    milestone: 'testing',
    minutes: 30,
    level: 'Beginner',
    context: 'Sab responses { success, message } shape mein aate hain. Status code aur message dekh ke seedha route tak pahunch sakte ho.',
    file: 'Backend/src/routes/monitors.js',
    prompt: 'Har response ke liye batao: kaunsi file/line ne bheja, kyun, aur user ko kya karna chahiye. Code nahi likhna — sirf reasoning (notes file mein likho).',
    starter: String.raw`// A) POST /api/monitors -> 401 {"success":false,"message":"Authentication required"}
// B) POST /api/auth/register -> 400 {"success":false,"message":"Password must be 8 to 72 characters"}
// C) POST /api/monitors -> 402 {"success":false,"requiresPayment":true,...}
// D) POST /api/monitors -> 403 {"success":false,"message":"Free beta allows 10 monitors"}
// E) DELETE /api/monitors/abc -> 404 {"success":false,"message":"Monitor not found"}
// F) GET /api/monitors -> 500 {"success":false,"message":"Something went wrong on the server"}`,
    expected: 'A: auth.js middleware, cookie missing\nB: routes/auth.js validation\nC: billing enabled + no paid slot\nD: free beta limit\nE: wrong id or not your monitor\nF: errorHandler hides real error; read server logs',
    hints: [
      'Concept: 4xx = request mein kuch galat (client fix kare), 5xx = server mein kuch toota (logs padho). Exact message text se grep karo.',
      'Pseudocode: har message ko repo mein search karo (grep -rn "Monitor not found" Backend/src). File + condition padho. Socho kaunsa input us condition ko true karta hai.',
      String.raw`Partial answer:
A) grep -rn "Authentication required" Backend/src
   -> Backend/src/middleware/auth.js: token cookie nahi mili.
   Kya fetch mein credentials: 'include' tha? Kya login kiya tha?
F) 500 ka real error client ko nahi dikhta. Kahan dikhega?`,
    ],
    explanation: [
      { code: 'A) middleware/auth.js', why: 'req.cookies[config.cookieName] missing. Login nahi kiya, cookie expire, ya fetch bina credentials.' },
      { code: 'B) routes/auth.js /register', why: 'bcrypt 72 bytes se aage ignore karta hai, isliye upper limit bhi hai.' },
      { code: 'C) routes/monitors.js POST /', why: 'config.billingEnabled true aur currentCount >= paidMonitorsCount. Frontend 402 par paywall dikhata hai.' },
      { code: 'D) routes/monitors.js POST /', why: 'Billing off, MAX_MONITORS_PER_USER (default 10) poore.' },
      { code: 'E) findFirst({ id, userId }) null', why: 'Galat id ya monitor kisi aur ka — dono ek jaise dikhte hain (on purpose).' },
      { code: 'F) middleware/errorHandler.js', why: 'status >= 500 par generic message; asli error console.error se server logs mein (Vercel logs / terminal).' },
    ],
    checklist: [
      'Chhe ke chhe responses ka source file maine grep se dhoondha',
      'Main 4xx aur 5xx ka farak ek line mein bata sakta hoon',
      'Main bata sakta hoon ki 500 ka asli error kahan dekhna hai',
    ],
  },
  {
    id: 'webhook-signature',
    title: 'Verify a webhook signature (concept)',
    milestone: 'payments',
    minutes: 45,
    level: 'Intermediate',
    context: 'POST /api/webhooks/dodo raw body leta hai aur verifyWebhookSignature() Dodo SDK ke webhooks.unwrap() se signature verify karta hai. Is exercise mein tum HMAC ka idea khud dekhoge — real Dodo format nahi.',
    file: 'Backend/src/services/dodoPayments.js',
    prompt: 'node:crypto se sign(body, secret) aur verify(body, signature, secret) banao (HMAC-SHA256, hex). Dikhao ki body ka ek character badalne par verify false ho jaata hai. Sirf fake secret use karo — koi real key nahi.',
    starter: String.raw`const crypto = require('node:crypto');
const SECRET = 'fake-test-secret-do-not-use';

function sign(body, secret) {
  // your code here
}

function verify(body, signature, secret) {
  // your code here (use crypto.timingSafeEqual)
}

const body = JSON.stringify({ type: 'payment.succeeded', data: { total_amount: 100 } });
const signature = sign(body, SECRET);
console.log('original:', verify(body, signature, SECRET));
console.log('tampered:', verify(body.replace('100', '1'), signature, SECRET));`,
    expected: 'original: true\ntampered: false',
    hints: [
      'Concept: HMAC = secret + message se banaya "fingerprint". Secret sirf tumhare aur Dodo ke paas hai, isliye attacker valid fingerprint nahi bana sakta. Message badla to fingerprint badal jaata hai.',
      'Pseudocode: sign: createHmac("sha256", secret).update(body).digest("hex"). verify: expected = sign(body); dono Buffers banao; length alag -> false; timingSafeEqual.',
      String.raw`Partial code:
function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}
// verify: const a = Buffer.from(signature); const b = Buffer.from(sign(body, secret)); ...`,
    ],
    explanation: [
      { code: "crypto.createHmac('sha256', secret).update(body).digest('hex')", why: 'Body + secret se deterministic signature.' },
      { code: 'const expected = Buffer.from(sign(body, secret));', why: 'Server khud signature dobara banata hai — bheje gaye signature par bharosa nahi.' },
      { code: 'if (a.length !== b.length) return false;', why: 'timingSafeEqual alag length par throw karta hai.' },
      { code: 'return crypto.timingSafeEqual(a, b);', why: '=== pehla galat character milte hi ruk jaata hai; time naap kar attacker guess kar sakta hai. timingSafeEqual hamesha same time leta hai.' },
      { code: "express.raw({ type: 'application/json' }) // routes/webhooks.js", why: 'Signature exact bytes par bana hai. JSON parse karke dobara stringify kiya to bytes badal sakte hain — isliye webhook route express.json se pehle mount hai.' },
    ],
    checklist: [
      'original true aur tampered false aata hai',
      'Koi real API key ya webhook secret file mein nahi hai',
      'Main samjha sakta hoon ki frontend redirect par payment kyun activate nahi hona chahiye',
      'Maine app.js mein dekha ki webhook route express.json() se pehle kyun hai',
    ],
  },
]
