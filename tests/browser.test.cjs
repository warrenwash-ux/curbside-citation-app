// Requires Playwright and an installed Chromium. Optional: CHROMIUM_EXECUTABLE.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

async function run() {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'));
  const server = http.createServer((req,res) => { res.setHeader('Content-Type','text/html'); res.end(html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_EXECUTABLE || undefined, args:['--no-sandbox','--disable-dev-shm-usage']});
    for (const width of [390,1280]) {
      const context = await browser.newContext({viewport:{width,height:844}});
      const page = await context.newPage(), errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route => route.request().url().startsWith('http://127.0.0.1:') ? route.continue() : route.abort());
      await page.addInitScript(() => {
        localStorage.setItem('pe_ai_config', JSON.stringify({apiKey:'synthetic-legacy-key'}));
        navigator.mediaDevices.getUserMedia = async () => {throw new DOMException('Synthetic denial','NotAllowedError');};
      });
      await page.goto('http://127.0.0.1:'+server.address().port);
      await page.locator('#onboard-screen').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>localStorage.getItem('pe_ai_config')),null);
      await page.locator('#ob-name').fill('Test Operator');
      await page.locator('#ob-badge').fill('TEST-01');
      await page.getByRole('button',{name:'Start shift',exact:true}).click();
      await page.getByText('DEMONSTRATION ONLY',{exact:false}).waitFor();
      await page.locator('[data-tab="settings"]').click();
      await page.getByRole('heading',{name:'Cloud AI unavailable in this demonstration'}).waitFor();
      assert.equal(await page.locator('#s-ai-key').count(),0);
      await page.locator('[data-tab="draft"]').click();
      await page.waitForFunction(()=>document.getElementById('scan-status').textContent.includes('Camera unavailable'));
      await page.evaluate(()=>{window.Tesseract={recognize:async()=>({data:{text:'abc123'}})};});
      await page.locator('input[onchange="handleCapture(event)"]').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('test')});
      await page.waitForFunction(()=>document.getElementById('scan-status').textContent.includes('Choose a JPEG'));
      await page.locator('input[onchange="handleCapture(event)"]').setInputFiles({name:'unreadable.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
      await page.waitForFunction(()=>document.getElementById('scan-status').textContent.includes('Could not read the photo'));
      await page.locator('input[onchange="handleCapture(event)"]').setInputFiles({
        name:'synthetic.png',mimeType:'image/png',
        buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1kAAAAASUVORK5CYII=','base64')
      });
      await page.waitForFunction(()=>document.getElementById('manual-plate').value==='ABC123');
      assert.equal(await page.locator('#vehicle-section').isVisible(),false);
      await page.locator('#manual-plate').fill('ABC123');
      page.once('dialog',dialog=>dialog.dismiss());
      await page.getByRole('button',{name:'Confirm ID & show simulated record'}).click();
      assert.equal(await page.locator('#vehicle-section').isVisible(),false);
      page.once('dialog',dialog=>dialog.accept());
      await page.getByRole('button',{name:'Confirm ID & show simulated record'}).click();
      await page.waitForFunction(()=>document.getElementById('lookup-status').textContent.includes('SIMULATED'));
      assert.equal(await page.locator('#vehicle-fields').isVisible(),true);
      const code=await page.locator('#violation-select option').evaluateAll(options=>options.find(o=>o.value)?.value);
      await page.locator('#violation-select').selectOption(code);
      assert.equal(await page.locator('#issue-btn').isDisabled(),true);
      assert.equal(await page.locator('#file-mail-btn').isDisabled(),true);
      await page.evaluate(()=>{issueCitation();fileForMail();printTicket();});
      assert.equal(await page.evaluate(()=>getCitations().length),0);
      page.once('dialog',dialog=>dialog.accept());
      await page.locator('#back-btn').click();
      await page.locator('#screen-home').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>window.scrollY),0);
      assert.deepEqual(errors,[]);
      await page.screenshot({path:'/tmp/curbside-browser-'+width+'.png',fullPage:true,animations:'disabled'});
      console.log('PASS: '+width+'px onboarding, cleanup, settings, camera denial, ID confirmation/cancel, simulated lookup, blocked issue/mail/print, discard, no runtime errors');
      await context.close();
    }
  } finally {
    if(browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
