import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
export function cloudBudget(db:SupabaseClient){return async function<T>(_file:string,call:()=>Promise<{value:T;actualUsd:number}>):Promise<T>{
 const id=randomUUID();
 const reserved=await db.rpc("straatbeeld_reserve_budget",{p_id:id});
 if(reserved.error||reserved.data!==true)throw new Error("Shared AI budget unavailable or exhausted");
 const result=await call();
 if(!Number.isFinite(result.actualUsd)||result.actualUsd<0)throw new Error("Invalid AI usage; reservation retained");
 const settled=await db.rpc("straatbeeld_record_usage",{p_id:id,p_actual:result.actualUsd});
 if(settled.error||settled.data!==true)throw new Error("Usage accounting failed; reservation retained");
 return result.value;
};}
