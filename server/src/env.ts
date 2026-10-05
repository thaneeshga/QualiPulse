import 'dotenv/config'
const need=(k:string)=>{const v=process.env[k];if(!v)throw new Error(`Missing environment variable ${k}. See .env.example.`);return v}
export const env={port:Number(process.env.PORT??4000),db:need('DATABASE_URL'),jwt:need('JWT_SECRET'),appUrl:process.env.APP_URL??'http://localhost:5173',prod:process.env.NODE_ENV==='production',smtp:process.env.SMTP_URL||'',anthropicKey:process.env.ANTHROPIC_API_KEY||'',model:process.env.ANTHROPIC_MODEL||'claude-sonnet-5-5',dbSsl:process.env.DATABASE_SSL==='true',dbCa:process.env.DATABASE_CA_FILE||'',mailFrom:process.env.MAIL_FROM??'no-reply@localhost'}
if(env.jwt.length<32)throw new Error('JWT_SECRET must be at least 32 characters.')
