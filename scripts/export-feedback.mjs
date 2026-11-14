// Pulls every in-app feedback message (app_feedback + the archive copy) into a CSV you can open
// in a spreadsheet. Read-only. Needs one-time credentials:
//   gcloud auth application-default login      (or set GOOGLE_APPLICATION_CREDENTIALS)
// Usage: node scripts/export-feedback.mjs [out.csv]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(resolve('functions/package.json'));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'vera-azan' });
const db = getFirestore();

const rows = new Map();
for (const collection of ['app_feedback_archive', 'app_feedback']) {
  const snap = await db.collection(collection).get();
  for (const doc of snap.docs) {
    const d = doc.data();
    const id = d.sourceId ?? doc.id;
    if (rows.has(id)) continue;
    const created = d.createdAt?.toDate?.() ?? null;
    rows.set(id, {
      id,
      createdAt: created ? created.toISOString() : '',
      appVersion: d.appVersion ?? '',
      platform: d.platform ?? '',
      osVersion: d.osVersion ?? '',
      language: d.language ?? '',
      diag: d.diag ? JSON.stringify(d.diag) : '',
      message: d.message ?? '',
    });
  }
}

const cols = ['createdAt', 'id', 'appVersion', 'platform', 'osVersion', 'language', 'diag', 'message'];
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const sorted = [...rows.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
const csv = '﻿' + [cols.join(','), ...sorted.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
const out = resolve(process.argv[2] ?? `feedback-export/feedback-${new Date().toISOString().slice(0, 10)}.csv`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, csv, 'utf8');
console.log(`${sorted.length} feedback messages written to ${out}`);
