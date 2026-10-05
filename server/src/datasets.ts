import { Router } from 'express'
import { PoolClient } from 'pg'
import { z } from 'zod'
import { pool } from './db'
import { AuthedRequest, requireRole } from './auth'
const t80=z.string().min(1).max(80),num=z.number().finite().nonnegative()
const RowZ=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),item:t80,code:t80,prod:num,defect:num,reason:t80,shift:t80,team:t80,line:t80,cost:num.nullish(),price:num.nullish(),rework:num.nullish(),downtime:num.nullish(),src:z.number().int().positive(),miss:z.array(z.string().max(20)).max(10).optional(),dup:z.boolean().optional()}).refine(r=>r.defect<=r.prod)
const Body=z.object({filename:z.string().min(1).max(200),rows:z.array(RowZ).min(1).max(200000),quality:z.object({rows:z.number(),columns:z.array(z.string().max(120)).max(200),missingRequired:z.array(z.string()),duplicates:z.number(),invalidDates:z.number(),invalidQty:z.number(),warnings:z.array(z.string().max(200)).max(2000),bad:z.array(z.object({row:z.number(),issue:z.string().max(60),details:z.string().max(200)})).max(2000)})})
async function names(c:PoolClient,table:string,vals:string[]){const {rows}=await c.query(`insert into ${table}(name) select * from unnest($1::text[]) on conflict(name) do update set name=excluded.name returning id,name`,[[...new Set(vals)]]);return new Map<string,number>(rows.map(r=>[r.name,r.id]))}
export const datasetsRouter=Router()
datasetsRouter.get('/active',async(_q,res,next)=>{try{const {rows}=await pool.query('select id,filename,row_count,quality,uploaded_at from datasets where active order by uploaded_at desc limit 1');res.json({dataset:rows[0]??null})}catch(e){next(e)}})
datasetsRouter.get('/active/rows',async(req,res,next)=>{try{
 const off=Math.max(0,Number(req.query.offset)||0),lim=Math.min(20000,Math.max(1,Number(req.query.limit)||20000))
 const {rows}=await pool.query(`select pr.record_date::text as date,p.name as item,p.code,pr.production_qty::float8 as prod,pr.defect_qty::float8 as defect,coalesce(r.name,'Unspecified') as reason,coalesce(s.name,'Unspecified') as shift,coalesce(t.name,'Unspecified') as team,coalesce(l.name,'Unspecified') as line,
  pr.unit_cost::float8 as cost,pr.selling_price::float8 as price,pr.rework_qty::float8 as rework,pr.downtime_hours::float8 as downtime,pr.source_row as src,pr.missing_fields as miss,pr.is_duplicate as dup
  from production_records pr join products p on p.id=pr.product_id left join shifts s on s.id=pr.shift_id left join production_lines l on l.id=pr.line_id left join teams t on t.id=pr.team_id
  left join defect_records d on d.production_record_id=pr.id left join defect_reasons r on r.id=d.reason_id
  where pr.dataset_id=(select id from datasets where active order by uploaded_at desc limit 1) order by pr.id offset $1 limit $2`,[off,lim]);res.json({rows})}catch(e){next(e)}})
datasetsRouter.post('/',requireRole('admin','manager'),async(req,res,next)=>{
 const p=Body.safeParse(req.body);if(!p.success)return res.status(400).json({error:'The dataset has invalid values. Re-upload the file and review the Data Health page.'})
 const {rows,filename,quality}=p.data;if(new Set(rows.map(r=>r.src)).size!==rows.length)return res.status(400).json({error:'Row numbers must be unique.'})
 const c=await pool.connect()
 try{await c.query('begin')
  const ds=(await c.query('insert into datasets(user_id,filename,row_count,quality) values($1,$2,$3,$4) returning id',[(req as AuthedRequest).user.id,filename,rows.length,quality])).rows[0].id
  const prods=(await c.query('insert into products(code,name) select * from unnest($1::text[],$2::text[]) on conflict(code) do update set name=excluded.name returning id,code',[...(()=>{const m=new Map<string,string>(rows.map(r=>[r.code,r.item] as [string,string]));return [[...m.keys()],[...m.values()]]})()])).rows
  const pm=new Map<string,number>(prods.map(r=>[r.code,r.id])),sm=await names(c,'shifts',rows.map(r=>r.shift)),lm=await names(c,'production_lines',rows.map(r=>r.line)),tm=await names(c,'teams',rows.map(r=>r.team)),rm=await names(c,'defect_reasons',rows.map(r=>r.reason))
  for(let i=0;i<rows.length;i+=5000){const ch=rows.slice(i,i+5000),col=<T,>(f:(r:typeof ch[number])=>T)=>ch.map(f)
   await c.query(`insert into production_records(dataset_id,source_row,record_date,product_id,shift_id,line_id,team_id,production_qty,defect_qty,rework_qty,downtime_hours,unit_cost,selling_price,is_duplicate,missing_fields)
    select $1::uuid,s,d,pid,sh,l,t,pq,dq,rw,dt,uc,sp,du,coalesce(string_to_array(nullif(m,''),','),'{}'::text[]) from unnest($2::int[],$3::date[],$4::int[],$5::int[],$6::int[],$7::int[],$8::numeric[],$9::numeric[],$10::numeric[],$11::numeric[],$12::numeric[],$13::numeric[],$14::bool[],$15::text[]) as x(s,d,pid,sh,l,t,pq,dq,rw,dt,uc,sp,du,m)`,
    [ds,col(r=>r.src),col(r=>r.date),col(r=>pm.get(r.code)),col(r=>sm.get(r.shift)),col(r=>lm.get(r.line)),col(r=>tm.get(r.team)),col(r=>r.prod),col(r=>r.defect),col(r=>r.rework??null),col(r=>r.downtime??null),col(r=>r.cost??null),col(r=>r.price??null),col(r=>!!r.dup),col(r=>(r.miss??[]).join(','))])
   await c.query(`insert into defect_records(production_record_id,reason_id,quantity) select pr.id,x.r,x.q from unnest($2::int[],$3::int[],$4::numeric[]) as x(s,r,q) join production_records pr on pr.dataset_id=$1::uuid and pr.source_row=x.s`,[ds,col(r=>r.src),col(r=>rm.get(r.reason)),col(r=>r.defect)])}
  await c.query('update datasets set active=false where id<>$1',[ds]);await c.query('commit');res.json({id:ds,rows:rows.length})}
 catch(e){await c.query('rollback');next(e)}finally{c.release()}})
