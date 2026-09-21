export default {
  id: 'auth',
  number: 7,
  title: 'Authentication and authorization',
  subject: 'Security',
  phase: 'Core backend',
  estMinutes: 240,
  summary: 'How WebWatch signs users up, logs them in, keeps them logged in with a JWT in an HTTP-only cookie, protects routes, and makes sure one user can never touch another user\'s monitors.',
  hinglish: [
    'Authentication = "tum kaun ho?" (login). Authorization = "tumhe ye karne ki permission hai?" (kya ye monitor tumhara hai). Dono alag cheezein hain aur dono chahiye.',
    'Password kabhi seedha store nahi hota. Hashing ek one-way function hai: password → lamba random-jaisa string, jise wapas password mein nahi badal sakte. bcrypt jaan-boojh kar slow hashing hai (WebWatch cost 12 use karta hai), taaki chori hua database brute-force karna mehenga ho.',
    'Login ke baad server ek JWT (JSON Web Token) banata hai: ek signed token jisme user id (sub) aur email hota hai. Signature JWT_SECRET se banta hai, isliye koi token badle to verify fail ho jaata hai. Token 7 din mein expire hota hai.',
    'Token ek cookie mein jaata hai jo httpOnly hai (browser JavaScript use padh nahi sakti, XSS se bachav), production mein secure hai (sirf HTTPS), aur sameSite: lax hai (doosri site se aane wali POST requests ke saath cookie nahi jaati, CSRF se bachav).',
    'requireAuth middleware har protected request par cookie padhta hai, token verify karta hai aur req.user set karta hai. Phir har monitor query mein userId: req.user.id likha hota hai. Yahi ownership check hai.',
  ],
  why: 'WebWatch multi-user SaaS hai. Agar ownership check ek bhi route mein chhoot gaya, to ek user doosre ka monitor dekh, pause ya delete kar sakta hai. Password leak, token forge ya brute-force se account takeover ho sakta hai. Ye milestone sabse important security foundation hai.',
  prerequisites: ['Milestone 4: middleware and next()', 'Milestone 6: Prisma where clauses'],
  terms: [
    { term: 'Authentication', meaning: 'Pehchaan verify karna: tum wahi ho jo kehte ho.' },
    { term: 'Authorization', meaning: 'Permission check: kya tum ye resource access kar sakte ho.' },
    { term: 'Hashing', meaning: 'One-way conversion. Same input se same hash, lekin hash se input wapas nahi.' },
    { term: 'bcrypt', meaning: 'Slow password-hashing algorithm with built-in salt. Salt = random value jo same password ko alag hash deta hai.' },
    { term: 'JWT', meaning: 'Signed token: header.payload.signature. Payload padh sakte hain, lekin secret ke bina badal nahi sakte.' },
    { term: 'Cookie', meaning: 'Chhota data jo browser store karta hai aur har request ke saath us site ko bhejta hai.' },
    { term: 'httpOnly', meaning: 'Cookie option: page ka JavaScript cookie nahi padh sakta.' },
    { term: 'secure', meaning: 'Cookie sirf HTTPS par bheji jaati hai.' },
    { term: 'sameSite: lax', meaning: 'Doosri website se aayi POST jaisi requests ke saath cookie nahi jaati.' },
    { term: 'Ownership check', meaning: 'Query mein userId filter taaki sirf apna data mile.' },
    { term: 'Brute force', meaning: 'Bahut saare passwords try karke andar ghusne ki koshish. Rate limiting isko rokta hai.' },
    { term: 'User enumeration', meaning: 'Error messages se pata lagana ki kaunsa email registered hai.' },
  ],
  flow: ['Login form', 'POST /api/auth/login', 'bcrypt.compare', 'jwt.sign (7d)', 'Set-Cookie httpOnly', 'Next request: requireAuth', 'req.user', 'where userId'],
  files: [
    { path: 'Backend/src/routes/auth.js', lines: '10-16', note: 'authLimiter: 10 attempts per 15 minutes on register and login.' },
    { path: 'Backend/src/routes/auth.js', lines: '22-35', note: 'setSessionCookie: jwt.sign with subject = user id, 7 day expiry, httpOnly / secure / sameSite cookie.' },
    { path: 'Backend/src/routes/auth.js', lines: '37-65', note: 'Register: validation, duplicate check (409), bcrypt.hash(password, 12), select without passwordHash.' },
    { path: 'Backend/src/routes/auth.js', lines: '67-82', note: 'Login: same generic 401 message for unknown email and wrong password.' },
    { path: 'Backend/src/routes/auth.js', lines: '84-101', note: 'Logout clears the cookie; /me returns the current user.' },
    { path: 'Backend/src/middleware/auth.js', lines: '4-18', note: 'requireAuth: reads the cookie, jwt.verify, sets req.user or answers 401.' },
    { path: 'Backend/src/routes/monitors.js', lines: '108, 121, 159, 171', note: 'Ownership: every per-monitor route uses findFirst({ where: { id, userId: req.user.id } }).' },
    { path: 'Backend/src/config.js', lines: '26-28', note: 'App refuses to start if JWT_SECRET is shorter than 32 characters.' },
  ],
  examples: [
    {
      title: 'Hash on signup, compare on login',
      code: String.raw`const passwordHash = await bcrypt.hash(password, 12)
// later
const ok = await bcrypt.compare(password, user.passwordHash)`,
      notes: [
        '12 cost factor hai: jitna zyada, utna slow aur safe.',
        'compare khud salt nikaal kar dobara hash karta hai; hum hashes ko === se compare nahi karte.',
        'WebWatch password 8 se 72 characters tak allow karta hai kyunki bcrypt 72 bytes ke baad input ignore karta hai.',
      ],
    },
    {
      title: 'Signing and verifying a JWT',
      code: String.raw`const token = jwt.sign({ email: user.email }, config.jwtSecret, { subject: user.id, expiresIn: '7d' })
const payload = jwt.verify(token, config.jwtSecret)
req.user = { id: payload.sub, email: payload.email }`,
      notes: [
        'subject JWT ke "sub" field mein user id rakhta hai.',
        'verify galat secret, badle hue token ya expired token par error throw karta hai; requireAuth use 401 mein badalta hai.',
        'Payload encrypted nahi hai, sirf signed hai. Isme kabhi password ya secret mat daalo.',
      ],
    },
  ],
  exercise: {
    title: 'Break and verify auth in a sandbox',
    minutes: 50,
    goal: 'Use bcryptjs and jsonwebtoken in a playground script to see hashing, comparison, token signing, tampering and expiry fail in the same way requireAuth would see them. Then trace ownership in the monitor routes.',
    where: 'playground/07-auth-lab.js (inside playground run npm install bcryptjs jsonwebtoken once; use a fake secret, never the real JWT_SECRET)',
    output: String.raw`hash starts with $2: true
correct password: true
wrong password: false
verified sub: user-123
tampered token: invalid signature
wrong secret: invalid signature
expired token: jwt expired`,
    steps: [
      'Hash "correct-horse-battery" with bcrypt cost 12. Print whether it starts with "$2" and compare both the right and a wrong password.',
      'Sign a token with { email } and subject "user-123" using a fake 32+ character secret. Verify it and print payload.sub.',
      'Decode the middle (payload) part of the token, change sub to "user-999", re-encode it as base64url, rebuild the token and verify it inside try/catch. Print error.message.',
      'Verify the original token with a different secret. Then sign one with expiresIn: "1s", wait 2 seconds and verify it.',
      'In playground notes, list every route in Backend/src/routes/monitors.js and write the exact where clause that proves ownership for each.',
    ],
    hints: [
      'Hashes are compared with bcrypt.compare, never with ===. jwt.verify throws on any problem, so wrap every verify in try/catch and print error.message.',
      'hash = await bcrypt.hash(pw, 12)\nprint(await compare(pw, hash), await compare(wrong, hash))\ntoken = sign({ email }, SECRET, { subject, expiresIn })\nfor each bad case: try verify → catch print message',
      "const SECRET = 'practice-secret-that-is-at-least-32-chars'\nconst token = jwt.sign({ email: 'a@b.com' }, SECRET, { subject: 'user-123', expiresIn: '7d' })\nconst [h, p, s] = token.split('.')\nconst payload = JSON.parse(Buffer.from(p, 'base64url'))\nconst forged = Buffer.from(JSON.stringify({ ...payload, sub: 'user-999' })).toString('base64url')\nconst tampered = [h, forged, s].join('.')\ntry { jwt.verify(tampered, SECRET) } catch (error) { /* ? */ }",
    ],
    explanation: [
      { code: 'await bcrypt.hash(password, 12)', why: 'Slow salted hash; database leak hone par bhi password seedha nahi milta.' },
      { code: 'await bcrypt.compare(wrong, hash)', why: 'false aana chahiye; ye wahi check hai jo login route line 73 par karta hai.' },
      { code: "jwt.sign({ email }, SECRET, { subject: 'user-123', expiresIn: '7d' })", why: 'Same shape jaisa setSessionCookie banata hai.' },
      { code: 'jwt.verify(tampered, SECRET)', why: 'Payload badla to signature match nahi hoga: "invalid signature". Isliye user apna id badal kar doosra user nahi ban sakta.' },
      { code: "expiresIn: '1s'", why: 'Expiry test: requireAuth isi error par "Session expired" 401 bhejta hai.' },
    ],
  },
  checklist: [
    'The script prints the seven expected lines',
    'I used a fake practice secret and did not paste any real secret',
    'I listed the ownership where clause for GET, POST, PATCH, DELETE, check and history monitor routes',
    'I can explain authentication vs authorization with a WebWatch example',
    'I can explain what httpOnly, secure and sameSite each protect against',
  ],
  mistakes: [
    { mistake: 'Looking up a monitor by id only: findUnique({ where: { id } }).', fix: 'Always add userId: req.user.id. Without it, any logged-in user can reach any monitor.' },
    { mistake: 'Returning different messages for "email not found" and "wrong password" on login.', fix: 'That leaks which emails exist. WebWatch login returns one generic 401 message.' },
    { mistake: 'Storing the JWT in localStorage.', fix: 'Any XSS script can read localStorage. An httpOnly cookie cannot be read by page JavaScript.' },
    { mistake: 'Believing logout invalidates the token everywhere.', fix: 'Logout only clears the cookie in that browser. A copied JWT stays valid until it expires (7 days); revocation would need a server-side session or token version.' },
  ],
  debugging: [
    'Every request returns 401 "Authentication required": the cookie is not being sent. Check credentials: "include" in fetch and the CORS origin.',
    '401 "Session expired": jwt.verify failed; the token expired or JWT_SECRET changed between restarts.',
    'Login works locally but not in production: with NODE_ENV=production the cookie is secure and needs HTTPS.',
    'In the browser, DevTools > Application > Cookies shows webwatch_token with the HttpOnly flag; the Network tab shows Set-Cookie on login.',
  ],
  quiz: [
    {
      id: 'auth-1',
      kind: 'mcq',
      prompt: 'Which line is the authorization (not authentication) step when User A opens a monitor\'s history?',
      options: [
        'jwt.verify(token, config.jwtSecret) in requireAuth',
        'prisma.monitor.findFirst({ where: { id: req.params.id, userId: req.user.id } })',
        'bcrypt.compare in the login route',
        'res.cookie(...) in setSessionCookie',
      ],
      answer: 1,
      explain: 'Authentication proves who you are (JWT). Authorization decides if you may access this specific monitor, which the userId filter does.',
      wrong: ['That proves identity: authentication.', '', 'That is login, also authentication.', 'That stores the session.'],
    },
    {
      id: 'auth-2',
      kind: 'bug',
      prompt: 'A new route is added. What is the security bug?',
      code: String.raw`router.delete('/:id/checks', async (req, res) => {
  await prisma.check.deleteMany({ where: { monitorId: req.params.id } })
  return res.json({ success: true })
})`,
      options: ['deleteMany does not exist', 'It never verifies that the monitor belongs to req.user.id, so anyone logged in can wipe another user\'s history', 'It should return 201', 'It needs express.json()'],
      answer: 1,
      explain: 'router.use(requireAuth) only proves the user is logged in. Every route must still check ownership first, as the existing routes do with findFirst({ id, userId }).',
      wrong: ['deleteMany exists.', '', 'The status code is not the security issue.', 'There is no body to parse.'],
    },
    {
      id: 'auth-3',
      kind: 'match',
      prompt: 'Match each cookie option to what it protects against.',
      pairs: [
        { left: 'httpOnly: true', right: 'Page scripts (XSS) stealing the token' },
        { left: 'secure: true in production', right: 'Token sent over plain HTTP' },
        { left: "sameSite: 'lax'", right: 'Other sites sending cross-site POSTs with your cookie (CSRF)' },
        { left: 'maxAge 7 days', right: 'Sessions that never end' },
      ],
      explain: 'All four are set in setSessionCookie in routes/auth.js.',
    },
    {
      id: 'auth-4',
      kind: 'predict',
      prompt: 'Someone tries 11 wrong passwords within 15 minutes from one IP. What does the 11th request get?',
      options: ['401 Invalid email or password', '429 "Too many login attempts. Try again later."', '500', '200'],
      answer: 1,
      explain: 'authLimiter allows 10 requests per 15 minutes on /register and /login, then express-rate-limit responds 429 with the configured message.',
      wrong: ['That is the answer for attempts 1 to 10.', '', 'Rate limiting is not an error.', 'Wrong passwords never succeed.'],
    },
    {
      id: 'auth-5',
      kind: 'explain',
      prompt: 'Why can a user not simply edit their JWT payload to change sub to another user\'s id?',
      model: 'The JWT signature is calculated from the header and payload using JWT_SECRET. Changing the payload makes the signature invalid, and jwt.verify rejects it. Only the server knows the secret.',
      keywords: ['signature', 'secret', 'verify'],
    },
  ],
  reflection: 'Register returns 409 "An account with this email already exists". Is that user enumeration? What would you trade off to remove it?',
  commit: 'chore(playground): add bcrypt and JWT auth lab',
  resume: [
    'Explained and tested a cookie-based JWT authentication flow with bcrypt hashing, rate-limited login and HTTP-only, SameSite cookies.',
    'Audited every monitor endpoint for ownership-scoped database queries to prevent cross-tenant access.',
  ],
  gaps: ['no-email-verification', 'alert-email-unverified'],
}
