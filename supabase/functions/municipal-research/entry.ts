import { createClient } from "@supabase/supabase-js";
import { runMunicipalPass } from "../../../scripts/lib/cloud-worker";
const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
Deno.serve(async(request:Request)=>{
 const token=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(request.method!=="POST"||!/^[a-f0-9]{64}$/.test(token))return new Response("Unauthorized",{status:401});
 const authorized=await db.rpc("straatbeeld_worker_authorized",{p_token:token});
 if(authorized.error||authorized.data!==true)return new Response("Unauthorized",{status:401});
 const body = await request.json().catch(() => ({}));
 if (body.action === "health") {
   const key = process.env.OPENAI_API_KEY;
   if (!key) return Response.json({ok:false,providerConfigured:false},{status:503});
   try {
     const probe = await fetch("https://api.openai.com/v1/models/gpt-4.1-mini-2025-04-14", {headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});
     await probe.body?.cancel();
     return Response.json({ok:probe.ok,providerConfigured:true,providerStatus:probe.status},{status:probe.ok?200:503});
   } catch { return Response.json({ok:false,providerConfigured:true,providerReachable:false},{status:503}); }
 }
 try {return Response.json(await runMunicipalPass(db));}catch(e){console.error(e instanceof Error?e.message:"Worker error");return Response.json({ok:false,error:"Research pass could not complete; pending work is retained."},{status:503});}
});
