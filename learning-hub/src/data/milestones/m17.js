export default {
  id: 'payments',
  number: 17,
  title: 'Payments',
  subject: 'Payments',
  phase: 'Product',
  estMinutes: 220,
  summary: 'Read the disabled Dodo Payments code as it exists, understand why only a verified webhook may grant access, and design (on paper and in a playground) the intended $2-for-two-months entitlement.',
  hinglish: [
    'Payment gateway (jaise Dodo Payments) woh service hai jo card se paisa leti hai. Dodo "Merchant of Record" bhi hai — matlab tax aur invoice ki legal zimmedari woh leta hai, tum nahi.',
    'Flow: tumhara server Dodo se ek checkout session banwata hai, user Dodo ke page par pay karta hai, phir Dodo tumhare server ko ek webhook bhejta hai. Webhook ek HTTP request hai jo Dodo khud tumhare server par bhejta hai jab koi event hota hai, jaise payment.succeeded.',
    'Sabse zaroori rule: user ka browser wapas aana (redirect) proof nahi hai ki paisa mila. Koi bhi URL type kar sakta hai. Sirf woh webhook trust karo jiska signature verify ho gaya ho.',
    'Abhi repo mein: $1 per monitor slot, hamesha ke liye (koi expiry nahi), aur BILLING_ENABLED false by default. Tumhara intended offer $2 for two months hai — woh abhi code mein nahi hai. Is milestone mein hum usko design karenge, real payments on nahi karenge.',
  ],
  why: 'Paise wala code galat ho to direct nuksaan hota hai: ya to log free mein paid feature le lete hain, ya pay karne wale ko service nahi milti. WebWatch ka business model automatic monitoring bechna hai, isliye entitlement (kisko kab tak access hai) bilkul sahi hona chahiye.',
  prerequisites: [
    'Prisma transactions (Milestone 6)',
    'Authentication aur ownership (Milestone 7)',
    'Express middleware order — raw body vs JSON (Milestone 4)',
    'Idempotency ka idea (Milestone 10)',
  ],
  terms: [
    { term: 'Checkout session', meaning: 'Dodo par ek temporary payment page jo tumhara server banwata hai. User wahan card daalta hai.' },
    { term: 'Webhook', meaning: 'Dodo ka tumhare server ko bheja gaya HTTP POST, jab payment jaisa event hota hai.' },
    { term: 'Signature verification', meaning: 'Webhook ke saath aaya code (signature) secret key se check karna, taaki pakka ho request sach mein Dodo se aayi aur beech mein badli nahi gayi.' },
    { term: 'Raw body', meaning: 'Request body bilkul waise hi bytes mein jaise aayi. Signature raw bytes par banta hai, isliye JSON parse karne se pehle verify karna padta hai.' },
    { term: 'Idempotency', meaning: 'Same event do baar aaye to bhi result ek hi baar lage. Dodo webhooks retry karta hai, isliye duplicate aa sakte hain.' },
    { term: 'Entitlement', meaning: 'Record jo batata hai user ko kya milne ka haq hai aur kab tak — jaise "monitor X, paid until 2026-11-20".' },
    { term: 'Merchant of Record', meaning: 'Company jo legally seller maani jaati hai aur tax/invoice sambhalti hai. Yahan Dodo.' },
  ],
  flow: [
    'React: POST /api/billing/create-checkout',
    'createCheckoutSession(): Payment PENDING row',
    'Dodo checkout page (user pays)',
    'Dodo → POST /api/webhooks/dodo (raw body)',
    'verifyWebhookSignature()',
    'fulfillPayment() in $transaction',
    'Payment SUCCESS + paidMonitorsCount increment',
    'Browser return → verify-session only reads status',
  ],
  files: [
    { path: 'Backend/src/config.js', lines: '23', note: "billingEnabled: process.env.BILLING_ENABLED === 'true' — off unless explicitly set" },
    { path: 'Backend/src/config.js', lines: '30-32', note: 'Refuses to start with billing on but Dodo keys missing' },
    { path: 'Backend/src/app.js', lines: '20-23', note: 'Webhook router mounted BEFORE express.json so the body stays raw' },
    { path: 'Backend/src/routes/webhooks.js', lines: '10-62', note: 'Verifies signature, handles only payment.succeeded, calls fulfillPayment' },
    { path: 'Backend/src/services/dodoPayments.js', lines: '38-91', note: 'createCheckoutSession: PENDING payment row, $1 x quantity, return_url' },
    { path: 'Backend/src/services/dodoPayments.js', lines: '96-134', note: 'fulfillPayment: transaction, SUCCESS check, paidMonitorsCount increment (no expiry)' },
    { path: 'Backend/src/services/dodoPayments.js', lines: '26-33', note: 'assertPaymentMatches: user, session, amount, currency must match the server record' },
    { path: 'Backend/src/services/dodoPayments.js', lines: '139-167', note: 'verifyWebhookSignature: without a key it is valid only outside production' },
    { path: 'Backend/src/routes/billing.js', lines: '75-104', note: 'verify-session: reads status only, never grants access' },
    { path: 'Backend/prisma/schema.prisma', lines: '17-41', note: 'User.paidMonitorsCount and Payment model (status is a plain String)' },
  ],
  examples: [
    {
      title: 'Why the webhook router comes before express.json()',
      code: String.raw`// Backend/src/app.js
app.use('/api/webhooks', webhookRoutes);   // uses express.raw()
app.use(express.json({ limit: '20kb' }));  // everything after this gets parsed JSON`,
      notes: [
        'Signature asli bytes par bana hota hai. Agar pehle JSON parse ho gaya, to bytes kho jaate hain aur verification fail hota hai.',
        'Isliye webhook route pehle mount hai aur apna express.raw({ type: "application/json" }) use karta hai.',
      ],
    },
    {
      title: 'Current fulfillment (repository fact)',
      code: String.raw`if (payment.status === 'SUCCESS') {
  return { payment, alreadyProcessed: true };
}
// ...mark SUCCESS...
const quantityGranted = Math.max(1, Math.floor(updatedPayment.amount / 100));
await tx.user.update({
  where: { id: payment.userId },
  data: { paidMonitorsCount: { increment: quantityGranted } },
});`,
      notes: [
        'Pehle se SUCCESS hai to dobara slot nahi milta — yeh idempotency ka pehla layer hai.',
        'Slots = amount / 100, yaani $1 = 1 slot. Koi expiry date nahi — slot hamesha ke liye.',
        'Recommendation (needs verification): do duplicate webhooks bilkul ek saath aayein to dono PENDING padh sakte hain. updateMany({ where: { id, status: "PENDING" } }) aur count check karna race ko band karta hai.',
      ],
    },
    {
      title: 'Recommended entitlement shape for $2 / two months (NOT in the repo)',
      code: String.raw`// Recommendation only — design sketch, not existing code
model MonitorEntitlement {
  id         String   @id @default(uuid())
  userId     String
  monitorId  String?
  paymentId  String   @unique   // one payment grants at most one entitlement
  paidUntil  DateTime
  createdAt  DateTime @default(now())
}`,
      notes: [
        'paidUntil — worker sirf un monitors ko check kare jinka paidUntil future mein hai.',
        'paymentId @unique — database level par duplicate grant impossible.',
        'Renewal: agar abhi active hai to paidUntil ko purane paidUntil se 60 din aage badhao, aaj se nahi.',
      ],
    },
  ],
  exercise: {
    title: 'Simulate a two-month entitlement with duplicate webhooks',
    minutes: 55,
    goal: 'Ek pure JavaScript function likho jo webhook events process kare, $2 par 60 din ka access de, duplicate event ignore kare, aur galat amount reject kare. Koi Dodo call nahi, koi database nahi.',
    where: 'playground/17-entitlements.js (practice folder, not production code). Do not change BILLING_ENABLED or any Dodo setting.',
    input: String.raw`const events = [
  { id: 'evt_1', type: 'payment.succeeded', userId: 'u1', amount: 200, at: '2026-10-01' },
  { id: 'evt_1', type: 'payment.succeeded', userId: 'u1', amount: 200, at: '2026-10-01' }, // duplicate
  { id: 'evt_2', type: 'payment.succeeded', userId: 'u1', amount: 100, at: '2026-10-05' }, // wrong amount
  { id: 'evt_3', type: 'payment.succeeded', userId: 'u1', amount: 200, at: '2026-11-20' }, // renewal while active
];`,
    output: String.raw`evt_1 granted  -> paidUntil 2026-11-30
evt_1 ignored  (duplicate)
evt_2 rejected (amount must be 200)
evt_3 extended -> paidUntil 2027-01-29`,
    steps: [
      'playground/17-entitlements.js banao aur upar ka events array paste karo.',
      'const processed = new Set() aur const paidUntil = {} (userId → Date) banao.',
      'processEvent(event) likho: duplicate id → ignore; amount !== 200 → reject; warna grant ya extend.',
      'Extend rule: agar current paidUntil event date se aage hai, to usi se 60 din jodo; warna event date se.',
      'Saare events loop mein chalao aur output print karo.',
      'Comment mein likho: production mein Set ki jagah kya use hoga (unique column) aur kyun.',
    ],
    hints: [
      'Concept: idempotency ke liye "maine yeh event pehle dekha?" ka yaad rakhna padta hai. Expiry ke liye ek date rakhni padti hai, count nahi.',
      'Pseudocode: if processed.has(id) -> ignored; processed.add(id); if amount !== 200 -> rejected; base = max(currentPaidUntil, eventDate); paidUntil = base + 60 days.',
      String.raw`Partial:
const DAY = 24 * 60 * 60 * 1000;
function processEvent(event) {
  if (processed.has(event.id)) return 'ignored (duplicate)';
  processed.add(event.id);
  if (event.amount !== 200) return 'rejected (amount must be 200)';
  const eventDate = new Date(event.at);
  const current = paidUntil[event.userId];
  // choose the base date, add 60 days, save it, return a message
}`,
    ],
    explanation: [
      { code: 'if (processed.has(event.id)) return ...', why: 'Dodo retry kar sakta hai; same event dobara aaya to access dobara nahi dena.' },
      { code: 'processed.add(event.id)', why: 'Check ke turant baad yaad rakho, taaki agla duplicate pakda jaaye. Database mein yeh kaam unique column karta hai.' },
      { code: 'if (event.amount !== 200)', why: 'Server khud decide karta hai price kya hai; client ya metadata ki value par bharosa nahi — jaise assertPaymentMatches karta hai.' },
      { code: 'const base = current && current > eventDate ? current : eventDate', why: 'Active user ne jaldi renew kiya to uske bache hue din waste na hon.' },
      { code: 'paidUntil[event.userId] = new Date(base.getTime() + 60 * DAY)', why: 'Two months = 60 din. Count ki jagah date rakhne se expiry automatically kaam karti hai.' },
    ],
  },
  checklist: [
    'Explain kar sakta hoon ki return URL (?payment=return) access kyun nahi deta aur verify-session sirf status kyun padhta hai.',
    'Explain kar sakta hoon ki webhook route express.json se pehle kyun mount hai.',
    'Playground simulation mein duplicate ignored, wrong amount rejected, renewal extended — teeno output sahi.',
    'Current code aur intended $2/60-day offer ke 3 fark likh sakta hoon (price, expiry, per-monitor vs slot count).',
    'BILLING_ENABLED ya kisi Dodo key ko production mein nahi chhua.',
  ],
  mistakes: [
    { mistake: 'Success page par hi access de dena', fix: 'Redirect URL koi bhi khol sakta hai. Access sirf verified webhook ke baad, server par.' },
    { mistake: 'Webhook ko JSON parse ke baad verify karna', fix: 'Signature raw body par hota hai. express.raw() wala route JSON parser se pehle rakho.' },
    { mistake: 'Metadata ya client se aayi amount par bharosa', fix: 'Server par save PENDING payment se compare karo (assertPaymentMatches jaisa).' },
    { mistake: 'Count badhana, expiry date na rakhna', fix: '"Two months" ke liye paidUntil date chahiye. Count hamesha ke liye access deta hai — abhi repo mein yahi hai.' },
  ],
  debugging: [
    'Webhook 400 "Invalid webhook signature" aaye: backend log mein verification.reason dekho (missing header, wrong key, parsed body).',
    'Payment PENDING hi rahe: Dodo dashboard mein webhook delivery attempts aur response status dekho.',
    'Prisma Studio mein Payment row ka status, dodoSessionId aur User.paidMonitorsCount compare karo.',
    'Hamesha Dodo test_mode mein debug karo; live keys local .env mein bhi mat rakho.',
  ],
  quiz: [
    {
      id: 'payments-1', kind: 'mcq',
      prompt: 'User checkout ke baad /?payment=return&payment_id=abc par aata hai. WebWatch kya karta hai?',
      options: ['Slot turant de deta hai', 'verify-session se sirf status padhta hai; slot sirf webhook deta hai', 'Dodo ko dobara charge karta hai', 'Monitor create kar deta hai'],
      answer: 1,
      explain: 'billing.js verify-session payment ka status aur fulfilled flag return karta hai. paidMonitorsCount sirf fulfillPayment (webhook se) badhata hai.',
      wrong: ['Yahi security galti hum avoid kar rahe hain.', '', 'Return URL se koi charge nahi hota.', 'Monitor user khud baad mein add karta hai.'],
    },
    {
      id: 'payments-2', kind: 'predict',
      prompt: 'Same payment.succeeded webhook do baar, kuch second ke gap se aata hai. paidMonitorsCount kitna badhega (current code)?',
      options: ['0', '1', '2', 'Error'],
      answer: 1,
      explain: 'Doosri baar payment.status pehle se SUCCESS hai, isliye alreadyProcessed return hota hai. (Bilkul ek saath aane wale duplicates ek alag, verify karne layak case hain.)',
      wrong: ['Pehla webhook grant karta hai.', '', 'SUCCESS check doosri grant rokta hai.', 'Duplicate ke liye 200 return hota hai.'],
    },
    {
      id: 'payments-3', kind: 'bug',
      prompt: 'Is design mein kya galat hai?',
      code: String.raw`app.use(express.json());
app.post('/api/webhooks/dodo', (req, res) => {
  if (req.body.type === 'payment.succeeded') grantAccess(req.body.data.metadata.userId);
  res.sendStatus(200);
});`,
      options: ['Status 200 galat hai', 'Signature verify nahi, body pehle parse, aur metadata par andha bharosa', 'type field galat hai', 'Kuch galat nahi'],
      answer: 1,
      explain: 'Koi bhi yeh URL fake JSON ke saath call karke free access le sakta hai. WebWatch raw body par signature verify karta hai aur server-side payment record se match karta hai.',
      wrong: ['200 sahi hai jab event process ho jaaye.', '', 'Asli problem security hai.', 'Yeh sabse khatarnak payment bug hai.'],
    },
    {
      id: 'payments-4', kind: 'match',
      prompt: 'Concept ko WebWatch file se jodo:',
      pairs: [
        { left: 'Raw body webhook route', right: 'Backend/src/routes/webhooks.js' },
        { left: 'Grant slots in a transaction', right: 'Backend/src/services/dodoPayments.js' },
        { left: 'Billing off by default', right: 'Backend/src/config.js' },
        { left: 'Read-only payment status for the browser', right: 'Backend/src/routes/billing.js' },
      ],
      explain: 'Har responsibility alag file mein hai: route HTTP sambhalta hai, service business logic, config settings.',
    },
    {
      id: 'payments-5', kind: 'explain',
      prompt: '$2 for two months lagane ke liye current code mein kya-kya badalna padega? (Sirf design, code nahi)',
      model: 'Price 100 se 200 cents, slot count ki jagah paidUntil date wala entitlement (per monitor ya per user), paymentId unique taaki duplicate grant na ho, renewal par purani date se extend, aur worker/scheduler sirf active entitlement wale monitors check kare. Expire hone par monitor pause aur user ko email.',
      keywords: ['200', 'paidUntil', 'expiry', 'unique', 'worker', 'renew'],
    },
  ],
  reflection: 'Agar ek user ka webhook fail ho gaya aur usne pay kar diya, to tum usko kaise pata karoge aur kaise theek karoge — bina kisi ko free access diye?',
  commit: 'docs: design two-month monitor entitlement with idempotent webhook handling',
  resume: [
    'Designed a webhook-driven entitlement model for a paid monitoring plan, with signature verification, server-side amount checks and idempotent fulfillment.',
    'Reviewed an existing Dodo Payments integration and documented the gaps between the implemented $1 slot model and the intended time-limited plan.',
  ],
  gaps: ['pricing-mismatch', 'no-subscription-expiry', 'webhook-failed-events-ignored'],
}
