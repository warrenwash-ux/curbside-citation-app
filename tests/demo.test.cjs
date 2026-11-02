const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const messages = [];
const buttons = { 'issue-btn': {disabled:false}, 'file-mail-btn': {disabled:false} };
const context = { showToast: message => messages.push(message), document: {getElementById: id => buttons[id]} };
vm.createContext(context);
for (const name of ['issueCitation', 'fileForMail', 'printTicket', 'checkIssueReady']) {
  const start = html.indexOf('function ' + name + '(');
  const end = html.indexOf('\n}', start) + 2;
  vm.runInContext(html.slice(start, end), context);
}
context.checkIssueReady();
assert.equal(buttons['issue-btn'].disabled, true);
assert.equal(buttons['file-mail-btn'].disabled, true);
for (const name of ['issueCitation', 'fileForMail', 'printTicket']) {
  context[name](); // Context deliberately provides no persistence, sync, counter, or printing APIs.
}
assert.equal(messages.length, 3);
assert.ok(messages.every(message => message.startsWith('Demo only')));
assert.ok(html.includes('DEMONSTRATION ONLY'));
assert.ok(html.includes('SIMULATED — owner, registration, and payment details are fictional.'));
console.log('PASS: issuance/mail disabled; direct issue/mail/print calls cannot persist, sync, number, or print; demo labels present');
