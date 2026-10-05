import { Costs } from './lib'
import { Th } from './ShiftPage'
export interface AiItem{finding:string;severity:'Critical'|'High'|'Medium'|'Low'|'Positive';kind:string;evidence:string;impact:string;action:string}
export const aiBody=(excl:boolean,costs:Costs,th:Th)=>({excludeDuplicates:excl,costs,th})
