import { createClient } from "@supabase/supabase-js";
import { runMunicipalPass } from "../../../scripts/lib/cloud-worker";
const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
Deno.serve(async(request:Request)=>{
 const token=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
 if(request.method!=="POST"||!/^[a-f0-9]{64}$/.test(token))return new Response("Unauthorized",{status:401});
 const authorized=await db.rpc("straatbeeld_worker_authorized",{p_token:token});
 if(authorized.error||authorized.data!==true)return new Response("Unauthorized",{status:401});
 try {return Response.json(await runMunicipalPass(db));}catch(e){console.error(e instanceof Error?e.message:"Worker error");return Response.json({ok:false,error:"Research pass could not complete; pending work is retained."},{status:503});}
});
