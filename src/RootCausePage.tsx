import { useMemo, useState, ReactNode } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronRight } from 'lucide-react'
import { Row, Costs, group } from './lib'
import { Th, level, tone } from './ShiftPage'
import { Chip, AiCards } from './InsightsPage'
import { api } from './api'
import { AiItem, aiBody } from './ai'
import { measure } from './ImprovementPage'
import { Action, Imp } from './store'
const card='bg-white rounded-2xl shadow-sm p-5'
const STEPS=['Production','Quality Inspection','Defect Detected','Defect Reason','Possible Root Cause','Corrective Action','Monitoring','Improvement']
const KIND={obs:['Observed data','bg-low text-primary'],stat:['Statistical pattern','bg-cyan-100 text-cyan-800'],ai:['AI hypothesis','bg-purple-100 text-purple-800'],user:['Recorded by you','bg-high text-sec']} as const
const Tag=({k}:{k:keyof typeof KIND})=><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${KIND[k][1]}`}>{KIND[k][0]}</span>
const Stat=({l,v}:{l:string;v:string})=><div className="bg-low rounded-xl p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{l}</div><div className="font-bold text-lg">{v}</div></div>
const n=(x:number)=>x.toLocaleString(),pc=(x:number)=>x.toFixed(2)+'%'
export default function RootCausePage({rows,allRows,th,costs,actions,imps,onNav,aiOn,excl}:{aiOn:boolean;excl:boolean;rows:Row[];allRows:Row[];th:Th;costs:Costs;actions:Action[];imps:Imp[];onNav:(p:string)=>void}){
 const [step,setStep]=useState(0),[pick,setPick]=useState<string|null>(null),[ai,setAi]=useState<{reason:string;items:AiItem[]}|null>(null),[aiBusy,setAiBusy]=useState(false),[aiErr,setAiErr]=useState('')
 const d=useMemo(()=>{
  const P=rows.reduce((a,r)=>a+r.prod,0),D=rows.reduce((a,r)=>a+r.defect,0)
  const reasons=group(rows,r=>r.reason).filter(g=>g.defect>0).sort((a,b)=>b.defect-a.defect)
  return {P,D,reasons,prods:group(rows,r=>r.item).sort((a,b)=>b.defect-a.defect),dates:[...new Set(rows.map(r=>r.date))].sort(),
   withDef:rows.filter(r=>r.defect>0).length,unspec:reasons.find(g=>g.k==='Unspecified')?.defect??0}},[rows])
 const reason=pick&&d.reasons.some(g=>g.k===pick)?pick:d.reasons[0]?.k??null
 const pat=useMemo(()=>{if(!reason)return{rd:0,list:[],daily:[]}
  const rr=rows.filter(r=>r.reason===reason),rd=rr.reduce((a,r)=>a+r.defect,0),P=rows.reduce((a,r)=>a+r.prod,0)
  const dims:[string,(r:Row)=>string][]=[['Shift',r=>r.shift],['Production line',r=>r.line],['Team',r=>r.team],['Product',r=>r.item]]
  const list:{dim:string;v:string;ds:number;ps:number;lift:number;defect:number}[]=[]
  for(const [dim,fn] of dims){const all=new Map<string,number>(group(rows,fn).map(g=>[g.k,g.prod] as [string,number]))
   group(rr,fn).forEach(g=>{const ps=(all.get(g.k)??0)/P,ds=g.defect/rd;if(g.k!=='Unspecified'&&g.defect>=5&&ps>0&&ds/ps>=1.3)list.push({dim,v:g.k,ds:ds*100,ps:ps*100,lift:ds/ps,defect:g.defect})})}
  return {rd,list:list.sort((a,b)=>b.lift-a.lift).slice(0,8),daily:group(rr,r=>r.date).sort((a,b)=>a.k.localeCompare(b.k))}},[rows,reason])
 if(!rows.length) return <p className={card}>No production data available for these filters.</p>
 const noDef=<p className="text-sm text-sec">No defects found for these filters.</p>
 const lastRate=(()=>{const a=d.dates.slice(-7),b=d.dates.slice(-14,-7);const rt=(s:string[])=>{const x=rows.filter(r=>s.includes(r.date)),p=x.reduce((q,r)=>q+r.prod,0);return p?x.reduce((q,r)=>q+r.defect,0)/p*100:0};return d.dates.length>=14?[rt(a),rt(b)]:null})()
 const body:ReactNode[]=[
  <><Tag k="obs"/><div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3"><Stat l="Units produced" v={n(d.P)}/><Stat l="Products" v={String(d.prods.length)}/><Stat l="Production lines" v={String(new Set(rows.map(r=>r.line)).size)}/><Stat l="Date range" v={`${d.dates[0]} to ${d.dates[d.dates.length-1]}`}/></div></>,
  <><Tag k="obs"/><p className="text-sm mt-3">Defects are recorded on each production record. Your dataset has no separate inspection results, so inspection coverage cannot be measured.</p>
   <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-3"><Stat l="Records" v={n(rows.length)}/><Stat l="Records with defects" v={n(d.withDef)}/><Stat l="Defects with no stated reason" v={n(d.unspec)}/></div></>,
  <><Tag k="obs"/>{d.D===0?<div className="mt-3">{noDef}</div>:<><div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-3"><Stat l="Defects" v={n(d.D)}/><Stat l="Defect rate" v={pc(d.D/d.P*100)}/><Stat l="Status" v={level(d.D/d.P*100,th)}/></div>
   <table className="w-full text-sm mt-3"><thead className="text-left text-sec"><tr><th>Product</th><th>Defects</th><th>Rate</th></tr></thead><tbody>{d.prods.slice(0,5).map(p=><tr key={p.k} className="border-t border-line/30"><td className="py-1.5 font-semibold">{p.k}</td><td>{n(p.defect)}</td><td><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tone[level(p.rate,th)]}`}>{pc(p.rate)}</span></td></tr>)}</tbody></table></>}</>,
  <><Tag k="obs"/>{d.D===0?<div className="mt-3">{noDef}</div>:<><p className="text-xs text-sec mt-2">Select a reason to examine it in the next step.</p><ul className="mt-2 space-y-1">{d.reasons.map(g=><li key={g.k}><button onClick={()=>{setPick(g.k);setStep(4)}} className={`w-full flex justify-between px-3 py-2 rounded-lg text-sm ${g.k===reason?'bg-pc text-white':'bg-low hover:bg-high'}`}><span className="font-semibold">{g.k}</span><span>{n(g.defect)} ({(g.defect/d.D*100).toFixed(1)}%)</span></button></li>)}</ul></>}</>,
  <>{!reason?noDef:<><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{reason}</span><Tag k="stat"/></div>
   <p className="text-xs text-sec mt-1">Where this reason is over-represented compared with production share. This shows where to look. It does not show that any of these factors causes the defects.</p>
   {pat.list.length===0?<p className="text-sm mt-3">No concentration found: this reason is spread in line with production across shifts, lines, teams and products (a value needs at least 5 defects and 1.3× its production share).</p>:
   <div className="overflow-x-auto"><table className="w-full text-sm mt-3"><thead className="text-left text-sec"><tr><th>Factor</th><th>Value</th><th>Defects</th><th>Share of this reason</th><th>Share of production</th><th>Concentration</th></tr></thead><tbody>{pat.list.map(x=><tr key={x.dim+x.v} className="border-t border-line/30"><td className="py-1.5">{x.dim}</td><td className="font-semibold">{x.v}</td><td>{n(x.defect)}</td><td>{x.ds.toFixed(1)}%</td><td>{x.ps.toFixed(1)}%</td><td className="font-bold">{x.lift.toFixed(2)}×</td></tr>)}</tbody></table></div>}
   <div className="mt-4 border border-dashed border-line rounded-xl p-3"><div className="flex flex-wrap items-center gap-2"><Tag k="ai"/>
    <button disabled={!aiOn||aiBusy} onClick={async()=>{setAiBusy(true);setAiErr('');try{const r=await api<{items:AiItem[]}>('/ai/analyze',{mode:'hypotheses',reason,...aiBody(excl,costs,th)});setAi({reason:reason!,items:r.items})}catch(e){setAiErr((e as Error).message)}finally{setAiBusy(false)}}} className="px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold disabled:opacity-40">{aiBusy?'Generating...':'Generate hypotheses'}</button></div>
    <p className="text-xs text-sec mt-2">Possible explanations from an AI model, based on a summary of your whole dataset. They are ideas to test, not findings.</p>
    {!aiOn&&<p className="text-sm mt-2">AI is not configured on the server.</p>}{aiErr&&<p role="alert" className="text-err text-sm mt-2">{aiErr}</p>}{ai&&ai.reason===reason&&<AiCards items={ai.items}/>}</div></>}</>,
  <><Tag k="user"/>{actions.length===0?<p className="text-sm mt-3">No actions recorded yet.</p>:<ul className="mt-3 space-y-1.5">{actions.slice(0,8).map(a=><li key={a.id} className="flex flex-wrap items-center gap-2 text-sm"><Chip s={a.priority}/><span className="font-semibold">{a.title}</span><span className="text-sec ml-auto">{a.status}</span></li>)}</ul>}
   <button onClick={()=>onNav('alerts')} className="mt-3 px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold">Open Alerts & Actions</button></>,
  <><Tag k="obs"/>{!reason||d.D===0?<div className="mt-3">{noDef}</div>:<>
   <p className="text-sm mt-3">Daily defects recorded as {reason}.{lastRate&&<> Overall defect rate over the last 7 recorded days: {pc(lastRate[0])}, against {pc(lastRate[1])} in the 7 before.</>}</p>
   <div className="h-52 mt-2"><ResponsiveContainer><LineChart data={pat.daily}><XAxis dataKey="k" tickFormatter={x=>x.slice(5)} fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Line dataKey="defect" stroke="#ba1a1a" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></>}</>,
  <><Tag k="stat"/>{imps.length===0?<p className="text-sm mt-3">No corrective actions have been recorded for before/after tracking.</p>:<ul className="mt-3 space-y-1.5">{imps.slice(0,8).map(it=>{const m=measure(allRows,it,costs);return <li key={it.id} className="text-sm"><span className="font-semibold">{it.problem}</span>: {m.before==null?'N/A':pc(m.before)} → {m.after==null?'N/A':pc(m.after)}{m.imp!=null&&<span className={m.imp>=0?'text-green-700 font-bold':'text-err font-bold'}> ({m.imp.toFixed(1)}%)</span>}</li>})}</ul>}
   <p className="text-xs text-sec mt-2">A change after an action does not prove the action caused it.</p>
   <button onClick={()=>onNav('improvement')} className="mt-3 px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold">Open Improvement Tracking</button></>]
 return <div className="space-y-4">
  <div className={card}><h1 className="text-lg font-bold">Root cause analysis</h1>
   <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-sec">Every item is labelled: {(['obs','stat','ai','user'] as const).map(k=><Tag key={k} k={k}/>)}</div></div>
  <ol className={`${card} flex flex-wrap items-center gap-1`}>{STEPS.map((s,i)=><li key={s} className="flex items-center gap-1"><button onClick={()=>setStep(i)} aria-current={i===step} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${i===step?'bg-pc text-white':'bg-low text-sec hover:bg-high'}`}>{i+1}. {s}</button>{i<STEPS.length-1&&<ChevronRight size={14} className="text-line"/>}</li>)}</ol>
  <section className={card}><h2 className="font-bold mb-1">{step+1}. {STEPS[step]}</h2>{body[step]}
   <div className="flex justify-between mt-5"><button disabled={step===0} onClick={()=>setStep(step-1)} className="px-3 py-1.5 rounded-lg bg-low text-primary text-sm font-semibold disabled:opacity-40">Previous</button>
    <button disabled={step===STEPS.length-1} onClick={()=>setStep(step+1)} className="px-3 py-1.5 rounded-lg bg-low text-primary text-sm font-semibold disabled:opacity-40">Next</button></div></section></div>}
