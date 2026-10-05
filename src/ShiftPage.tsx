import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Row, group } from './lib'
export interface Th { attn:number; crit:number }
const card='bg-white rounded-2xl shadow-sm p-5'
const ORDER=['Morning','Evening','Night']
const LINE=['#0050cb','#007c96','#ba1a1a','#515f78','#c2c6d8']
const ord=(s:string)=>{const i=ORDER.indexOf(s);return i<0?9:i}
export const level=(r:number,t:Th)=>r>=t.crit?'Critical':r>=t.attn?'Attention':'Good'
export const tone:Record<string,string>={Good:'bg-green-100 text-green-800',Attention:'bg-yellow-100 text-yellow-800',Critical:'bg-errc text-err'}
const Chip=({r,t}:{r:number;t:Th})=><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tone[level(r,t)]}`}>{level(r,t)}</span>
type G={k:string;prod:number;defect:number;loss:number;rate:number}
function Table({title,data,t,hasCost,note}:{title:string;data:G[];t:Th;hasCost:boolean;note?:string}){
 return <div className={`${card} overflow-x-auto`}><h3 className="font-bold mb-1">{title}</h3>{note&&<p className="text-xs text-sec mb-2">{note}</p>}
  <table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Name</th><th>Output</th><th>Defects</th><th>Rate</th><th>Est. loss</th><th>Status</th></tr></thead><tbody>
  {data.map(d=><tr key={d.k} className="border-t border-line/30"><td className="py-2 font-semibold">{d.k}</td><td>{d.prod.toLocaleString()}</td><td>{d.defect.toLocaleString()}</td><td>{d.rate.toFixed(2)}%</td>
   <td>{hasCost?'$'+Math.round(d.loss).toLocaleString():'Cost data unavailable'}</td><td><Chip r={d.rate} t={t}/></td></tr>)}</tbody></table></div>}
export default function ShiftPage({rows,th,setTh,onDrill}:{rows:Row[];th:Th;setTh:(t:Th)=>void;onDrill:(code:string,shift:string)=>void}){
 const shifts=useMemo(()=>[...new Set(rows.map(r=>r.shift))].sort((a,b)=>ord(a)-ord(b)||a.localeCompare(b)),[rows])
 const byShift=useMemo(()=>group(rows,r=>r.shift).sort((a,b)=>ord(a.k)-ord(b.k)||a.k.localeCompare(b.k)),[rows])
 const teams=useMemo(()=>group(rows,r=>r.team).sort((a,b)=>b.rate-a.rate),[rows])
 const lines=useMemo(()=>group(rows,r=>r.line).sort((a,b)=>b.rate-a.rate),[rows])
 const trend=useMemo(()=>{const m=new Map<string,Record<string,number|string>>()
  group(rows,r=>r.date+'|'+r.shift).forEach(x=>{const [d,s]=x.k.split('|');const o=m.get(d)??{k:d};o[s]=+x.rate.toFixed(2);m.set(d,o)})
  return [...m.values()].sort((a,b)=>String(a.k).localeCompare(String(b.k)))},[rows])
 const cells=useMemo(()=>{const m=new Map<string,G>();group(rows,r=>r.code+'|'+r.shift).forEach(g=>m.set(g.k,g));return m},[rows])
 const prods=useMemo(()=>{const m=new Map<string,string>();rows.forEach(r=>m.set(r.code,r.item));return [...m].sort((a,b)=>a[1].localeCompare(b[1]))},[rows])
 const hasCost=rows.some(r=>r.cost!=null)
 if(!rows.length) return <p className={card}>No production data available for these filters.</p>
 const num=(k:keyof Th)=><input type="number" step="0.1" min="0" value={th[k]} aria-label={k==='attn'?'Attention threshold':'Critical threshold'} onChange={e=>{const v=Math.max(0,Number(e.target.value)||0);setTh({...th,[k]:v})}} className="w-20 border border-line/60 rounded-lg px-2 py-1 text-sm bg-low"/>
 return <div className="space-y-4">
  <div className={`${card} flex flex-wrap items-center gap-3`}><h1 className="text-lg font-bold">Shift & workforce</h1>
   <div className="ml-auto flex flex-wrap items-center gap-2 text-sm text-sec">Attention from {num('attn')}% · Critical from {num('crit')}% defect rate</div></div>
  <p className="text-xs text-sec">Differences between shifts and teams are observed patterns that call for investigation. They do not show the cause, and they say nothing about individual people. This dataset has no production target, so target achievement is unavailable.</p>
  <Table title="Shift performance" data={byShift} t={th} hasCost={hasCost}/>
  <section className="grid lg:grid-cols-2 gap-4">
   <div className={card}><h3 className="font-bold mb-2">Shift comparison (defect rate)</h3><div className="h-60"><ResponsiveContainer><BarChart data={byShift}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><Bar dataKey="rate" fill="#007c96" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
   <div className={card}><h3 className="font-bold mb-2">Shift defect trend</h3><div className="h-60"><ResponsiveContainer><LineChart data={trend}><XAxis dataKey="k" tickFormatter={d=>String(d).slice(5)} fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip/><Legend/>{shifts.map((s,i)=><Line key={s} dataKey={s} stroke={LINE[i%5]} strokeWidth={2} dot={false} connectNulls/>)}</LineChart></ResponsiveContainer></div></div>
  </section>
  <div className={`${card} overflow-x-auto`}><h3 className="font-bold mb-1">Product × shift heatmap</h3><p className="text-xs text-sec mb-2">Defect rate per cell. Select a cell to open that product with that shift applied.</p>
   <table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Product</th>{shifts.map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>
   {prods.map(([c,n])=><tr key={c} className="border-t border-line/30"><td className="py-1.5 font-semibold">{n}</td>{shifts.map(s=>{const g=cells.get(c+'|'+s)
    return <td key={s} className="p-1">{g?<button onClick={()=>onDrill(c,s)} className={`w-full rounded-lg px-2 py-1.5 font-semibold ${tone[level(g.rate,th)]}`}>{g.rate.toFixed(2)}%</button>:<span className="text-sec">No data</span>}</td>})}</tr>)}</tbody></table></div>
  <section className="grid lg:grid-cols-2 gap-4">
   <Table title="Team performance" data={teams} t={th} hasCost={hasCost}/>
   <Table title="Production-line performance" data={lines} t={th} hasCost={hasCost}/>
  </section></div>}
