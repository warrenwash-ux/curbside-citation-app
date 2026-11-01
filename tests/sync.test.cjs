const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const fn=html.slice(html.indexOf('async function syncToSupabase('),html.indexOf('/* ------------------------------------------------------------',html.indexOf('async function syncToSupabase(')));
async function run(){
 let calls=[];
 let cfg={enabled:true,url:'https://example.invalid/',key:'synthetic'};
 let result={ok:true,status:201};
 const ctx={getSyncConfig:()=>cfg,fetch:async(...args)=>{calls.push(args);if(result instanceof Error)throw result;return result;}};
 vm.createContext(ctx);vm.runInContext(fn,ctx);
 const sync=ctx.syncToSupabase;
 assert.equal((await sync({id:'test'},'insert')).ok,true);
 assert.equal(calls[0][1].method,'POST');
 result={ok:false,status:401};
 assert.equal((await sync({id:'test'},'insert')).reason,'http_error');
 result={ok:false,status:500};
 assert.equal((await sync({id:'test'},'update')).status,500);
 assert.equal(calls.at(-1)[1].method,'PATCH');
 result=new Error('offline');
 assert.equal((await sync({},'insert')).reason,'network_error');
 assert.equal((await sync({},'unsupported')).reason,'invalid_action');
 cfg.enabled=false;
 const count=calls.length;
 assert.equal((await sync({},'insert')).reason,'not_configured');
 assert.equal(calls.length,count);
 assert.ok(!html.includes("label.textContent = 'Live sync on'"));
 for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(script[1]);
 console.log('PASS: insert, update, HTTP 401/500, offline, invalid action, disabled sync, honest status, script syntax');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

