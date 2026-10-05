import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { pool } from './db'
import { env } from './env'
export interface AuthedRequest extends Request{user:{id:string;email:string;name:string;role:string}}
const COOKIE='fab_session',DUMMY=bcrypt.hashSync('not-a-real-password',12),sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex')
const opts={httpOnly:true,sameSite:'lax' as const,secure:env.prod}
const pw=z.string().min(10).max(128)
type H=(req:Request,res:Response)=>Promise<unknown>
const h=(f:H)=>(req:Request,res:Response,next:NextFunction)=>{f(req,res).catch(next)}
export async function issueReset(userId:string,minutes:number){const token=crypto.randomBytes(32).toString('hex')
 await pool.query('insert into password_resets(user_id,token_hash,expires_at) values($1,$2,now()+($3||\' minutes\')::interval)',[userId,sha(token),String(minutes)]);return token}
async function sendReset(email:string,token:string){const link=`${env.appUrl}/?reset=${token}`
 if(env.smtp){await nodemailer.createTransport(env.smtp).sendMail({from:env.mailFrom,to:email,subject:'Reset your password',text:`Use this link within 30 minutes to set a new password:\n${link}\nIf you did not ask for this, ignore this email.`})}
 else if(!env.prod)console.log(`[dev] Password reset link for ${email}: ${link}`);else console.warn('SMTP_URL is not set: reset email not sent.')}
export async function requireAuth(req:Request,res:Response,next:NextFunction){
 try{const t=req.cookies?.[COOKIE];if(!t)return res.status(401).json({error:'Not signed in.'})
  const p=jwt.verify(t,env.jwt) as {sub:string};const {rows}=await pool.query('select id,email,name,role from users where id=$1 and active',[p.sub])
  if(!rows[0])return res.status(401).json({error:'Not signed in.'});(req as AuthedRequest).user=rows[0];next()}catch{res.status(401).json({error:'Not signed in.'})}}
export const requireRole=(...roles:string[])=>(req:Request,res:Response,next:NextFunction)=>{roles.includes((req as AuthedRequest).user?.role)?next():res.status(403).json({error:'Your role cannot make changes.'})}
export const authRouter=Router()
authRouter.use(rateLimit({windowMs:15*60e3,limit:40,standardHeaders:true,legacyHeaders:false,message:{error:'Too many requests. Try again later.'}}))
authRouter.post('/login',h(async(req,res)=>{
 const p=z.object({email:z.string().email().max(254),password:z.string().min(1).max(128),remember:z.boolean().optional()}).safeParse(req.body)
 if(!p.success)return res.status(400).json({error:'Enter a valid email and password.'})
 const {rows}=await pool.query('select * from users where lower(email)=$1 and active',[p.data.email.toLowerCase().trim()]),u=rows[0]
 if(u?.locked_until&&new Date(u.locked_until)>new Date())return res.status(429).json({error:'Too many failed attempts. Try again in a few minutes.'})
 const ok=await bcrypt.compare(p.data.password,u?.password_hash??DUMMY)
 if(!u||!ok){if(u)await pool.query("update users set failed_attempts=failed_attempts+1,locked_until=case when failed_attempts+1>=5 then now()+interval '15 minutes' else locked_until end where id=$1",[u.id])
  return res.status(401).json({error:'Invalid email or password.'})}
 await pool.query('update users set failed_attempts=0,locked_until=null,last_login=now() where id=$1',[u.id])
 const rem=!!p.data.remember;res.cookie(COOKIE,jwt.sign({sub:u.id},env.jwt,{expiresIn:rem?'30d':'12h'}),rem?{...opts,maxAge:30*864e5}:opts)
 res.json({user:{id:u.id,email:u.email,name:u.name,role:u.role}})}))
authRouter.post('/logout',(_q,res)=>{res.clearCookie(COOKIE,opts);res.json({ok:true})})
authRouter.get('/me',requireAuth,(req,res)=>{res.json({user:(req as AuthedRequest).user})})
authRouter.post('/forgot',h(async(req,res)=>{
 const p=z.object({email:z.string().email().max(254)}).safeParse(req.body)
 if(p.success){const {rows}=await pool.query('select id,email from users where lower(email)=$1 and active',[p.data.email.toLowerCase().trim()])
  if(rows[0])try{await sendReset(rows[0].email,await issueReset(rows[0].id,30))}catch(e){console.error('Reset email failed',(e as Error).message)}}
 res.json({message:'If an account exists for that email, a reset link has been sent.'})}))
authRouter.post('/reset',h(async(req,res)=>{
 const p=z.object({token:z.string().regex(/^[0-9a-f]{64}$/),password:pw}).safeParse(req.body)
 if(!p.success)return res.status(400).json({error:'Password must be 10 to 128 characters.'})
 const {rows}=await pool.query('select user_id from password_resets where token_hash=$1 and used_at is null and expires_at>now()',[sha(p.data.token)])
 if(!rows[0])return res.status(400).json({error:'This reset link is invalid or has expired.'})
 const hash=await bcrypt.hash(p.data.password,12),c=await pool.connect()
 try{await c.query('begin');await c.query('update users set password_hash=$1,failed_attempts=0,locked_until=null where id=$2',[hash,rows[0].user_id])
  await c.query('update password_resets set used_at=now() where user_id=$1 and used_at is null',[rows[0].user_id]);await c.query('commit')}catch(e){await c.query('rollback');throw e}finally{c.release()}
 res.json({message:'Password updated. You can now sign in.'})}))
