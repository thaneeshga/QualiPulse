import { FormEvent, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api } from './api'
export interface User{id:string;email:string;name:string;role:string}
const inp='w-full border border-line/60 rounded-lg px-3 py-2 text-sm bg-low focus:outline-none focus:ring-1 focus:ring-primary'
export default function LoginPage({onLogin}:{onLogin:(u:User)=>void}){
 const [token]=useState(()=>{const t=new URLSearchParams(location.search).get('reset');if(t)history.replaceState(null,'',location.pathname);return t})
 const [mode,setMode]=useState<'login'|'forgot'|'reset'>(token?'reset':'login')
 const [email,setEmail]=useState(''),[pw,setPw]=useState(''),[pw2,setPw2]=useState(''),[show,setShow]=useState(false),[rem,setRem]=useState(false)
 const [busy,setBusy]=useState(false),[err,setErr]=useState(''),[msg,setMsg]=useState('')
 const go=(m:typeof mode)=>{setMode(m);setErr('');setMsg('');setPw('');setPw2('')}
 const submit=async(e:FormEvent)=>{e.preventDefault();setErr('');setMsg('')
  if(mode==='reset'){if(pw.length<10){setErr('Use at least 10 characters.');return}if(pw!==pw2){setErr('The passwords do not match.');return}}
  setBusy(true)
  try{if(mode==='login')onLogin((await api<{user:User}>('/auth/login',{email,password:pw,remember:rem})).user)
   else if(mode==='forgot')setMsg((await api<{message:string}>('/auth/forgot',{email})).message)
   else{const r=await api<{message:string}>('/auth/reset',{token,password:pw});go('login');setMsg(r.message)}}
  catch(x){setErr((x as Error).message)}finally{setBusy(false)}}
 return <main className="min-h-screen flex items-center justify-center p-4 bg-surface"><form onSubmit={submit} className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-4">
  <div><div className="font-bold text-lg">SAMSUNG AI</div><div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Fab Intelligence</div></div>
  <h1 className="text-xl font-bold">{mode==='login'?'Sign in':mode==='forgot'?'Forgot password':'Set a new password'}</h1>
  {mode!=='reset'&&<label className="block text-sm font-semibold">Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className={`${inp} mt-1 font-normal`}/></label>}
  {mode!=='forgot'&&<label className="block text-sm font-semibold">{mode==='reset'?'New password':'Password'}<div className="relative mt-1"><input type={show?'text':'password'} required autoComplete={mode==='login'?'current-password':'new-password'} value={pw} onChange={e=>setPw(e.target.value)} className={`${inp} pr-10 font-normal`}/>
   <button type="button" onClick={()=>setShow(!show)} aria-label={show?'Hide password':'Show password'} className="absolute right-2 top-2 text-sec">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>}
  {mode==='reset'&&<label className="block text-sm font-semibold">Confirm password<input type={show?'text':'password'} required autoComplete="new-password" value={pw2} onChange={e=>setPw2(e.target.value)} className={`${inp} mt-1 font-normal`}/></label>}
  {mode==='login'&&<div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={rem} onChange={e=>setRem(e.target.checked)}/>Remember me</label><button type="button" onClick={()=>go('forgot')} className="text-primary font-semibold">Forgot password?</button></div>}
  {err&&<p role="alert" className="text-err text-sm">{err}</p>}{msg&&<p role="status" className="text-green-700 text-sm">{msg}</p>}
  <button disabled={busy} className="w-full py-2 rounded-lg bg-pc text-white font-semibold disabled:opacity-50">{busy?'Please wait...':mode==='login'?'Sign in':mode==='forgot'?'Send reset link':'Update password'}</button>
  {mode!=='login'&&<button type="button" onClick={()=>go('login')} className="w-full text-sm text-primary font-semibold">Back to sign in</button>}</form></main>}
