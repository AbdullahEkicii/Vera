fetch('https://api.alquran.cloud/v1/juz/1/quran-imlaei').then(r => r.text()).then(t => console.log('RESPONSE:', t.substring(0, 100))).catch(e => console.error(e));
