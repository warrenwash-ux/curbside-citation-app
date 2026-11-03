const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
let created=0,terminated=0,parameters=[],timer,hang=false;
const ctx={MIN_PLATE_LEN:4,MAX_PLATE_LEN:8,plateWorkerPromise:null,plateOCRBusy:false,
 setTimeout:fn=>{timer=fn;return 1;},clearTimeout:()=>{},
 Tesseract:{createWorker:async()=>{created++;return {
  setParameters:async p=>parameters.push(p),
  recognize:async()=>hang?new Promise(()=>{}):({data:{text:'CALIFORNIA\nABC123\nFRAME'}}),
  terminate:async()=>{terminated++;}
 };}}
};
vm.createContext(ctx);
for(const name of ['isPlausiblePlate','extractPlateCandidate','reliablePlateCandidate','guideSourceRect']){
 const start=html.indexOf('function '+name+'('),end=html.indexOf('\n}',start)+2;
 vm.runInContext(html.slice(start,end),ctx);
}
{
 const start=html.indexOf('async function recognizePlateImage('),end=html.indexOf('\n}',start)+2;
 vm.runInContext(html.slice(start,end),ctx);
}
assert.equal(ctx.extractPlateCandidate('CALIFORNIA\nABC123\nFRAME'),'ABC123');
assert.equal(ctx.extractPlateCandidate('ABC123\nXYZ789'),null);
assert.equal(ctx.extractPlateCandidate('ABC!123'),null);
assert.equal(ctx.extractPlateCandidate(''),null);
const r=ctx.guideSourceRect(1080,1920,400,300,{x:60,y:96,width:280,height:105});
assert.equal(r.x,162);assert.equal(r.width,756);assert.equal(r.height,283.5);
assert.equal(r.y,814.2);
const landscape=ctx.guideSourceRect(1920,1080,400,300,{x:60,y:96,width:280,height:105});
assert.equal(landscape.width,1008);assert.ok(landscape.x>0&&landscape.y>0);
assert.equal(ctx.reliablePlateCandidate({data:{text:'WRONG123',confidence:0}}),null);
assert.equal(ctx.reliablePlateCandidate({data:{text:'WRONG123'}}),null);
assert.equal(ctx.reliablePlateCandidate({data:{text:'ABC123',confidence:87}}),'ABC123');
async function run(){
 const first=await ctx.recognizePlateImage('synthetic');
 assert.equal(ctx.extractPlateCandidate(first.data.text),'ABC123');
 await ctx.recognizePlateImage('synthetic');assert.equal(created,1);
 assert.equal(parameters[0].tessedit_pageseg_mode,'11');
 assert.equal(parameters[0].tessedit_char_whitelist,'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
 hang=true;
 const stalled=ctx.recognizePlateImage('synthetic');
 await Promise.resolve();await Promise.resolve();
 await assert.rejects(ctx.recognizePlateImage('other'),/Scanner busy/);
 timer();await assert.rejects(stalled,/timed out/);
 assert.equal(ctx.plateOCRBusy,false);assert.equal(ctx.plateWorkerPromise,null);
 await Promise.resolve();assert.equal(terminated,1);
 hang=false;await ctx.recognizePlateImage('synthetic');assert.equal(created,2);
 console.log('PASS: worker reuse/parameters, busy guard, stalled-read timeout/termination/retry, multiline ambiguity, cover-crop mapping');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

