import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cloudBudget } from "../../../scripts/lib/cloud-budget";
function fake(rpc: (name:string,args:Record<string,unknown>)=>Promise<unknown>) { return {rpc} as unknown as SupabaseClient; }
test("shared budget denies paid work when reservation fails or backend is unavailable",async()=>{
 for (const result of [{data:false,error:null},{data:null,error:{message:'offline'}}]) {
  let called=false;
  await assert.rejects(cloudBudget(fake(async()=>result))('',async()=>{called=true;return {value:1,actualUsd:0};}),/budget/);
  assert.equal(called,false);
 }
});
test("shared budget reserves before paid work and records usage against the same reservation",async()=>{
 const order:string[]=[];let reserved:unknown;
 const db=fake(async(name,args)=>{order.push(name);if(name==='straatbeeld_reserve_budget')reserved=args.p_id;else assert.equal(args.p_id,reserved);return {data:true,error:null};});
 assert.equal(await cloudBudget(db)('',async()=>{order.push('paid');return {value:7,actualUsd:0.002};}),7);
 assert.deepEqual(order,['straatbeeld_reserve_budget','paid','straatbeeld_record_usage']);
});
test("failed paid work retains its reservation; accounting failure cannot report success",async()=>{
 const names:string[]=[];
 const db=fake(async(name)=>{names.push(name);return {data:name==='straatbeeld_reserve_budget',error:null};});
 await assert.rejects(cloudBudget(db)('',async()=>{throw new Error('uncertain response');}),/uncertain/);
 assert.deepEqual(names,['straatbeeld_reserve_budget']);
 await assert.rejects(cloudBudget(db)('',async()=>({value:1,actualUsd:0.001})),/accounting failed/);
});
