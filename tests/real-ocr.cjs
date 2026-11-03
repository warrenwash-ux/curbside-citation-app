// Runs the actual application worker adapter with installed Tesseract (no OCR mock).
// Usage: CURBSIDE_LANG_PATH=/path/to/traineddata node tests/real-ocr.cjs image.png [...]
const fs=require('node:fs'),vm=require('node:vm'),Tesseract=require('tesseract.js');
const paths=process.argv.slice(2);
if(!paths.length) throw new Error('Supply image paths; no images are uploaded');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const options=process.env.CURBSIDE_LANG_PATH ? {langPath:process.env.CURBSIDE_LANG_PATH,gzip:false,cacheMethod:'none'} : {};
const ctx={Tesseract:{createWorker:(lang,oem)=>Tesseract.createWorker(lang,oem,options)},plateWorkerPromise:null,plateOCRBusy:false,setTimeout,clearTimeout};
vm.createContext(ctx);
const start=html.indexOf('async function recognizePlateImage('),end=html.indexOf('\n}',start)+2;
vm.runInContext(html.slice(start,end),ctx);
(async()=>{try{console.log('Actual engine version:',require('tesseract.js/package.json').version);
for(const path of paths){const before=Date.now();const result=await ctx.recognizePlateImage(path);
console.log(JSON.stringify({file:require('node:path').basename(path),ms:Date.now()-before,text:result.data.text,confidence:result.data.confidence}));}
}finally{if(ctx.plateWorkerPromise)await(await ctx.plateWorkerPromise).terminate();}})().catch(e=>{console.error(e);process.exitCode=1;});
