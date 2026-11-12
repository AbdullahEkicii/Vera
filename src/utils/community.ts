// Pure rules for the anonymous community feed. No Firebase imports here, so these run under node --test.

export const COMMUNITY_TEMPLATES = ['hatim.completed', 'achievement', 'dhikr.milestone', 'prayer.fullday'] as const;
export type CommunityTemplateKey = (typeof COMMUNITY_TEMPLATES)[number];

export const COMMUNITY_EMOJIS = ['🤲', '❤️', '🎉', '🌙', '⭐'] as const;
export type CommunityEmoji = (typeof COMMUNITY_EMOJIS)[number];

export interface CommunityPostParams {
  count?: number;
  country?: string;
  title?: string;
}

const COUNTRY_CODE = /^[A-Z]{2}$/;
const MAX_COUNT = 1_000_000;
const MAX_TITLE_LENGTH = 60;

/** Region from a BCP-47 locale: "tr-TR" -> "TR", "zh-Hant-TW" -> "TW", "en" -> null. */
export function regionFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  const match = locale.match(/[-_]([A-Za-z]{2})(?:[-_]|$)/);
  return match ? match[1].toUpperCase() : null;
}

/** Only keys the template allowlist knows about, with values in range. Anything else is rejected. */
export function isValidPostPayload(templateKey: string, params: CommunityPostParams): boolean {
  if (!(COMMUNITY_TEMPLATES as readonly string[]).includes(templateKey)) return false;

  const allowedKeys = ['count', 'country', 'title'];
  if (Object.keys(params).some((key) => !allowedKeys.includes(key))) return false;

  if (params.count !== undefined) {
    if (!Number.isInteger(params.count) || params.count < 1 || params.count > MAX_COUNT) return false;
  }
  if (params.country !== undefined && !COUNTRY_CODE.test(params.country)) return false;
  if (params.title !== undefined && (typeof params.title !== 'string' || params.title.length > MAX_TITLE_LENGTH)) {
    return false;
  }
  return true;
}

export function isAllowedEmoji(emoji: string): emoji is CommunityEmoji {
  return (COMMUNITY_EMOJIS as readonly string[]).includes(emoji);
}

/** Stable document id for one user's one reaction to one post. */
export function reactionDocId(uid: string, emoji: CommunityEmoji): string {
  return `${uid}_${COMMUNITY_EMOJIS.indexOf(emoji)}`;
}

/** One prompt per completed event: the key changes with each hatim, so the next one asks again. */
export function hatimPromptKey(completedHatims: number): string {
  return `hatim.completed:${completedHatims}`;
}

/** Drops posts from authors the user blocked. Pure, so the feed filter can be tested without UI. */
export function filterBlockedAuthors<T extends { authorUid: string }>(posts: T[], blockedUids: string[]): T[] {
  if (blockedUids.length === 0) return posts;
  const blocked = new Set(blockedUids);
  return posts.filter((post) => !blocked.has(post.authorUid));
}
