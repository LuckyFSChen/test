import re,json,hashlib,collections
from pathlib import Path
from pypdf import PdfReader
root=Path(__file__).resolve().parent; doc=PdfReader(root/'source.pdf')
pages=[]; offsets=[]; pos=0
for i,p in enumerate(doc.pages):
 t=p.extract_text()
 t=re.sub(r'(?m)^\s*\d+\s*$','',t)
 offsets.append(pos); pages.append(t); pos+=len(t)+1
t='\n'.join(pages)
headers=list(re.finditer(r'【([^】]+)】',t))
subheaders=list(re.finditer(r'(?m)^[ \t]*(總則|債編|物權編|親屬編|一、總則編|二、經紀業編|三、經紀人員篇|四、業務及責任篇|五、獎懲篇)[ \t]*$',t))
pat=r'(?m)^\s*[（(]([A-D])[)）]\s*\n\s*(\d+)[.．、]'
matches=list(re.finditer(pat,t)); questions=[]; repairs=[]
for i,m in enumerate(matches):
 end=matches[i+1].start() if i+1<len(matches) else len(t)
 b=t[m.end():end]
 subj=[h.group(1).replace('試題','') for h in headers if h.start()<m.start()][-1]
 subject_start=[h.start() for h in headers if h.start()<m.start()][-1]
 sub=[h.group(1) for h in subheaders if subject_start<h.start()<m.start()]
 page=max(j+1 for j,o in enumerate(offsets) if o<=m.start())
 # Keep source text, change only malformed option delimiters confirmed in original PDF.
 for old,new in [('(B 負擔','(B)負擔'),('（B 農地','（B）農地'),('(D 6 個月','(D)6 個月'),('( \nC)','(C)')]:
  if old in b: repairs.append({'index':i+1,'page':page,'old':old,'new':new}); b=b.replace(old,new)
 opts=list(re.finditer(r'[（(]([A-D])[)）]',b))
 assert [o.group(1) for o in opts]==list('ABCD'),(i,b)
 source=re.search(r'[（(]\s*出處\s*[：:]',b)
 if not source: source=re.search(r'$',b)
 def clean(s): return re.sub(r'\s+',' ',s).strip()
 # Source ends before a following section heading. Balanced brackets preserve nested references.
 s=b[source.start():]; depth=0; stop=len(s)
 for k,ch in enumerate(s):
  if ch in '(（': depth+=1
  elif ch in ')）':
   depth-=1
   if depth==0: stop=k+1; break
 q={'id':f'q{i+1:04}','subject':subj,'number':int(m.group(2)),'page':page,'printedPage':page-2,'text':clean(b[:opts[0].start()]),'options':[clean(b[o.end():opts[j+1].start() if j<3 else source.start()]) for j,o in enumerate(opts)],'answer':'ABCD'.index(m.group(1)),'reference':clean(s[:stop])}
 assert all(q['options']) and q['text']
 q['subchapter']=sub[-1] if sub else None
 questions.append(q)
allkeys=re.findall(r'(?m)^\s*[（(]([A-D])[)）]\s*$',t)
assert len(allkeys)==len(questions),(len(allkeys),len(questions))
assert '\ufffd' not in json.dumps(questions,ensure_ascii=False)
report={'pages':len(pages),'questions':len(questions),'standaloneAnswerMarkers':len(allkeys),'subjects':dict(collections.Counter(q['subject'] for q in questions)),'delimiterRepairs':repairs,'sha256':hashlib.sha256((root/'source.pdf').read_bytes()).hexdigest()}
report['subchapters']={subject:dict(collections.Counter(q['subchapter'] or '原PDF未另分子章節' for q in questions if q['subject']==subject)) for subject in report['subjects']}
(root/'questions.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'bank.js').write_text('window.QUESTION_BANK = '+json.dumps(questions,ensure_ascii=False)+';\n',encoding='utf-8')
(root/'extraction-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))




