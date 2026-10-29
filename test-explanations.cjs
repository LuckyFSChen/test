const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=process.argv[2]||__dirname;
const bank=JSON.parse(fs.readFileSync(path.join(base,'questions.json'),'utf8'));
const C=require(path.join(base,'core.js'));
const fake={innerHTML:'',hidden:true,textContent:'',addEventListener(){}};
const ctx=vm.createContext({window:{QUESTION_BANK:bank,PracticeCore:C,addEventListener(){},scrollTo(){}},document:{querySelector:()=>fake},localStorage:{getItem:()=>null,setItem(){}},location:{hash:'#home'},structuredClone,console,Date,Map,Set,Blob,URL,setTimeout});
vm.runInContext(fs.readFileSync(path.join(base,'explanations.js'),'utf8'),ctx);
const data=ctx.window.QUESTION_EXPLANATIONS;
assert.equal(Object.keys(data).length,bank.length,'Every question must have exactly one explanation');
const counts={},flags=[];
for(const q of bank){const e=data[q.id];assert.ok(e,q.id);assert.ok(e.explanation.length>=60,q.id+' explanation too short');assert.ok(e.sources.length,q.id+' missing sources');assert.equal(e.verifiedAt,'2026-10-30');for(const s of e.sources){assert.ok(s.title);assert.equal(new URL(s.url).protocol,'https:');}counts[q.subject]=(counts[q.subject]||0)+1;if(e.caveat)flags.push(q.id);}
vm.runInContext(fs.readFileSync(path.join(base,'app.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
for(const q of bank){for(let offset=0;offset<4;offset++){const order=[0,1,2,3].map(i=>(i+offset)%4),x={id:q.id,order,selected:q.answer,correct:true};const html=run(`reviewRow(${JSON.stringify(x)},0)`);assert.ok(html.includes(`標準答案：${'ABCD'[order.indexOf(q.answer)]}`),q.id+' shuffled label');assert.ok(html.includes('解題說明'),q.id+' render');}}
run("state.profiles.default.active=C.create(bank,'exam');");
assert.ok(!run('practice()').includes('解題說明'),'Do not reveal explanation in test');
assert.ok(run("library('q0517')").includes('法規差異／題目疑義'));
run("location.hash='#explanations/q0517';render();");assert.ok(fake.innerHTML.includes('q0517'));assert.ok(!fake.innerHTML.includes('找不到這道題目'));
run("location.hash='#explanations/unknown';render();");assert.ok(fake.innerHTML.includes('找不到這道題目'));
run("libraryFilter={subject:'',term:'q0517',flagged:false,page:0}");assert.ok(run('library()').includes('共 1 題'));
run("libraryFilter={subject:'契稅條例',term:'',flagged:false,page:0}");assert.ok(run('library()').includes('共 30 題'));
run("libraryFilter={subject:'',term:'no-such-question-abcdef',flagged:false,page:20}");assert.ok(run('library()').includes('沒有符合條件'));assert.equal(run('libraryFilter.page'),0);
run("libraryFilter={subject:'',term:'',flagged:true,page:0}");assert.ok(run('library()').includes(`共 ${flags.length} 題`));
const before=run('JSON.stringify(state)');run('library();libraryQuestion(bank[0]);explanationBlock(bank[0]);');assert.equal(run('JSON.stringify(state)'),before,'Reading must not mutate user history/progress');
run("explanations.q0001={explanation:'<script>alert(1)</script>',sources:[{title:'bad',url:'javascript:alert(1)'}],caveat:'<img onerror=x>',verifiedAt:'2026-10-30'}");const escaped=run('explanationBlock(bank[0])');assert.ok(escaped.includes('&lt;script&gt;'));assert.ok(!escaped.includes('javascript:'));assert.ok(!escaped.includes('<img'));
console.log(JSON.stringify({status:'PASS',questions:bank.length,bySubject:counts,caveatCount:flags.length,checks:['Complete coverage and HTTPS sources','3952 shuffled answer-label render checks','No in-exam explanation reveal','Search, subject filter, caveat filter, empty results and paging','History/progress unchanged when reading','HTML escaping and unsafe source URL rejection']},null,2));
