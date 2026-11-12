// Pure helpers for the feedback relay (no Firebase imports, so they run under `node --test`).

const TELEGRAM_LIMIT = 4000; // Telegram rejects messages over 4096 characters.

function pickTimestamp(createdAt) {
  if (createdAt && typeof createdAt.toDate === 'function') return createdAt.toDate();
  return null;
}

/** The permanent copy kept apart from `app_feedback`, plus a place to mark it handled. */
export function buildArchiveDoc(id, data, receivedAt = new Date()) {
  return {
    sourceId: id,
    message: String(data.message ?? ''),
    language: data.language ?? null,
    platform: data.platform ?? null,
    osVersion: data.osVersion ?? null,
    appVersion: data.appVersion ?? null,
    diag: data.diag && typeof data.diag === 'object' ? data.diag : null,
    createdAt: data.createdAt ?? null,
    archivedAt: receivedAt,
    handled: false,
  };
}

/** One readable message for a chat/e-mail notification. */
export function formatFeedbackNotice(id, data) {
  const when = pickTimestamp(data.createdAt);
  const head = [
    'Vera geri bildirimi',
    [data.platform, data.osVersion && `OS ${data.osVersion}`, data.appVersion && `v${data.appVersion}`, data.language]
      .filter(Boolean)
      .join(' · '),
    when ? when.toISOString() : null,
  ]
    .filter(Boolean)
    .join('\n');
  const diag =
    data.diag && Object.keys(data.diag).length > 0
      ? `\n\n[diag] ${Object.entries(data.diag)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')}`
      : '';
  const text = `${head}\n\n${String(data.message ?? '')}${diag}\n\nid: ${id}`;
  return text.length > TELEGRAM_LIMIT ? `${text.slice(0, TELEGRAM_LIMIT - 1)}…` : text;
}
