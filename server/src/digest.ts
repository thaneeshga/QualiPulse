import { pool } from './db'
const BASE=`with d as(select id,filename from datasets where active order by uploaded_at desc limit 1),
b as(select pr.record_date,pr.production_qty u,pr.defect_qty f,pr.unit_cost,pr.selling_price,pr.rework_qty,pr.downtime_hours,p.name product,coalesce(s.name,'Unspecified') shift,coalesce(l.name,'Unspecified') line,coalesce(t.name,'Unspecified') team,coalesce(r.name,'Unspecified') reason,to_char(pr.record_date,'YYYY-MM') month
 from production_records pr join d on d.id=pr.dataset_id join products p on p.id=pr.product_id left join shifts s on s.id=pr.shift_id left join production_lines l on l.id=pr.line_id left join teams t on t.id=pr.team_id
 left join defect_records dr on dr.production_record_id=pr.id left join defect_reasons r on r.id=dr.reason_id where not($1 and pr.is_duplicate))`
const q=(sql:string,x:boolean)=>pool.query(BASE+' '+sql,[x]).then(r=>r.rows as Record<string,unknown>[])
const r2=(n:unknown)=>n==null?null:Math.round(Number(n)*100)/100,clean=(s:unknown)=>String(s).replace(/[\u0000-\u001f]/g,' ').slice(0,80)
const S='sum(u)::float8 units,sum(f)::float8 defects,sum(case when unit_cost is not null then f*unit_cost end)::float8 scrap'
const rate=(r:Record<string,unknown>)=>Number(r.units)?r2(Number(r.defects)/Number(r.units)*100):null
const dim=(rows:Record<string,unknown>[])=>rows.map(r=>({name:clean(r.k),units:r.units,defects:r.defects,defectRatePct:rate(r),scrapCost:r2(r.scrap)}))
const pair=(rows:Record<string,unknown>[])=>rows.map(r=>({a:clean(r.k1),b:clean(r.k2),units:r.units,defects:r.defects,defectRatePct:rate(r)}))
export interface DigestOpts{excludeDuplicates:boolean;costs:{rework?:number;downtime?:number};th:{attn:number;crit:number}}
export async function buildDigest(o:DigestOpts){
 const x=o.excludeDuplicates,[t]=await q(`select sum(u)::float8 units,sum(f)::float8 defects,count(*)::int records,count(distinct record_date)::int days,min(record_date)::text first,max(record_date)::text last,sum(case when unit_cost is not null then f*unit_cost end)::float8 scrap,sum(case when selling_price is not null then u*selling_price end)::float8 value,sum(rework_qty)::float8 rw,sum(downtime_hours)::float8 dt,(select filename from d) filename from b`,x)
 if(!t||t.units==null)return null
 const g=(col:string,lim=40,order='defects desc')=>q(`select ${col} k,${S} from b group by 1 order by ${order} limit ${lim}`,x)
 const p2=(a:string,c:string,where='',lim=80)=>q(`select ${a} k1,${c} k2,sum(u)::float8 units,sum(f)::float8 defects from b ${where} group by 1,2 order by defects desc limit ${lim}`,x)
 const [prod,shift,line,team,reason,month,ps,pr,sr,pl,pm,daily]=await Promise.all([g('product'),g('shift'),g('line'),g('team'),g('reason',20),g('month',60,'k'),p2('product','shift'),p2('product','reason','where f>0'),p2('shift','reason','where f>0'),p2('product','line'),p2('product','month','',300),
  q('select record_date::text k,sum(u)::float8 units,sum(f)::float8 defects from b group by 1 order by 1 desc limit 31',x)])
 const rc=o.costs.rework!=null&&t.rw!=null?Number(t.rw)*o.costs.rework:null,dc=o.costs.downtime!=null&&t.dt!=null?Number(t.dt)*o.costs.downtime:null
 return {digest:{dataset:{filename:clean(t.filename),records:t.records,productionDays:t.days,firstDate:t.first,lastDate:t.last,duplicatesExcluded:x},
  thresholdsPct:o.th,
  totals:{units:t.units,defects:t.defects,defectRatePct:rate(t),productionValue:r2(t.value),scrapCost:r2(t.scrap),reworkUnits:t.rw,downtimeHours:t.dt,reworkCost:r2(rc),downtimeCost:r2(dc),totalLoss:t.scrap==null&&rc==null&&dc==null?null:r2(Number(t.scrap??0)+(rc??0)+(dc??0)),costNote:'null means the data or the rate needed is unavailable'},
  byProduct:dim(prod),byShift:dim(shift),byLine:dim(line),byTeam:dim(team),byDefectReason:dim(reason).map(({name,defects})=>({name,defects})),byMonth:dim(month),
  productByShift:pair(ps),productByDefectReason:pair(pr).map(({a,b,defects})=>({product:a,reason:b,defects})),shiftByDefectReason:pair(sr).map(({a,b,defects})=>({shift:a,reason:b,defects})),productByLine:pair(pl),productByMonth:pair(pm),
  last31ProductionDays:daily.map(d=>({date:d.k,units:d.units,defects:d.defects,defectRatePct:rate(d)})),
  limits:'Lists show at most the top entries by defects. Individual records, operators and single shifts on single days are not included.'},reasons:reason.map(r=>clean(r.k))}}
