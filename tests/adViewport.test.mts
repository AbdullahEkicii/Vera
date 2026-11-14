import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SETTLE_DWELL_MS, isSlotOnScreen, nextSettle } from '../src/utils/adViewport.ts';

const WINDOW = { width: 411, height: 914 };
const TAB_BAR = 88; // tab bar height plus its bottom margin
const slot = (y: number, x = 16) => ({ x, y, width: 379, height: 72 });

test('a slot well inside the screen counts as on screen', () => {
  assert.equal(isSlotOnScreen(slot(300), WINDOW, TAB_BAR), true);
});

test('a slot below the fold does not count', () => {
  assert.equal(isSlotOnScreen(slot(1200), WINDOW, TAB_BAR), false);
  // Just under the edge: only its top peeks in.
  assert.equal(isSlotOnScreen(slot(WINDOW.height - 10), WINDOW, 0), false);
});

test('a slot behind the floating tab bar does not count', () => {
  // The same position is on screen without the overlay, hidden with it.
  assert.equal(isSlotOnScreen(slot(800), WINDOW, 0), true);
  assert.equal(isSlotOnScreen(slot(800), WINDOW, TAB_BAR), false);
});

test('a banner that only peeks in at the bottom edge does not count', () => {
  // About half of the slot is visible: the case that used to cost a request on the zakat screen.
  assert.equal(isSlotOnScreen(slot(WINDOW.height - 40), WINDOW, 0), false);
});

test('the whole slot has to fit above the visible bottom', () => {
  const bottom = WINDOW.height - TAB_BAR;
  assert.equal(isSlotOnScreen(slot(bottom - 72), WINDOW, TAB_BAR), true);
  assert.equal(isSlotOnScreen(slot(bottom - 71), WINDOW, TAB_BAR), false);
});

test('a slot scrolled past the top does not count', () => {
  assert.equal(isSlotOnScreen(slot(-200), WINDOW, TAB_BAR), false);
  assert.equal(isSlotOnScreen(slot(-60), WINDOW, TAB_BAR), true);
});

test('a page of a pager next to the visible one does not count', () => {
  assert.equal(isSlotOnScreen(slot(300, WINDOW.width), WINDOW, TAB_BAR), false);
  assert.equal(isSlotOnScreen(slot(300, -WINDOW.width), WINDOW, TAB_BAR), false);
});

test('an unmeasured slot does not count', () => {
  assert.equal(isSlotOnScreen({ x: 0, y: 0, width: 0, height: 0 }, WINDOW, 0), false);
});

test('the slot has to stay put for the dwell time before it commits', () => {
  let state = nextSettle(null, true, 400, 0);
  assert.equal(state.commit, false);
  state = nextSettle(state.settle, true, 401, SETTLE_DWELL_MS - 1);
  assert.equal(state.commit, false);
  state = nextSettle(state.settle, true, 400, SETTLE_DWELL_MS);
  assert.equal(state.commit, true);
});

test('a slot that is pushed down by late content starts the wait again', () => {
  let state = nextSettle(null, true, 400, 0);
  // A card above it finished loading and moved the slot 300dp down.
  state = nextSettle(state.settle, true, 700, 1000);
  assert.equal(state.commit, false);
  assert.equal(state.settle?.at, 1000);
  state = nextSettle(state.settle, true, 700, 1000 + SETTLE_DWELL_MS);
  assert.equal(state.commit, true);
});

test('looking away resets the wait', () => {
  let state = nextSettle(null, true, 400, 0);
  state = nextSettle(state.settle, false, 400, 800);
  assert.equal(state.settle, null);
  state = nextSettle(state.settle, true, 400, 900);
  assert.equal(state.commit, false);
  assert.equal(state.settle?.at, 900);
});
