import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Row, group, streaks } from './lib'
import { Th, level, tone } from './ShiftPage'
const card='bg-white rounded-2xl shadow-sm p-5'
const DAY=864e5
const bucket=(n:number)=>n<=3?`Day ${n}`:n<=6?'Days 4-6':'Day 7+'
const BUCKETS=['Day 1','Day 2','Day 3','Days 4-6','Day 7+']
const Kpi=({l,v,sub}:{l:string;v:string;sub?:string})=><div className={card}><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{l}</div><div className="text-xl font-bold mt-1">{v}</div>{sub&&<div className="text-xs text-sec">{sub}</div>}</div>
export default function ProductionPage({rows,th,onDay}:{rows:Row[];th:Th;onDay:(d:string)=>void}){
 const d=useMemo(()=>{
  const dm=new Map<string,{prod:number;def:number}>()
  rows.forEach(r=>{const o=dm.get(r.date)??{prod:0,def:0};o.prod+=r.prod;o.def+=r.defect;dm.set(r.date,o)})
  const all=[...dm.keys()].sort();if(!all.length)return null
  const first=all[0],last=all[all.length-1],span=Math.round((Date.parse(last)-Date.parse(first))/DAY)+1
  const pdays=all.filter(x=>dm.get(x)!.prod>0)
  const agg=new Map<string,{prod:number;def:number}>();let run=0,prev=0
  for(const x of pdays){const t=Date.parse(x);run=prev&&t-prev===DAY?run+1:1;prev=t
   const b=bucket(run),o=agg.get(b)??{prod:0,def:0};o.prod+=dm.get(x)!.prod;o.def+=dm.get(x)!.def;agg.set(b,o)}
  const byStreak=BUCKETS.filter(b=>agg.has(b)).map(b=>({k:b,rate:agg.get(b)!.def/agg.get(b)!.prod*100,days:0}))
  const months:string[]=[];let [y,m]=first.slice(0,7).split('-').map(Number);const [ly,lm]=last.slice(0,7).split('-').map(Number)
  while(y<ly||(y===ly&&m<=lm)){months.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++}}
  const prods=group(rows,r=>r.item).map(g=>({...g,st:streaks(rows.filter(r=>r.item===g.k))})).sort((a,b)=>b.st.best-a.st.best)
  return {dm,first,last,pdays:pdays.length,off:span-pdays.length,st:streaks(rows),byStreak,months,prods}},[rows])
 if(!d) return <p className={card}>No production data available for these filters.</p>
 return <div className="space-y-4">
  <section className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Kpi l="Current streak" v={d.st.current+' days'} sub={`Ending ${d.last}`}/><Kpi l="Best streak" v={d.st.best+' days'}/><Kpi l="Production days" v={String(d.pdays)}/><Kpi l="No-production days" v={String(d.off)} sub="Weekends and holidays included"/></section>
  <p className="text-xs text-sec">Streaks are consecutive calendar days with production, calculated from the dates (any streak value in your file is ignored). Range: {d.first} to {d.last}.</p>
  <section className="grid lg:grid-cols-3 gap-4">
   <div className={card}><h3 className="font-bold mb-1">Defect rate by streak day</h3><p className="text-xs text-sec mb-2">An observed pattern, not proof that streak length affects quality.</p><div className="h-56"><ResponsiveContainer><BarChart data={d.byStreak}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><Bar dataKey="rate" fill="#0050cb" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
   <div className={`${card} lg:col-span-2 overflow-x-auto`}><h3 className="font-bold mb-2">Streaks by product</h3><table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Product</th><th>Current</th><th>Best</th><th>Production days</th><th>Defect rate</th></tr></thead><tbody>
    {d.prods.map(p=><tr key={p.k} className="border-t border-line/30"><td className="py-2 font-semibold">{p.k}</td><td>{p.st.current}</td><td>{p.st.best}</td><td>{p.st.days}</td><td>{p.rate.toFixed(2)}%</td></tr>)}</tbody></table></div>
  </section>
  <div className={card}><div className="flex flex-wrap items-center gap-3 mb-3"><h3 className="font-bold">Production calendar</h3>
   <span className="text-xs text-sec ml-auto flex items-center gap-2"><i className={`w-3 h-3 rounded ${tone.Good}`}/>Good<i className={`w-3 h-3 rounded ${tone.Attention}`}/>Attention<i className={`w-3 h-3 rounded ${tone.Critical}`}/>Critical<i className="w-3 h-3 rounded bg-low border border-line/60"/>No production</span></div>
   <p className="text-xs text-sec mb-3">Daily defect rate. Select a day to open the overview for that date.</p>
   <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">{d.months.map(m=>{const [y,mo]=m.split('-').map(Number),dim=new Date(Date.UTC(y,mo,0)).getUTCDate(),lead=new Date(Date.UTC(y,mo-1,1)).getUTCDay()
    return <div key={m}><h4 className="font-semibold mb-1">{m}</h4><div className="grid grid-cols-7 gap-1 text-center text-xs">
     {'SMTWTFS'.split('').map((c,i)=><div key={i} className="text-sec">{c}</div>)}{Array.from({length:lead},(_,i)=><div key={'b'+i}/>)}
     {Array.from({length:dim},(_,i)=>{const date=`${m}-${String(i+1).padStart(2,'0')}`,v=d.dm.get(date),inR=date>=d.first&&date<=d.last
      if(!inR)return <div key={date} className="py-1.5 text-line">{i+1}</div>
      if(!v||v.prod===0)return <div key={date} title={`${date}: no production`} className="py-1.5 rounded bg-low border border-line/60 text-sec">{i+1}</div>
      const r=v.def/v.prod*100
      return <button key={date} onClick={()=>onDay(date)} title={`${date}: ${r.toFixed(2)}% defect rate, ${v.prod.toLocaleString()} units`} className={`py-1.5 rounded font-semibold ${tone[level(r,th)]}`}>{i+1}</button>})}
    </div></div>})}</div></div>
 </div>}
