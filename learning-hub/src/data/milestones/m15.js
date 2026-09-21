export default {
  id: 'testing',
  number: 15,
  title: 'Testing and debugging',
  subject: 'Testing',
  phase: 'Product',
  estMinutes: 180,
  summary: 'Read and run the real WebWatch tests, write new failure-case tests, and learn to debug from stack traces and logs instead of guessing.',
  hinglish: [
    'Test ek chhota program hai jo tumhare code ko chala kar check karta hai ki result sahi hai ya nahi. Aaj code sahi hai, lekin kal koi change use tod sakta hai. Test us din tumhe turant bata dega.',
    'Unit test ek chhote function ko akela test karta hai, jaise parseHttpUrl(). Integration test kai hisson ko saath mein test karta hai, jaise Express route + Prisma + database. WebWatch mein abhi sirf unit tests hain.',
    'Debugging ka matlab hai bug ki asli wajah dhoondhna. Tareeka: pehle bug ko dobara paida karo (reproduce), phir error message aur stack trace padho, phir ek-ek hypothesis test karo. Andaaze se code badalna debugging nahi hai.',
  ],
  why: 'WebWatch SSRF protection aur payment verification jaise sensitive code chalata hai. Agar koi refactor galti se localhost allow kar de, to security hole ban jaata hai. Tests aisi galti ko merge hone se pehle pakadte hain. Aur jab production mein monitor fail hota hai, tumhe logs padh kar wajah dhoondhni padegi.',
  prerequisites: [
    'Functions, try/catch aur modules (Milestone 1-2)',
    'urlSafety.js ka parseHttpUrl aur isPublicAddress (Milestone 9)',
    'Terminal mein npm commands chalana',
  ],
  terms: [
    { term: 'Unit test', meaning: 'Ek function ko akela, bina database ya network ke, test karna.' },
    { term: 'Integration test', meaning: 'Kai hisson ko saath mein test karna, jaise HTTP request se route tak aur database tak.' },
    { term: 'Assertion', meaning: 'Test ke andar ek dava: "yeh value itni honi chahiye". Galat nikli to test fail.' },
    { term: 'node:test', meaning: 'Node.js ka built-in test runner. WebWatch isi ko use karta hai, koi extra library nahi (Jest ya Mocha nahi).' },
    { term: 'Mock', meaning: 'Asli cheez ki jagah nakli cheez, jaise asli network call ki jagah ek function jo fixed result de.' },
    { term: 'Stack trace', meaning: 'Error ke saath aane wali list jo batati hai error kis file ki kis line par, aur kis function ke through wahan pahuncha.' },
    { term: 'Reproduce', meaning: 'Bug ko jaan boojh kar dobara paida karna, taaki pakka ho ki fix ne sach mein kaam kiya.' },
  ],
  flow: [
    'npm test',
    'node --test finds Backend/test/*.test.js',
    'require() loads source modules',
    'test() blocks run',
    'assert passes or throws',
    'Summary: pass / fail counts',
  ],
  files: [
    { path: 'Backend/package.json', lines: '10', note: '"test": "node --test" — built-in runner, no extra library' },
    { path: 'Backend/test/urlSafety.test.js', lines: '1-29', note: 'Unit tests for parseHttpUrl and isPublicAddress' },
    { path: 'Backend/test/dodoPayments.test.js', lines: '1-28', note: 'Unit tests for webhook verifier and assertPaymentMatches' },
    { path: 'Backend/src/config.js', lines: '26-28', note: 'Throws if JWT_SECRET is missing — this is why dodoPayments tests fail without it' },
    { path: 'Backend/src/middleware/errorHandler.js', lines: '1-14', note: 'Logs 500 errors with console.error, hides details from the client' },
  ],
  examples: [
    {
      title: 'A real test from Backend/test/urlSafety.test.js',
      code: String.raw`const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicAddress, parseHttpUrl } = require('../src/services/urlSafety');

test('rejects local hostnames', () => {
  assert.throws(() => parseHttpUrl('http://localhost:3000'));
  assert.throws(() => parseHttpUrl('http://service.internal'));
});`,
      notes: [
        'node:test — Node ka built-in test function.',
        'assert/strict — strict comparison wale assertions.',
        'require source module — test asli production function ko hi chalata hai.',
        'assert.throws(() => ...) — function ko arrow function mein lapet kar do, taaki assert khud use chala kar error pakad sake.',
      ],
    },
    {
      title: 'Why npm test fails without JWT_SECRET',
      code: String.raw`# In Backend/
npm test
# dodoPayments.test.js -> requires ../src/services/dodoPayments
#   -> requires ../config
#   -> throw new Error('JWT_SECRET must be at least 32 characters long.')

JWT_SECRET="$(node -e "console.log('x'.repeat(40))")" npm test
# tests 7, pass 7`,
      notes: [
        'config.js module load hote hi JWT_SECRET check karta hai.',
        'Test file ne sirf dodoPayments require kiya, lekin require chain config tak pahunchi.',
        'Fix option (recommendation, repo mein nahi): test ke liye dummy secret set karo, ya config ko lazy load karo. Asli secret kabhi test mein mat daalo.',
      ],
    },
  ],
  exercise: {
    title: 'Add three SSRF failure-case tests',
    minutes: 45,
    goal: 'urlSafety ke liye teen naye tests likho jo abhi tak cover nahi hain: cloud metadata IP, IPv4-mapped IPv6 localhost, aur javascript: protocol.',
    where: 'A local branch (git switch -c learn/url-tests), new file Backend/test/urlSafety.extra.test.js. Do not push it without review.',
    steps: [
      'Local branch banao: git switch -c learn/url-tests',
      'Backend/test/urlSafety.test.js padho aur same imports copy karo.',
      "Test 1: isPublicAddress('169.254.169.254') false hona chahiye (cloud metadata).",
      "Test 2: isPublicAddress('::ffff:127.0.0.1') false hona chahiye.",
      "Test 3: parseHttpUrl('javascript://alert(1)') throw kare aur message 'Only HTTP and HTTPS URLs are allowed' ho.",
      'JWT_SECRET ke saath npm test chalao aur pass/fail count note karo.',
      'Jaan boojh kar ek assertion galat karo (true likho), test fail hote dekho, stack trace padho, phir wapas theek karo.',
    ],
    output: String.raw`ℹ tests 10
ℹ pass 10
ℹ fail 0`,
    hints: [
      'Concept: har test ek sawaal hai — "agar main yeh input doon, to kya hona chahiye?" Security tests mein hum khaas taur par woh inputs dete hain jo attacker bhejega.',
      'Pseudocode: import test, assert, functions -> test("blocks metadata IP", () => assert.equal(isPublicAddress(...), false)) -> same for mapped IPv6 -> test("rejects javascript protocol", () => assert.throws(() => parseHttpUrl(...), /Only HTTP/)).',
      String.raw`Partial:
const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicAddress, parseHttpUrl } = require('../src/services/urlSafety');

test('blocks cloud metadata address', () => {
  assert.equal(isPublicAddress('169.254.169.254'), /* ? */);
});
// write the other two tests yourself`,
    ],
    explanation: [
      { code: "require('../src/services/urlSafety')", why: 'Test asli production function ko test kare, copy ko nahi.' },
      { code: "assert.equal(isPublicAddress('169.254.169.254'), false)", why: 'Yeh cloud metadata IP linkLocal range mein hai; isPublicAddress sirf unicast allow karta hai.' },
      { code: "assert.equal(isPublicAddress('::ffff:127.0.0.1'), false)", why: 'IPv4-mapped IPv6 address ko function IPv4 mein badal kar check karta hai; localhost chhup kar nahi nikal sakta.' },
      { code: "assert.throws(() => parseHttpUrl('javascript://alert(1)'), /Only HTTP/)", why: 'Sirf http aur https allowed hain. Regex /Only HTTP/ pakka karta hai ki error protocol check se aaya, kisi aur wajah se nahi. (javascript:alert(1) bina // ke bhi fail hota hai, lekin "Please enter a valid URL" message ke saath.)' },
    ],
  },
  checklist: [
    'npm test bina JWT_SECRET ke chalaya aur explain kar sakta hoon ki kyun fail hua.',
    'Teen naye tests likhe aur sab pass hue (dummy JWT_SECRET ke saath).',
    'Ek test jaan boojh kar fail kiya aur stack trace mein file aur line dhoondhi.',
    'Unit test aur integration test ka fark ek WebWatch example ke saath bata sakta hoon.',
    'Bata sakta hoon ki WebWatch mein kaunse important hisson ke tests nahi hain (routes, monitorRunner, auth).',
  ],
  mistakes: [
    { mistake: 'assert.throws(parseHttpUrl("ftp://x")) likhna', fix: 'Function ko call kar ke nahi, arrow function mein lapet kar do: assert.throws(() => parseHttpUrl("ftp://x")). Warna error assert tak pahunchne se pehle hi test crash kar dega.' },
    { mistake: 'Test mein asli JWT_SECRET ya API key daalna', fix: 'Sirf dummy values use karo. Secrets kabhi test files ya commits mein nahi jaane chahiye.' },
    { mistake: 'Sirf "happy path" test karna', fix: 'Security code ke liye sabse zaroori tests woh hain jo galat input reject karte hain.' },
    { mistake: 'Test pass hone ka matlab bug-free samajhna', fix: 'Test sirf wahi check karta hai jo tumne likha. Test pehle fail karke dekho (red), phir pass (green) — tab bharosa karo.' },
  ],
  debugging: [
    'Error message ki pehli line padho, phir stack trace mein pehli line dhoondo jo tumhari apni file (Backend/src/...) ki ho, node_modules ki nahi.',
    'Bug reproduce karo sabse chhote input ke saath, jaise ek single node -e command.',
    'console.log lagao lekin kabhi password, cookie ya API key log mat karo.',
    'Prisma data dekhne ke liye npm run prisma:studio (Backend) use karo, SQL guess mat karo.',
  ],
  quiz: [
    {
      id: 'testing-1', kind: 'mcq',
      prompt: 'Backend mein bina .env ke npm test chalane par dodoPayments tests kyun fail hote hain?',
      options: ['Dodo API band hai', 'config.js load hote hi JWT_SECRET na hone par throw karta hai', 'node --test purana hai', 'Database connect nahi hua'],
      answer: 1,
      explain: 'Test file dodoPayments.js require karti hai, jo config.js require karta hai, aur config.js line 26-28 JWT_SECRET check karke throw karti hai.',
      wrong: ['Tests koi network call nahi karte.', '', 'node --test Node 22 mein built-in aur stable hai.', 'In tests mein database use hi nahi hota.'],
    },
    {
      id: 'testing-2', kind: 'predict',
      prompt: 'Is test ka result kya hoga?',
      code: String.raw`test('metadata blocked', () => {
  assert.equal(isPublicAddress('169.254.169.254'), true);
});`,
      options: ['Pass', 'Fail — function false return karta hai', 'Syntax error', 'Test skip ho jaata hai'],
      answer: 1,
      explain: '169.254.169.254 linkLocal range hai, isPublicAddress false deta hai. Assertion true expect kar raha hai, isliye fail.',
      wrong: ['Function ki asli value false hai.', '', 'Code syntax sahi hai.', 'Skip ke liye test.skip likhna padta.'],
    },
    {
      id: 'testing-3', kind: 'bug',
      prompt: 'Is test mein kya galat hai?',
      code: String.raw`test('rejects ftp', () => {
  assert.throws(parseHttpUrl('ftp://example.com'));
});`,
      options: ['ftp allowed hai', 'Function turant call ho jaata hai; arrow function mein lapetna chahiye', 'assert.throws exist nahi karta', 'test() ko async hona chahiye'],
      answer: 1,
      explain: 'parseHttpUrl pehle hi throw kar deta hai, assert.throws ko function milta hi nahi. Sahi: assert.throws(() => parseHttpUrl(...)).',
      wrong: ['Code sirf http aur https allow karta hai.', '', 'assert.throws node:assert ka part hai.', 'parseHttpUrl synchronous hai.'],
    },
    {
      id: 'testing-4', kind: 'match',
      prompt: 'Har test type ko sahi WebWatch example se jodo:',
      pairs: [
        { left: 'Unit test', right: 'isPublicAddress("8.8.8.8") returns true' },
        { left: 'Integration test', right: 'POST /api/monitors with a real test database' },
        { left: 'Mock', right: 'Replace checkWebsite with a function returning isUp: false' },
      ],
      explain: 'Unit = akela function. Integration = route + database saath. Mock = asli network ki jagah nakli result, taaki monitorRunner ka incident logic bina internet ke test ho.',
    },
    {
      id: 'testing-5', kind: 'explain',
      prompt: 'monitorRunner.js ke liye pehla test kaunsa likhoge aur kya mock karoge?',
      model: 'Main test karunga ki fail result par naya incident banta hai aur doosre fail par duplicate incident nahi banta. checkWebsite ko mock karunga taaki network na lage, aur sendAlert ko mock karke count karunga ki alert sirf ek baar gaya. Database ke liye test database chahiye.',
      keywords: ['incident', 'mock', 'checkWebsite', 'sendAlert', 'duplicate'],
    },
  ],
  reflection: 'Ek aisa WebWatch bug socho jo production mein users ko nuksaan pahunchayega lekin abhi koi test use nahi pakadta. Kaunsa test use pakdega?',
  commit: 'test: cover metadata IP, mapped IPv6 and non-HTTP protocols in URL safety',
  resume: [
    'Extended the Node.js built-in test suite for SSRF protection with failure-case tests for cloud metadata and IPv4-mapped IPv6 addresses.',
    'Diagnosed a test-environment failure caused by eager configuration validation and documented a safe workaround.',
  ],
  gaps: ['tests-need-jwt-secret', 'few-tests', 'logging-console-only'],
}
