const { Client } = require('pg');

const connectionString = 'postgresql://elektrik_direk_db_user:01DCn7Oae5qBUgbB0y3RhGPgrSDDrBKy@dpg-d9nl2g8ae00c739vc70g-a.frankfurt-postgres.render.com/elektrik_direk_db';

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function tablolariOlustur() {
  await client.connect();
  console.log('Veritabanına bağlanıldı, tablolar oluşturuluyor...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS direkler (
      id SERIAL PRIMARY KEY,
      kod VARCHAR(50) NOT NULL,
      enlem FLOAT,
      boylam FLOAT,
      bolge VARCHAR(100),
      kurulum_tarihi DATE
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS arizalar (
      id SERIAL PRIMARY KEY,
      direk_id INTEGER NOT NULL REFERENCES direkler(id),
      tur VARCHAR(20) NOT NULL,
      aciklama VARCHAR(500),
      oncelik VARCHAR(20),
      durum VARCHAR(20) NOT NULL DEFAULT 'acik',
      bildirilme_tarihi TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS sensor_verileri (
      id SERIAL PRIMARY KEY,
      direk_id INTEGER NOT NULL REFERENCES direkler(id),
      olcum_turu VARCHAR(50) NOT NULL,
      deger FLOAT NOT NULL,
      esik_asildi_mi BOOLEAN NOT NULL DEFAULT false,
      zaman TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS kullanicilar (
      id SERIAL PRIMARY KEY,
      kullanici_adi VARCHAR(50) NOT NULL UNIQUE,
      sifre VARCHAR(100) NOT NULL,
      ad_soyad VARCHAR(100),
      rol VARCHAR(20) NOT NULL DEFAULT 'mühendis'
    );
  `);

  console.log('Tüm tablolar oluşturuldu!');

  // Test verileri ekle
  await client.query(`
    INSERT INTO direkler (kod, enlem, boylam, bolge, kurulum_tarihi) VALUES
    ('D-001', 37.9144, 40.2306, 'Diyarbakır Merkez', '2020-01-15'),
    ('D-002', 37.9200, 40.2400, 'Diyarbakır Merkez', '2020-01-15'),
    ('D-003', 37.9300, 40.2500, 'Diyarbakır Kayapınar', '2021-03-10')
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol) VALUES
    ('yusuf', 'Direk2026!', 'Yusuf', 'mühendis')
    ON CONFLICT (kullanici_adi) DO NOTHING;
  `);

  console.log('Test verileri eklendi!');
  await client.end();
}

tablolariOlustur().catch(err => console.error('Hata:', err));