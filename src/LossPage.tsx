import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Row, Costs, finance } from './lib'
const card='bg-white rounded-2xl shadow-sm p-5'
const fm=(n:number)=>(n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString()
const tip=(v:number)=>fm(v)
function Kpi({l,v,ok,why,bad}:{l:string;v:number;ok:boolean;why:string;bad?:boolean}){return <div className={card}><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{l}</div>
 {ok?<div className={`text-xl font-bold mt-1 ${bad?'text-err':''}`}>{fm(v)}</div>:<div className="text-sm font-semibold text-sec mt-2">{why}</div>}</div>}
export default function LossPage({rows,costs,setCosts,onProduct}:{rows:Row[];costs:Costs;setCosts:(c:Costs)=>void;onProduct:(code:string)=>void}){
 const f=useMemo(()=>finance(rows,costs),[rows,costs])
 const split=useMemo(()=>(key:(r:Row)=>string,c:Costs)=>{const m=new Map<string,Row[]>();rows.forEach(r=>{const k=key(r),a=m.get(k);a?a.push(r):m.set(k,[r])})
  return [...m].map(([k,rs])=>({k,code:rs[0].code,...finance(rs,c)}))},[rows])
 const prod=useMemo(()=>split(r=>r.item,costs).sort((a,b)=>b.loss-a.loss),[split,costs])
 const line=useMemo(()=>split(r=>r.line,costs).sort((a,b)=>b.loss-a.loss),[split,costs])
 const reason=useMemo(()=>split(r=>r.reason,{}).filter(g=>g.scrap>0).sort((a,b)=>b.scrap-a.scrap),[split])
 const month=useMemo(()=>split(r=>r.date.slice(0,7),costs).sort((a,b)=>a.k.localeCompare(b.k)),[split,costs])
 if(!rows.length) return <p className={card}>No production data available for these filters.</p>
 const inp=(k:keyof Costs,l:string)=><label className="text-xs font-semibold text-sec flex flex-col gap-1">{l}<input type="number" min="0" step="0.01" value={costs[k]??''} placeholder="Not set" onChange={e=>setCosts({...costs,[k]:e.target.value===''?undefined:Math.max(0,Number(e.target.value)||0)})} className="w-36 border border-line/60 rounded-lg px-2 py-1 text-sm bg-low text-ink font-normal"/></label>
 const noCost='Cost data unavailable'
 return <div className="space-y-4">
  <div className={`${card} flex flex-wrap items-end gap-4`}><h1 className="text-lg font-bold mr-auto">Loss & profit</h1>{inp('rework','Rework cost per unit ($)')}{inp('downtime','Downtime cost per hour ($)')}</div>
  <p className="text-xs text-sec">Scrap cost is defect units × unit production cost. Rework and downtime costs use the rates you enter above. Total loss adds only the components that are available. Profit is sellable units × selling price minus all units produced × unit cost, less any rework and downtime cost.</p>
  <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
   <Kpi l="Production value" v={f.value} ok={f.hasPrice} why="Selling price unavailable"/>
   <Kpi l="Scrap cost" v={f.scrap} ok={f.hasCost} why={noCost}/>
   <Kpi l="Rework cost" v={f.rework} ok={f.hasRework} why={costs.rework==null?'Enter a rework cost':'Rework data unavailable'}/>
   <Kpi l="Downtime cost" v={f.down} ok={f.hasDown} why={costs.downtime==null?'Enter a downtime cost':'Downtime data unavailable'}/>
   <Kpi l="Total est. loss" v={f.loss} ok={f.hasLoss} why={noCost} bad/>
   <Kpi l="Est. profit" v={f.profit} ok={f.hasProfit} why="Cost or price data unavailable" bad={f.profit<0}/></section>
  {!f.hasLoss?<p className={card}>No cost information available to calculate loss. Add a Unit Production Cost column to your file or enter rework and downtime costs above.</p>:<>
  <section className="grid lg:grid-cols-2 gap-4">
   <div className={card}><h3 className="font-bold mb-2">Profit vs loss by month</h3><div className="h-60"><ResponsiveContainer><BarChart data={month}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} tickFormatter={v=>'$'+Math.round(v/1000)+'k'}/><Tooltip formatter={tip}/><Legend/>{f.hasProfit&&<Bar dataKey="profit" name="Profit" fill="#0050cb" radius={[4,4,0,0]}/>}<Bar dataKey="loss" name="Loss" fill="#ba1a1a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
   <div className={card}><h3 className="font-bold mb-2">Monthly loss trend</h3><div className="h-60"><ResponsiveContainer><LineChart data={month}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} tickFormatter={v=>'$'+Math.round(v/1000)+'k'}/><Tooltip formatter={tip}/><Line dataKey="loss" stroke="#ba1a1a" strokeWidth={2}/></LineChart></ResponsiveContainer></div></div>
   <div className={card}><h3 className="font-bold mb-1">Loss by product</h3><p className="text-xs text-sec">Select a bar to open the product.</p><div className="h-56"><ResponsiveContainer><BarChart data={prod}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} tickFormatter={v=>'$'+Math.round(v/1000)+'k'}/><Tooltip formatter={tip}/><Bar dataKey="loss" fill="#0050cb" radius={[4,4,0,0]} cursor="pointer" onClick={(x:{code:string})=>onProduct(x.code)}/></BarChart></ResponsiveContainer></div></div>
   <div className={card}><h3 className="font-bold mb-1">Loss by production line</h3><p className="text-xs text-sec invisible">.</p><div className="h-56"><ResponsiveContainer><BarChart data={line}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} tickFormatter={v=>'$'+Math.round(v/1000)+'k'}/><Tooltip formatter={tip}/><Bar dataKey="loss" fill="#007c96" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
   {f.hasCost&&<div className={`${card} lg:col-span-2`}><h3 className="font-bold mb-1">Loss by defect reason</h3><p className="text-xs text-sec mb-2">Scrap cost only. Rework and downtime are not recorded per defect reason, so they cannot be attributed here.</p><div className="h-56"><ResponsiveContainer><BarChart data={reason}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} tickFormatter={v=>'$'+Math.round(v/1000)+'k'}/><Tooltip formatter={tip}/><Bar dataKey="scrap" name="Scrap cost" fill="#ba1a1a" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>}
  </section></>}
 </div>}
