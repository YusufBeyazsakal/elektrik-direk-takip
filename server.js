require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
  res.send('Elektrik Direk Arıza Takip API çalışıyor 🚀');
});

// Tüm direkleri listele
app.get('/api/direkler', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM direkler');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Tüm arızaları listele
app.get('/api/arizalar', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.tur, a.aciklama, a.oncelik, a.durum, a.bildirilme_tarihi,
             d.kod AS direk_kod, d.bolge
      FROM arizalar a
      JOIN direkler d ON a.direk_id = d.id
      ORDER BY a.bildirilme_tarihi DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Yeni arıza bildir
app.post('/api/arizalar', async (req, res) => {
  try {
    const { direk_id, tur, aciklama, oncelik } = req.body;
    await pool.query(
      `INSERT INTO arizalar (direk_id, tur, aciklama, oncelik) VALUES ($1, $2, $3, $4)`,
      [direk_id, tur, aciklama, oncelik]
    );
    res.json({ mesaj: 'Arıza başarıyla kaydedildi' });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Arıza durumunu güncelle
app.put('/api/arizalar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { durum } = req.body;
    await pool.query('UPDATE arizalar SET durum = $1 WHERE id = $2', [durum, id]);
    res.json({ mesaj: 'Arıza durumu güncellendi' });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Sensör verisi al
app.post('/api/sensor-veri', async (req, res) => {
  try {
    const { direk_id, olcum_turu, deger, esik_deger } = req.body;
    const esikAsildiMi = deger > esik_deger;

    await pool.query(
      `INSERT INTO sensor_verileri (direk_id, olcum_turu, deger, esik_asildi_mi) VALUES ($1, $2, $3, $4)`,
      [direk_id, olcum_turu, deger, esikAsildiMi]
    );

    if (esikAsildiMi) {
      await pool.query(
        `INSERT INTO arizalar (direk_id, tur, aciklama, oncelik) VALUES ($1, 'sensor', $2, 'yuksek')`,
        [direk_id, olcum_turu + ' degeri esik asti: ' + deger]
      );
    }

    res.json({ mesaj: 'Sensör verisi kaydedildi', esikAsildiMi });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Sensör verilerini listele
app.get('/api/sensor-veri', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, d.kod AS direk_kod
      FROM sensor_verileri s
      JOIN direkler d ON s.direk_id = d.id
      ORDER BY s.zaman DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// Giriş kontrolü
// Yeni kullanıcı kaydı (sadece davet kodu olanlar için)
const KAYIT_ANAHTARI = 'TEIAS2026'; // Bu kodu bilmeyen kayıt olamaz

app.post('/api/kayit', async (req, res) => {
  try {
    const { kullanici_adi, sifre, ad_soyad, davet_kodu } = req.body;

    if (davet_kodu !== KAYIT_ANAHTARI) {
      return res.status(403).json({ hata: 'Geçersiz davet kodu. Sadece yetkili personel kayıt olabilir.' });
    }

    const kontrol = await pool.query('SELECT id FROM kullanicilar WHERE kullanici_adi = $1', [kullanici_adi]);
    if (kontrol.rows.length > 0) {
      return res.status(400).json({ hata: 'Bu kullanıcı adı zaten alınmış' });
    }

    const result = await pool.query(
      'INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad) VALUES ($1, $2, $3) RETURNING id, kullanici_adi, ad_soyad, rol',
      [kullanici_adi, sifre, ad_soyad]
    );

    res.json({ basarili: true, kullanici: result.rows[0] });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});
app.post('/api/giris', async (req, res) => {
  try {
    const { kullanici_adi, sifre } = req.body;
    const result = await pool.query(
      'SELECT id, kullanici_adi, ad_soyad, rol FROM kullanicilar WHERE kullanici_adi = $1 AND sifre = $2',
      [kullanici_adi, sifre]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ hata: 'Kullanıcı adı veya şifre hatalı' });
    }

    res.json({ basarili: true, kullanici: result.rows[0] });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});