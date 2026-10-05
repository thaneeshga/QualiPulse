export class ApiError extends Error{constructor(public status:number,msg:string){super(msg)}}
export async function api<T>(path:string,body?:unknown,method?:string):Promise<T>{
 const r=await fetch('/api'+path,{method:method??(body===undefined?'GET':'POST'),credentials:'include',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})
 let d:unknown=null;try{d=await r.json()}catch{/* empty body */}
 if(!r.ok)throw new ApiError(r.status,(d as {error?:string}|null)?.error??'Something went wrong. Please try again.')
 return d as T}
