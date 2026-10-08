const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
let source=fs.readFileSync(__dirname+'/../../supabase/functions/medi-patient-gemini/index.ts','utf8').replace(/^import .*;\n/gm,'');source=stripTypeScriptTypes(source);
function fixture({user=true,role='Patient',limit=true,status=200,scope='health',verdict='SAFE'}={}){
 let handler,providerCalls=0;
 const client={auth:{getUser:async()=>({data:{user:user?{id:'test-patient'}:null}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role,account_active:true}})})})}),rpc:async()=>({data:limit})};
 const data={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({scope,action:'none',target:'none',minutes:0,draft:'',answer:'Informazione sanitaria generale',followup:'impact'})}]}}]};
 const context={Deno:{env:{get:()=> 'test-only'},serve:f=>handler=f},createClient:()=>client,Response,Request,crypto,TextEncoder,AbortSignal,setTimeout,fetch:async()=>{providerCalls++;if(status!==200)return new Response('{}',{status});return new Response(JSON.stringify(providerCalls===2?{candidates:[{content:{parts:[{text:verdict}]}}]}:data));}};
 // A valid model is supplied independently from opaque mock credentials.
 context.Deno.env.get=name=>name==='GEMINI_COMMAND_MODEL'?'gemini-3.1-flash-lite':'test-only';
 vm.runInNewContext(source,context);
 return {call:async(body,token=true)=>handler(new Request('https://example.test',{method:'POST',headers:token?{Authorization:'Bearer fake'}:{},body:JSON.stringify(body)})),count:()=>providerCalls};
}
test('unauthenticated request never reaches Gemini',async()=>{const f=fixture();assert.equal((await f.call({mode:'conversation',question:'ciao'},false)).status,401);assert.equal(f.count(),0);});
test('wrong role cannot use patient endpoint',async()=>{const f=fixture({role:'Clinician'});assert.equal((await f.call({mode:'conversation',question:'ciao'})).status,403);assert.equal(f.count(),0);});
test('local quota rejects before provider transmission',async()=>{const f=fixture({limit:false});assert.equal((await f.call({mode:'conversation',question:'ciao'})).status,429);assert.equal(f.count(),0);});
test('provider quota is not retried',async()=>{const f=fixture({status:429});assert.equal((await f.call({mode:'conversation',question:'salute'})).status,429);assert.equal(f.count(),1);});
test('off-topic request returns only scope refusal',async()=>{const f=fixture({scope:'other'});const r=await (await f.call({mode:'conversation',question:'calcio'})).json();assert.match(r.answer,/salute/);assert.equal(r.action,'none');assert.equal(f.count(),1);});
test('output scope filter suppresses unsafe response',async()=>{const f=fixture({verdict:'BLOCK'});const r=await(await f.call({mode:'conversation',question:'salute'})).json();assert.match(r.answer,/valutazione del medico/);assert.equal(r.action,'none');});
test('check-in returns a closed-list prompt identifier, no diagnosis',async()=>{const f=fixture();const r=await(await f.call({mode:'checkin',question:'stanchezza'})).json();assert.deepEqual(r,{provider:'gemini',action:'none',followup:'impact'});});
