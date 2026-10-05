import { Row, Costs, group, finance } from './lib'
import { Th } from './ShiftPage'
import { analyze } from './insights'
export type Cell=string|number
export interface Section{heading:string;columns:string[];rows:Cell[][]}
export interface Report{title:string;subtitle:string;sections:Section[];notes:string[];empty:boolean}
export const TYPES=[['daily','Daily Report'],['weekly','Weekly Report'],['monthly','Monthly Report'],['yearly','Yearly Report'],['product','Product Report'],['shift','Shift Report'],['defect','Defect Report'],['loss','Loss & Profit Report'],['summary','AI Management Summary']] as const
export type RType=typeof TYPES[number][0]
const NA='Cost data unavailable',r2=(n:number)=>Math.round(n*100)/100,sum=(rs:Row[],k:'prod'|'defect')=>rs.reduce((a,r)=>a+r[k],0)
const split=(rs:Row[],key:(r:Row)=>string)=>{const m=new Map<string,Row[]>();rs.forEach(r=>{const k=key(r),a=m.get(k);a?a.push(r):m.set(k,[r])});return [...m]}
function summary(rs:Row[],c:Costs):Section{const P=sum(rs,'prod'),D=sum(rs,'defect'),f=finance(rs,c),m=(ok:boolean,v:number,off=NA):Cell=>ok?Math.round(v):off
 return {heading:'Summary',columns:['Metric','Value'],rows:[['Units produced',P],['Defects',D],['Defect rate (%)',P?r2(D/P*100):'N/A'],['Production value ($)',m(f.hasPrice,f.value,'Selling price unavailable')],['Scrap cost ($)',m(f.hasCost,f.scrap)],
  ['Rework cost ($)',m(f.hasRework,f.rework,'Not set or no rework data')],['Downtime cost ($)',m(f.hasDown,f.down,'Not set or no downtime data')],['Total estimated loss ($)',m(f.hasLoss,f.loss)],['Estimated profit ($)',m(f.hasProfit,f.profit,'Cost or price data unavailable')]]}}
function tab(rs:Row[],key:(r:Row)=>string,label:string,heading:string,c:Costs,byRate=false):Section{
 const o=split(rs,key).map(([k,x])=>{const P=sum(x,'prod'),D=sum(x,'defect'),f=finance(x,c);return {k,P,D,rate:P?D/P*100:0,loss:(f.hasLoss?Math.round(f.loss):NA) as Cell}})
 o.sort((a,b)=>byRate?b.rate-a.rate:a.k.localeCompare(b.k))
 return {heading,columns:[label,'Units','Defects','Defect rate (%)','Est. loss ($)'],rows:o.map(x=>[x.k,x.P,x.D,r2(x.rate),x.loss])}}
function reasons(rs:Row[]):Section{const g=group(rs,r=>r.reason).filter(x=>x.defect>0).sort((a,b)=>b.defect-a.defect),D=sum(rs,'defect');return {heading:'Defect reasons',columns:['Reason','Defects','Share (%)'],rows:g.map(x=>[x.k,x.defect,D?r2(x.defect/D*100):0])}}
function matrix(rs:Row[],key:(r:Row)=>string,label:string,heading:string):Section{const names=group(rs,r=>r.reason).filter(x=>x.defect>0).sort((a,b)=>b.defect-a.defect).map(x=>x.k)
 return {heading,columns:[label,...names],rows:split(rs,key).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,x])=>[k,...names.map(n=>sum(x.filter(r=>r.reason===n),'defect'))])}}
