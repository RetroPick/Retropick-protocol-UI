import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const directory = process.argv[2];
if (!directory) throw new Error('Usage: node e2e/tools/summarize-resume.mjs <evidence directory>');
const report = JSON.parse(readFileSync(join(directory,'results.json'),'utf8'));
const cases = [];
function visit(suite) {
  for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
    const result = test.results.at(-1);
    cases.push({ title:spec.title,project:test.projectName,result:result?.status === 'passed' ? 'PASS' : result?.status === 'skipped' ? 'SKIP' : 'FAIL',
      retry:result?.retry ?? 0,durationMs:result?.duration ?? 0,
      reasons:(test.annotations ?? []).filter(a=>a.type==='skip').map(a=>a.description || 'Intentional viewport-specific applicability skip; see spec condition'),
      errors:(result?.errors ?? []).map(e=>e.message?.replace(/https?:\/\/[^\s]+/g,'[source]')) });
  }
  for (const child of suite.suites ?? []) visit(child);
}
report.suites.forEach(visit);
const observed = readdirSync(join(directory,'observed')).map(file=>JSON.parse(readFileSync(join(directory,'observed',file),'utf8')));
const summary = { stats:report.stats,counts:cases.reduce((sum,c)=>{sum[c.result]++;return sum;},{PASS:0,FAIL:0,SKIP:0}),
  appConsoleErrors:observed.reduce((n,r)=>n+r.appConsoleErrors.length,0),uncaughtPageErrors:observed.reduce((n,r)=>n+r.pageErrors.length,0),
  signingBroadcastViolations:observed.reduce((n,r)=>n+r.guardViolations.length,0),
  screenshots:readdirSync(join(directory,'screenshots'),{recursive:true}).filter(file=>file.endsWith('.png')).length,cases };
writeFileSync(join(directory,'verdicts.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,cases:undefined},null,2));
