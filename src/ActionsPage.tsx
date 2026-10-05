import { useMemo, useState } from 'react'
import { Row, Costs } from './lib'
import { Th } from './ShiftPage'
import { analyze, Sev, SEV } from './insights'
import { Chip } from './InsightsPage'
import { Action, Pri, STATUS, Status, uid } from './store'
const card='bg-white rounded-2xl shadow-sm p-5'
interface Alert{id:string;type:string;title:string;severity:Sev;evidence:string;action:string}
const typeOf=(f:string)=>f.includes('among shifts')?'Shift performance':f.includes('among production lines')?'Line performance':f.includes('among teams')?'Team performance':f.includes('frequent defect reason')?'Repeated defect cause':f.includes('scrap cost')?'High-loss product':f.includes('rising')?'Defect trend':f.includes('falling')||f.includes('lowest')?'Positive improvement':f.includes('highest defect rate')?'Defect rate above target':'Finding'
const PRI:Pri[]=['Critical','High','Medium','Low']
export default function ActionsPage({rows,th,costs,actions,setActions}:{rows:Row[];th:Th;costs:Costs;actions:Action[];setActions:(a:Action[])=>void}){
 const [sev,setSev]=useState('All'),[form,setForm]=useState({title:'',priority:'Medium' as Pri,reason:'',recommendation:''}),[err,setErr]=useState('')
 const alerts=useMemo<Alert[]>(()=>{const r=analyze(rows,th,costs)
  const a:Alert[]=r.insights.map(i=>({id:'i|'+i.finding,type:typeOf(i.finding),title:i.finding,severity:i.severity,evidence:i.evidence,action:i.action}))
  r.anomalies.filter(x=>x.type!=='Production increase').slice(0,10).forEach(x=>a.push({id:`a|${x.type}|${x.code}|${x.date}`,type:x.type==='Defect spike'?'Sudden defect spike':'Production drop',title:`${x.type}: ${x.product} on ${x.date}`,severity:x.severity,evidence:x.evidence,action:`Review what happened to ${x.product} on ${x.date}${x.shift!=='All'?`, starting with ${x.shift} shift and ${x.line}`:''}.`}))
  return a.sort((p,q)=>SEV.indexOf(p.severity)-SEV.indexOf(q.severity))},[rows,th,costs])
 const shown=alerts.filter(a=>sev==='All'||a.severity===sev)
 const made=new Set(actions.map(a=>a.alertId))
 const make=(a:Alert)=>setActions([{id:uid(),alertId:a.id,title:a.title,priority:(a.severity==='Positive'?'Low':a.severity) as Pri,reason:a.evidence,recommendation:a.action,status:'Open',created:new Date().toISOString().slice(0,10)},...actions])
 const setStatus=(id:string,s:Status)=>setActions(actions.map(x=>x.id===id?{...x,status:s}:x))
 const add=()=>{const t=form.title.trim();if(!t){setErr('Enter a title for the action.');return}setErr('')
  setActions([{id:uid(),title:t.slice(0,120),priority:form.priority,reason:form.reason.trim().slice(0,300),recommendation:form.recommendation.trim().slice(0,300),status:'Open',created:new Date().toISOString().slice(0,10)},...actions]);setForm({...form,title:'',reason:'',recommendation:''})}
 const sorted=[...actions].sort((a,b)=>(a.status==='Resolved'?1:0)-(b.status==='Resolved'?1:0)||PRI.indexOf(a.priority)-PRI.indexOf(b.priority))
 const inp='border border-line/60 rounded-lg px-2 py-1.5 text-sm bg-low'
 return <div className="space-y-4">
  <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">{STATUS.map(s=><div key={s} className={card}><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{s}</div><div className="text-xl font-bold mt-1">{actions.filter(a=>a.status===s).length}</div></div>)}</section>
  <div className={card}><div className="flex flex-wrap items-center gap-3 mb-1"><h2 className="font-bold">Smart alerts</h2>
   <select aria-label="Severity" value={sev} onChange={e=>setSev(e.target.value)} className={`${inp} ml-auto`}>{['All',...SEV].map(s=><option key={s}>{s}</option>)}</select></div>
   <p className="text-xs text-sec mb-3">Alerts are generated from the filtered data. Production-below-target alerts need a production target, which this dataset does not have.</p>
   {shown.length===0?<p className="text-sm text-sec">No alerts for the current filters.</p>:<ul className="space-y-2">{shown.map(a=><li key={a.id} className="border border-line/40 rounded-xl p-3 flex flex-wrap gap-3 items-start">
    <div className="flex-1 min-w-64"><div className="flex flex-wrap items-center gap-2 mb-1"><Chip s={a.severity}/><span className="text-xs text-sec font-semibold">{a.type}</span></div><div className="font-semibold">{a.title}</div><div className="text-sm text-sec">{a.evidence}</div></div>
    <button disabled={made.has(a.id)} onClick={()=>make(a)} className="px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold disabled:opacity-40">{made.has(a.id)?'Action created':'Create action'}</button></li>)}</ul>}</div>
  <div className={card}><h2 className="font-bold mb-2">Actions</h2>
   <div className="grid md:grid-cols-4 gap-2 mb-1"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Action, e.g. Investigate Line 3" aria-label="Action title" className={`${inp} md:col-span-2`}/>
    <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as Pri})} aria-label="Priority" className={inp}>{PRI.map(p=><option key={p}>{p}</option>)}</select>
    <button onClick={add} className="px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold">Add action</button>
    <input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Reason" aria-label="Reason" className={`${inp} md:col-span-2`}/><input value={form.recommendation} onChange={e=>setForm({...form,recommendation:e.target.value})} placeholder="Recommendation" aria-label="Recommendation" className={`${inp} md:col-span-2`}/></div>
   {err&&<p role="alert" className="text-err text-sm mb-2">{err}</p>}
   {sorted.length===0?<p className="text-sm text-sec mt-3">No actions yet. Create one from an alert or add your own.</p>:<ul className="space-y-2 mt-3">{sorted.map(a=><li key={a.id} className={`border border-line/40 rounded-xl p-3 ${a.status==='Resolved'?'opacity-60':''}`}>
    <div className="flex flex-wrap items-center gap-2"><Chip s={a.priority}/><span className="font-semibold">{a.title}</span><span className="text-xs text-sec ml-auto">Created {a.created}</span></div>
    {a.reason&&<p className="text-sm mt-1"><span className="text-sec">Reason: </span>{a.reason}</p>}{a.recommendation&&<p className="text-sm"><span className="text-sec">Recommendation: </span>{a.recommendation}</p>}
    <div className="flex flex-wrap gap-1 mt-2" role="group" aria-label="Status">{STATUS.map(s=><button key={s} onClick={()=>setStatus(a.id,s)} aria-pressed={a.status===s} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${a.status===s?'bg-pc text-white':'bg-low text-sec hover:bg-high'}`}>{s}</button>)}</div></li>)}</ul>}</div>
 </div>}
