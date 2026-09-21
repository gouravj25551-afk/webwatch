export default {
  id: 'js-foundations',
  number: 1,
  title: 'JavaScript foundations',
  subject: 'JavaScript',
  phase: 'Foundations',
  estMinutes: 240,
  summary: 'The JavaScript building blocks that every WebWatch file is written with: values, functions, arrays, objects, modules, errors and async code.',
  hinglish: [
    'WebWatch ka har backend file JavaScript mein likha hai. Agar variables, functions, arrays aur objects clear nahi hain, to Express ya Prisma ka code sirf "magic" lagega. Isliye hum pehle yahi basics monitoring ke examples se seekhenge.',
    'Variable ek naam wala dabba hai jisme value rakhte hain (const ka matlab dabba dobara assign nahi hoga, let ka matlab ho sakta hai). Function ek reusable machine hai: input andar, result bahar. Array ek list hai (jaise saare check results). Object ek cheez ki details hain (jaise ek check ka isUp, statusCode, responseTimeMs).',
    'filter, map aur reduce array methods hain. filter kuch items rakhta hai, map har item ko badal kar nayi list banata hai, reduce poori list ko ek value mein jod deta hai (jaise total response time).',
    'Promise ek "baad mein milne wala result" hai, jaise network request ka jawab. async/await Promise ko seedhe line-by-line code jaisa padhne layak bana deta hai. try/catch error ko pakadta hai taaki poora program crash na ho.',
  ],
  why: 'WebWatch uptime percentage, response time aur due monitors sab arrays aur objects se hi calculate karta hai. Website check ek network request hai, isliye async/await har jagah hai. Ye samjhe bina monitorRunner.js ya routes/monitors.js padhna mushkil hai.',
  prerequisites: ['Node.js installed (node -v shows v22 or newer)', 'A code editor', 'Ability to run a file with node from the terminal'],
  terms: [
    { term: 'Variable', meaning: 'Naam wala dabba jisme value store hoti hai. const = dobara assign nahi, let = dobara assign ho sakta hai.' },
    { term: 'Function', meaning: 'Code ka reusable tukda. Input (parameters) leta hai aur return se result deta hai.' },
    { term: 'Array', meaning: 'Values ki ordered list, jaise [check1, check2, check3].' },
    { term: 'Object', meaning: 'key: value pairs ka group, jaise { isUp: true, statusCode: 200 }.' },
    { term: 'filter / map / reduce', meaning: 'Array methods: filter = chhaanto, map = har item badlo, reduce = sabko ek value mein jodo.' },
    { term: 'Module', meaning: 'Ek file jo kuch cheezein export karti hai taaki doosri file require/import karke use kar sake.' },
    { term: 'Destructuring', meaning: 'Object ya array se values nikaal kar seedhe variables banana: const { isUp } = check.' },
    { term: 'Promise', meaning: 'Aisa object jo abhi nahi, baad mein result (ya error) dega.' },
    { term: 'async / await', meaning: 'async function hamesha Promise return karta hai; await us Promise ke result ka wait karta hai.' },
    { term: 'try / catch', meaning: 'try mein risky code, catch mein error aane par kya karna hai.' },
    { term: 'JSON', meaning: 'Text format jisme data bheja jaata hai. JSON.stringify object ko text banata hai, JSON.parse text ko object.' },
  ],
  flow: ['Array of checks', 'filter isUp', 'count / length', 'divide and round', 'uptime %'],
  files: [
    { path: 'Backend/src/routes/monitors.js', lines: '15-32', note: 'monitorWithStats: Promise.all, destructuring, spread (...monitor) aur ternary se uptime percentage.' },
    { path: 'Backend/src/routes/monitors.js', lines: '190-192', note: 'History route: checks.filter(check => check.isUp).length se uptime calculate hota hai.' },
    { path: 'Backend/src/services/scheduler.js', lines: '19-24', note: 'filter se due monitors chhaante jaate hain, phir map + Promise.allSettled.' },
    { path: 'Backend/src/services/websiteChecker.js', lines: '73-86', note: 'checkWebsite: async function, for loop, await, early return.' },
    { path: 'Backend/src/config.js', lines: '3-6', note: 'Chhota function numberFromEnv: input string, output number ya fallback.' },
  ],
  examples: [
    {
      title: 'Objects and arrays of checks',
      code: String.raw`const checks = [
  { isUp: true,  statusCode: 200,  responseTimeMs: 120 },
  { isUp: false, statusCode: null, responseTimeMs: 5000 },
]

const upChecks = checks.filter((check) => check.isUp)
console.log(upChecks.length) // 1`,
      notes: [
        'checks ek array hai, har item ek object hai jo ek website check ko represent karta hai.',
        'filter har check par arrow function chalata hai; jo true return kare wahi naye array mein rehta hai.',
        '.length batata hai kitne UP checks mile.',
      ],
    },
    {
      title: 'reduce for total response time',
      code: String.raw`const total = checks.reduce((sum, check) => sum + check.responseTimeMs, 0)
const average = Math.round(total / checks.length)`,
      notes: [
        'reduce ka pehla argument function hai: sum ab tak ka total, check current item.',
        '0 starting value hai. Iske bina khaali array par reduce error deta hai.',
        'Math.round decimal hata deta hai, kyunki ms mein decimal ki zaroorat nahi.',
      ],
    },
    {
      title: 'async/await with try/catch (same shape as WebWatch routes)',
      code: String.raw`async function checkAndLog(url) {
  try {
    const result = await fakeCheck(url)
    console.log(result.isUp ? 'UP' : 'DOWN')
  } catch (error) {
    console.error('Check failed:', error.message)
  }
}`,
      notes: [
        'async lagane se function Promise return karta hai aur andar await use kar sakte hain.',
        'await tab tak rukta hai jab tak fakeCheck ka Promise resolve ya reject na ho.',
        'Reject hone par control catch mein jaata hai. WebWatch routes bhi try/catch mein next(error) call karte hain.',
      ],
    },
  ],
  exercise: {
    title: 'Calculate uptime and average response time',
    minutes: 45,
    goal: 'Write two small functions that turn an array of check objects into an uptime percentage and an average response time, just like monitorWithStats does with database counts.',
    where: 'playground/01-uptime.js (practice folder at the repo root, not production code)',
    input: String.raw`const checks = [
  { isUp: true,  statusCode: 200,  responseTimeMs: 120 },
  { isUp: true,  statusCode: 200,  responseTimeMs: 95 },
  { isUp: false, statusCode: null, responseTimeMs: 5000 },
  { isUp: true,  statusCode: 301,  responseTimeMs: 210 },
]`,
    output: String.raw`Uptime: 75%
Average response time: 1356 ms
Empty uptime: null`,
    steps: [
      'Create playground/01-uptime.js and paste the checks array.',
      'Write calculateUptime(checks) using filter and length. Return null for an empty array.',
      'Write averageResponseTime(checks) using reduce. Return null for an empty array.',
      'Log both results, plus calculateUptime([]).',
      'Run it with: node playground/01-uptime.js',
    ],
    hints: [
      'Uptime = (UP checks / total checks) * 100. filter gives you only the UP checks; .length counts them. Dividing by zero gives NaN, so handle the empty array first.',
      'function calculateUptime(checks):\n  if checks is empty → return null\n  upCount = number of checks where isUp is true\n  return round((upCount / total) * 100, 2 decimals)',
      "function calculateUptime(checks) {\n  if (checks.length === 0) return null\n  const upCount = checks.filter((check) => /* ? */).length\n  return Number(((upCount / checks.length) * 100).toFixed(/* ? */))\n}",
    ],
    explanation: [
      { code: 'if (checks.length === 0) return null', why: 'Bina checks ke uptime "pata nahi" hai, 0% nahi. WebWatch bhi totalChecks 0 hone par null deta hai (monitors.js line 28).' },
      { code: 'const upCount = checks.filter((check) => check.isUp).length', why: 'Sirf UP checks rakho aur gino.' },
      { code: 'return Number(((upCount / checks.length) * 100).toFixed(2))', why: 'toFixed(2) string deta hai, isliye Number() se wapas number banate hain, bilkul WebWatch jaisa.' },
      { code: 'const total = checks.reduce((sum, check) => sum + check.responseTimeMs, 0)', why: 'Saare response times jodo; 0 starting value hai.' },
      { code: 'return Math.round(total / checks.length)', why: 'Average = total / count, round karke integer ms.' },
    ],
  },
  checklist: [
    'playground/01-uptime.js runs with node and prints the expected output',
    'calculateUptime([]) returns null instead of NaN or 0',
    'I used filter and reduce, not a manual for loop',
    'I can point to the line in Backend/src/routes/monitors.js that does the same uptime calculation',
    'I can explain in my own words what await does in checkWebsite',
  ],
  mistakes: [
    { mistake: 'Dividing by checks.length when the array is empty, which prints NaN.', fix: 'Return early with null when checks.length === 0.' },
    { mistake: 'Forgetting the 0 starting value in reduce.', fix: 'Always pass the initial value: reduce(fn, 0). Without it, an empty array throws a TypeError.' },
    { mistake: 'Treating toFixed() output as a number.', fix: 'toFixed returns a string. Wrap it in Number() if you need to compare or do math.' },
    { mistake: 'Calling an async function without await and logging a Promise.', fix: 'If console.log shows Promise { <pending> }, you forgot await.' },
  ],
  debugging: [
    'Add console.log(checks) before the calculation to confirm the data shape.',
    'Log intermediate values: console.log({ upCount, total: checks.length }).',
    'If you see NaN, look for division by zero or an undefined property name (typo like responseTime instead of responseTimeMs).',
    'Read the error line number in the stack trace and open that exact line.',
  ],
  quiz: [
    {
      id: 'js-foundations-1',
      kind: 'predict',
      prompt: 'What does this print?',
      code: String.raw`const checks = [{ isUp: true }, { isUp: false }, { isUp: true }]
console.log(checks.filter((c) => c.isUp).length)`,
      options: ['3', '2', '1', 'true'],
      answer: 1,
      explain: 'filter keeps only the two objects where isUp is true, and .length counts them: 2.',
      wrong: ['3 is the length of the original array, not the filtered one.', '', '1 is the number of DOWN checks.', 'filter returns an array, and .length is a number, not a boolean.'],
    },
    {
      id: 'js-foundations-2',
      kind: 'bug',
      prompt: 'This function prints NaN for a new monitor with no checks. What is the bug?',
      code: String.raw`function uptime(checks) {
  const up = checks.filter((c) => c.isUp).length
  return (up / checks.length) * 100
}`,
      options: ['filter is used wrongly', 'It divides by zero when checks is empty', 'It should use map instead of filter', 'isUp should be a string'],
      answer: 1,
      explain: '0 / 0 is NaN in JavaScript. WebWatch avoids this with a ternary: totalChecks ? ... : null.',
      wrong: ['filter is fine here.', '', 'map would transform items, not select them.', 'isUp is a Boolean in the Check model.'],
    },
    {
      id: 'js-foundations-3',
      kind: 'mcq',
      prompt: 'In monitors.js, why is monitorWithStats awaited with Promise.all(monitors.map(monitorWithStats))?',
      options: ['To run the stats queries for all monitors in parallel and wait for all of them', 'To sort monitors by date', 'Because map cannot be used on arrays', 'To delete old checks'],
      answer: 0,
      explain: 'map returns an array of Promises (one per monitor). Promise.all waits for all of them and returns an array of results.',
      wrong: ['', 'Sorting is done by orderBy in the Prisma query.', 'map works on arrays; that is exactly its purpose.', 'Nothing is deleted here.'],
    },
    {
      id: 'js-foundations-4',
      kind: 'match',
      prompt: 'Match each JavaScript idea to where WebWatch uses it.',
      pairs: [
        { left: 'filter to find due monitors', right: 'Backend/src/services/scheduler.js' },
        { left: 'async function with a retry loop', right: 'Backend/src/services/websiteChecker.js' },
        { left: 'Small helper that reads a number from env', right: 'Backend/src/config.js' },
      ],
      explain: 'scheduler.js filters monitors whose interval elapsed; checkWebsite loops up to 3 attempts; numberFromEnv converts env strings to numbers.',
    },
    {
      id: 'js-foundations-5',
      kind: 'explain',
      prompt: 'In your own words: what is the difference between a Promise and the value you get after await?',
      model: 'A Promise is a placeholder for a result that will arrive later. await pauses the async function until the Promise settles, then gives the actual value (or throws the error).',
      keywords: ['later', 'wait', 'value', 'error'],
    },
  ],
  reflection: 'Which line in monitorWithStats would you change if WebWatch wanted uptime rounded to one decimal place, and why?',
  commit: 'chore(playground): add uptime and average response time practice',
  resume: [
    'Explained how WebWatch calculates 30-day uptime from check records using array methods and async/await.',
    'Wrote and tested small JavaScript utilities for uptime and response-time metrics on realistic monitoring data.',
  ],
}
