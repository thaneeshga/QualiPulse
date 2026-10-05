import { useEffect, useState } from 'react'
export const STATUS=['Open','Investigating','Action Taken','Resolved'] as const
export type Status=typeof STATUS[number]
export type Pri='Critical'|'High'|'Medium'|'Low'
export interface Action{id:string;alertId?:string;title:string;priority:Pri;reason:string;recommendation:string;status:Status;created:string}
export interface Imp{id:string;problem:string;action:string;code:string;date:string;window:number}
export const uid=()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0'));return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10).join('')}`}
export function useStored<T>(key:string,init:T){
 const [v,setV]=useState<T>(()=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s) as T:init}catch{return init}})
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(v))}catch{/* storage unavailable */}},[key,v])
 return [v,setV] as const}
