const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const els={},pending=[],timers=[],messages=[];
const ctx={draft:{idType:'plate'},scanGeneration:0,scanBusy:false,scanPaused:false,liveStream:{},plateWorkerPromise:null,
 MIN_PLATE_LEN:4,MAX_PLATE_LEN:8,Tesseract:{},
 document:{getElementById:id=>els[id]||(els[id]={value:'',videoWidth:640,style:{}})},
 updateScanStatus:m=>messages.push(m),setPauseButtonLabel:()=>{},checkIssueReady:()=>{},showScanDetails:()=>{},
 captureGuideFrame:()=> 'frame',recognizePlateImage:()=>new Promise(resolve=>pending.push(resolve)),
 finalizePlateResult:()=>{throw Error('Stale OCR must not reach proposal');},
 window:{confirm:()=>true},showToast:()=>{},setTimeout:fn=>timers.push(fn),
 stopLiveScan:()=>{ctx.scanGeneration++;ctx.scanBusy=false;},
 mockVehicleLookup:()=>({ownerName:'SIMULATED'}),fillVehicleFields:()=>{},priorCitationCount:()=>0,
};vm.createContext(ctx);
for(const name of ['isPlausiblePlate','createPlateConsensus','captureAndRecognize','manualIdEdited','lookupVehicle','handleScanHit']){
 const start=html.indexOf('function '+name+'('),end=html.indexOf('\n}',start)+2;vm.runInContext(html.slice(start,end),ctx);
}
ctx.plateConsensus=ctx.createPlateConsensus();
const input=ctx.document.getElementById('manual-plate');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 ctx.captureAndRecognize(true);await flush();assert.equal(pending.length,1);
 input.value='9LHU458';ctx.manualIdEdited();const generation=ctx.scanGeneration;
 assert.equal(ctx.scanPaused,true);assert.equal(ctx.scanBusy,false);
 pending.shift()({data:{text:'WRONG123'}});await flush();assert.equal(input.value,'9LHU458');
 // Restoring the previous input must still invalidate the earlier generation.
 assert.equal(ctx.scanGeneration,generation);assert.equal(ctx.draft.manualIdOwned,true);
 ctx.handleScanHit('WRONG123','frame');assert.equal(input.value,'9LHU458');
 ctx.lookupVehicle();assert.equal(ctx.draft.plate,'9LHU458');timers.shift()();
 assert.ok(ctx.document.getElementById('lookup-status').textContent.includes('9LHU458'));
 input.value='NEW456';ctx.manualIdEdited();assert.equal(ctx.draft.plate,'');
 assert.equal(ctx.document.getElementById('vehicle-section').style.display,'none');
 ctx.lookupVehicle();const obsolete=timers.shift();input.value='AB123CD';ctx.manualIdEdited();obsolete();
 assert.equal(ctx.draft.plate,'');assert.equal(input.value,'AB123CD');
 ctx.lookupVehicle();timers.shift()();assert.equal(ctx.draft.plate,'AB123CD');
 assert.ok(/oninput="manualIdEdited\(\)"/.test(html));
 console.log('PASS: delayed live OCR cannot overwrite typing; direct hits blocked; confirmation preserves exact ID; edits invalidate confirmed IDs and delayed lookups');
})().catch(e=>{console.error(e);process.exitCode=1});
