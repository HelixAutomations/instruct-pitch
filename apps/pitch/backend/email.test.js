const assert = require('assert');
const {
  buildClientSuccessBody,
  buildFeeEarnerBody,
  wrapSignature
} = require('./email');

const sampleRecord = {
  Title: 'Mr',
  FirstName: 'Alex',
  LastName: 'Smith',
  InstructionRef: 'HLX-1-ABC',
  PaymentAmount: 100,
  PaymentProduct: 'Deposit',
  PaymentMethod: 'card',
  PaymentResult: 'successful',
  Email: 'alex@example.com',
  Phone: '12345'
};

const docs = [
  { FileName: 'id.pdf', BlobUrl: 'http://example/id.pdf' }
];

const body = buildClientSuccessBody(sampleRecord);
assert(body.includes('Dear Mr Alex Smith'));
assert(body.includes(sampleRecord.InstructionRef));
assert(body.includes('£100.00'));

const feBody = buildFeeEarnerBody(sampleRecord, docs);
assert(feBody.includes('id.pdf'));
assert(feBody.includes('alex@example.com'));

const wrapped = wrapSignature('<p>test</p>');
assert(wrapped.trimStart().startsWith('<!DOCTYPE html>'));
console.log('All tests passed');
