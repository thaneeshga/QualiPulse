import { useState } from 'react'
import { Row, Costs, finance } from './lib'
import { Imp, uid } from './store'
const card='bg-white rounded-2xl shadow-sm p-5'
const DAY=864e5
export function measure(rows:Row[],it:Imp,costs:Costs){
 const sc=it.code?rows.filter(r=>r.code===it.code):rows,d0=Date.parse(it.date),w=it.window*DAY
 const B=sc.filter(r=>{const t=Date.parse(r.date);return t>=d0-w&&t<d0}),A=sc.filter(r=>{const t=Date.parse(r.date);return t>=d0&&t<d0+w})
 const rt=(x:Row[])=>{const p=x.reduce((a,r)=>a+r.prod,0);return p?x.reduce((a,r)=>a+r.defect,0)/p*100:undefined}
 const before=rt(B),after=rt(A),fb=finance(B,costs),fa=finance(A,costs),last=sc.reduce((m,r)=>r.date>m?r.date:m,'')
 const short=last&&Date.parse(last)<d0+w-DAY
 return {before,after,imp:before&&after!=null?(before-after)/before*100:undefined,hasLoss:fb.hasLoss&&fa.hasLoss&&B.length>0&&A.length>0,lb:fb.loss,la:fa.loss,
  note:before==null?'No production in the before window.':after==null?'No production in the after window yet.':short?`After window is incomplete: data ends ${last}.`:''}}
export default function ImprovementPage({rows,costs,items,setItems}:{rows:Row[];costs:Costs;items:Imp[];setItems:(i:Imp[])=>void}){
 const prods=[...new Map<string,string>(rows.map(r=>[r.code,r.item] as [string,string])).entries()].sort((a,b)=>a[1].localeCompare(b[1]))
 const [f,setF]=useState({problem:'',action:'',code:'',date:'',window:14}),[err,setErr]=useState('')
 const add=()=>{if(!f.problem.trim()||!f.action.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(f.date)){setErr('Enter the problem, the corrective action and the date it was taken.');return}setErr('')
  setItems([{id:uid(),problem:f.problem.trim().slice(0,200),action:f.action.trim().slice(0,200),code:f.code,date:f.date,window:f.window},...items]);setF({...f,problem:'',action:''})}
 const inp='border border-line/60 rounded-lg px-2 py-1.5 text-sm bg-low'
 const pc=(n?:number)=>n==null?'N/A':n.toFixed(2)+'%',fm=(n:number)=>'$'+Math.round(n).toLocaleString()
 const name=(c:string)=>c?prods.find(p=>p[0]===c)?.[1]??c:'All products'
 return <div className="space-y-4">
  <div className={card}><h1 className="text-lg font-bold">Before vs after improvement</h1>
   <p className="text-sm text-sec mt-1">Record a corrective action and the date it was taken. The defect rate and loss are measured over equal windows before and after that date, using all your data (global filters do not apply here). A change after an action is not proof that the action caused it.</p>
   <div className="grid md:grid-cols-6 gap-2 mt-3"><input value={f.problem} onChange={e=>setF({...f,problem:e.target.value})} placeholder="Problem" aria-label="Problem" className={`${inp} md:col-span-3`}/><input value={f.action} onChange={e=>setF({...f,action:e.target.value})} placeholder="Corrective action" aria-label="Corrective action" className={`${inp} md:col-span-3`}/>
    <select value={f.code} onChange={e=>setF({...f,code:e.target.value})} aria-label="Product" className={`${inp} md:col-span-2`}><option value="">All products</option>{prods.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select>
    <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} aria-label="Date action was taken" className={inp}/>
    <select value={f.window} onChange={e=>setF({...f,window:Number(e.target.value)})} aria-label="Window" className={inp}>{[7,14,30].map(d=><option key={d} value={d}>{d} days each side</option>)}</select>
    <button onClick={add} className="px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold">Record action</button></div>
   {err&&<p role="alert" className="text-err text-sm mt-2">{err}</p>}</div>
  <div className={`${card} overflow-x-auto`}>{items.length===0?<p className="text-sm text-sec">No corrective actions recorded yet.</p>:
   <table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Problem</th><th>Corrective action</th><th>Scope / date</th><th>Before</th><th>After</th><th>Improvement</th><th>Loss before</th><th>Loss after</th><th/></tr></thead><tbody>
   {items.map(it=>{const m=measure(rows,it,costs);return <tr key={it.id} className="border-t border-line/30 align-top"><td className="py-2 font-semibold">{it.problem}</td><td>{it.action}</td><td>{name(it.code)}<br/><span className="text-sec">{it.date}, ±{it.window} days</span></td>
    <td>{pc(m.before)}</td><td>{pc(m.after)}</td><td className={m.imp==null?'':m.imp>=0?'text-green-700 font-bold':'text-err font-bold'}>{m.imp==null?'N/A':(m.imp>=0?'':'')+m.imp.toFixed(1)+'%'}{m.note&&<div className="text-xs font-normal text-sec">{m.note}</div>}</td>
    <td>{m.hasLoss?fm(m.lb):'Cost data unavailable'}</td><td>{m.hasLoss?fm(m.la):'Cost data unavailable'}</td>
    <td><button onClick={()=>setItems(items.filter(x=>x.id!==it.id))} className="text-xs text-err font-semibold hover:underline">Remove</button></td></tr>})}</tbody></table>}</div>
 </div>}
