import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Row, Costs } from './lib'
import { Th } from './ShiftPage'
import { build, Cell, Report, RType, TYPES } from './reports'
const card='bg-white rounded-2xl shadow-sm p-5'
const fmt=(c:Cell)=>typeof c==='number'?c.toLocaleString('en-US'):c
function pdf(r:Report,file:string){const d=new jsPDF({orientation:'landscape'});d.setFontSize(16);d.text(r.title,14,16);d.setFontSize(9);d.text(r.subtitle,14,22);let y=30
 for(const s of r.sections){if(y>175){d.addPage();y=16}d.setFontSize(11);d.text(s.heading,14,y);autoTable(d,{startY:y+2,head:[s.columns],body:s.rows.map(x=>x.map(fmt)),styles:{fontSize:8},headStyles:{fillColor:[0,80,203]}});y=(d as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+10}
 d.setFontSize(8);r.notes.forEach(n=>{if(y>195){d.addPage();y=16}d.text(n,14,y);y+=5});d.save(file)}
function xlsx(r:Report,file:string){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([[r.title],[r.subtitle],[],...r.notes.map(n=>[n])]),'About')
 r.sections.forEach((s,i)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([s.columns,...s.rows]),`${i+1} ${s.heading}`.replace(/[:\\/?*[\]]/g,'').slice(0,31)));XLSX.writeFile(wb,file)}
export default function ReportsPage({rows,th,costs}:{rows:Row[];th:Th;costs:Costs}){
 const [t,setT]=useState<RType>('daily'),[val,setVal]=useState('')
 const o=useMemo(()=>({months:[...new Set(rows.map(r=>r.date.slice(0,7)))].sort(),years:[...new Set(rows.map(r=>r.date.slice(0,4)))].sort(),shifts:[...new Set(rows.map(r=>r.shift))].sort(),prods:[...new Map<string,string>(rows.map(r=>[r.code,r.item] as [string,string])).entries()].sort((a,b)=>a[1].localeCompare(b[1]))}),[rows])
 const rep=useMemo(()=>build(t,rows,val,th,costs),[t,rows,val,th,costs])
 const inp='border border-line/60 rounded-lg px-2 py-1.5 text-sm bg-low'
 const param=t==='daily'||t==='weekly'?<input type="date" value={val} onChange={e=>setVal(e.target.value)} aria-label={t==='weekly'?'Week ending':'Date'} className={inp}/>
  :t==='monthly'?<select value={val} onChange={e=>setVal(e.target.value)} aria-label="Month" className={inp}><option value="">Latest month</option>{o.months.map(m=><option key={m}>{m}</option>)}</select>
  :t==='yearly'?<select value={val} onChange={e=>setVal(e.target.value)} aria-label="Year" className={inp}><option value="">Latest year</option>{o.years.map(m=><option key={m}>{m}</option>)}</select>
  :t==='product'?<select value={val} onChange={e=>setVal(e.target.value)} aria-label="Product" className={inp}>{o.prods.map(([c,n])=><option key={c} value={c}>{n}</option>)}</select>
  :t==='shift'?<select value={val} onChange={e=>setVal(e.target.value)} aria-label="Shift" className={inp}><option value="">All shifts</option>{o.shifts.map(m=><option key={m}>{m}</option>)}</select>:null
 const file=`${t}-report${val?'-'+val:''}`
 return <div className="space-y-4">
  <div className={`${card} flex flex-wrap items-end gap-3`}><h1 className="text-lg font-bold mr-auto">Reports & exports</h1>
   <select value={t} onChange={e=>{setT(e.target.value as RType);setVal('')}} aria-label="Report type" className={inp}>{TYPES.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>{param}
   <button disabled={rep.empty} onClick={()=>pdf(rep,file+'.pdf')} className="px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold disabled:opacity-40">Download PDF</button>
   <button disabled={rep.empty} onClick={()=>xlsx(rep,file+'.xlsx')} className="px-3 py-1.5 rounded-lg bg-low text-primary text-sm font-semibold disabled:opacity-40">Export Excel</button></div>
  <p className="text-xs text-sec">Reports use all your data and ignore the global filters. Choose the period or scope above.</p>
  <section className={card}><h2 className="text-lg font-bold">{rep.title}</h2><p className="text-sm text-sec mb-3">{rep.subtitle}</p>
   {rep.empty?<p className="text-sm">No production data available for this selection.</p>:<div className="space-y-5">{rep.sections.map(s=><div key={s.heading} className="overflow-x-auto"><h3 className="font-bold mb-1">{s.heading}</h3>
    <table className="w-full text-sm"><thead className="text-left text-sec"><tr>{s.columns.map(c=><th key={c} className="pr-3">{c}</th>)}</tr></thead><tbody>{s.rows.slice(0,100).map((r,i)=><tr key={i} className="border-t border-line/30 align-top">{r.map((c,j)=><td key={j} className={`py-1.5 pr-3 ${j===0?'font-semibold':''}`}>{fmt(c)}</td>)}</tr>)}</tbody></table>
    {s.rows.length>100&&<p className="text-xs text-sec mt-1">Preview shows the first 100 of {s.rows.length} rows. Downloads contain all rows.</p>}</div>)}
    <ul className="text-xs text-sec list-disc pl-5">{rep.notes.map(n=><li key={n}>{n}</li>)}</ul></div>}</section></div>}
