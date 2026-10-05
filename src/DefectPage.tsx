import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Row, group } from './lib'
import { Th, level, tone } from './ShiftPage'
const card='bg-white rounded-2xl shadow-sm p-5'
const COL=['#0050cb','#ba1a1a','#007c96','#515f78','#c2c6d8','#8a5a00','#6a3fb5']
const SEP='\u0001'
const Kpi=({l,v,sub,bad}:{l:string;v:string;sub?:string;bad?:boolean})=><div className={card}><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{l}</div><div className={`text-xl font-bold mt-1 ${bad?'text-err':''}`}>{v}</div>{sub&&<div className="text-xs text-sec">{sub}</div>}</div>
export default function DefectPage({rows,th,onProduct,onReason}:{rows:Row[];th:Th;onProduct:(code:string)=>void;onReason:(r:string)=>void}){
 const d=useMemo(()=>{
  const prod=rows.reduce((a,r)=>a+r.prod,0),def=rows.reduce((a,r)=>a+r.defect,0)
  const reasons=group(rows,r=>r.reason).filter(g=>g.defect>0).sort((a,b)=>b.defect-a.defect)
  const names=reasons.map(r=>r.k)
  const pv=(key:(r:Row)=>string)=>{const m=new Map<string,Record<string,number|string>>()
   group(rows,r=>key(r)+SEP+r.reason).forEach(g=>{const [x,re]=g.k.split(SEP);const o=m.get(x)??{k:x};o[re]=g.defect;m.set(x,o)});return [...m.values()]}
  const products=group(rows,r=>r.item).sort((a,b)=>b.rate-a.rate)
  const code=new Map<string,string>();rows.forEach(r=>code.set(r.item,r.code))
  const months=[...new Set(rows.map(r=>r.date.slice(0,7)))].sort()
  const cells=new Map<string,number>();group(rows,r=>r.item+SEP+r.date.slice(0,7)).forEach(g=>cells.set(g.k,g.rate))
  return {prod,def,reasons,names,products,code,months,cells,byProd:pv(r=>r.item),byShift:pv(r=>r.shift),
   monthly:group(rows,r=>r.date.slice(0,7)).sort((a,b)=>a.k.localeCompare(b.k)),
   worstShift:group(rows,r=>r.shift).sort((a,b)=>b.rate-a.rate)[0],worstLine:group(rows,r=>r.line).sort((a,b)=>b.rate-a.rate)[0]}},[rows])
 if(!rows.length) return <p className={card}>No production data available for these filters.</p>
 const rate=d.prod?d.def/d.prod*100:0,top=d.reasons[0],w=d.products[0]
 const Stack=({title,data}:{title:string;data:Record<string,number|string>[]})=><div className={card}><h3 className="font-bold mb-2">{title}</h3><div className="h-64"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11}/><Tooltip/><Legend/>
  {d.names.map((n,i)=><Bar key={n} dataKey={n} stackId="a" fill={COL[i%7]}/>)}</BarChart></ResponsiveContainer></div></div>
 return <div className="space-y-4">
  <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
   <Kpi l="Total defects" v={d.def.toLocaleString()}/><Kpi l="Defect rate" v={rate.toFixed(2)+'%'} bad={rate>=th.attn}/>
   <Kpi l="Top defect reason" v={top?top.k:'None'} sub={top?`${(top.defect/d.def*100).toFixed(1)}% of defects`:'No defects found'}/>
   <Kpi l="Worst product" v={w?w.k:'-'} sub={w?w.rate.toFixed(2)+'%':''} bad/><Kpi l="Worst shift" v={d.worstShift?.k??'-'} sub={d.worstShift?d.worstShift.rate.toFixed(2)+'%':''}/><Kpi l="Worst line" v={d.worstLine?.k??'-'} sub={d.worstLine?d.worstLine.rate.toFixed(2)+'%':''}/></section>
  {d.def===0?<p className={card}>No defects found for these filters.</p>:<>
  <section className="grid lg:grid-cols-3 gap-4">
   <div className={card}><h3 className="font-bold mb-1">Defect reasons</h3><p className="text-xs text-sec">Select a slice to filter by that reason.</p><div className="h-60"><ResponsiveContainer><PieChart><Pie data={d.reasons} dataKey="defect" nameKey="k" innerRadius={50} outerRadius={85} cursor="pointer" onClick={(x:{k:string})=>onReason(x.k)}>{d.reasons.map((_,i)=><Cell key={i} fill={COL[i%7]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>
   <div className={card}><h3 className="font-bold mb-1">Defect rate by product</h3><p className="text-xs text-sec">Select a bar to open the product.</p><div className="h-60"><ResponsiveContainer><BarChart data={d.products}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><Bar dataKey="rate" fill="#0050cb" radius={[4,4,0,0]} cursor="pointer" onClick={(x:{k:string})=>{const c=d.code.get(x.k);if(c)onProduct(c)}}/></BarChart></ResponsiveContainer></div></div>
   <div className={card}><h3 className="font-bold mb-2">Monthly defect trend</h3><div className="h-60"><ResponsiveContainer><LineChart data={d.monthly}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><Line dataKey="rate" stroke="#ba1a1a" strokeWidth={2}/></LineChart></ResponsiveContainer></div></div>
  </section>
  <section className="grid lg:grid-cols-2 gap-4"><Stack title="Product × defect reason (units)" data={d.byProd}/><Stack title="Shift × defect reason (units)" data={d.byShift}/></section>
  <div className={`${card} overflow-x-auto`}><h3 className="font-bold mb-1">Product × month heatmap</h3><p className="text-xs text-sec mb-2">Defect rate. Green is below {th.attn}%, yellow below {th.crit}%, red from {th.crit}%. Change thresholds on the Shift & Workforce page.</p>
   <table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Product</th>{d.months.map(m=><th key={m}>{m}</th>)}</tr></thead><tbody>
   {d.products.map(p=><tr key={p.k} className="border-t border-line/30"><td className="py-1.5 font-semibold">{p.k}</td>{d.months.map(m=>{const v=d.cells.get(p.k+SEP+m)
    return <td key={m} className="p-1">{v==null?<span className="text-sec">No data</span>:<div className={`rounded-lg px-2 py-1.5 text-center font-semibold ${tone[level(v,th)]}`}>{v.toFixed(2)}%</div>}</td>})}</tr>)}</tbody></table></div></>}
 </div>}
