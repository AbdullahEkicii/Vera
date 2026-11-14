import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_TAB, homeTabParams } from '../src/utils/homeTabRoute.ts';

test('homeTabParams targets the community page by its pager index', () => {
  const params = homeTabParams(HOME_TAB.community);
  assert.equal(params.tab, '3');
  assert.equal(HOME_TAB.community, 3);
});

test('homeTabParams changes its nonce on every call, so repeated navigation is seen as new', async () => {
  const first = homeTabParams(HOME_TAB.community);
  await new Promise((resolve) => setTimeout(resolve, 2));
  const second = homeTabParams(HOME_TAB.community);
  assert.equal(first.tab, second.tab);
  assert.notEqual(first.nonce, second.nonce);
});

test('homeTabParams keeps extra params alongside tab and nonce', () => {
  const params = homeTabParams(HOME_TAB.home, { open: 'greeting' });
  assert.equal(params.open, 'greeting');
  assert.equal(params.tab, '2');
  assert.ok(params.nonce.length > 0);
});
