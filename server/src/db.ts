import fs from 'node:fs'
import pg from 'pg'
import { env } from './env'
// Hosted databases (Supabase) need SSL. A CA file verifies the server; DATABASE_SSL=true encrypts without verifying identity.
const ssl=env.dbCa?{ca:fs.readFileSync(env.dbCa,'utf8')}:env.dbSsl?{rejectUnauthorized:false}:undefined
export const pool=new pg.Pool({connectionString:env.db,max:10,ssl})
