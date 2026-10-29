(function(root){
'use strict';
const VERSION='52604c7bc20b07d7';
function shuffle(items, rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const modes={exam:'全科模擬考',balanced:'各章節抽題',chapter:'單一章節練習',review:'全部錯題練習',chapterReview:'章節錯題練習'};
function isExam(s){return ['exam','balanced'].includes(s.mode)&&s.items.length===100;}
function create(bank,mode='exam',wrong={},rng=Math.random,config={}){
 if(!Object.hasOwn(modes,mode))throw Error('不支援的練習模式');
 let pool=bank,selected,requested=100;
 const scoped=['chapter','chapterReview'].includes(mode);
 if(scoped){if(!config.subject)throw Error('請選擇科目');pool=pool.filter(q=>q.subject===config.subject&&(!config.subchapter||q.subchapter===config.subchapter));}
 if(['review','chapterReview'].includes(mode))pool=pool.filter(q=>wrong[q.id]);
 if(!pool.length)throw Error('所選範圍目前沒有可練習題目');
 if(mode==='balanced'){
  const subjects=[...new Set(bank.map(q=>q.subject))];requested=subjects.length*10;
  selected=shuffle(subjects.flatMap(s=>shuffle(bank.filter(q=>q.subject===s),rng).slice(0,10)),rng);
 }else{
  requested=mode==='exam'?100:mode==='chapter'?(config.count==='all'?pool.length:Number(config.count||10)):pool.length;
  if(!Number.isInteger(requested)||requested<1)throw Error('題數必須為正整數');
  selected=shuffle(pool,rng).slice(0,requested);
 }
 return {id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),mode,subject:scoped?config.subject:null,subchapter:scoped?(config.subchapter||null):null,requested,startedAt:new Date().toISOString(),index:0,items:selected.map(q=>({id:q.id,order:shuffle([0,1,2,3],rng),selected:null}))};
}
function grade(session,bank){const map=new Map(bank.map(q=>[q.id,q]));const rows=session.items.map(x=>({...x,correct:x.selected===map.get(x.id).answer})); const score=rows.filter(x=>x.correct).length;return {...session,items:rows,score,total:rows.length,passed:isExam(session)?score>=60:null,finishedAt:new Date().toISOString()};}
function complete(profile,bank){const result=grade(profile.active,bank);const wrong={...profile.wrong};for(const x of result.items){if(!x.correct)wrong[x.id]=(wrong[x.id]||0)+1;else delete wrong[x.id];}return {...profile,active:null,wrong,history:[result,...profile.history]};}
function fresh(){return {version:VERSION,revision:0,current:'default',profiles:{default:{name:'我的練習',active:null,wrong:{},history:[]}}};}
function validate(data,bank){
 const ids=new Set(bank.map(q=>q.id));const map=new Map(bank.map(q=>[q.id,q]));
 const fail=()=>{throw Error('備份格式、題庫版本或資料內容不正確');};
 if(!data||data.version!==VERSION||!Number.isInteger(data.revision)||!data.profiles||!Object.hasOwn(data.profiles,data.current))fail();
 for(const p of Object.values(data.profiles)){
  if(typeof p.name!=='string'||p.name.length>60||!Array.isArray(p.history)||!p.wrong||typeof p.wrong!=='object')fail();
  for(const [id,n] of Object.entries(p.wrong))if(!ids.has(id)||!Number.isInteger(n)||n<1)fail();
  for(const s of [...p.history,...(p.active?[p.active]:[])]){
   if(!Object.hasOwn(modes,s.mode)||typeof s.id!=='string'||!Array.isArray(s.items)||!s.items.length||s.items.length>bank.length||!Number.isInteger(s.index)||s.index<0||s.index>=s.items.length||!Number.isFinite(Date.parse(s.startedAt)))fail();
   if(s.mode==='exam'&&s.items.length!==Math.min(100,bank.length))fail();
   if(new Set(s.items.map(x=>x.id)).size!==s.items.length)fail();
   for(const x of s.items)if(!ids.has(x.id)||!Array.isArray(x.order)||x.order.length!==4||[...x.order].sort().join('')!=='0123'||!(x.selected===null||Number.isInteger(x.selected)&&x.selected>=0&&x.selected<4))fail();
   if(['chapter','chapterReview'].includes(s.mode)&&(!s.subject||s.items.some(x=>map.get(x.id).subject!==s.subject||(s.subchapter&&map.get(x.id).subchapter!==s.subchapter))))fail();
   if(s.mode==='balanced'){for(const subject of new Set(bank.map(q=>q.subject))){if(s.items.filter(x=>map.get(x.id).subject===subject).length!==Math.min(10,bank.filter(q=>q.subject===subject).length))fail();}}
   if(p.history.includes(s)){
    const score=s.items.filter(x=>x.selected===map.get(x.id).answer).length;
    if(s.score!==score||s.total!==s.items.length||s.passed!==(isExam(s)?score>=60:null)||!Number.isFinite(Date.parse(s.finishedAt))||s.items.some(x=>x.correct!==(x.selected===map.get(x.id).answer)))fail();
   }
  }
 }
 return data;
}
const api={VERSION,modes,isExam,shuffle,create,grade,complete,fresh,validate};if(typeof module!=='undefined')module.exports=api;else root.PracticeCore=api;
})(typeof window!=='undefined'?window:globalThis);
