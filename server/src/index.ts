import express, { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './env'
import { authRouter, requireAuth } from './auth'
import { datasetsRouter } from './datasets'
import { aiRouter } from './ai'
import { actionsRouter, improvementsRouter } from './work'
const app=express()
app.disable('x-powered-by');app.set('trust proxy',1)
app.use(helmet(),cookieParser())
app.use((req,res,next)=>{const o=req.headers.origin;if(!['GET','HEAD','OPTIONS'].includes(req.method)&&o&&o!==new URL(env.appUrl).origin)return res.status(403).json({error:'Origin not allowed.'});next()})
app.use('/api/datasets',requireAuth,express.json({limit:'60mb'})) // sign-in is checked before a large body is read
app.use(express.json({limit:'1mb'}))
app.get('/api/health',(_q,res)=>{res.json({ok:true})})
app.use('/api/auth',authRouter)
app.use('/api',requireAuth) // every route added after this line requires a signed-in user
app.use('/api/ai',aiRouter);app.use('/api/datasets',datasetsRouter);app.use('/api/actions',actionsRouter);app.use('/api/improvements',improvementsRouter)
app.use('/api',(_q,res)=>{res.status(404).json({error:'Not found.'})})
app.use((e:Error,_q:Request,res:Response,_n:NextFunction)=>{console.error(e);res.status(500).json({error:'Something went wrong. Please try again.'})})
app.listen(env.port,()=>console.log(`API listening on http://localhost:${env.port}`))
