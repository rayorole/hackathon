import {createClient} from '@supabase/supabase-js';
import {detailSchema} from '../packages/contracts/src/index';
import {discoverWeb} from './lib/web-discovery';
import {research} from './lib/research';
import {cloudBudget} from './lib/cloud-budget';
async function main(){
const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!);
const id=process.argv[2];if(!/^\d{10}$/.test(id??''))throw new Error('Establishment id required');
const r=await db.from('straatbeeld_cases').select('detail').eq('id',id).single();if(r.error)throw r.error;
const d=detailSchema.parse(r.data.detail);const targets=await discoverWeb(d,db);
console.log(JSON.stringify({id,name:d.establishment.name,targets}));
if(targets.length){const result=await research(d,targets,undefined,cloudBudget(db));console.log(JSON.stringify({message:result.messageNl,sources:result.detail.sources.filter(s=>!d.sources.some(old=>old.id===s.id)),proposals:result.detail.establishment.proposals.filter(p=>!d.establishment.proposals.some(old=>old.id===p.id))}));}

}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
