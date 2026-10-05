import fs from 'node:fs'
import { pool } from './db'
await pool.query(fs.readFileSync(new URL('../schema.sql',import.meta.url),'utf8'))
console.log('Database schema is up to date.');await pool.end()
