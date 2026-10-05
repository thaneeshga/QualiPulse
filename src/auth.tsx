import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { api, ApiError } from './api'
import LoginPage, { User } from './LoginPage'
const Ctx=createContext<{user:User;logout:()=>Promise<void>}|null>(null)
export const useAuth=()=>{const c=useContext(Ctx);if(!c)throw new Error('useAuth must be used inside AuthGate');return c}
export function AuthGate({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[st,setSt]=useState<'loading'|'out'|'in'|'error'>('loading')
 useEffect(()=>{api<{user:User}>('/auth/me').then(r=>{setUser(r.user);setSt('in')}).catch(e=>setSt(e instanceof ApiError&&e.status===401?'out':'error'))},[])
 if(st==='loading')return <p className="p-10 text-sec" role="status">Loading...</p>
 if(st==='error')return <div className="p-10"><p role="alert" className="text-err">Cannot reach the server. Check that the backend is running.</p><button onClick={()=>location.reload()} className="mt-3 px-3 py-1.5 rounded-lg bg-pc text-white font-semibold">Try again</button></div>
 if(st==='out'||!user)return <LoginPage onLogin={u=>{setUser(u);setSt('in')}}/>
 return <Ctx.Provider value={{user,logout:async()=>{try{await api('/auth/logout',{})}finally{setUser(null);setSt('out')}}}}>{children}</Ctx.Provider>}
