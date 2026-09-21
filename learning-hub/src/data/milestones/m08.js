export default {
  id: 'url-checking',
  number: 8,
  title: 'URL checking',
  subject: 'Website checking',
  phase: 'Core backend',
  estMinutes: 200,
  summary: 'How WebWatch turns a URL into a check result: normalization, one HTTP request, status codes, redirects, timeouts, retries and error messages.',
  hinglish: [
    'WebWatch ka core kaam ek hi hai: ek URL pe request bhejo aur dekho website zinda hai ya nahi. Ye kaam Backend/src/services/websiteChecker.js karta hai. Isme do functions hain: checkOnce() ek baar try karta hai, aur checkWebsite() zarurat pade to 3 baar tak try karta hai.',
    'Pehle URL normalize hota hai. Normalize matlab user ne jo bhi likha (jaise "example.com"), use ek standard form mein badalna ("https://example.com/"). Ye kaam urlSafety.js ka parseHttpUrl() karta hai: agar protocol nahi likha to https:// jod deta hai.',
    'Phir undici library ka request() function GET request bhejta hai. Status code (jaise 200, 404, 500) server ka jawab hai ki kya hua. WebWatch 200 se 399 tak ko "up" maanta hai (isUp: statusCode >= 200 && statusCode < 400).',
    'Timeout ka matlab: agar server 5 second mein jawab na de, to request cancel. Ye AbortSignal.timeout(timeoutMs) se hota hai. Abort signal ek "cancel button" jaisa hai jo time khatam hone par khud dab jaata hai.',
    'Redirect (301, 302, 303, 307, 308) ka matlab server kehta hai "mai yahan nahi, wahan jao". WebWatch redirect ko khud follow karta hai (maxRedirections: 0 rakh ke), taaki har naye URL ko dobara safety check se guzaar sake. Maximum 6 requests (redirectCount 0 se 5) ke baad "Too many redirects" error.',
    'Retry matlab fail hone par dobara try karna. checkWebsite() har fail attempt ke baad 500 ms rukta hai, aur up milte hi turant return kar deta hai. Scheduled checks 3 attempts use karte hain; free manual check (/api/check) sirf 1 attempt.',
  ],
  why: 'Agar check galat hai to poora product galat hai: fake downtime alerts user ko pareshan karenge, aur miss hua downtime trust tod dega. Isliye timeout, retry aur error classification sahi samajhna zaroori hai.',
  prerequisites: [
    'async/await aur try/catch (Milestone 1)',
    'HTTP methods aur status codes (Milestone 3)',
    'URL ke parts: protocol, hostname, path',
  ],
  terms: [
    { term: 'URL normalization', meaning: 'User ke likhe URL ko ek standard format mein badalna, jaise "example.com" ko "https://example.com/".' },
    { term: 'HTTP status code', meaning: 'Server ka 3-digit jawab. 2xx = sab theek, 3xx = redirect, 4xx = client ki galti, 5xx = server ki galti.' },
    { term: 'Response time', meaning: 'Request bhejne se jawab milne tak kitne milliseconds lage. WebWatch Date.now() se start aur end ka farak nikalta hai.' },
    { term: 'Timeout', meaning: 'Maximum waiting time. Isse zyada lage to request ko fail maan lo.' },
    { term: 'AbortSignal', meaning: 'Ek signal jo chalti hui request ko cancel kar sakta hai. AbortSignal.timeout(5000) 5 second baad khud cancel karta hai.' },
    { term: 'Redirect', meaning: 'Server bolta hai ki page kisi aur address pe hai. Naya address "Location" header mein aata hai.' },
    { term: 'Retry', meaning: 'Fail hone par thoda ruk ke dobara try karna, taaki ek choti network galti ko downtime na samjha jaaye.' },
    { term: 'User-Agent', meaning: 'Request ke saath bheja gaya naam jo batata hai ki kaun request kar raha hai. WebWatch "WebWatch/1.0 uptime-monitor" bhejta hai.' },
    { term: 'Error classification', meaning: 'Error ko samajhne layak category mein daalna, jaise timeout, DNS fail, ya bad status code.' },
  ],
  flow: [
    'User URL (example.com)',
    'parseHttpUrl() adds https://',
    'validatePublicUrl() + DNS',
    'undici request() with 5s timeout',
    'Redirect? validate next URL',
    'Status 200-399 = up',
    'Retry up to 3 times',
    'Result object',
  ],
  files: [
    { path: 'Backend/src/services/websiteChecker.js', lines: '21-71', note: 'checkOnce(): one request, redirect loop, timeout, result object' },
    { path: 'Backend/src/services/websiteChecker.js', lines: '73-86', note: 'checkWebsite(): up to 3 attempts, 500 ms wait between them' },
    { path: 'Backend/src/services/websiteChecker.js', lines: '5', note: 'REDIRECT_CODES set: 301, 302, 303, 307, 308' },
    { path: 'Backend/src/services/urlSafety.js', lines: '23-56', note: 'parseHttpUrl(): adds https://, allows only http/https' },
    { path: 'Backend/src/app.js', lines: '41-48', note: 'POST /api/check: free manual check with attempts: 1' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '36', note: 'Scheduled checks call checkWebsite with attempts: 3' },
  ],
  examples: [
    {
      title: 'How WebWatch decides up or down',
      code: String.raw`isUp: response.statusCode >= 200 && response.statusCode < 400,
statusCode: response.statusCode,
responseTimeMs: Date.now() - startedAt,
error: null,`,
      notes: [
        'isUp: 2xx aur 3xx ko up maana jaata hai. 404 ya 500 aaye to down.',
        'statusCode: asli number save hota hai taaki dashboard dikha sake.',
        'responseTimeMs: startedAt checkOnce ki shuruaat mein set hua tha, isliye redirects ka time bhi isme judta hai.',
        'error: null matlab koi network error nahi hua (status code bura ho sakta hai, phir bhi error null rehta hai).',
      ],
    },
    {
      title: 'Retry loop in checkWebsite()',
      code: String.raw`const attempts = Math.min(Math.max(options.attempts || 1, 1), 3);
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  lastResult = await checkOnce(url, options.timeoutMs || 5_000);
  lastResult.attempts = attempt;
  if (lastResult.isUp) return lastResult;
  if (attempt < attempts) await wait(500);
}
return lastResult;`,
      notes: [
        'Math.min/Math.max attempts ko 1 aur 3 ke beech band kar dete hain. Koi 100 bhi bheje to 3 hi chalega.',
        'Up milte hi return: website theek hai to baaki attempts bekaar hain.',
        'wait(500) aakhri attempt ke baad nahi chalta, isliye bekaar delay nahi hota.',
        'Sab fail hue to aakhri attempt ka result return hota hai, attempts = 3 ke saath.',
      ],
    },
  ],
  exercise: {
    title: 'Write a tiny check-result classifier',
    minutes: 40,
    goal: 'Ek function classifyResult(result) banao jo WebWatch jaise result object ko ek simple label mein badle: "UP", "HTTP_ERROR", "TIMEOUT" ya "NETWORK_ERROR".',
    where: 'playground/08-classify.js (practice folder, production code nahi)',
    input: String.raw`const results = [
  { isUp: true,  statusCode: 200,  error: null },
  { isUp: false, statusCode: 503,  error: null },
  { isUp: false, statusCode: null, error: 'Request timed out after 5 seconds' },
  { isUp: false, statusCode: null, error: 'The hostname could not be resolved' },
  { isUp: true,  statusCode: 301,  error: null },
];`,
    output: String.raw`UP
HTTP_ERROR
TIMEOUT
NETWORK_ERROR
UP`,
    steps: [
      'websiteChecker.js lines 49-55 aur 63-69 padho: dono return objects ka shape dekho.',
      'playground/08-classify.js banao aur upar ka results array paste karo.',
      'classifyResult(result) likho jo string return kare.',
      'results.forEach se har label console.log karo.',
      'node playground/08-classify.js chalao aur output match karo.',
    ],
    hints: [
      'Concept: isUp true hai to baaki kuch dekhne ki zaroorat nahi. Agar statusCode hai aur isUp false, to server ne jawab diya lekin bura jawab. Agar statusCode null hai, to jawab aaya hi nahi.',
      'Pseudocode: if isUp -> "UP"; else if statusCode is not null -> "HTTP_ERROR"; else if error mentions "timed out" -> "TIMEOUT"; else -> "NETWORK_ERROR".',
      String.raw`Partial code:
function classifyResult(result) {
  if (result.isUp) return 'UP';
  if (result.statusCode !== null) return /* ? */;
  // timeout check: String.includes()
}`,
    ],
    explanation: [
      { code: "if (result.isUp) return 'UP';", why: 'Sabse common case pehle. Up result ke liye error ya status dekhna zaroori nahi.' },
      { code: "if (result.statusCode !== null) return 'HTTP_ERROR';", why: 'statusCode ka matlab server tak pahunche aur jawab mila, par 200-399 nahi tha (jaise 503).' },
      { code: "if (result.error && result.error.includes('timed out')) return 'TIMEOUT';", why: "websiteChecker.js line 68 timeout ke liye exact text 'Request timed out after 5 seconds' likhta hai." },
      { code: "return 'NETWORK_ERROR';", why: 'Baaki sab (DNS fail, connection refused, unsafe URL) mein jawab aaya hi nahi.' },
    ],
  },
  checklist: [
    'Mai bata sakta hoon ki WebWatch kaunse status codes ko up maanta hai aur kyun',
    'Mai samjha sakta hoon ki maxRedirections: 0 kyun hai aur redirects kaise follow hote hain',
    'Mai bata sakta hoon ki scheduled check aur /api/check mein attempts ka farak kya hai',
    'playground/08-classify.js expected output deta hai',
    'Mai timeout aur retry ka farak apne shabdon mein samjha sakta hoon',
  ],
  mistakes: [
    { mistake: 'Sochna ki 404 bhi "up" hai kyunki server ne jawab diya', fix: 'WebWatch ke rule ke hisaab se sirf 200-399 up hai. 404 = down.' },
    { mistake: 'Timeout ke bina fetch/request likhna', fix: 'Bina timeout ke ek slow server check ko minutes tak latka sakta hai. Hamesha AbortSignal.timeout() jaisa limit lagao.' },
    { mistake: 'Retry ke beech koi wait na rakhna', fix: 'Turant retry usi temporary problem se takra sakta hai. WebWatch 500 ms rukta hai.' },
    { mistake: 'Response body ko band na karna', fix: 'WebWatch response.body.destroy() karta hai taaki connection khula na rahe. Body padhni nahi to bhi band karo.' },
  ],
  debugging: [
    'Terminal mein curl -I https://example.com chala ke asli status code aur Location header dekho.',
    'Monitor ka lastError field dekho: "Request timed out after 5 seconds" matlab timeout, "The hostname could not be resolved" matlab DNS problem.',
    'History panel mein Check rows ka attempts column dekho: 3 matlab teeno tries fail hue.',
    'Redirect loop shak ho to curl -L --max-redirs 6 se chain dekho.',
  ],
  quiz: [
    {
      id: 'url-checking-1', kind: 'mcq',
      prompt: 'Ek website 302 redirect deti hai aur final page 200 return karta hai. WebWatch kya save karega?',
      options: ['statusCode 302, isUp true', 'statusCode 200, isUp true', 'statusCode null, error "redirect"', 'isUp false kyunki redirect hua'],
      answer: 1,
      explain: 'checkOnce() redirect ko follow karta hai (line 42-46) aur final response ka status code return karta hai.',
      wrong: ['302 sirf beech ka step tha; loop continue hua.', '', 'Redirect error nahi hai, WebWatch use follow karta hai.', 'Final 200 hai, isliye up.'],
    },
    {
      id: 'url-checking-2', kind: 'predict',
      prompt: 'checkWebsite(url, { attempts: 10 }) call kiya. Server hamesha 500 deta hai. result.attempts kya hoga?',
      code: String.raw`const attempts = Math.min(Math.max(options.attempts || 1, 1), 3);`,
      options: ['10', '3', '1', '0'],
      answer: 1,
      explain: 'Math.min(..., 3) maximum 3 pe rok deta hai. Teeno fail honge, isliye attempts = 3.',
      wrong: ['10 ko 3 pe cap kar diya jaata hai.', '', '1 tab hota jab pehla attempt up hota.', 'Loop kam se kam ek baar chalta hai.'],
    },
    {
      id: 'url-checking-3', kind: 'bug',
      prompt: 'Is simplified checker mein kya bug hai?',
      code: String.raw`async function check(url) {
  const res = await fetch(url);
  return { isUp: res.status >= 200 && res.status < 400 };
}`,
      options: ['fetch GET nahi bhejta', 'Koi timeout nahi hai, slow server check ko hamesha ke liye rok sakta hai', 'status 200 ko down maanta hai', 'async galat use hua'],
      answer: 1,
      explain: 'Bina timeout ke request bahut der tak latak sakti hai. WebWatch AbortSignal.timeout(timeoutMs) use karta hai.',
      wrong: ['fetch default GET hi bhejta hai.', '', 'Condition 200 ko up maanti hai.', 'async/await yahan theek hai.'],
    },
    {
      id: 'url-checking-4', kind: 'match',
      prompt: 'Concept ko sahi file se match karo.',
      pairs: [
        { left: 'Retry loop', right: 'Backend/src/services/websiteChecker.js' },
        { left: 'https:// auto-add', right: 'Backend/src/services/urlSafety.js' },
        { left: 'Free one-attempt check route', right: 'Backend/src/app.js' },
      ],
      explain: 'checkWebsite() websiteChecker.js mein hai, parseHttpUrl() urlSafety.js mein, aur POST /api/check app.js mein.',
    },
    {
      id: 'url-checking-5', kind: 'explain',
      prompt: 'Apne shabdon mein: WebWatch har scheduled check 3 baar kyun try karta hai?',
      model: 'Internet mein chhoti temporary problems hoti hain (ek packet drop, ek slow second). Ek hi fail pe downtime maan lenge to user ko fake alerts milenge. 3 attempts aur beech mein 500 ms wait se galat alarm kam hote hain.',
      keywords: ['temporary', 'false', 'alert', 'retry'],
    },
  ],
  reflection: 'Agar tumhari site 4.9 second mein jawab deti hai aur timeout 5 second hai, to kya ye "up" hai? User ke liye kya ye sach mein theek hai?',
  commit: 'docs: explain how WebWatch classifies check results',
  resume: [
    'Traced and documented the HTTP check pipeline of an uptime monitor, including timeouts, manual redirect handling and bounded retries.',
    'Built a small classifier that maps raw check results to timeout, HTTP and network error categories.',
  ],
  gaps: ['free-check-not-in-ui'],
}
