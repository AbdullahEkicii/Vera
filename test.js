const https = require('https');

https.get('https://api.alquran.cloud/v1/edition', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const quran = json.data.filter(e => e.language === 'ar' && e.format === 'text').map(e => e.identifier);
    console.log(quran);
  });
});
