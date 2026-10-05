import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from './db'
import { issueReset } from './auth'
import { env } from './env'
const [email,name,role='manager']=process.argv.slice(2)
const p=z.object({email:z.string().email(),name:z.string().min(1).max(80),role:z.enum(['admin','manager','viewer'])}).safeParse({email,name,role})
if(!p.success){console.error('Usage: npm run create-user -- email@example.com "Full Name" [admin|manager|viewer]');process.exit(1)}
try{const hash=await bcrypt.hash(crypto.randomBytes(32).toString('hex'),12)
 const {rows}=await pool.query('insert into users(email,name,role,password_hash) values($1,$2,$3,$4) returning id',[p.data.email.toLowerCase(),p.data.name,p.data.role,hash])
 console.log(`Created ${p.data.email}. Send this link so they can set their own password (valid 24 hours):\n${env.appUrl}/?reset=${await issueReset(rows[0].id,1440)}`)}
catch(e){console.error((e as {code?:string}).code==='23505'?'An account with that email already exists.':(e as Error).message);process.exitCode=1}
await pool.end()
