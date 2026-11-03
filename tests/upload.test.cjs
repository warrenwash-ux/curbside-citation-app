const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const readers=[],resizes=[],pending=[],messages=[],input={value:''};
const ctx={draft:{idType:'plate'},scanGeneration:0,document:{getElementById:()=>input},
 stopLiveScan:()=>{ctx.scanGeneration++;},setIdType:type=>{ctx.draft.idType=type;},
 updateScanStatus:m=>messages.push(m),isPlausiblePlate:t=>t==='ABC123',
 FileReader:class {constructor(){readers.push(this);}readAsDataURL(){}},
 resizeImage:(data,width,callback,error)=>resizes.push({callback,error}),
 Tesseract:{},showScanDetails:()=>{},reliablePlateCandidate:r=>r.data.confidence>=60?String(r.data.text).toUpperCase():null,extractPlateCandidate:raw=>String(raw).toUpperCase(),recognizePlateImage:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))
};
vm.createContext(ctx);
const start=html.indexOf('function handleCapture('),end=html.indexOf('\n}',start)+2;
vm.runInContext(html.slice(start,end),ctx);
const flush=()=>new Promise(r=>setImmediate(r));
function upload(type='image/png',size=10){ctx.handleCapture({target:{files:[{type,size}],value:'file'}});}
function load(){readers.at(-1).onload({target:{result:'synthetic'}});}
async function run(){
 upload('text/plain');upload('image/png',11*1024*1024);assert.equal(readers.length,0);
 upload();const old=readers.at(-1);ctx.draft={idType:'plate'};old.onload({target:{result:'old'}});assert.equal(resizes.length,0);
 upload();load();const oldResize=resizes.shift();upload();oldResize.callback('old');assert.equal(ctx.draft.photo,undefined);
 load();resizes.shift().callback('new');await flush();assert.equal(ctx.draft.photo,'new');
 input.value='MANUAL7';pending.shift().resolve({data:{text:'ABC123',confidence:85}});await flush();assert.equal(input.value,'MANUAL7');
 upload();load();resizes.shift().callback('current');await flush();
 upload();const count=messages.length;pending.shift().resolve({data:{text:'ABC123',confidence:85}});await flush();assert.equal(messages.length,count);
 load();resizes.shift().error();assert.ok(messages.at(-1).startsWith('Could not read'));
 upload();load();resizes.shift().callback('valid');await flush();pending.shift().resolve({data:{text:'abc123',confidence:85}});await flush();assert.equal(input.value,'ABC123');
 upload();readers.at(-1).onerror();assert.ok(messages.at(-1).startsWith('Could not read'));
 console.log('PASS: file limits, stale drafts/readers/resize/OCR, manual edits preserved, decoding/read errors, lowercase OCR normalization');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
