import { useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Row, Costs, group, rate, streaks, finance } from './lib'
const card='bg-white rounded-2xl shadow-sm p-5'
type G={k:string;rate:number;defect:number}
function stats(rows:Row[],c:Costs){const prod=rows.reduce((a,r)=>a+r.prod,0),def=rows.reduce((a,r)=>a+r.defect,0)
 const fi=finance(rows,c)
 return {prod,def,rate:rate(def,prod),hasCost:fi.hasLoss,hasProfit:fi.hasProfit,st:streaks(rows),loss:fi.loss,profit:fi.profit}}
function Bars({title,data,color,line}:{title:string;data:G[];color:string;line?:number}){
 return <div className={card}><h3 className="font-bold mb-2">{title}</h3>
  {data.length===0?<p className="text-sm text-sec">No data for this view.</p>:<div className="h-56"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/>
  {line!=null&&<ReferenceLine y={line} stroke="#727687" strokeDasharray="4 4"/>}<Bar dataKey="rate" fill={color} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>}</div>}
export default function ProductPage({rows,code,setCode,target,costs}:{costs:Costs;rows:Row[];code:string|null;setCode:(c:string)=>void;target:number}){
 const products=useMemo(()=>{const m=new Map<string,string>();rows.forEach(r=>m.set(r.code,r.item));return [...m]},[rows])
 const [cmp,setCmp]=useState('')
 if(!products.length) return <p className={card}>No production data available for these filters.</p>
 const cur=code&&products.some(p=>p[0]===code)?code:products[0][0]
 const name=(c:string)=>products.find(p=>p[0]===c)?.[1]??c
 const mine=rows.filter(r=>r.code===cur),s=stats(mine,costs)
 const other=cmp&&cmp!==cur&&products.some(p=>p[0]===cmp)?stats(rows.filter(r=>r.code===cmp),costs):null
 const money=(n:number,ok:boolean)=>ok?'$'+Math.round(n).toLocaleString():'Cost data unavailable'
 const by=(fn:(r:Row)=>string)=>group(mine,fn).sort((a,b)=>a.k.localeCompare(b.k))
 const reasons=group(mine,r=>r.reason).sort((a,b)=>b.defect-a.defect)
 const daily=by(r=>r.date)
 const kp:[string,string,boolean?][]=[['Output',s.prod.toLocaleString()],['Defects',s.def.toLocaleString()],['Defect rate',s.rate.toFixed(2)+'%',s.rate>target],
  ['Current streak',s.st.current+' days'],['Best streak',s.st.best+' days'],['Est. loss',money(s.loss,s.hasCost)],['Est. profit',money(s.profit,s.hasProfit)],
  ['Rate vs target',`${s.rate>=target?'+':''}${(s.rate-target).toFixed(2)} pts`,s.rate>target]]
 const Pick=({v,on,none}:{v:string;on:(c:string)=>void;none?:boolean})=><select value={v} onChange={e=>on(e.target.value)} className="border border-line/60 rounded-lg px-2 py-1 text-sm bg-low">{none&&<option value="">None</option>}{products.map(([c,n])=><option key={c} value={c}>{n} ({c})</option>)}</select>
 return <div className="space-y-4">
  <div className={`${card} flex flex-wrap items-center gap-3`}><h1 className="text-lg font-bold">Product analysis</h1><Pick v={cur} on={setCode}/>
   <span className="text-sm text-sec ml-auto">Compare with</span><Pick v={cmp} on={setCmp} none/></div>
  <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">{kp.map(([l,v,bad])=><div key={l} className={card}><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{l}</div><div className={`text-xl font-bold mt-1 ${bad?'text-err':''}`}>{v}</div></div>)}</section>
  <p className="text-xs text-sec">Streaks count consecutive calendar days with production, calculated from dates. The dataset has no production target, so quality is compared with the defect-rate target of {target}%.</p>
  {other&&<div className={`${card} overflow-x-auto`}><h3 className="font-bold mb-2">Comparison</h3><table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Metric</th><th>{name(cur)}</th><th>{name(cmp)}</th></tr></thead><tbody>
   {([['Output',(x:typeof s)=>x.prod.toLocaleString()],['Defects',x=>x.def.toLocaleString()],['Defect rate',x=>x.rate.toFixed(2)+'%'],['Best streak',x=>x.st.best+' days'],['Est. loss',x=>money(x.loss,x.hasCost)],['Est. profit',x=>money(x.profit,x.hasProfit)]] as [string,(x:typeof s)=>string][]).map(([l,fn])=><tr key={l} className="border-t border-line/30"><td className="py-2 font-semibold">{l}</td><td>{fn(s)}</td><td>{fn(other)}</td></tr>)}</tbody></table></div>}
  <section className="grid lg:grid-cols-2 gap-4">
   <div className={card}><h3 className="font-bold mb-2">Daily defect rate</h3><div className="h-56"><ResponsiveContainer><LineChart data={daily}><XAxis dataKey="k" tickFormatter={d=>d.slice(5)} fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><ReferenceLine y={target} stroke="#727687" strokeDasharray="4 4"/><Line dataKey="rate" stroke="#ba1a1a" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></div>
   <Bars title="Monthly defect rate" data={by(r=>r.date.slice(0,7))} color="#0050cb" line={target}/>
   <Bars title="Yearly defect rate" data={by(r=>r.date.slice(0,4))} color="#515f78" line={target}/>
   {reasons.every(r=>r.defect===0)?<div className={card}><h3 className="font-bold mb-2">Defect reasons</h3><p className="text-sm text-sec">No defects found for this product.</p></div>
    :<div className={card}><h3 className="font-bold mb-2">Defect reasons (units)</h3><div className="h-56"><ResponsiveContainer><BarChart data={reasons} layout="vertical"><XAxis type="number" fontSize={11}/><YAxis type="category" dataKey="k" width={110} fontSize={11}/><Tooltip/><Bar dataKey="defect" fill="#ba1a1a" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div></div>}
   <Bars title="Shift performance" data={by(r=>r.shift)} color="#007c96" line={target}/>
   <Bars title="Production-line performance" data={by(r=>r.line)} color="#0066ff" line={target}/>
  </section></div>}
