import { Router } from 'express'
import { z } from 'zod'
import { pool } from './db'
import { AuthedRequest, requireRole } from './auth'
const w=requireRole('admin','manager'),bad=(res:import('express').Response)=>res.status(400).json({error:'Invalid request.'})
const STATUS=z.enum(['Open','Investigating','Action Taken','Resolved'])
const A=z.object({id:z.string().uuid(),alertId:z.string().max(300).optional(),title:z.string().min(1).max(120),priority:z.enum(['Critical','High','Medium','Low']),reason:z.string().max(300).default(''),recommendation:z.string().max(300).default(''),status:STATUS.default('Open')})
const I=z.object({id:z.string().uuid(),problem:z.string().min(1).max(200),action:z.string().min(1).max(200),code:z.string().max(80),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),window:z.union([z.literal(7),z.literal(14),z.literal(30)])})
export const actionsRouter=Router(),improvementsRouter=Router()
actionsRouter.get('/',async(_q,res,n)=>{try{res.json({actions:(await pool.query(`select id,alert_key as "alertId",title,priority,reason,recommendation,status,created_at::date::text as created from actions order by created_at desc limit 1000`)).rows})}catch(e){n(e)}})
actionsRouter.post('/',w,async(req,res,n)=>{const p=A.safeParse(req.body);if(!p.success)return bad(res);const a=p.data
 try{await pool.query('insert into actions(id,user_id,alert_key,title,priority,reason,recommendation,status) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do nothing',[a.id,(req as AuthedRequest).user.id,a.alertId??null,a.title,a.priority,a.reason,a.recommendation,a.status]);res.json({ok:true})}catch(e){n(e)}})
actionsRouter.patch('/:id',w,async(req,res,n)=>{const p=z.object({status:STATUS}).safeParse(req.body),id=z.string().uuid().safeParse(req.params.id);if(!p.success||!id.success)return bad(res)
 try{const r=await pool.query('update actions set status=$1,updated_at=now() where id=$2',[p.data.status,id.data]);r.rowCount?res.json({ok:true}):res.status(404).json({error:'Not found.'})}catch(e){n(e)}})
improvementsRouter.get('/',async(_q,res,n)=>{try{res.json({items:(await pool.query(`select i.id,i.problem,i.action,coalesce(p.code,'') as code,i.action_date::text as date,i.window_days as window from improvement_records i left join products p on p.id=i.product_id order by i.created_at desc limit 1000`)).rows})}catch(e){n(e)}})
improvementsRouter.post('/',w,async(req,res,n)=>{const p=I.safeParse(req.body);if(!p.success)return bad(res);const i=p.data
 try{await pool.query('insert into improvement_records(id,user_id,problem,action,product_id,action_date,window_days) values($1,$2,$3,$4,(select id from products where code=$5),$6,$7) on conflict(id) do nothing',[i.id,(req as AuthedRequest).user.id,i.problem,i.action,i.code||null,i.date,i.window]);res.json({ok:true})}catch(e){n(e)}})
improvementsRouter.delete('/:id',w,async(req,res,n)=>{const id=z.string().uuid().safeParse(req.params.id);if(!id.success)return bad(res)
 try{await pool.query('delete from improvement_records where id=$1',[id.data]);res.json({ok:true})}catch(e){n(e)}})
