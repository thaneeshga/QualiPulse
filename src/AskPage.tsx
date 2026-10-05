import { useState } from 'react'
import { api } from './api'
import { Costs } from './lib'
import { Th } from './ShiftPage'
import { aiBody } from './ai'
interface Msg{role:'user'|'assistant';content:string}
const EX=['Which product has the highest defect rate?','Which shift performs worst?','Compare morning and night shifts.','Where are we losing the most money?','Which product improved the most?','What defect reason occurs most frequently?','Which production line needs attention?','What should management investigate first?']
const card='bg-white rounded-2xl shadow-sm p-5'
export default function AskPage({aiOn,excl,costs,th}:{aiOn:boolean;excl:boolean;costs:Costs;th:Th}){
 const [msgs,setMsgs]=useState<Msg[]>([]),[q,setQ]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('')
 const send=async(text:string)=>{const question=text.trim().slice(0,500);if(!question||busy||!aiOn)return;setErr('');setBusy(true);const history=msgs.slice(-6);setMsgs([...msgs,{role:'user',content:question}]);setQ('')
  try{const r=await api<{answer:string}>('/ai/ask',{question,history,...aiBody(excl,costs,th)});setMsgs(m=>[...m,{role:'assistant',content:r.answer}])}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 return <div className="space-y-4">
  <div className={card}><h1 className="text-lg font-bold">Ask AI</h1><p className="text-sm text-sec mt-1">Answers use a summary of your whole uploaded dataset (totals and breakdowns, not individual records) and ignore the global filters. That summary is sent to the AI provider. Check important figures against the tables.</p>
   {!aiOn&&<p role="alert" className="text-err text-sm mt-2">AI is not configured. Set ANTHROPIC_API_KEY in server/.env and restart the server.</p>}</div>
  {msgs.length===0&&<div className={`${card} flex flex-wrap gap-2`}>{EX.map(e=><button key={e} disabled={!aiOn||busy} onClick={()=>send(e)} className="px-3 py-1.5 rounded-full bg-low text-primary text-sm font-semibold hover:bg-high disabled:opacity-40">{e}</button>)}</div>}
  {msgs.length>0&&<div className={`${card} space-y-3`}>{msgs.map((m,i)=><div key={i} className={m.role==='user'?'text-right':''}><div className={`inline-block max-w-[90%] text-left rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role==='user'?'bg-pc text-white':'bg-low'}`}>{m.content}</div></div>)}
   {busy&&<p className="text-sm text-sec" role="status">Thinking...</p>}</div>}
  {err&&<p role="alert" className="text-err text-sm">{err}</p>}
  <form onSubmit={e=>{e.preventDefault();send(q)}} className={`${card} flex gap-2`}><input value={q} onChange={e=>setQ(e.target.value)} maxLength={500} placeholder="Ask about your production data..." aria-label="Question" className="flex-1 border border-line/60 rounded-lg px-3 py-2 text-sm bg-low"/>
   <button disabled={!aiOn||busy||!q.trim()} className="px-4 py-2 rounded-lg bg-pc text-white font-semibold disabled:opacity-40">Ask</button>
   {msgs.length>0&&<button type="button" onClick={()=>{setMsgs([]);setErr('')}} className="px-3 py-2 rounded-lg bg-low text-primary text-sm font-semibold">Clear</button>}</form></div>}
