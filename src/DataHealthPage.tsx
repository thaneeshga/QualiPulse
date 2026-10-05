import { useMemo, useState } from 'react'
import { Row, Quality } from './lib'
const card='bg-white rounded-2xl shadow-sm p-5'
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
interface Rec{row:string;issue:string;details:string}
const Kpi=({l,v,bad,sub}:{l:string;v:string;bad?:boolean;sub?:string})=><div className={card}><div className="text-[11px] font-bold uppercase tracking-wider text-sec">{l}</div><div className={`text-xl font-bold mt-1 ${bad?'text-err':''}`}>{v}</div>{sub&&<div className="text-xs text-sec">{sub}</div>}</div>
export default function DataHealthPage({raw,quality,isDemo,excl,setExcl,known,setKnown}:{raw:Row[];quality:Quality|null;isDemo:boolean;excl:boolean;setExcl:(b:boolean)=>void;known:string[]|null;setKnown:(k:string[]|null)=>void}){
 const [issue,setIssue]=useState('All'),[more,setMore]=useState(20)
 const d=useMemo(()=>{
  const total=quality?quality.rows:raw.length,incomplete=raw.filter(r=>r.miss?.length),dups=raw.filter(r=>r.dup)
  const rc=new Map<string,number>();raw.forEach(r=>rc.set(r.reason,(rc.get(r.reason)??0)+r.defect))
  const reasons=[...rc].sort((a,b)=>b[1]-a[1]),groups=new Map<string,string[]>();reasons.forEach(([k])=>{const n=norm(k),a=groups.get(n);a?a.push(k):groups.set(n,[k])})
  const variants=new Set<string>();groups.forEach(v=>{if(v.length>1)v.forEach(x=>variants.add(x))})
  const unrec=known?new Set(reasons.map(r=>r[0]).filter(r=>r!=='Unspecified'&&!known.includes(r))):new Set<string>()
  const recs:Rec[]=[...(quality?.bad??[]).map(b=>({row:String(b.row),issue:b.issue,details:b.details})),
   ...dups.map(r=>({row:String(r.src??'-'),issue:'Duplicate',details:`${r.date}, ${r.item}, ${r.shift}, produced ${r.prod}, defects ${r.defect}`})),
   ...incomplete.map(r=>({row:String(r.src??'-'),issue:'Missing '+r.miss!.join(', '),details:`${r.date}, ${r.item}, produced ${r.prod}, defects ${r.defect}`})),
   ...raw.filter(r=>unrec.has(r.reason)).map(r=>({row:String(r.src??'-'),issue:'Unrecognized reason',details:`${r.reason}: ${r.date}, ${r.item}, defects ${r.defect}`}))]
  return {total,complete:total?(raw.length-incomplete.length)/total*100:100,missing:raw.reduce((a,r)=>a+(r.miss?.length??0),0),dups:dups.length,reasons,variants,unrec,
   unrecUnits:raw.filter(r=>unrec.has(r.reason)).reduce((a,r)=>a+r.defect,0),recs,unspec:rc.get('Unspecified')??0}},[raw,quality,known])
 const types=['All',...new Set(d.recs.map(r=>r.issue.startsWith('Missing')?'Missing values':r.issue))]
 const shown=d.recs.filter(r=>issue==='All'||(issue==='Missing values'?r.issue.startsWith('Missing'):r.issue===issue))
 const toggle=(r:string)=>known&&setKnown(known.includes(r)?known.filter(x=>x!==r):[...known,r])
 return <div className="space-y-4">
  <div className={card}><h1 className="text-lg font-bold">Data health</h1><p className="text-sm text-sec mt-1">{isDemo?'You are viewing demo data. Upload a file to check your own data.':`Checked ${d.total.toLocaleString()} rows from your uploaded file. Invalid rows are kept out of the analysis and listed below.`}</p></div>
  <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
   <Kpi l="Complete records" v={d.complete.toFixed(1)+'%'} bad={d.complete<100}/><Kpi l="Missing values" v={d.missing.toLocaleString()} bad={d.missing>0} sub="Blank cells in columns you supplied"/>
   <Kpi l="Duplicate rows" v={d.dups.toLocaleString()} bad={d.dups>0}/><Kpi l="Invalid dates" v={String(quality?.invalidDates??0)} bad={!!quality?.invalidDates}/>
   <Kpi l="Invalid quantities" v={String(quality?.invalidQty??0)} bad={!!quality?.invalidQty}/><Kpi l="Unrecognized reasons" v={known?String(d.unrec.size):'Not set'} bad={d.unrec.size>0} sub={known?`${d.unrecUnits.toLocaleString()} defect units`:'Set a recognized list below'}/></section>
  <label className={`${card} flex items-center gap-3 text-sm`}><input type="checkbox" checked={excl} onChange={e=>setExcl(e.target.checked)}/>Exclude duplicate rows from all analysis ({d.dups.toLocaleString()} rows). Duplicates are kept by default, because identical rows can be genuine.</label>
  <div className={`${card} overflow-x-auto`}><div className="flex flex-wrap items-center gap-2 mb-2"><h2 className="font-bold">Defect reasons</h2>
   {known==null?<button onClick={()=>setKnown(d.reasons.map(r=>r[0]).filter(r=>r!=='Unspecified'))} className="ml-auto px-3 py-1.5 rounded-lg bg-pc text-white text-sm font-semibold">Use current reasons as the recognized list</button>:<button onClick={()=>setKnown(null)} className="ml-auto px-3 py-1.5 rounded-lg bg-low text-primary text-sm font-semibold">Clear recognized list</button>}</div>
   <p className="text-xs text-sec mb-2">Reasons with no stated value appear as Unspecified ({d.unspec.toLocaleString()} defect units). Spellings that differ only by case or punctuation are flagged.{known&&' Untick a reason to mark it unrecognized.'}</p>
   <table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Reason</th><th>Defect units</th><th>Notes</th>{known&&<th>Recognized</th>}</tr></thead><tbody>{d.reasons.map(([r,u])=><tr key={r} className="border-t border-line/30"><td className="py-1.5 font-semibold">{r}</td><td>{u.toLocaleString()}</td>
    <td className="text-xs text-sec">{r==='Unspecified'?'No reason given':d.variants.has(r)?'Possible duplicate spelling':''}</td>{known&&<td>{r==='Unspecified'?'-':<input type="checkbox" checked={known.includes(r)} onChange={()=>toggle(r)} aria-label={`Recognize ${r}`}/>}</td>}</tr>)}</tbody></table></div>
  <div className={`${card} overflow-x-auto`}><div className="flex flex-wrap items-center gap-2 mb-2"><h2 className="font-bold">Problem records</h2>
   <select value={issue} onChange={e=>{setIssue(e.target.value);setMore(20)}} aria-label="Issue type" className="ml-auto border border-line/60 rounded-lg px-2 py-1 text-sm bg-low">{types.map(t=><option key={t}>{t}</option>)}</select></div>
   {shown.length===0?<p className="text-sm text-sec">No problem records found.</p>:<><table className="w-full text-sm"><thead className="text-left text-sec"><tr><th>Row</th><th>Issue</th><th>Details</th></tr></thead><tbody>
    {shown.slice(0,more).map((r,i)=><tr key={i} className="border-t border-line/30 bg-errc/20"><td className="py-1.5 font-mono">{r.row}</td><td className="font-semibold">{r.issue}</td><td>{r.details}</td></tr>)}</tbody></table>
    <div className="flex items-center gap-3 mt-3 text-sm text-sec">Showing {Math.min(more,shown.length)} of {shown.length}{more<shown.length&&<button onClick={()=>setMore(more+20)} className="px-3 py-1 rounded-lg bg-low text-primary font-semibold">Show more</button>}</div></>}
   <p className="text-xs text-sec mt-2">Row numbers match the row in your Excel file, counting the header as row 1.</p></div>
 </div>}
