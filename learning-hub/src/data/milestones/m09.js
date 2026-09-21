export default {
  id: 'ssrf',
  number: 9,
  title: 'SSRF and URL security',
  subject: 'Security',
  phase: 'Core backend',
  estMinutes: 200,
  summary: 'Why a monitoring service must refuse private, local and reserved destinations, and how WebWatch enforces that with hostname rules, DNS checks, redirect re-validation and DNS pinning.',
  hinglish: [
    'SSRF ka full form hai Server-Side Request Forgery. Simple bhasha mein: attacker tumhare server se aisi jagah request bhijwata hai jahan wo khud nahi pahunch sakta.',
    'WebWatch ka kaam hi hai "user jo URL de, us pe request bhejo". Agar koi user http://localhost:3001 ya http://169.254.169.254 de de, to WebWatch ka server apne andar ki cheezein ya cloud ki secret metadata padh lega. Isliye har URL pe pehard lagana zaroori hai.',
    'Private IP addresses (jaise 10.x.x.x, 192.168.x.x, 127.0.0.1) andar ke network ke address hain. Internet se unhe koi nahi dekh sakta, lekin server khud dekh sakta hai. 169.254.169.254 cloud metadata endpoint hai: kai cloud providers wahan server ke secret credentials rakhte hain. ipaddr.js is address ko "linkLocal" range batata hai, aur WebWatch sirf "unicast" (normal public) range allow karta hai.',
    'DNS (Domain Name System) internet ki phonebook hai: naam (example.com) ko IP address mein badalta hai. Attacker apna domain bana ke use 127.0.0.1 pe point kar sakta hai. Isliye WebWatch sirf naam nahi, resolve hue saare IPs check karta hai (resolvePublicTarget).',
    'DNS rebinding ek chaalak attack hai: pehli baar DNS public IP deta hai (check pass), doosri baar private IP (asli request andar chali jaati hai). WebWatch isse DNS pinning se rokta hai: jo IP check hua, pinnedAgent() connection ko usi IP pe "pin" kar deta hai. Doosri DNS lookup hoti hi nahi.',
    'Redirect bhi khatarnaak hai: public site 302 de ke http://127.0.0.1 pe bhej sakti hai. Isliye websiteChecker har redirect ke naye URL ko dobara validatePublicUrl() se guzarta hai.',
  ],
  why: 'WebWatch ek "request bhejne wala" product hai, isliye SSRF iska sabse bada security risk hai. Is layer ke bina koi bhi user tumhare server ko apne andar ke network ya cloud secrets padhne ke liye use kar sakta hai.',
  prerequisites: [
    'URL checking (Milestone 8)',
    'IP address kya hota hai (4 numbers, jaise 8.8.8.8)',
    'throw aur try/catch',
  ],
  terms: [
    { term: 'SSRF', meaning: 'Server-Side Request Forgery: attacker tumhare server ko aisi jagah request bhejne pe majboor kare jahan use nahi jaana chahiye.' },
    { term: 'Private IP', meaning: 'Sirf andar ke network ka address (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). Internet se nahi dikhta.' },
    { term: 'localhost / loopback', meaning: '127.0.0.1 ya ::1, matlab "yahi machine". Server pe chal rahi andar ki services yahan milti hain.' },
    { term: 'Metadata endpoint', meaning: '169.254.169.254: kai cloud servers yahan apni secret keys aur config rakhte hain. SSRF ka favourite target.' },
    { term: 'DNS', meaning: 'Naam ko IP address mein badalne wala system, internet ki phonebook.' },
    { term: 'DNS rebinding', meaning: 'Ek hi naam pehle public IP aur baad mein private IP deta hai, taaki check pass ho jaaye par request andar jaaye.' },
    { term: 'DNS pinning', meaning: 'Jo IP check hua, connection usi IP pe karna. Beech mein dobara DNS nahi puchna.' },
    { term: 'Unicast range', meaning: 'ipaddr.js ki category jo normal public address batati hai. Private, loopback, linkLocal alag categories hain.' },
  ],
  flow: [
    'User URL',
    'parseHttpUrl(): only http/https, no user:pass, block localhost/.local/.internal',
    'dns.lookup(all: true)',
    'Every IP must be unicast',
    'pinnedAgent(target)',
    'Request to pinned IP',
    'Redirect? validate again',
  ],
  files: [
    { path: 'Backend/src/services/urlSafety.js', lines: '12-21', note: 'isPublicAddress(): only ipaddr.js "unicast" range is allowed; IPv4-mapped IPv6 is unwrapped first' },
    { path: 'Backend/src/services/urlSafety.js', lines: '39-53', note: 'Protocol allow-list, credential block, blocked names and suffixes' },
    { path: 'Backend/src/services/urlSafety.js', lines: '58-86', note: 'resolvePublicTarget(): checks literal IPs and every DNS answer' },
    { path: 'Backend/src/services/websiteChecker.js', lines: '7-19', note: 'pinnedAgent(): forces the connection to the already-validated IP' },
    { path: 'Backend/src/services/websiteChecker.js', lines: '26-46', note: 'Redirect loop re-runs validatePublicUrl() for every hop' },
    { path: 'Backend/test/urlSafety.test.js', lines: '5-30', note: 'Existing tests for protocols, local names and IP classification' },
    { path: 'Backend/src/routes/monitors.js', lines: '72', note: 'Monitor creation validates the URL before saving it' },
  ],
  examples: [
    {
      title: 'The core rule',
      code: String.raw`function isPublicAddress(address) {
  if (!ipaddr.isValid(address)) return false;
  let parsed = ipaddr.parse(address);
  if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }
  return parsed.range() === 'unicast';
}`,
      notes: [
        'Invalid address ko seedha reject: shak ho to mana karo.',
        '::ffff:127.0.0.1 IPv6 ke kapde pehne 127.0.0.1 hai. Use unwrap karke asli IPv4 check hota hai.',
        'Allow-list approach: sirf "unicast" pass. Private, loopback, linkLocal (169.254.x.x), carrierGradeNat (100.64.x.x), unspecified (0.0.0.0) sab fail.',
      ],
    },
    {
      title: 'DNS pinning',
      code: String.raw`lookup(hostname, options, callback) {
  if (options && options.all) {
    callback(null, [{ address: target.address, family: target.family }]);
    return;
  }
  callback(null, target.address, target.family);
}`,
      notes: [
        'undici connection banate waqt lookup() puchta hai "is naam ka IP kya hai?"',
        'Asli DNS se puchne ke bajaye hum wahi target.address de dete hain jo pehle validate hua tha.',
        'Isse DNS rebinding ka second (private) answer kabhi use hi nahi hota.',
      ],
    },
  ],
  exercise: {
    title: 'Predict and prove the SSRF guard',
    minutes: 45,
    goal: 'Ek playground script likho jo WebWatch ke asli isPublicAddress() aur parseHttpUrl() ko import karke 10 URLs/IPs test kare, aur pehle apni prediction likho.',
    where: 'playground/09-ssrf.js (Backend ke functions sirf import hote hain, badle nahi jaate)',
    input: String.raw`8.8.8.8
127.0.0.1
10.0.0.5
192.168.1.10
169.254.169.254
100.64.0.1
::1
::ffff:127.0.0.1
http://localhost:3000
ftp://example.com`,
    output: String.raw`Har line ke saath: tumhari prediction, asli result, aur match/mismatch.
Sirf 8.8.8.8 allowed hona chahiye.`,
    steps: [
      'Pehle kaagaz pe har input ke liye allowed/blocked predict karo aur reason likho.',
      'playground/09-ssrf.js banao. Backend folder ke functions require karo: require("../Backend/src/services/urlSafety").',
      'IP inputs ke liye isPublicAddress() call karo; URL inputs ke liye parseHttpUrl() ko try/catch mein call karo.',
      'Result print karo aur apni prediction se compare karo.',
      'node playground/09-ssrf.js ko repo root se chalao (urlSafety.js config load nahi karta, isliye JWT_SECRET ki zaroorat nahi).',
    ],
    hints: [
      'Concept: isPublicAddress() true/false return karta hai. parseHttpUrl() galat URL pe throw karta hai, isliye usse try/catch chahiye.',
      'Pseudocode: for each input -> if it starts with a letter and contains "://" treat as URL (try parseHttpUrl, catch -> blocked) else treat as IP (isPublicAddress).',
      String.raw`Partial code:
const { isPublicAddress, parseHttpUrl } = require('../Backend/src/services/urlSafety');
for (const input of inputs) {
  if (input.includes('://')) {
    try { parseHttpUrl(input); console.log(input, 'allowed'); }
    catch (error) { /* ? */ }
  } else {
    // ?
  }
}`,
    ],
    explanation: [
      { code: "const { isPublicAddress, parseHttpUrl } = require('../Backend/src/services/urlSafety');", why: 'Hum production logic ko copy nahi, seedha import karte hain. Isse jo test ho raha hai wahi asli code hai.' },
      { code: "if (input.includes('://')) {", why: 'URL aur raw IP ko alag functions chahiye, isliye pehle pehchano.' },
      { code: 'try { parseHttpUrl(input); ... } catch (error) { console.log(input, "blocked:", error.message); }', why: 'parseHttpUrl galat URL pe UnsafeUrlError throw karta hai. catch mein error.message se asli reason dikhta hai.' },
      { code: "console.log(input, isPublicAddress(input) ? 'allowed' : 'blocked');", why: 'IP ke liye boolean kaafi hai. 169.254.169.254 linkLocal hone ki wajah se blocked aayega.' },
    ],
  },
  checklist: [
    'Mai SSRF ko ek example ke saath samjha sakta hoon (jaise 169.254.169.254)',
    'Mai bata sakta hoon ki sirf hostname check kaafi kyun nahi, DNS answer bhi check karna padta hai',
    'Mai DNS rebinding aur DNS pinning ko apne shabdon mein samjha sakta hoon',
    'Mai bata sakta hoon ki redirect ke baad dobara validation kyun zaroori hai',
    'playground/09-ssrf.js mein meri predictions asli results se compare hui hain',
  ],
  mistakes: [
    { mistake: 'Sirf "localhost" string block karna', fix: 'Attacker 127.0.0.1, ::1, ya apna domain jo 127.0.0.1 pe point kare, use kar sakta hai. IP level pe check karo.' },
    { mistake: 'Block-list banana (sirf 10.x aur 192.168.x block)', fix: 'Naye ranges chhoot jaate hain (100.64.x, 169.254.x). WebWatch allow-list use karta hai: sirf unicast.' },
    { mistake: 'Validate karke phir normal fetch() se dobara DNS karna', fix: 'Beech mein DNS badal sakta hai (rebinding). Validate hua IP hi use karo (pinning).' },
    { mistake: 'Library ko redirects follow karne dena', fix: 'Redirect private IP pe le ja sakta hai. maxRedirections: 0 rakh ke har hop khud validate karo.' },
  ],
  debugging: [
    'Monitor create karte waqt 400 aaye to message padho: "The hostname resolves to a private, local, or reserved address" matlab DNS answer private tha.',
    'dig +short example.com ya nslookup se dekho domain kis IP pe resolve hota hai.',
    'node -e "console.log(require(\'ipaddr.js\').parse(\'169.254.169.254\').range())" se kisi bhi IP ki category dekho (Backend folder se chalao).',
    'Backend tests chalao: urlSafety.test.js ke 4 tests pass hone chahiye (JWT_SECRET set karke, dekho Project Gaps).',
  ],
  quiz: [
    {
      id: 'ssrf-1', kind: 'mcq',
      prompt: 'isPublicAddress("169.254.169.254") kya return karega aur kyun?',
      options: ['true, kyunki ye private range mein nahi', 'false, kyunki ipaddr.js ise linkLocal range batata hai', 'Error throw karega', 'true, kyunki 169 public number hai'],
      answer: 1,
      explain: 'WebWatch sirf "unicast" range allow karta hai. 169.254.x.x linkLocal hai, jahan cloud metadata milta hai.',
      wrong: ['Private ke alawa bhi kai reserved ranges hain; rule allow-list hai.', '', 'Ye valid IP hai, isliye throw nahi hota.', 'Pehla number dekh ke faisla nahi hota.'],
    },
    {
      id: 'ssrf-2', kind: 'trace',
      prompt: 'https://good.example 302 redirect deta hai http://10.0.0.5/admin pe. WebWatch mein kya hoga?',
      options: ['10.0.0.5 pe request chali jaayegi', 'Redirect loop dobara validatePublicUrl() chalata hai, wo throw karta hai, aur result down with error aata hai', 'Status 302 ke saath up save hoga', 'Server crash ho jaayega'],
      answer: 1,
      explain: 'Loop ki har iteration line 27 pe validatePublicUrl(currentUrl) chalati hai. Private IP pe UnsafeUrlError throw hota hai, jo line 62 ke catch mein down result ban jaata hai.',
      wrong: ['maxRedirections: 0 ki wajah se library khud nahi jaati.', '', '302 follow hota hai, save nahi.', 'Error catch hota hai, crash nahi.'],
    },
    {
      id: 'ssrf-3', kind: 'bug',
      prompt: 'Is code mein security bug kya hai?',
      code: String.raw`const { address } = await dns.lookup(host);
if (!isPublicAddress(address)) throw new Error('blocked');
const res = await fetch('https://' + host);`,
      options: ['dns.lookup galat hai', 'fetch dobara DNS karta hai, isliye DNS rebinding se doosra (private) IP mil sakta hai', 'isPublicAddress ulta hai', 'https galat protocol hai'],
      answer: 1,
      explain: 'Check aur asli request alag DNS lookups use karte hain. WebWatch pinnedAgent() se validated IP pin karta hai.',
      wrong: ['dns.lookup theek hai.', '', 'Condition sahi hai.', 'Protocol problem nahi.'],
    },
    {
      id: 'ssrf-4', kind: 'explain',
      prompt: 'DNS pinning ek chhote example se samjhao.',
      model: 'Mai evil.example ko resolve karta hoon, 93.184.216.34 milta hai, check pass. Ab connection banate waqt dobara DNS nahi puchta, seedha 93.184.216.34 pe connect karta hoon. Agar attacker ne ab DNS badal ke 127.0.0.1 kar diya ho, to bhi farak nahi padta.',
      keywords: ['same IP', 'resolve', 'again', 'rebinding'],
    },
  ],
  reflection: 'Terms page kehta hai ki user sirf apni ya authorized sites monitor kare. Code-level SSRF guard ke alawa aur kaunsi (network level) suraksha production mein honi chahiye? (README deployment notes mein ek hint hai.)',
  commit: 'test: add playground checks for SSRF address classification',
  resume: [
    'Analyzed SSRF defenses in an uptime monitor: allow-list IP classification, per-redirect re-validation and DNS pinning against rebinding.',
    'Verified private, loopback, link-local and IPv4-mapped addresses are rejected using the production validation functions.',
  ],
  gaps: ['tests-need-jwt-secret'],
}
