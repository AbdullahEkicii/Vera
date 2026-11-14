// Pure rules for deciding when a banner slot counts as "on screen". No React or native imports, so these run
// under node --test. The slot component measures itself and feeds the numbers in here.

/**
 * Height of a banner slot once an ad is in it: the reserved banner height (56) plus the card padding.
 * The whole slot must fit above the visible bottom, so a banner that only peeks in at the edge of the screen
 * does not cost a request. The measured height cannot be used: an empty slot is only its padding tall.
 */
export const SLOT_HEIGHT = 72;
/** Slack sideways, so a page of a pager that sits next to the visible one does not count. */
export const EDGE_TOLERANCE = 24;
/** The slot has to stay on screen, in the same place, for this long before an ad is requested. */
export const SETTLE_DWELL_MS = 1500;
/** How far (in dp) the slot may move between two looks and still count as "the same place". */
export const SETTLE_Y_TOLERANCE = 4;

export interface SlotMeasure {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Settle {
  at: number;
  y: number;
}

/**
 * True when the slot is really visible: all of it above the visible bottom (the screen height minus
 * whatever floats over it, such as the tab bar), not scrolled past the top, and inside the screen sideways.
 */
export function isSlotOnScreen(
  m: SlotMeasure,
  window: { width: number; height: number },
  bottomInset: number,
): boolean {
  if (!(m.width > 0) || !(m.height > 0)) return false;
  const visibleBottom = window.height - bottomInset;
  const vertical = m.y + SLOT_HEIGHT <= visibleBottom && m.y + m.height > 0;
  const horizontal = m.x < window.width - EDGE_TOLERANCE && m.x + m.width > EDGE_TOLERANCE;
  return vertical && horizontal;
}

/**
 * Content above a slot often loads after the first layout and pushes the slot down, so one look is not
 * enough. Feed each look in; `commit` turns true once the slot has been on screen at (almost) the same
 * position for SETTLE_DWELL_MS. Any look off screen, or a move, starts the wait again.
 */
export function nextSettle(
  prev: Settle | null,
  onScreen: boolean,
  y: number,
  now: number,
): { settle: Settle | null; commit: boolean } {
  if (!onScreen) return { settle: null, commit: false };
  if (prev && Math.abs(prev.y - y) <= SETTLE_Y_TOLERANCE) {
    return { settle: prev, commit: now - prev.at >= SETTLE_DWELL_MS };
  }
  return { settle: { at: now, y }, commit: false };
}
