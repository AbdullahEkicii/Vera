// Pages of the home pager, in the order the pager renders them (see src/app/(tabs)/index.tsx).
export const HOME_TAB = {
  quran: 0,
  daily: 1,
  home: 2,
  community: 3,
  tasbih: 4,
  names: 5,
} as const;

/**
 * Params that open one home pager page.
 * The nonce makes every navigation a new param value. Without it, a second tap that asks for the same
 * page leaves the params unchanged, so the pager never moves and the user stays on whatever page they are on.
 */
export function homeTabParams(tab: number, extra: Record<string, string> = {}): Record<string, string> {
  return { ...extra, tab: String(tab), nonce: `${Date.now()}` };
}
