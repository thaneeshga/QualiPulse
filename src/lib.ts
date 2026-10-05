import * as XLSX from 'xlsx'
export interface Row { date:string; item:string; code:string; prod:number; defect:number; reason:string; shift:string; team:string; line:string; cost?:number; price?:number; rework?:number; downtime?:number; src?:number; miss?:string[]; dup?:boolean }
export interface Quality { rows:number; columns:string[]; missingRequired:string[]; duplicates:number; invalidDates:number; invalidQty:number; warnings:string[]; bad:{row:number;issue:string;details:string}[] }
const ALIAS:Record<string,string[]>={date:['date'],item:['item name','item'],code:['item code','sku'],prod:['production quantity','production'],defect:['defect quantity','defects'],reason:['defect reason','reason'],shift:['shift'],team:['team'],line:['production line','line'],cost:['unit production cost','cost'],price:['selling price','price'],rework:['rework quantity','rework'],downtime:['downtime hours','downtime']}
export function demo():Row[]{const items=[['Exynos 2400','EX24',.009],['ISOCELL HP2','HP2',.015],['LPDDR5X 16GB','DR16',.017],['UFS 4.0 512GB','UF40',.018],['OLED Gen-5','OL5',.048]] as const
 const shifts=['Morning','Evening','Night'],lines=['Line 01','Line 03','Line 05'],reasons=['Solder Bridging','Micro-Crack','Misalignment','Contamination'];const out:Row[]=[];let s=7
 const rnd=()=>(s=(s*9301+49297)%233280)/233280
 for(let d=1;d<=31;d++)for(const [n,c,r] of items)for(const sh of shifts){const prod=Math.round(900+rnd()*300);const f=(sh==='Night'?1.34:1)*(d>=24&&c==='OL5'?1.6:1)
  out.push({date:`2024-10-${String(d).padStart(2,'0')}`,item:n,code:c,prod,defect:Math.round(prod*r*f*(0.8+rnd()*.4)),reason:reasons[Math.floor(rnd()*4)],shift:sh,team:sh==='Night'?'Beta':'Alpha',line:lines[Math.floor(rnd()*3)],cost:40,price:55,rework:Math.round(rnd()*5),downtime:+(rnd()).toFixed(1)})}
 return out}
export async function parseExcel(f:File):Promise<{rows:Row[];q:Quality}>{
 if(!/\.(xlsx|xls|csv)$/i.test(f.name)) throw new Error('Only .xlsx, .xls or .csv files are accepted.')
 if(f.size>25e6) throw new Error('File exceeds 25 MB.')
 const wb=XLSX.read(await f.arrayBuffer(),{cellDates:true});const raw=XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[wb.SheetNames[0]],{defval:null})
 const cols=Object.keys(raw[0]??{});const map:Record<string,string>={}
 for(const [k,a] of Object.entries(ALIAS)){const m=cols.find(c=>a.includes(c.trim().toLowerCase()));if(m)map[k]=m}
 const missingRequired=['date','item','prod','defect'].filter(k=>!map[k])
 const q:Quality={rows:raw.length,columns:cols,missingRequired,duplicates:0,invalidDates:0,invalidQty:0,warnings:[],bad:[]}
 const seen=new Set<string>(),rows:Row[]=[]
 const blank=(v:unknown)=>v==null||(typeof v==='string'&&v.trim()==='')
 const isNum=(v:unknown)=>!blank(v)&&!isNaN(Number(v))
 const detail=(r:Record<string,unknown>)=>Object.entries(r).slice(0,6).map(([k,v])=>`${k}=${String(v??'')}`).join(', ').slice(0,160)
 raw.forEach((r,i)=>{const n=i+2,dt=new Date(r[map.date] as string)
  if(blank(r[map.date])||isNaN(dt.getTime())){q.invalidDates++;q.warnings.push(`Row ${n}: invalid date`);q.bad.push({row:n,issue:'Invalid date',details:detail(r)});return}
  const prod=Number(r[map.prod]),defect=Number(r[map.defect])
  if(!isNum(r[map.prod])||!isNum(r[map.defect])||prod<0||defect<0||defect>prod){q.invalidQty++;q.warnings.push(`Row ${n}: invalid quantity`);q.bad.push({row:n,issue:'Invalid quantity',details:detail(r)});return}
  const key=JSON.stringify(r),dup=seen.has(key);if(dup)q.duplicates++;seen.add(key)
  const str=(k:string,d:string)=>blank(r[map[k]])?d:String(r[map[k]]).replace(/[<>]/g,'').slice(0,80)
  const num=(k:string)=>map[k]&&!blank(r[map[k]])&&isNum(r[map[k]])?Number(r[map[k]]):undefined
  const miss=(['code','reason','shift','team','line'] as const).filter(k=>map[k]&&blank(r[map[k]]))
  rows.push({date:dt.toISOString().slice(0,10),item:str('item','Unknown'),code:str('code',str('item','Unknown')),prod,defect,reason:str('reason','Unspecified'),shift:str('shift','Unspecified'),team:str('team','Unspecified'),line:str('line','Unspecified'),cost:num('cost'),price:num('price'),rework:num('rework'),downtime:num('downtime'),src:n,miss:[...miss],dup})})
 return {rows,q}}
export const rate=(d:number,p:number)=>p?d/p*100:0
export function group(rows:Row[],key:(r:Row)=>string){const m=new Map<string,{k:string;prod:number;defect:number;loss:number}>()
 for(const r of rows){const k=key(r);const g=m.get(k)??{k,prod:0,defect:0,loss:0};g.prod+=r.prod;g.defect+=r.defect;if(r.cost!=null)g.loss+=r.defect*r.cost;m.set(k,g)}
 return [...m.values()].map(g=>({...g,rate:rate(g.defect,g.prod)}))}
export function streaks(rows:Row[]){const days=[...new Set(rows.filter(r=>r.prod>0).map(r=>r.date))].sort()
 let best=0,run=0,prev=0;for(const d of days){const t=Date.parse(d);run=prev&&t-prev===864e5?run+1:1;best=Math.max(best,run);prev=t}
 return {current:run,best,days:days.length}}
export interface Costs { rework?:number; downtime?:number }
export function finance(rows:Row[],c:Costs={}){
 let value=0,scrap=0,rwQty=0,dtHrs=0,profit=0
 for(const r of rows){if(r.price!=null)value+=r.prod*r.price;if(r.cost!=null)scrap+=r.defect*r.cost;rwQty+=r.rework??0;dtHrs+=r.downtime??0
  if(r.price!=null&&r.cost!=null)profit+=(r.prod-r.defect)*r.price-r.prod*r.cost}
 const hasCost=rows.some(r=>r.cost!=null),hasPrice=rows.some(r=>r.price!=null),hasProfit=rows.some(r=>r.price!=null&&r.cost!=null)
 const hasRework=c.rework!=null&&rows.some(r=>r.rework!=null),hasDown=c.downtime!=null&&rows.some(r=>r.downtime!=null)
 const rework=hasRework?rwQty*c.rework!:0,down=hasDown?dtHrs*c.downtime!:0
 return {value,scrap,rework,down,loss:scrap+rework+down,profit:profit-rework-down,hasCost,hasPrice,hasProfit,hasRework,hasDown,hasLoss:hasCost||hasRework||hasDown}}