export function build(t:RType,rows:Row[],val:string,th:Th,c:Costs):Report{
 const dates=[...new Set(rows.map(r=>r.date))].sort(),last=dates[dates.length-1]??'',lastM=last.slice(0,7),lastY=last.slice(0,4)
 let rs=rows,title=TYPES.find(x=>x[0]===t)![1],sub='All data',sec:Section[]=[]
 const notes=['Defect rate = defects ÷ units produced. Costs appear only where the uploaded data supports them.']
 if(t==='daily'){const d=val||last;rs=rows.filter(r=>r.date===d);sub=d;sec=[summary(rs,c),tab(rs,r=>r.item,'Product','By product',c,true),tab(rs,r=>r.shift,'Shift','By shift',c),tab(rs,r=>r.line,'Production line','By production line',c)]}
 else if(t==='weekly'){const e=val||last,s=new Date(Date.parse(e)-6*864e5).toISOString().slice(0,10);rs=rows.filter(r=>r.date>=s&&r.date<=e);sub=`${s} to ${e}`;sec=[summary(rs,c),tab(rs,r=>r.date,'Date','By day',c),tab(rs,r=>r.item,'Product','By product',c,true)]}
 else if(t==='monthly'){const m=val||lastM;rs=rows.filter(r=>r.date.slice(0,7)===m);sub=m;sec=[summary(rs,c),tab(rs,r=>r.date,'Date','By day',c),tab(rs,r=>r.item,'Product','By product',c,true),reasons(rs)]}
 else if(t==='yearly'){const y=val||lastY;rs=rows.filter(r=>r.date.slice(0,4)===y);sub=y;sec=[summary(rs,c),tab(rs,r=>r.date.slice(0,7),'Month','By month',c),tab(rs,r=>r.item,'Product','By product',c,true)]}
 else if(t==='product'){const code=val||rows[0]?.code;rs=rows.filter(r=>r.code===code);sub=rs[0]?`${rs[0].item} (${code})`:'';sec=[summary(rs,c),tab(rs,r=>r.date.slice(0,7),'Month','By month',c),reasons(rs),tab(rs,r=>r.shift,'Shift','By shift',c),tab(rs,r=>r.line,'Production line','By production line',c)]}
 else if(t==='shift'){const s=val||'All';rs=s==='All'?rows:rows.filter(r=>r.shift===s);sub=s==='All'?'All shifts':s+' shift';sec=[tab(rs,r=>r.shift,'Shift','By shift',c),tab(rs,r=>r.item,'Product','By product',c,true),tab(rs,r=>r.team,'Team','By team',c),tab(rs,r=>r.line,'Production line','By production line',c)]
  notes.push('Shift and team differences are patterns to investigate. They do not show cause and say nothing about individuals.')}
 else if(t==='defect'){sec=[reasons(rs),tab(rs,r=>r.item,'Product','By product',c,true),matrix(rs,r=>r.item,'Product','Product × defect reason (units)'),matrix(rs,r=>r.shift,'Shift','Shift × defect reason (units)')]}
 else if(t==='loss'){sec=[summary(rs,c),tab(rs,r=>r.item,'Product','Loss by product',c),tab(rs,r=>r.date.slice(0,7),'Month','Loss by month',c),tab(rs,r=>r.line,'Production line','Loss by line',c)]
  notes.push('Scrap cost = defect units × unit production cost. Rework and downtime costs use the rates entered on the Loss & Profit page.')}
 else{const a=analyze(rs,th,c),P=sum(rs,'prod'),D=sum(rs,'defect'),top=a.insights.filter(i=>i.severity!=='Positive').slice(0,3)
  sec=[{heading:'What happened?',columns:['Statement'],rows:[[`Overall defect rate is ${P?r2(D/P*100):0}% (${D.toLocaleString()} defects in ${P.toLocaleString()} units); the attention threshold is ${th.attn}%.`],...a.insights.filter(i=>i.finding.includes('rising')||i.finding.includes('falling')).map(i=>[i.evidence])]},
   {heading:'Why does it matter?',columns:['Statement'],rows:top.length?top.map(i=>[i.impact]):[['No findings above Low severity.']]},
   {heading:'Where is it happening?',columns:['Statement'],rows:top.length?top.map(i=>[i.finding]):[['No concentrated problem areas found.']]},
   {heading:'What should we do?',columns:['Statement'],rows:top.length?top.map(i=>[i.action]):[['Keep monitoring.']]},
   {heading:'All findings',columns:['Finding','Severity','Evidence','Business impact','Recommended action'],rows:a.insights.map(i=>[i.finding,i.severity,i.evidence,i.impact,i.action])},summary(rs,c)]
  notes.push('Generated by statistical rules on your data. No AI model was used.')}
 return {title,subtitle:sub,sections:sec,notes,empty:rs.length===0}}
