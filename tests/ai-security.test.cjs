const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
let removed = [], networkCalls = 0;
const ctx = {
  STORAGE_KEYS: {ai:'pe_ai_config'},
  localStorage: {removeItem: key => removed.push(key)},
  fetch: () => { networkCalls++; throw new Error('unexpected network'); }
};
vm.createContext(ctx);
const config = html.slice(html.indexOf('function clearLegacyAISettings()'), html.indexOf('function stripDataUrlPrefix'));
const call = html.slice(html.indexOf('async function callClaudeVision('), html.indexOf('function nextCitationNumber'));
vm.runInContext(config + call, ctx);
async function run() {
  assert.equal(ctx.getAIConfig().enabled, false);
  assert.equal(ctx.getAIConfig().apiKey, undefined);
  ctx.saveAIConfig({apiKey:'synthetic-test-secret'});
  assert.equal(await ctx.callClaudeVision('synthetic', 'image/jpeg', 'test'), null);
  assert.equal(networkCalls, 0);
  assert.ok(removed.length >= 4);
  assert.ok(removed.every(key => key === 'pe_ai_config'));
  ctx.localStorage.removeItem = () => {throw new Error('storage denied');};
  assert.equal(ctx.getAIConfig().enabled, false);
  assert.equal(await ctx.callClaudeVision('', '', ''), null);
  assert.ok(!html.includes('anthropic-dangerous-direct-browser-access'));
  assert.ok(!html.includes('api.anthropic.com'));
  assert.ok(!html.includes('s-ai-key'));
  assert.ok(!html.includes('s-ai-model'));
  assert.match(html, /function initOnboarding\(\) \{\s*clearLegacyAISettings\(\);/);
  console.log('PASS: legacy AI config removal, no key acceptance, no AI network requests, storage-denied fallback, startup cleanup, removed key controls');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
