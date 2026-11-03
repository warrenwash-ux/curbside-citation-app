const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const elements={}, timers=[], notices=[];
let lookups=0, accepted=true;
const ctx={
 draft:{idType:'plate'}, MIN_PLATE_LEN:4,MAX_PLATE_LEN:8,
 document:{getElementById:id=>elements[id]||(elements[id]={value:'',style:{}})},
 window:{confirm:()=>accepted},
 showToast:message=>notices.push(message),setTimeout:fn=>timers.push(fn),
 mockVehicleLookup:()=>{lookups++;return {ownerName:'SIMULATED'};},
 stopLiveScan:()=>{},fillVehicleFields:()=>{},priorCitationCount:()=>0,checkIssueReady:()=>{}
};
vm.createContext(ctx);
for(const name of ['isPlausiblePlate','lookupVehicle']){
 const start=html.indexOf('function '+name+'('),end=html.indexOf('\n}',start)+2;
 vm.runInContext(html.slice(start,end),ctx);
}
assert.equal(ctx.isPlausiblePlate('AB!123'),false);
assert.equal(ctx.isPlausiblePlate('AB1234'),true);
assert.equal(ctx.isPlausiblePlate(''),false);
const input=ctx.document.getElementById('manual-plate');
input.value='ABC!123';ctx.lookupVehicle();assert.equal(timers.length,0);
input.value='ABC123';accepted=false;ctx.lookupVehicle();assert.equal(timers.length,0);assert.equal(ctx.draft.plate,undefined);
accepted=true;ctx.lookupVehicle();assert.equal(ctx.draft.plate,'ABC123');
const stale=timers.shift();ctx.draft={idType:'plate'};stale();assert.equal(lookups,0);
input.value='ABC123';ctx.lookupVehicle();const older=timers.shift();
input.value='XYZ789';ctx.lookupVehicle();const newer=timers.shift();
older();assert.equal(lookups,0);newer();assert.equal(lookups,1);assert.equal(ctx.draft.plate,'XYZ789');
ctx.draft={idType:'vin'};input.value='IIIIIIIIIIIIIIIII';ctx.lookupVehicle();assert.equal(timers.length,0);
input.value='1HGCM82633A004352';ctx.lookupVehicle();assert.equal(timers.length,1);
const scan=html.slice(html.indexOf('function handleScanHit('),html.indexOf('function flashScan('));
assert.ok(!scan.includes('lookupVehicle();'));
const upload=html.slice(html.indexOf('function handleCapture('),html.indexOf('function scanVehiclePhoto('));
assert.ok(!upload.includes('lookupVehicle();'));
console.log('PASS: invalid IDs rejected, confirmation cancellation, valid IDs, stale/reordered lookup rejection, scan/upload require explicit lookup');
