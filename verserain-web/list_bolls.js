fetch("https://bolls.life/get-translations/")
  .then(res => res.json())
  .then(data => console.log(data.filter(t => JSON.stringify(t).includes('Chinese') || JSON.stringify(t).includes('CUV') || t.language === 'zh').map(t => t.short_name)))
  .catch(console.error);
