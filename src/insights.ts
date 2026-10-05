import { Row, Costs, group, finance } from './lib'
import { Th } from './ShiftPage'
export type Sev='Critical'|'High'|'Medium'|'Low'|'Positive'
export const SEV:Sev[]=['Critical','High','Medium','Low','Positive']
export interface Insight{finding:string;severity:Sev;kind:'Observed data'|'Statistical pattern';evidence:string;impact:string;action:string}
export interface Anomaly{type:string;date:string;product:string;code:string;shift:string;line:string;rate:number;severity:Sev;evidence:string}
const SEP='\u0001',pct=(n:number)=>n.toFixed(2)+'%',usd=(n:number)=>'$'+Math.round(n).toLocaleString()
const sevRate=(r:number,t:Th):Sev=>r>=t.crit?'Critical':r>=t.attn?'High':'Medium'
const median=(a:number[])=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
const worst=(rs:Row[],key:(r:Row)=>string)=>group(rs,key).filter(g=>g.prod>0).sort((a,b)=>b.rate-a.rate)[0]
export function analyze(rows:Row[],t:Th,c:Costs){
 const P=rows.reduce((a,r)=>a+r.prod,0),D=rows.reduce((a,r)=>a+r.defect,0),avg=P?D/P*100:0,fin=finance(rows,c)
 const ins:Insight[]=[]
 const prods=group(rows,r=>r.item).filter(g=>g.prod>0).sort((a,b)=>b.rate-a.rate)
 const w=prods[0]
 if(w&&prods.length>1&&w.rate>avg) ins.push({finding:`${w.k} has the highest defect rate.`,severity:sevRate(w.rate,t),kind:'Observed data',
  evidence:`${w.k}: ${pct(w.rate)} defect rate (${w.defect.toLocaleString()} of ${w.prod.toLocaleString()} units) against ${pct(avg)} overall.`,
  impact:fin.hasCost?`Scrap cost for ${w.k} is ${usd(w.loss)}, ${(w.loss/fin.scrap*100).toFixed(1)}% of total scrap cost.`:`${w.defect.toLocaleString()} defective units. Cost data unavailable.`,
  action:`Review the shifts and production lines where ${w.k} defects are concentrated, starting with the product page.`})
 const reasons=group(rows,r=>r.reason).filter(g=>g.defect>0).sort((a,b)=>b.defect-a.defect),tr=reasons[0]
 if(tr&&D>0){const sh=tr.defect/D*100;ins.push({finding:`${tr.k} is the most frequent defect reason.`,severity:sh>=40?'Medium':'Low',kind:'Observed data',
  evidence:`${tr.defect.toLocaleString()} of ${D.toLocaleString()} defects (${sh.toFixed(1)}%) are recorded as ${tr.k}.`,
  impact:fin.hasCost?`Scrap cost attributed to this reason: ${usd(tr.loss)}.`:'Cost data unavailable.',
  action:`Check how ${tr.k} is defined and recorded, then look at which products and lines it appears on.`})}
 const cmp=(label:string,key:(r:Row)=>string)=>{const g=group(rows,key).filter(x=>x.prod>0).sort((a,b)=>b.rate-a.rate)
  if(g.length<2)return;const hi=g[0],lo=g[g.length-1];if(hi.rate<=lo.rate*1.15||hi.k==='Unspecified')return
  ins.push({finding:`${hi.k} has the highest defect rate among ${label}s.`,severity:sevRate(hi.rate,t),kind:'Statistical pattern',
   evidence:`${hi.k}: ${pct(hi.rate)} vs ${lo.k}: ${pct(lo.rate)} (${((hi.rate/lo.rate-1)*100).toFixed(0)}% higher). This is an association in the data, not a proven cause.`,
   impact:`${hi.defect.toLocaleString()} defective units from ${hi.k}.${fin.hasCost?` Scrap cost: ${usd(hi.loss)}.`:''}`,
   action:`Compare conditions, staffing and equipment between ${hi.k} and ${lo.k} to find what differs.`})}
 cmp('shift',r=>r.shift);cmp('production line',r=>r.line);cmp('team',r=>r.team)
 if(fin.hasCost&&fin.scrap>0){const l=[...prods].sort((a,b)=>b.loss-a.loss)[0],sh=l.loss/fin.scrap*100
  if(l&&prods.length>1)ins.push({finding:`${l.k} contributes the most scrap cost.`,severity:sh>=40?'High':'Medium',kind:'Observed data',evidence:`${usd(l.loss)} of ${usd(fin.scrap)} total scrap cost (${sh.toFixed(1)}%).`,impact:'Largest single product share of estimated scrap loss.',action:`Prioritise quality work on ${l.k}.`})}
 const days=[...new Set(rows.map(r=>r.date))].sort()
 if(days.length>=14){const rt=(s:Set<string>)=>{let p=0,d=0;rows.forEach(r=>{if(s.has(r.date)){p+=r.prod;d+=r.defect}});return {p,r:p?d/p*100:0}}
  const a=rt(new Set(days.slice(-7))),b=rt(new Set(days.slice(-14,-7)))
  if(a.r>b.r*1.2&&a.r>=t.attn)ins.push({finding:'The overall defect rate is rising.',severity:sevRate(a.r,t),kind:'Statistical pattern',evidence:`Last 7 recorded days: ${pct(a.r)} vs ${pct(b.r)} in the 7 days before.`,
   impact:`About ${Math.round((a.r-b.r)/100*a.p).toLocaleString()} more defective units than the earlier rate would give.`,action:'Check what changed in the last two weeks: products, lines, shifts and equipment.'})
  else if(a.r<b.r*0.8)ins.push({finding:'The overall defect rate is falling.',severity:'Positive',kind:'Statistical pattern',evidence:`Last 7 recorded days: ${pct(a.r)} vs ${pct(b.r)} in the 7 days before.`,impact:'Fewer defective units than the earlier rate would give.',action:'Record what changed so the improvement can be kept.'})}
 const bst=prods[prods.length-1]
 if(bst&&prods.length>1&&bst.rate<t.attn)ins.push({finding:`${bst.k} has the lowest defect rate.`,severity:'Positive',kind:'Observed data',evidence:`${bst.k}: ${pct(bst.rate)} against ${pct(avg)} overall.`,impact:'Lowest share of defective units.',action:'Use its process settings and conditions as a reference.'})
 ins.sort((x,y)=>SEV.indexOf(x.severity)-SEV.indexOf(y.severity))
 const an:Anomaly[]=[],byCode=new Map<string,Row[]>()
 rows.forEach(r=>{const a=byCode.get(r.code);a?a.push(r):byCode.set(r.code,[r])})
 for(const [code,rs] of byCode){
  const dm=new Map<string,Row[]>();rs.forEach(r=>{const a=dm.get(r.date);a?a.push(r):dm.set(r.date,[r])})
  const ds=[...dm].map(([date,x])=>({date,x,p:x.reduce((a,r)=>a+r.prod,0),d:x.reduce((a,r)=>a+r.defect,0)})).filter(o=>o.p>0)
  if(ds.length<7)continue
  const rates=ds.map(o=>o.d/o.p*100),mr=median(rates),sr=Math.max(median(rates.map(v=>Math.abs(v-mr)))*1.4826,mr*0.1,0.05)
  const mp=median(ds.map(o=>o.p)),sp=Math.max(median(ds.map(o=>Math.abs(o.p-mp)))*1.4826,mp*0.05,1),name=rs[0].item
  ds.forEach((o,i)=>{const r=rates[i],z=(r-mr)/sr,zp=(o.p-mp)/sp,ch=o.p/mp-1,sh=worst(o.x,x=>x.shift),ln=worst(o.x,x=>x.line)
   if(z>=3.5&&o.d>=5&&r>mr*1.5)an.push({type:'Defect spike',date:o.date,product:name,code,shift:sh?.k??'-',line:ln?.k??'-',rate:r,severity:r>=t.crit||z>=6?'Critical':z>=4.5?'High':'Medium',
    evidence:`${pct(r)} vs a typical ${pct(mr)} for this product (${z.toFixed(1)} robust deviations, ${ds.length} production days). Shift and line shown have the highest rate that day.`})
   if(zp<=-3.5&&ch<=-0.25)an.push({type:'Production drop',date:o.date,product:name,code,shift:'All',line:'All',rate:r,severity:ch<=-0.5?'High':'Medium',evidence:`${o.p.toLocaleString()} units vs a typical ${Math.round(mp).toLocaleString()} (${(ch*100).toFixed(0)}%).`})
   if(zp>=3.5&&ch>=0.25)an.push({type:'Production increase',date:o.date,product:name,code,shift:'All',line:'All',rate:r,severity:ch>=0.5?'Medium':'Low',evidence:`${o.p.toLocaleString()} units vs a typical ${Math.round(mp).toLocaleString()} (+${(ch*100).toFixed(0)}%).`})})}
 an.sort((x,y)=>SEV.indexOf(x.severity)-SEV.indexOf(y.severity)||y.date.localeCompare(x.date))
 return {insights:ins,anomalies:an.slice(0,200),total:an.length}}
