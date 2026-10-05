import { AppStorage } from './storageService';
import { logEvent } from './analyticsService';

const REFERRAL_CODE_KEY = 'MY_REFERRAL_CODE';
const REFERRED_BY_KEY = 'REFERRED_BY_CODE';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

function generateCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Returns this device's personal referral code, generating one on first use. */
export async function getOrCreateReferralCode(): Promise<string> {
  const existing = await AppStorage.getItem(REFERRAL_CODE_KEY);
  if (existing) return existing;
  const code = generateCode();
  await AppStorage.setItem(REFERRAL_CODE_KEY, code);
  return code;
}

export function getReferralLink(code: string): string {
  return `ezanapp://link?type=invite&ref=${code}`;
}

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.abdllhekc.vera';

export type ShareSource = 'greeting' | 'story' | 'invite';

/**
 * Play Store link tagged with an install referrer. Firebase Analytics reads the
 * utm_* values on first_open, so installs coming from shared cards and invites show
 * up as their own acquisition source. Keep it short when it goes into a small QR.
 */
export function getStoreLink(source: ShareSource, code?: string): string {
  const referrer = `utm_source=${source}${code ? `&utm_content=${code}` : ''}`;
  return `${STORE_URL}&referrer=${encodeURIComponent(referrer)}`;
}

type Translate = (key: string, defaultValue: string, options?: Record<string, unknown>) => string;

export function getReferralShareMessage(code: string, t: Translate): string {
  return t(
    'share.inviteMessage',
    "🕌 Vera ile namaz vakitlerini, ezanı ve Kur'an okumayı takip ediyorum. Birlikte hatim takibi yapalım!\n\n📲 Uygulamayı indir: {{link}}",
    { link: getStoreLink('invite', code) },
  );
}

/** Persists the referral code that brought this user in (first-touch, never overwritten). */
export async function recordReferralIfPresent(refCode: string | undefined | null): Promise<void> {
  if (!refCode) return;
  const alreadyRecorded = await AppStorage.getItem(REFERRED_BY_KEY);
  if (alreadyRecorded) return; // first-touch attribution only
  await AppStorage.setItem(REFERRED_BY_KEY, refCode);
  logEvent('referral_link_opened', { ref_code: refCode });
}

export async function getReferredByCode(): Promise<string | null> {
  const val = await AppStorage.getItem(REFERRED_BY_KEY);
  return val || null;
}
