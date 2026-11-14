// Pure region -> calculation method mapping (no React Native imports, so it runs under `node --test`).

const EUROPE_CODES = [
  'DE', 'FR', 'GB', 'NL', 'BE', 'AT', 'CH', 'SE', 'DK', 'NO', 'FI', 'IT', 'ES', 'PT', 'IE', 'LU',
  'PL', 'CZ', 'SK', 'HU', 'GR', 'BG', 'RO', 'CY', 'HR', 'SI', 'RS', 'BA', 'MK', 'AL', 'XK', 'ME',
];

/**
 * Returns the recommended prayer calculation method based on ISO country code or device timezone.
 */
export function recommendMethod(countryCode: string, timeZone: string, language: string): number {
  const code = (countryCode || '').toUpperCase();
  const tz = (timeZone || '').toLowerCase();
  // A country code is authoritative; the timezone is only a hint when there is none.
  const byTz = !code;
  const isTurkishSpeaker = language.toLowerCase().startsWith('tr');

  // Turkey
  if (code === 'TR' || (byTz && (tz.includes('istanbul') || tz.includes('ankara')))) {
    return 13; // Diyanet
  }

  // Saudi Arabia & Gulf
  if (['SA', 'AE', 'QA', 'KW', 'OM', 'BH', 'YE'].includes(code) || (byTz && (tz.includes('riyadh') || tz.includes('dubai') || tz.includes('qatar')))) {
    return 4; // Umm Al-Qura
  }

  // Egypt, Sudan, Libya, Levant
  if (['EG', 'SD', 'LY', 'SY', 'JO', 'LB', 'PS'].includes(code) || (byTz && (tz.includes('cairo') || tz.includes('damascus') || tz.includes('beirut') || tz.includes('jerusalem') || tz.includes('amman')))) {
    return 5; // Egyptian General Authority
  }

  // Pakistan, India, Bangladesh, Afghanistan
  if (['PK', 'IN', 'BD', 'AF'].includes(code) || (byTz && (tz.includes('karachi') || tz.includes('kolkata') || tz.includes('calcutta') || tz.includes('dhaka') || tz.includes('kabul')))) {
    return 1; // Karachi
  }

  // Southeast Asia: national authorities publish their own angles
  if (code === 'ID' || (byTz && tz.includes('jakarta'))) return 20; // Kemenag
  if (code === 'MY' || code === 'BN' || (byTz && tz.includes('kuala_lumpur'))) return 17; // JAKIM
  if (code === 'SG' || (byTz && tz.includes('singapore'))) return 11; // MUIS

  // Iran
  if (code === 'IR' || (byTz && tz.includes('tehran'))) return 7;

  // North America (USA, Canada). The timezone hint is limited to the US/Canada zones: Latin
  // America (Sao_Paulo, Bogota...) is also under "America/" and is not ISNA territory.
  if (['US', 'CA'].includes(code) || (byTz && (tz.includes('new_york') || tz.includes('chicago') || tz.includes('los_angeles') || tz.includes('toronto') || tz.includes('denver') || tz.includes('vancouver')))) {
    return 2; // ISNA
  }

  // Turkish speakers in Europe (the diaspora) follow Diyanet: their mosques (DITIB and others)
  // publish Diyanet times, and Muslim World League / UOIF would be 5-9 minutes off for sunrise,
  // noon and sunset. Only a default; Settings can change it.
  if (isTurkishSpeaker && EUROPE_CODES.includes(code)) return 13;

  // France
  if (code === 'FR' || (byTz && tz.includes('paris'))) {
    return 12; // UOIF
  }

  // Russia & Central Asia
  if (['RU', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AZ'].includes(code) || (byTz && (tz.includes('moscow') || tz.includes('tashkent') || tz.includes('almaty') || tz.includes('baku')))) {
    return 14; // Russia
  }

  // Default international standard for the rest of Europe, Asia & the world
  return 3; // Muslim World League (MWL)
}
