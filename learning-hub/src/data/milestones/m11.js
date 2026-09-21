export default {
  id: 'incidents',
  number: 11,
  title: 'Incidents',
  subject: 'Monitoring logic',
  phase: 'Core backend',
  estMinutes: 160,
  summary: 'Incidents as a state machine: exactly when WebWatch opens an incident, keeps it open, resolves it, and which transition sends an alert.',
  hinglish: [
    'Incident matlab ek downtime ki "file": kab shuru hua (startedAt), kyun (startReason), aur kab theek hua (resolvedAt). Jab tak resolvedAt null hai, incident open hai.',
    'State machine ek aisa model hai jisme cheez kuch fixed states mein hi ho sakti hai, aur har event (jaise "check fail hua") use ek state se doosri mein le jaata hai. Traffic light jaisa: red, green, yellow, aur fixed rules.',
    'WebWatch ka rule (monitorRunner.js se verified): check fail hua (3 attempts ke baad bhi) aur koi open incident nahi -> naya incident + "down" alert. Check fail hua aur incident pehle se open -> kuch naya nahi, sirf status DOWN aur consecutiveFailures + 1. Isse alert spam nahi hota.',
    'Check up hua aur incident open tha -> resolvedAt = abhi, aur "recovery" alert. Check up hua aur koi incident nahi -> sirf status UP, koi alert nahi.',
    'Dhyaan do: incident ek hi failed scheduled run (andar 3 attempts) pe khul jaata hai. consecutiveFailures column badhta hai lekin decision mein use nahi hota. Aur monitor pause karne se open incident band nahi hota; resume ke baad agla successful check use resolve karega.',
  ],
  why: 'Incident logic decide karta hai ki user ko email kab jaaye. Galat logic = har 5 minute "site down" spam, ya asli downtime pe chuppi. Interview mein "incident kab banta hai?" ka exact jawab dena bahut strong signal hai.',
  prerequisites: [
    'Monitoring engine aur transactions (Milestone 10)',
    'if/else aur boolean logic',
    'null ka matlab',
  ],
  terms: [
    { term: 'Incident', meaning: 'Ek downtime period ka record. Open = resolvedAt null, closed = resolvedAt set.' },
    { term: 'State machine', meaning: 'Fixed states aur fixed rules ka model: kaunsa event kis state ko kis state mein le jaata hai.' },
    { term: 'Transition', meaning: 'Ek state se doosri state mein jaana, jaise UP se DOWN.' },
    { term: 'Recovery', meaning: 'Down website ka wapas up hona, jisse open incident resolve hota hai.' },
    { term: 'Alert deduplication', meaning: 'Ek hi problem ke liye baar-baar alert na bhejna. WebWatch sirf naya incident banne par down alert bhejta hai.' },
    { term: 'Transaction', meaning: 'Kai database operations ka group jo saath mein poore hote hain ya saath mein fail.' },
  ],
  flow: [
    'Check result',
    'Up? find open incident',
    'Open -> set resolvedAt, recovery alert',
    'Down? find open incident',
    'None -> create incident, down alert',
    'Exists -> no alert',
    'Commit transaction',
    'Send alert after commit',
  ],
  files: [
    { path: 'Backend/src/services/monitorRunner.js', lines: '51-75', note: 'Up branch: resolve open incident, status UP, consecutiveFailures 0' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '76-103', note: 'Down branch: create incident only if none is open, status DOWN' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '106-112', note: 'Alert is sent after the transaction; failure is only logged' },
    { path: 'Backend/prisma/schema.prisma', lines: '83-93', note: 'Incident model with startedAt, resolvedAt, startReason and indexes' },
    { path: 'Backend/src/routes/monitors.js', lines: '126-130', note: 'Pause sets PAUSED, resume sets UNKNOWN and clears lastCheckedAt; incidents are not touched' },
    { path: 'Backend/src/routes/monitors.js', lines: '15-32', note: 'activeIncident returned to the dashboard' },
  ],
  examples: [
    {
      title: 'The down branch',
      code: String.raw`const activeIncident = await tx.incident.findFirst({
  where: { monitorId: monitor.id, resolvedAt: null },
  orderBy: { startedAt: 'desc' },
});
if (!activeIncident) {
  const incident = await tx.incident.create({ data: { monitorId: monitor.id, startReason: '...' } });
  alert = { type: 'down', incident };
}`,
      notes: [
        'resolvedAt: null wala incident = abhi chal raha downtime.',
        'Sirf tab naya incident jab koi open na ho. Yahi deduplication hai.',
        'alert variable sirf yaad rakhta hai; email transaction ke bahar bheja jaata hai taaki slow email database lock na pakde rahe.',
      ],
    },
  ],
  exercise: {
    title: 'Model the incident state machine as a pure function',
    minutes: 45,
    goal: 'nextState(state, isUp) likho jo { status, incidentOpen, alert } return kare, aur ek sequence of check results pe chala ke alerts ki list print karo.',
    where: 'playground/11-incidents.js',
    input: String.raw`const results = [true, true, false, false, false, true, false, true];
let state = { status: 'UNKNOWN', incidentOpen: false };`,
    output: String.raw`1 UP    alert: none
2 UP    alert: none
3 DOWN  alert: down
4 DOWN  alert: none
5 DOWN  alert: none
6 UP    alert: recovery
7 DOWN  alert: down
8 UP    alert: recovery`,
    steps: [
      'monitorRunner.js lines 51-103 padho aur ek chhota table banao: (isUp, incidentOpen) -> (naya status, alert).',
      'nextState() ko pure function banao: input badlo mat, naya object return karo.',
      'results array pe loop chala ke har step print karo.',
      'Sequence mein ek pause add karke socho: pause hone par incidentOpen ka kya hota hai? (Hint: monitors.js 126-130.)',
    ],
    hints: [
      'Concept: sirf 4 combinations hain: (up, open), (up, not open), (down, open), (down, not open). Har ek ka ek fixed result hai.',
      'Pseudocode: if isUp -> alert = incidentOpen ? "recovery" : "none"; return UP, incidentOpen false. else -> alert = incidentOpen ? "none" : "down"; return DOWN, incidentOpen true.',
      String.raw`Partial code:
function nextState(state, isUp) {
  if (isUp) {
    return { status: 'UP', incidentOpen: false, alert: state.incidentOpen ? 'recovery' : 'none' };
  }
  // down case: ?
}`,
    ],
    explanation: [
      { code: 'if (isUp) {', why: 'monitorRunner line 51: pehla faisla sirf result.isUp pe hota hai.' },
      { code: "alert: state.incidentOpen ? 'recovery' : 'none'", why: 'Recovery alert sirf tab jab koi open incident resolve hua (lines 57-63).' },
      { code: "return { status: 'DOWN', incidentOpen: true, alert: state.incidentOpen ? 'none' : 'down' };", why: 'Naya incident aur down alert sirf jab pehle koi open nahi tha (lines 82-90). Warna chup.' },
      { code: 'state = nextState(state, isUp);', why: 'Pure function purana state nahi badalta; hum naya state variable mein daalte hain. Isse test aasaan hota hai.' },
    ],
  },
  checklist: [
    'Mai 4 combinations ka table bina code dekhe bana sakta hoon',
    'Mai bata sakta hoon ki ek downtime mein sirf ek down alert kyun jaata hai',
    'Mai bata sakta hoon ki pause karne se open incident ka kya hota hai',
    'playground/11-incidents.js expected output deta hai',
    'Mai samjha sakta hoon ki alert transaction ke bahar kyun bheja jaata hai',
  ],
  mistakes: [
    { mistake: 'Har failed check pe naya incident banana', fix: 'Pehle open incident dhundo (resolvedAt null). Mile to kuch naya mat banao.' },
    { mistake: 'Status DOWN ko hi incident samajhna', fix: 'Status monitor pe hai, incident alag table mein. Pause ke baad status PAUSED hai lekin incident open reh sakta hai.' },
    { mistake: 'Email transaction ke andar bhejna', fix: 'Email slow ya fail ho sakta hai. WebWatch pehle data commit karta hai, phir email bhejta hai.' },
    { mistake: 'Sochna ki consecutiveFailures ek threshold lagata hai', fix: 'Code mein ye sirf badhta/reset hota hai. Incident pehle failed run pe hi khulta hai.' },
  ],
  debugging: [
    'Prisma Studio mein Incident table: kisi monitor ke do open incidents (resolvedAt null) dikhein to bug hai.',
    'Backend log mein "[email preview] Down: ..." aur "[email preview] Recovered: ..." lines dekh ke transitions confirm karo (RESEND_API_KEY khaali ho tab).',
    'History panel mein incident "Ongoing" ya "Resolved" dikhta hai; ye resolvedAt pe based hai.',
    'Down alert nahi aaya? Pehle check karo incident pehle se open to nahi tha.',
  ],
  quiz: [
    {
      id: 'incidents-1', kind: 'trace',
      prompt: 'Site 20 minute down rahi (4 scheduled runs fail), phir up. Kitne alerts gaye?',
      options: ['4 down + 1 recovery', '1 down + 1 recovery', 'Sirf 1 recovery', '0'],
      answer: 1,
      explain: 'Pehla fail incident banata hai aur down alert bhejta hai. Agle 3 fails open incident dekh ke chup rehte hain. Up aane par ek recovery.',
      wrong: ['Deduplication ki wajah se baaki fails alert nahi bhejte.', '', 'Down alert pehle fail pe gaya tha.', 'Transitions pe alert jaata hai.'],
    },
    {
      id: 'incidents-2', kind: 'predict',
      prompt: 'Monitor DOWN tha (incident open). User ne Pause kiya, phir Resume, aur agla check up aaya. Kya hoga?',
      options: ['Pause ne incident band kar diya tha, isliye koi alert nahi', 'Resume pe status UNKNOWN, agla up check open incident resolve karega aur recovery alert jaayega', 'Naya incident banega', 'Error aayega'],
      answer: 1,
      explain: 'PATCH route sirf enabled/status/lastCheckedAt badalta hai (lines 126-130). Incident open raha, isliye pehla up check use resolve karta hai.',
      wrong: ['Pause route Incident table ko chhoota hi nahi.', '', 'Up check naya incident nahi banata.', 'Ye normal flow hai.'],
    },
    {
      id: 'incidents-3', kind: 'mcq',
      prompt: 'Naya monitor banaya aur site pehle hi check pe down thi. Kya down alert jaayega?',
      options: ['Nahi, pehle UP hona zaroori hai', 'Haan, POST /api/monitors turant runMonitor chalata hai aur koi open incident nahi, isliye incident + down alert', 'Sirf 3 scheduled runs ke baad', 'Sirf agar billing enabled ho'],
      answer: 1,
      explain: 'monitors.js line 99 creation ke turant baad runMonitor() chalata hai. Down branch UNKNOWN status ka farak nahi karti.',
      wrong: ['Code aisa koi rule nahi rakhta.', '', 'Ek failed run (3 attempts) kaafi hai.', 'Billing ka alert logic se koi lena-dena nahi.'],
    },
    {
      id: 'incidents-4', kind: 'explain',
      prompt: 'Incident logic ko state machine ki tarah 4 rules mein likho.',
      model: 'Up + open incident -> resolve, recovery alert. Up + no incident -> UP, no alert. Down + no incident -> create incident, down alert. Down + open incident -> stay DOWN, no alert.',
      keywords: ['resolve', 'create', 'recovery', 'down'],
    },
  ],
  reflection: 'Kya ek failed run (3 quick attempts, 500 ms gap) incident kholne ke liye kaafi hai? consecutiveFailures ko use karke "2 lagatar failed runs" rule kaise design karoge? (Sirf design likho, production code mat badlo.)',
  commit: 'docs: model WebWatch incident transitions as a state machine',
  resume: [
    'Modeled incident lifecycle as a state machine and verified alert deduplication: one downtime alert and one recovery alert per incident.',
    'Documented edge cases such as incidents staying open across pause and resume.',
  ],
  gaps: ['consecutive-failures-unused', 'no-alert-retry'],
}
