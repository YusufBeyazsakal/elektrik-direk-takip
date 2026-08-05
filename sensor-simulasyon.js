// Bu script, gerçek sensörler yokken test amaçlı rastgele veri üretir
// ve API'ye gönderir. Gerçek sensörler bağlandığında bu dosyaya gerek kalmaz.

const direkIdleri = [1, 2, 3]; // Veritabanındaki direk id'leri
const olcumTurleri = ['titresim', 'sicaklik', 'egim'];

// Her ölçüm türü için normal aralık ve eşik değeri
const esikDegerler = {
  titresim: 5,    // 0-5 arası normal, üstü tehlikeli
  sicaklik: 60,   // 0-60 derece normal, üstü tehlikeli
  egim: 10        // 0-10 derece normal, üstü tehlikeli (direk eğimi)
};

function rastgeleDeger(olcumTuru) {
  const esik = esikDegerler[olcumTuru];
  // %20 ihtimalle eşiği aşan "anormal" bir değer üret, %80 normal değer
  const anormalMi = Math.random() < 0.2;
  if (anormalMi) {
    return +(esik + Math.random() * esik * 0.5).toFixed(2); // eşiğin üstünde
  }
  return +(Math.random() * esik * 0.7).toFixed(2); // normal aralıkta
}

async function veriGonder() {
  const direk_id = direkIdleri[Math.floor(Math.random() * direkIdleri.length)];
  const olcum_turu = olcumTurleri[Math.floor(Math.random() * olcumTurleri.length)];
  const deger = rastgeleDeger(olcum_turu);
  const esik_deger = esikDegerler[olcum_turu];

  try {
    const res = await fetch('https://elektrik-direk-takip.onrender.com/api/sensor-veri', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direk_id, olcum_turu, deger, esik_deger })
    });
    const data = await res.json();
    const durum = data.esikAsildiMi ? '⚠️ EŞİK AŞILDI - ARIZA OLUŞTURULDU' : '✅ normal';
    console.log(`Direk ${direk_id} | ${olcum_turu}: ${deger} (eşik: ${esik_deger}) → ${durum}`);
  } catch (err) {
    console.error('Hata:', err.message);
  }
}

// Her 3 saniyede bir yeni sensör verisi gönder
console.log('Sensör simülasyonu başladı... (durdurmak için Ctrl+C)');
setInterval(veriGonder, 3000);