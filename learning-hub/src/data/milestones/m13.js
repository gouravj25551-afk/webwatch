export default {
  id: 'notifications',
  number: 13,
  title: 'Notifications',
  subject: 'Notifications',
  phase: 'Product',
  estMinutes: 180,
  summary: 'How WebWatch sends downtime and recovery emails through Resend, what preview mode does, and where the current email code is unsafe or incomplete.',
  hinglish: [
    'Notification ka matlab user ko batana ki kuch hua. WebWatch mein abhi sirf email hai, jo Backend/src/services/emailService.js ka sendAlert() bhejta hai. Do types: "down" (Downtime detected) aur "recovery" (Website recovered).',
    'Resend ek transactional email service hai. Transactional email matlab kisi event pe ek insaan ko bheja gaya email (jaise password reset ya alert), marketing newsletter nahi. Resend ko API key (RESEND_API_KEY) chahiye aur ek verified sender domain, taaki email spam folder mein na jaaye.',
    'Preview mode: agar RESEND_API_KEY khaali hai, to resend null rehta hai aur sendAlert() sirf terminal mein "[email preview] Down: ... -> email" print karta hai. Isse local development mein poora flow bina email bheje test ho jaata hai.',
    'Spam se bachav: alert sirf incident khulne aur band hone pe jaata hai (Milestone 11), har failed check pe nahi. Lekin kuch kamiyan hain jo repository mein verified hain: (1) alertEmail koi bhi address ho sakta hai, verify nahi hota, to koi WebWatch se kisi anjaan ko email bhijwa sakta hai. (2) monitor.name bina escape kiye HTML mein jaata hai. (3) Email fail ho to sirf console.error, koi retry ya delivery log nahi.',
    'Slack, Discord, generic webhooks aur Telegram abhi repository mein nahi hain. Ye sab recommendations hain, jo email solid hone ke baad aani chahiye.',
  ],
  why: 'Monitoring bina alert ke bekaar hai: user ko pata hi nahi chalega. Aur galat alert system (spam, doosron ko email, fake HTML) product ki reputation aur email domain dono ko kharab kar sakta hai.',
  prerequisites: [
    'Incidents state machine (Milestone 11)',
    'Environment variables (Milestone 2)',
    'Template literals aur strings',
  ],
  terms: [
    { term: 'Transactional email', meaning: 'Kisi event ki wajah se ek user ko gaya email, jaise alert ya password reset.' },
    { term: 'Resend', meaning: 'Email bhejne wali service. Code API key se ise bolta hai "ye email bhej do".' },
    { term: 'Sender domain verification', meaning: 'DNS records se prove karna ki tum us domain ke maalik ho, taaki tumhare email trusted hon.' },
    { term: 'Preview mode', meaning: 'WebWatch ka mode jahan email bheja nahi jaata, sirf terminal mein print hota hai (RESEND_API_KEY khaali ho tab).' },
    { term: 'HTML escaping', meaning: 'Special characters (<, >, &, ", \') ko safe form mein badalna, taaki user ka text HTML code na ban jaaye.' },
    { term: 'Verified recipient', meaning: 'Email address jiske maalik ne confirm kiya ho ki wo alerts chahta hai (jaise confirmation link click karke).' },
    { term: 'Delivery log', meaning: 'Database record ki kaunsa alert kab, kise, kis result ke saath gaya. Abhi WebWatch mein nahi hai.' },
    { term: 'Webhook', meaning: 'Ek URL jis pe tumhara server event hone par data POST karta hai. Slack/Discord alerts aise hi kaam karte hain.' },
  ],
  flow: [
    'Incident opened or resolved',
    'Transaction committed',
    'sendAlert({ type, monitor, result, incident })',
    'RESEND_API_KEY empty? print preview',
    'Else resend.emails.send()',
    'Error? throw',
    'monitorRunner logs failure',
  ],
  files: [
    { path: 'Backend/src/services/emailService.js', lines: '4', note: 'resend client only exists when RESEND_API_KEY is set' },
    { path: 'Backend/src/services/emailService.js', lines: '6-19', note: 'emailTemplate(): monitor.name and monitor.url are inserted into HTML without escaping' },
    { path: 'Backend/src/services/emailService.js', lines: '21-49', note: 'sendAlert(): subject, message, preview mode, Resend call' },
    { path: 'Backend/src/services/monitorRunner.js', lines: '106-112', note: 'Alert delivery failure is caught and only logged' },
    { path: 'Backend/src/routes/monitors.js', lines: '76-83', note: 'alertEmail accepted from the request, only regex-validated' },
    { path: 'Backend/src/config.js', lines: '15-16', note: 'RESEND_API_KEY and ALERT_FROM (default onboarding@resend.dev)' },
  ],
  examples: [
    {
      title: 'Preview mode',
      code: String.raw`const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
// ...
if (!resend) {
  console.log('[email preview] ' + subject + ' -> ' + monitor.alertEmail);
  return { preview: true };
}`,
      notes: [
        'Key nahi to client banta hi nahi. Local development mein koi email accidentally nahi jaata.',
        'Asli code template literal use karta hai; yahan concatenation se same idea dikhaya hai.',
        'return { preview: true } se caller ko pata chalta hai email sach mein nahi gaya.',
      ],
    },
    {
      title: 'Why escaping matters',
      code: String.raw`// monitor.name comes from the user:
const name = '<a href="https://evil.example">Reset your password</a>';
// emailTemplate puts it inside <h1> as-is, so the email shows a real link.`,
      notes: [
        'User ne jo naam likha wo HTML ban ke email mein render hota hai.',
        'alertEmail bhi user decide karta hai, to ye email kisi aur ke inbox mein WebWatch ke naam se ja sakta hai.',
        'Fix idea (recommendation): naam escape karo, aur alertEmail ko confirmation link se verify karo.',
      ],
    },
  ],
  exercise: {
    title: 'Write and test an HTML escape helper',
    minutes: 40,
    goal: 'escapeHtml(text) likho aur dikhao ki ek malicious monitor name email HTML mein plain text ban jaata hai. Production emailService.js mat badlo; ye practice hai.',
    where: 'playground/13-escape.js',
    input: String.raw`const names = [
  'My Portfolio',
  '<b>Bold</b>',
  '<a href="https://evil.example">Click</a>',
  'Tom & Jerry',
];`,
    output: String.raw`My Portfolio
&lt;b&gt;Bold&lt;/b&gt;
&lt;a href=&quot;https://evil.example&quot;&gt;Click&lt;/a&gt;
Tom &amp; Jerry`,
    steps: [
      'emailService.js lines 6-19 padho aur list banao ki kaunse values user se aati hain.',
      'escapeHtml(text) likho jo & < > " \' ko entities mein badle.',
      '& ko sabse pehle replace karo (socho kyun).',
      'Har name ka escaped output print karo aur expected se match karo.',
      'Ek paragraph likho: production mein ye helper kahan lagana chahiye aur alertEmail ke liye aur kya chahiye.',
    ],
    hints: [
      'Concept: browser/email client "<" dekh ke tag shuru maanta hai. "&lt;" dekh ke sirf "<" character dikhata hai.',
      'Pseudocode: String(text) -> replace all & with &amp; -> < with &lt; -> > with &gt; -> " with &quot; -> \' with &#39;.',
      String.raw`Partial code:
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    // ?
}`,
    ],
    explanation: [
      { code: 'String(text)', why: 'Agar number ya null aaye to bhi string methods chalein.' },
      { code: ".replaceAll('&', '&amp;')", why: 'Pehle &, warna baad mein bane &lt; ka & dobara &amp;lt; ban jaayega.' },
      { code: ".replaceAll('<', '&lt;').replaceAll('>', '&gt;')", why: 'Tags banne se rokta hai.' },
      { code: ".replaceAll('\"', '&quot;').replaceAll(\"'\", '&#39;')", why: 'Attribute (jaise href="...") ke andar quote tod ke naya attribute banne se rokta hai.' },
    ],
  },
  checklist: [
    'Mai preview mode aur real Resend mode ka farak bata sakta hoon',
    'Mai bata sakta hoon ki ek downtime mein kitne emails jaate hain',
    'Mai emailService.js ki do verified security kamiyan samjha sakta hoon',
    'playground/13-escape.js expected output deta hai',
    'Mai clear bata sakta hoon ki Slack/Discord/webhooks abhi repo mein nahi hain',
  ],
  mistakes: [
    { mistake: 'RESEND_API_KEY frontend mein daalna', fix: 'Key sirf Backend/.env ya hosting env vars mein. README bhi yahi kehta hai.' },
    { mistake: 'Unverified domain se production email bhejna', fix: 'Resend mein domain verify karo aur ALERT_FROM usi domain ka rakho.' },
    { mistake: 'User text ko seedha HTML template mein daalna', fix: 'Pehle escape karo.' },
    { mistake: 'Email fail hone ko ignore karna', fix: 'Abhi sirf log hota hai. Delivery log table aur retry ek recommendation hai.' },
  ],
  debugging: [
    'Email nahi aaya? Backend log mein "[email preview]" hai to RESEND_API_KEY set nahi.',
    '"Resend email failed: ..." log hai to Resend dashboard mein domain aur API key status dekho.',
    '"Alert delivery failed for monitor ..." ka matlab incident save ho gaya, sirf email fail hua; dobara nahi bheja jaayega.',
    'Down alert expected tha par nahi aaya? Pehle dekho koi open incident pehle se tha ya nahi.',
  ],
  quiz: [
    {
      id: 'notifications-1', kind: 'mcq',
      prompt: 'RESEND_API_KEY khaali hai aur site down ho gayi. Kya hoga?',
      options: ['Error aayega aur incident save nahi hoga', 'Incident save hoga aur terminal mein "[email preview] Down: ..." print hoga', 'Email onboarding@resend.dev se chala jaayega', 'Kuch nahi hoga'],
      answer: 1,
      explain: 'resend null hai, isliye sendAlert() preview print karke return karta hai. Incident transaction pehle hi commit ho chuka hai.',
      wrong: ['Preview mode error nahi deta.', '', 'Bina key ke Resend call hota hi nahi.', 'Preview line print hoti hai.'],
    },
    {
      id: 'notifications-2', kind: 'bug',
      prompt: 'Is template mein security problem kya hai?',
      code: String.raw`<h1 style="font-size:22px;margin:0 0 12px">${'$'}{monitor.name}</h1>`,
      options: ['Font size galat hai', 'monitor.name user se aata hai aur bina escape HTML mein jaata hai', 'h1 email mein kaam nahi karta', 'Koi problem nahi'],
      answer: 1,
      explain: 'User naam mein HTML (jaise fake link) daal sakta hai. Escape karna chahiye.',
      wrong: ['Style security issue nahi.', '', 'h1 kaam karta hai.', 'User input HTML mein ja raha hai.'],
    },
    {
      id: 'notifications-3', kind: 'trace',
      prompt: 'Resend ne error lautaya. Error kahan tak jaata hai?',
      options: ['User ke browser tak 500 ke roop mein', 'sendAlert throw karta hai, monitorRunner catch karke console.error karta hai, check aur incident saved rehte hain', 'Transaction rollback hota hai', 'Worker crash hota hai'],
      answer: 1,
      explain: 'monitorRunner.js lines 106-112: try/catch sirf log karta hai. Email transaction ke baad hai, isliye rollback nahi hota.',
      wrong: ['Background flow mein browser shamil nahi.', '', 'Transaction pehle commit ho chuka.', 'Error catch hota hai.'],
    },
    {
      id: 'notifications-4', kind: 'explain',
      prompt: 'Koi bhi alertEmail allow karna abuse kaise ban sakta hai, aur ek fix kya hoga?',
      model: 'Attacker monitor bana ke alertEmail mein kisi aur ka address daal de aur ek down site use kare. WebWatch us insaan ko bina permission emails bhejega, jisse spam complaints aur domain reputation kharab hogi. Fix: alertEmail pe confirmation link bhejo aur verify hone tak alerts mat bhejo, ya sirf account ka verified email allow karo.',
      keywords: ['verify', 'spam', 'confirm', 'reputation'],
    },
  ],
  reflection: 'Slack ya Discord add karne se pehle email mein kaunsi 3 cheezein theek honi chahiye? Webhook URL database mein plain text rakhna kyun risky hai?',
  commit: 'test: add playground HTML escaping helper for alert emails',
  resume: [
    'Audited transactional alert emails in an uptime monitor and identified unescaped user input and unverified recipients as abuse risks.',
    'Documented alert deduplication, preview mode and delivery-failure behaviour for downtime and recovery notifications.',
  ],
  gaps: ['alert-email-unverified', 'email-html-unescaped', 'no-alert-retry', 'no-email-verification', 'logging-console-only'],
}
