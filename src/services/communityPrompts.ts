import { AppStorage } from './storageService';

// Keys of events the user already answered ("Paylaş" or "Şimdi değil"). Each event asks once.
const ANSWERED_KEY = 'COMMUNITY_PROMPTS_ANSWERED_V1';

async function loadAnswered(): Promise<string[]> {
  try {
    const raw = await AppStorage.getItem(ANSWERED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function wasPromptAnswered(promptKey: string): Promise<boolean> {
  return (await loadAnswered()).includes(promptKey);
}

export async function markPromptAnswered(promptKey: string): Promise<void> {
  const answered = await loadAnswered();
  if (answered.includes(promptKey)) return;
  // Keep the list short: old event keys are never asked again.
  const next = [...answered, promptKey].slice(-200);
  await AppStorage.setItem(ANSWERED_KEY, JSON.stringify(next));
}
