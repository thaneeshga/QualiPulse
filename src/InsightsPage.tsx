import { useMemo, useState } from 'react'
import { Row, Costs } from './lib'
import { Th } from './ShiftPage'
import { analyze, Sev } from './insights'
import { api } from './api'
import { AiItem, aiBody } from './ai'
const card='bg-white rounded-2xl shadow-sm p-5'
export const SC:Record<Sev,string>={Critical:'bg-err text-white',High:'bg-errc text-err',Medium:'bg-yellow-100 text-yellow-800',Low:'bg-high text-sec',Positive:'bg-green-100 text-green-800'}
export const Chip=({s}:{s:Sev})=><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SC[s]}`}>{s}</span>
export function AiCards({items}:{items:AiItem[]}){return <section className="grid lg:grid-cols-2 gap-4 mt-3">{items.map((i,n)=><article key={n} className="border border-line/40 rounded-xl p-4">
 <div className="flex flex-wrap items-center gap-2 mb-2"><Chip s={i.severity}/><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${i.kind==='AI hypothesis'?'bg-purple-100 text-purple-800':i.kind==='Statistical pattern'?'bg-cyan-100 text-cyan-800':'bg-low text-primary'}`}>{i.kind}</span></div>
 <h3 className="font-bold">{i.finding}</h3><dl className="mt-2 space-y-1.5 text-sm">{([['Evidence',i.evidence],['Business impact',i.impact],['Recommended action',i.action]] as [string,string][]).map(([l,v])=><div key={l}><dt className="text-xs font-semibold text-sec">{l}</dt><dd>{v}</dd></div>)}</dl></article>)}</section>}
export default function InsightsPage({rows,th,costs,onProduct,aiOn,excl}:{rows:Row[];th:Th;costs:Costs;onProduct:(c:string)=>void;aiOn:boolean;excl:boolean}){
 const r=useMemo(()=>analyze(rows,th,costs),[rows,th,costs]),[more,setMore]=useState(15),[ai,setAi]=useState<AiItem[]|null>(null),[busy,setBusy]=useState(false),[aerr,setAerr]=useState('')
 if(!rows.length) return <p className={card}>No production data available for these filters.</p>
 return <div className="space-y-4">
  <div className={card}><h1 className="text-lg font-bold">Insights & anomalies</h1>
   <p className="text-sm text-sec mt-1">These findings come from statistical rules applied to your data, using the thresholds set on the Shift & Workforce page. No AI model is used here. Every figure comes from the uploaded records, and associations are not proof of cause.</p></div>
  <div className={card}><div className="flex flex-wrap items-center gap-3"><h2 className="font-bold">AI analysis</h2>
   <button disabled={!aiOn||busy} onClick={async()=>{setBusy(true);setAerr('');try{setAi((await api<{items:AiItem[]}>('/ai/analyze',{mode:'insights',...aiBody(excl,costs,th)})).items)}catch(e){setAerr((e as Error).message)}finally{setBusy(false)}}} className="px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold disabled:opacity-40">{busy?'Analysing...':ai?'Regenerate':'Generate AI analysis'}</button></div>
   <p className="text-xs text-sec mt-1">Written by an AI model from a summary of your whole dataset (totals and breakdowns, not individual records), ignoring the global filters. Items marked AI hypothesis are possible explanations, not facts. Check figures against the tables.</p>
   {!aiOn&&<p className="text-sm text-sec mt-2">AI is not configured. Set ANTHROPIC_API_KEY in server/.env and restart the server.</p>}{aerr&&<p role="alert" className="text-err text-sm mt-2">{aerr}</p>}{ai&&<AiCards items={ai}/>}</div>
  <section className="grid lg:grid-cols-2 gap-4">{r.insights.length===0?<p className={card}>Not enough variation in this data to report a finding.</p>:r.insights.map((i,n)=><article key={n} className={card}>
   <div className="flex flex-wrap items-center gap-2 mb-2"><Chip s={i.severity}/><span className="text-xs px-2 py-0.5 rounded-full bg-low text-primary font-semibold">{i.kind}</span></div>
   <h3 className="font-bold">{i.finding}</h3>
   <dl className="mt-2 space-y-1.5 text-sm">{([['Evidence',i.evidence],['Business impact',i.impact],['Recommended action',i.action]] as [string,string][]).map(([l,v])=><div key={l}><dt className="text-xs font-semibold text-sec">{l}</dt><dd>{v}</dd></div>)}</dl></article>)}</section>
  <div className={`${card} overflow-x-auto`}><h3 className="font-bold mb-1">Anomalies</h3>
   <p className="text-xs text-sec mb-2">Each product day is compared with that product's own typical day. A product needs at least 7 production days to be checked. Not covered yet: shift-performance changes and repeated defect patterns.</p>
   {r.anomalies.length===0?<p className="text-sm text-sec">No anomalies found in the filtered data.</p>:<>
   <table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Anomaly</th><th>Date</th><th>Product</th><th>Shift</th><th>Line</th><th>Defect rate</th><th>Severity</th><th>Evidence</th></tr></thead><tbody>
   {r.anomalies.slice(0,more).map((a,i)=><tr key={i} className="border-t border-line/30 align-top"><td className="py-2 font-semibold">{a.type}</td><td>{a.date}</td>
    <td><button onClick={()=>onProduct(a.code)} className="text-primary font-semibold hover:underline text-left">{a.product}</button></td><td>{a.shift}</td><td>{a.line}</td><td>{a.rate.toFixed(2)}%</td><td><Chip s={a.severity}/></td><td className="min-w-64">{a.evidence}</td></tr>)}</tbody></table>
   <div className="flex items-center gap-3 mt-3 text-sm text-sec">Showing {Math.min(more,r.anomalies.length)} of {r.total}{more<r.anomalies.length&&<button onClick={()=>setMore(more+15)} className="px-3 py-1 rounded-lg bg-low text-primary font-semibold">Show more</button>}</div></>}</div>
 </div>}
