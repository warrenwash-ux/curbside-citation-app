const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
let pending=[], hits=[], messages=[], now=1000;
const ctx={MIN_PLATE_LEN:4,MAX_PLATE_LEN:8,draft:{id:'one'},liveStream:{},scanPaused:false,scanBusy:false,scanGeneration:0,plateWorkerPromise:null,showScanDetails:()=>{},
 document:{getElementById:()=>({videoWidth:640})},
 Tesseract:{},recognizePlateImage:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),
 captureGuideFrame:()=> 'synthetic-image',updateScanStatus:message=>messages.push(message),
 finalizePlateResult:(...args)=>hits.push(args), Date:{now:()=>now}
};
vm.createContext(ctx);
for (const name of ['isPlausiblePlate','extractPlateCandidate','createPlateConsensus','captureAndRecognize']) {
 const start=html.indexOf('function '+name+'('),end=html.indexOf('\n}',start)+2;
 vm.runInContext(html.slice(start,end),ctx);
}
ctx.plateConsensus=ctx.createPlateConsensus();
const c=ctx.createPlateConsensus();
assert.equal(c.observe('ABC123',1000),false);
assert.equal(c.observe('ABC123',3200),true);
c.reset();
assert.equal(c.observe('ABC123',1000),false);
assert.equal(c.observe('XYZ789',3200),false);
assert.equal(c.observe('ABC123',5400),false);
assert.equal(c.observe('ABC123',12000),false);
assert.equal(c.observe('',13000),false);
assert.equal(c.observe('ABC123',14000),false);
assert.equal(c.observe('ABC123',14000),false);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function read(text,forced=false) {
 ctx.captureAndRecognize(forced);await flush();
 assert.equal(pending.length,1);
 pending.shift().resolve({data:{text}});await flush();
}
async function run(){
 await read('abc123');assert.equal(hits.length,0);
 now=3200;await read('ABC123');assert.equal(hits.length,1);
 ctx.plateConsensus.reset();now=5400;await read('XYZ789',true);assert.equal(hits.length,2);
 ctx.captureAndRecognize(false);await flush();
 ctx.draft={id:'two'};ctx.scanGeneration++;ctx.scanBusy=false;
 pending.shift().resolve({data:{text:'ABC123'}});await flush();
 assert.equal(hits.length,2);assert.equal(ctx.scanBusy,false);
 ctx.captureAndRecognize(false);await flush();
 ctx.scanGeneration++;ctx.scanBusy=false;
 pending.shift().reject(new Error('old scan'));await flush();
 assert.equal(hits.length,2);assert.equal(ctx.scanBusy,false);
 console.log('PASS: frame agreement, mismatches, timeout/reset, duplicate timestamps, lowercase OCR, tap capture, stale success/failure isolation');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
