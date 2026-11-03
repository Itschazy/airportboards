import assert from 'node:assert/strict';
import {deliveryHealth} from './automation-health.mjs';
assert.equal(deliveryHealth({version:2,runs:[{accepted:0,failed:0,pending:0}]}).ok,true);
assert.equal(deliveryHealth({version:2,runs:[{accepted:100,failed:0,pending:20},{accepted:0,failed:20,pending:20}]}).ok,false);
assert.equal(deliveryHealth({runs:[{ok:468,fail:0},{ok:0,fail:470}]}).ok,false);
assert.equal(deliveryHealth({runs:[{ok:150,fail:0}]}).ok,true);
assert.equal(deliveryHealth({version:2,runs:[{accepted:0,failed:0,pending:10}]}).ok,false);
assert.equal(deliveryHealth({version:2,runs:[]}).ok,false);
console.log('PASS: idle v2, current failure, legacy failure, accepted delivery, stalled queue, empty history');

import {stopRecrawl} from './recrawl-delivery.mjs';
assert.equal(stopRecrawl(504,1),false);
assert.equal(stopRecrawl(504,3),true);
assert.equal(stopRecrawl(0,3),true);
for(const code of [401,403,429]) assert.equal(stopRecrawl(code,1),true);
console.log('PASS: recrawl stops on repeated failures, timeout, auth and rate limit');
