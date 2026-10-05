import { useEffect, useMemo, useState, useRef } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts'
import { LayoutGrid, Cpu, Users, Bug, CalendarDays, Wallet, Sparkles, Bell, TrendingUp, Workflow, HeartPulse, MessageSquare, FileText, Upload, Search, Menu, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from './auth'
import { api } from './api'
import ProductPage from './ProductPage'
import AskPage from './AskPage'
import ReportsPage from './ReportsPage'
import DataHealthPage from './DataHealthPage'
import RootCausePage from './RootCausePage'
import ActionsPage from './ActionsPage'
import ImprovementPage from './ImprovementPage'
import { useStored, Action, Imp } from './store'
import InsightsPage from './InsightsPage'
import LossPage from './LossPage'
import ProductionPage from './ProductionPage'
import DefectPage from './DefectPage'
import ShiftPage, { Th } from './ShiftPage'
import { demo, parseExcel, group, rate, finance, Row, Quality, Costs } from './lib'

const NAV=[['overview','Executive Overview',LayoutGrid],['product','Product Intelligence',Cpu],['production','Production Analytics',CalendarDays],['insights','AI Insights & Anomalies',Sparkles],['rca','Root Cause Analysis',Workflow],['alerts','Alerts & Actions',Bell],['improvement','Improvement Tracking',TrendingUp],['loss','Loss & Profit',Wallet],['defects','Defect Intelligence',Bug],['shift','Shift & Workforce',Users],['ask','Ask AI',MessageSquare],['reports','Reports & Exports',FileText],['health','Data Health',HeartPulse],['upload','Upload Data',Upload]] as const
const COLORS=['#0050cb','#ba1a1a','#007c96','#515f78','#c2c6d8']
const TARGET=1.8
const card='bg-white rounded-2xl shadow-sm p-5'
const INIT={year:'All',month:'All',day:'All',team:'All',line:'All',reason:'All'}
type F=typeof INIT
function Sel({l,v,o,on}:{l:string;v:string;o:string[];on:(v:string)=>void}){return <label className="text-xs font-semibold text-sec flex flex-col gap-1">{l}<select value={v} onChange={e=>on(e.target.value)} className="border border-line/60 rounded-lg px-2 py-1 text-sm bg-low text-ink font-normal">{['All',...o].map(x=><option key={x}>{x}</option>)}</select></label>}

function Kpi({l,v,sub,bad}:{l:string;v:string;sub?:string;bad?:boolean}){return <div className={card}><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{l}</div><div className={`text-2xl font-bold mt-1 ${bad?'text-err':''}`}>{v}</div>{sub&&<div className="text-xs text-sec">{sub}</div>}</div>}

export default function App(){
 const {user,logout}=useAuth()
 const [page,setPage]=useState<'overview'|'product'|'ask'|'reports'|'health'|'rca'|'alerts'|'improvement'|'insights'|'loss'|'production'|'defects'|'shift'|'upload'>('overview'),[nav,setNav]=useState(false)
 const [raw,setRows]=useState<Row[]>(demo),[isDemo,setIsDemo]=useState(true),[quality,setQuality]=useState<Quality|null>(null)
 const [excl,setExcl]=useStored<boolean>('fab.excludeDup',false),[known,setKnown]=useStored<string[]|null>('fab.knownReasons',null)
 const rows=useMemo(()=>excl?raw.filter(r=>!r.dup):raw,[raw,excl])
 const [pending,setPending]=useState<{rows:Row[];q:Quality;name:string}|null>(null),[err,setErr]=useState('')
 const [shift,setShift]=useState('All'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[query,setQuery]=useState(''),[sel,setSel]=useState<string|null>(null)
 const [th,setTh]=useState<Th>({attn:TARGET,crit:3})
 const [actions,setActionsRaw]=useState<Action[]>([]),[imps,setImpsRaw]=useState<Imp[]>([]),[boot,setBoot]=useState<'loading'|'ready'|'error'>('loading'),[syncErr,setSyncErr]=useState(''),[saving,setSaving]=useState(false)
 const setActions=(next:Action[])=>{const prev=actions,old=new Map<string,Action>(prev.map(a=>[a.id,a] as [string,Action]));setActionsRaw(next);setSyncErr('')
  Promise.all(next.flatMap(a=>{const o=old.get(a.id);return !o?[api('/actions',a)]:o.status!==a.status?[api(`/actions/${a.id}`,{status:a.status},'PATCH')]:[]})).catch(e=>{setActionsRaw(prev);setSyncErr((e as Error).message)})}
 const setImps=(next:Imp[])=>{const prev=imps,had=new Set(prev.map(i=>i.id)),has=new Set(next.map(i=>i.id));setImpsRaw(next);setSyncErr('')
  Promise.all([...next.filter(i=>!had.has(i.id)).map(i=>api('/improvements',i)),...prev.filter(i=>!has.has(i.id)).map(i=>api(`/improvements/${i.id}`,undefined,'DELETE'))]).catch(e=>{setImpsRaw(prev);setSyncErr((e as Error).message)})}
 useEffect(()=>{let live=true;(async()=>{try{
  const [a,i,ds]=await Promise.all([api<{actions:Action[]}>('/actions'),api<{items:Imp[]}>('/improvements'),api<{dataset:{id:string;quality:Quality}|null}>('/datasets/active')])
  let rs:Row[]|null=null
  if(ds.dataset){rs=[];for(let off=0;;off+=20000){const p=await api<{rows:Row[]}>(`/datasets/active/rows?offset=${off}&limit=20000`);rs.push(...p.rows);if(p.rows.length<20000)break}}
  if(!live)return;setActionsRaw(a.actions);setImpsRaw(i.items);if(rs){setRows(rs);setQuality(ds.dataset!.quality);setIsDemo(false)};setBoot('ready')}catch{if(live)setBoot('error')}})();return()=>{live=false}},[])
 const [aiOn,setAiOn]=useState(false)
 useEffect(()=>{api<{enabled:boolean}>('/ai/status').then(r=>setAiOn(r.enabled)).catch(()=>setAiOn(false))},[])
 const [costs,setCosts]=useState<Costs>({})
 const [f,setF]=useState<F>(INIT)
 const file=useRef<HTMLInputElement>(null)

 const shifts=useMemo(()=>['All',...new Set(rows.map(r=>r.shift))],[rows])
 const uniq=(fn:(r:Row)=>string)=>[...new Set(rows.map(fn))].sort()
 const opts=useMemo(()=>({year:uniq(r=>r.date.slice(0,4)),month:uniq(r=>r.date.slice(5,7)),day:uniq(r=>r.date.slice(8,10)),team:uniq(r=>r.team),line:uniq(r=>r.line),reason:uniq(r=>r.reason)}),[rows])
 const setFv=(k:keyof F)=>(v:string)=>setF(p=>({...p,[k]:v}))
 const drill=(c:string,s:string)=>{setSel(c);setShift(s);setPage('product')}
 const reset=()=>{setF(INIT);setShift('All');setFrom('');setTo('');setSel(null)}
 const active=sel!==null||shift!=='All'||from!==''||to!==''||Object.values(f).some(v=>v!=='All')
 const base=useMemo(()=>rows.filter(r=>(shift==='All'||r.shift===shift)&&(!from||r.date>=from)&&(!to||r.date<=to)
  &&(f.year==='All'||r.date.slice(0,4)===f.year)&&(f.month==='All'||r.date.slice(5,7)===f.month)&&(f.day==='All'||r.date.slice(8,10)===f.day)
  &&(f.team==='All'||r.team===f.team)&&(f.line==='All'||r.line===f.line)&&(f.reason==='All'||r.reason===f.reason)),[rows,shift,from,to,f])
 const filtered=useMemo(()=>sel?base.filter(r=>r.code===sel):base,[base,sel])
 const hits=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return[];const m=new Map<string,string>();rows.forEach(r=>{if(r.item.toLowerCase().includes(q)||r.code.toLowerCase().includes(q))m.set(r.code,r.item)});return [...m].slice(0,6)},[query,rows])
 const k=useMemo(()=>{const prod=filtered.reduce((a,r)=>a+r.prod,0),def=filtered.reduce((a,r)=>a+r.defect,0)
  const fin=finance(filtered,costs)
  const prods=group(filtered,r=>r.item).sort((a,b)=>b.rate-a.rate)
  return {prod,def,rate:rate(def,prod),hasCost:fin.hasLoss,hasProfit:fin.hasProfit,loss:fin.loss,profit:fin.profit,worst:prods[0],best:prods[prods.length-1],prods,
   byShift:group(filtered,r=>r.shift),byLine:group(filtered,r=>r.line),
   daily:group(filtered,r=>r.date).sort((a,b)=>a.k.localeCompare(b.k)),reasons:group(filtered,r=>r.reason).sort((a,b)=>b.defect-a.defect)}},[filtered,costs])

 const onFile=async(f?:File)=>{if(!f)return;setErr('');try{setPending({...(await parseExcel(f)),name:f.name})}catch(e){setErr((e as Error).message)}}
 const confirm=async()=>{if(!pending||pending.q.missingRequired.length>0||saving)return;setSaving(true);setErr('')
  try{await api('/datasets',{filename:pending.name,rows:pending.rows,quality:{...pending.q,warnings:pending.q.warnings.slice(0,2000),bad:pending.q.bad.slice(0,2000)}})
   setRows(pending.rows);setQuality(pending.q);setIsDemo(false);setF(INIT);setShift('All');setFrom('');setTo('');setPending(null);setSel(null);setPage('overview')}
  catch(e){setErr((e as Error).message)}finally{setSaving(false)}}
 const fmt=(n:number)=>n.toLocaleString(); const money=(n:number,ok=k.hasCost)=>ok?'$'+Math.round(n).toLocaleString():'Cost data unavailable'
 const insights=useMemo(()=>{const out:string[]=[];if(k.worst)out.push(`${k.worst.k} has the highest defect rate: ${k.worst.rate.toFixed(2)}% vs overall ${k.rate.toFixed(2)}% (target ${TARGET}%).`)
  const ws=[...k.byShift].sort((a,b)=>b.rate-a.rate)[0];if(ws)out.push(`${ws.k} shift shows the highest defect rate (${ws.rate.toFixed(2)}%). This is an association; investigate before assigning a cause.`)
  if(k.reasons[0])out.push(`Most frequent defect reason: ${k.reasons[0].k} (${fmt(k.reasons[0].defect)} units).`);return out},[k])

 if(boot==='loading')return <p className="p-10 text-sec" role="status">Loading your data...</p>
 if(boot==='error')return <div className="p-10"><p role="alert" className="text-err">Could not load your data from the server.</p><button onClick={()=>location.reload()} className="mt-3 px-3 py-1.5 rounded-lg bg-pc text-white font-semibold">Try again</button></div>
 return <div className="min-h-screen">
  {nav&&<div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={()=>setNav(false)} aria-hidden="true"/>}
  <aside className={`fixed left-0 top-0 h-full w-72 overflow-y-auto bg-low border-r border-line/40 z-50 transition-transform ${nav?'':'-translate-x-full'} lg:translate-x-0`}>
   <div className="h-16 px-5 flex items-center border-b border-line/40"><div><div className="font-bold">SAMSUNG AI</div><div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Fab Intelligence</div></div></div>
   <nav className="p-3 space-y-1">{NAV.map(([id,label,Icon])=><button key={id} onClick={()=>{setPage(id);setNav(false)}} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${page===id?'bg-pc text-white font-semibold':'text-sec hover:bg-high'}`}><Icon size={18}/>{label}</button>)}</nav>
  </aside>
  <div className="lg:pl-72">
   <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line/40 px-4 h-16 flex items-center gap-3">
    <button className="lg:hidden" aria-label="Menu" onClick={()=>setNav(!nav)}><Menu/></button>
    <div className="relative w-full max-w-sm min-w-0"><Search size={16} className="absolute left-3 top-2.5 text-sec"/>
     <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Item name or item code..." className="w-full pl-9 py-1.5 bg-low border border-line/60 rounded-lg text-sm"/>
     {hits.length>0&&<ul className="absolute mt-1 w-full bg-white rounded-lg shadow-lg border border-line/40">{hits.map(([c,n])=><li key={c}><button className="w-full text-left px-3 py-2 text-sm hover:bg-low" onClick={()=>{setSel(c);setQuery('');setPage('overview')}}>{n} <span className="text-sec">({c})</span></button></li>)}</ul>}</div>
    <input type="date" value={from} onChange={e=>setFrom(e.target.value)} aria-label="From" className="hidden md:block border border-line/60 rounded-lg px-2 py-1 text-sm bg-low"/>
    <input type="date" value={to} onChange={e=>setTo(e.target.value)} aria-label="To" className="hidden md:block border border-line/60 rounded-lg px-2 py-1 text-sm bg-low"/>
    <select value={shift} onChange={e=>setShift(e.target.value)} className="border border-line/60 rounded-lg px-2 py-1 text-sm bg-low">{shifts.map(s=><option key={s}>{s}</option>)}</select>
   <div className="ml-auto flex items-center gap-2"><span className="hidden md:block text-sm font-semibold">{user.name}</span><button onClick={logout} className="px-3 py-1.5 rounded-lg bg-low text-primary text-sm font-semibold">Sign out</button></div></header>
   <main className="p-4 lg:p-6 space-y-5">
    {syncErr&&<p role="alert" className="bg-errc text-err rounded-lg p-3 text-sm">Could not save your change: {syncErr}</p>}
    {page==='upload'?<section className={card}>
     <h1 className="text-lg font-bold mb-3">Upload production data</h1>
     <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files[0])}} onClick={()=>file.current?.click()} className="border-2 border-dashed border-line rounded-xl p-10 text-center cursor-pointer hover:bg-low">
      <Upload className="mx-auto mb-2 text-primary"/>Drop an .xlsx, .xls or .csv file here, or click to browse
      <input ref={file} type="file" hidden accept=".xlsx,.xls,.csv" onChange={e=>onFile(e.target.files?.[0])}/></div>
     {err&&<p role="alert" className="mt-3 text-err">{err}</p>}
     {pending&&<div className="mt-4 space-y-2 text-sm">
      <p><b>{fmt(pending.q.rows)}</b> rows. Columns detected: {pending.q.columns.join(', ')||'none'}</p>
      {pending.q.missingRequired.length>0&&<p className="text-err">Missing required columns: {pending.q.missingRequired.join(', ')}. Add them and re-upload.</p>}
      <p>Invalid dates: {pending.q.invalidDates} · Invalid quantities: {pending.q.invalidQty} · Duplicate rows: {pending.q.duplicates}. Invalid rows are excluded from analysis and listed below.</p>
      {pending.q.warnings.length>0&&<ul className="max-h-40 overflow-auto bg-errc/40 rounded-lg p-2">{pending.q.warnings.slice(0,200).map((w,i)=><li key={i}>{w}</li>)}</ul>}
      <button onClick={confirm} disabled={pending.q.missingRequired.length>0||saving} className="px-4 py-2 rounded-lg bg-pc text-white font-semibold disabled:opacity-40">{saving?'Saving dataset...':'Confirm dataset and run analysis'}</button></div>}
    </section>:<>
     <div className="flex flex-wrap items-center gap-2 text-sm text-sec">
      {isDemo&&<span className="px-2 py-0.5 rounded-full bg-high font-semibold text-primary">Demo data</span>}
      <span>{({product:'Product Intelligence',shift:'Shift & Workforce',defects:'Defect Intelligence',production:'Production Analytics',loss:'Loss & Profit',insights:'AI Insights & Anomalies',alerts:'Alerts & Actions',rca:'Root Cause Analysis',health:'Data Health',reports:'Reports & Exports',ask:'Ask AI',improvement:'Improvement Tracking',overview:'Executive Overview',upload:'Upload Data'})[page]}</span>{sel&&<button onClick={()=>setSel(null)} className="px-2 py-0.5 rounded-full bg-low font-semibold text-ink">Product: {sel} ✕</button>}</div>
     <section aria-label="Filters" className={`${card} flex flex-wrap items-end gap-3`}>
      <Sel l="Year" v={f.year} o={opts.year} on={setFv('year')}/><Sel l="Month" v={f.month} o={opts.month} on={setFv('month')}/><Sel l="Day" v={f.day} o={opts.day} on={setFv('day')}/>
      <Sel l="Team" v={f.team} o={opts.team} on={setFv('team')}/><Sel l="Production line" v={f.line} o={opts.line} on={setFv('line')}/><Sel l="Defect reason" v={f.reason} o={opts.reason} on={setFv('reason')}/>
      <button onClick={reset} disabled={!active} className="px-3 py-1.5 rounded-lg bg-low text-primary text-sm font-semibold disabled:opacity-40">Reset filters</button>
      <span className="text-xs text-sec ml-auto">{filtered.length.toLocaleString()} of {rows.length.toLocaleString()} records</span></section>
     {page==='ask'?<AskPage aiOn={aiOn} excl={excl} costs={costs} th={th}/>:page==='reports'?<ReportsPage rows={rows} th={th} costs={costs}/>:page==='health'?<DataHealthPage raw={raw} quality={quality} isDemo={isDemo} excl={excl} setExcl={setExcl} known={known} setKnown={setKnown}/>:page==='rca'?<RootCausePage aiOn={aiOn} excl={excl} rows={filtered} allRows={rows} th={th} costs={costs} actions={actions} imps={imps} onNav={p=>setPage(p as typeof page)}/>:page==='alerts'?<ActionsPage rows={filtered} th={th} costs={costs} actions={actions} setActions={setActions}/>:page==='improvement'?<ImprovementPage rows={rows} costs={costs} items={imps} setItems={setImps}/>:page==='insights'?<InsightsPage aiOn={aiOn} excl={excl} rows={filtered} th={th} costs={costs} onProduct={c=>{setSel(c);setPage('product')}}/>:page==='loss'?<LossPage rows={filtered} costs={costs} setCosts={setCosts} onProduct={c=>{setSel(c);setPage('product')}}/>:page==='production'?<ProductionPage rows={filtered} th={th} onDay={d=>{setFrom(d);setTo(d);setPage('overview')}}/>:page==='defects'?<DefectPage rows={filtered} th={th} onProduct={c=>{setSel(c);setPage('product')}} onReason={r=>setF(p=>({...p,reason:r}))}/>:page==='shift'?<ShiftPage rows={base} th={th} setTh={setTh} onDrill={drill}/>:page==='product'?<ProductPage costs={costs} rows={base} code={sel} setCode={setSel} target={TARGET}/>:filtered.length===0?<p className={card}>No production data available for these filters.</p>:<>
     <section className="bg-inv text-white rounded-2xl p-5"><h2 className="font-bold mb-2">Management summary</h2>
      <ul className="space-y-1 text-sm text-white/90 list-disc pl-5">{insights.map((t,i)=><li key={i}>{t}</li>)}</ul></section>
     <section className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <Kpi l="Total output" v={fmt(k.prod)}/><Kpi l="Defects" v={fmt(k.def)}/><Kpi l="Defect rate" v={k.rate.toFixed(2)+'%'} sub={`Target ${TARGET}%`} bad={k.rate>TARGET}/>
      <Kpi l="Est. loss" v={money(k.loss)}/><Kpi l="Est. profit" v={money(k.profit,k.hasProfit)}/><Kpi l="Worst product" v={k.worst?.k??'-'} sub={k.worst?k.worst.rate.toFixed(2)+'%':''} bad/></section>
     <section className="grid xl:grid-cols-3 gap-4">
      <div className={`${card} xl:col-span-2`}><h3 className="font-bold mb-2">Daily defect rate</h3><div className="h-64"><ResponsiveContainer><LineChart data={k.daily}><XAxis dataKey="k" tickFormatter={d=>d.slice(5)} fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><ReferenceLine y={TARGET} stroke="#727687" strokeDasharray="4 4"/><Line dataKey="rate" stroke="#ba1a1a" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></div>
      <div className={card}><h3 className="font-bold mb-2">Defect reasons</h3><div className="h-64"><ResponsiveContainer><PieChart><Pie data={k.reasons} dataKey="defect" nameKey="k" innerRadius={50} outerRadius={85}>{k.reasons.map((_,i)=><Cell key={i} fill={COLORS[i%5]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>
      <div className={`${card} xl:col-span-2`}><h3 className="font-bold mb-2">Defect rate by product (click to drill down)</h3><div className="h-64"><ResponsiveContainer><BarChart data={k.prods}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><Bar dataKey="rate" fill="#0050cb" radius={[4,4,0,0]} cursor="pointer" onClick={(d:{k:string})=>{const r=rows.find(x=>x.item===d.k);if(r)setSel(r.code)}}/></BarChart></ResponsiveContainer></div></div>
      <div className={card}><h3 className="font-bold mb-2">Shift comparison</h3><div className="h-64"><ResponsiveContainer><BarChart data={k.byShift}><XAxis dataKey="k" fontSize={11}/><YAxis fontSize={11} unit="%"/><Tooltip formatter={(v:number)=>v.toFixed(2)+'%'}/><Bar dataKey="rate" fill="#007c96" radius={[4,4,0,0]} cursor="pointer" onClick={(d:{k:string})=>setShift(d.k)}/></BarChart></ResponsiveContainer></div></div>
     </section>
     <section className={card}><h3 className="font-bold mb-2 flex items-center gap-2">{k.rate>TARGET?<AlertTriangle size={16} className="text-err"/>:<CheckCircle2 size={16} className="text-primary"/>}Production lines</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Line</th><th>Output</th><th>Defects</th><th>Rate</th></tr></thead><tbody>{k.byLine.map(l=><tr key={l.k} className="border-t border-line/30"><td className="py-2 font-semibold">{l.k}</td><td>{fmt(l.prod)}</td><td>{fmt(l.defect)}</td><td className={l.rate>TARGET?'text-err font-bold':''}>{l.rate.toFixed(2)}%</td></tr>)}</tbody></table></div></section>
     </>}</>}
   </main></div></div>}
