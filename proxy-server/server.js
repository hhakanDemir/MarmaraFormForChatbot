const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// --- Yapilandirma ---
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://hhakandemir.github.io';

if (!WEBHOOK_URL) {
  console.error('HATA: WEBHOOK_URL environment variable ayarlanmamis!');
  process.exit(1);
}

// --- Guvenlik middleware ---
app.use(helmet());

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10kb' }));

// Rate limiting: IP basina dakikada 10 istek
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Cok fazla istek gonderdiniz. Lutfen bir dakika bekleyin.' }
});

app.use('/api/chat', limiter);

// --- Chat endpoint ---
app.post('/api/chat', async (req, res) => {
  const { sessionId, adSoyad, ogrenciNo, bolum, email, soru } = req.body;

  // Temel validasyon
  if (!sessionId || !adSoyad || !ogrenciNo || !soru) {
    return res.status(400).json({ error: 'Eksik alanlar var.' });
  }

  if (typeof soru !== 'string' || soru.length > 1000) {
    return res.status(400).json({ error: 'Soru gecersiz veya cok uzun.' });
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, adSoyad, ogrenciNo, bolum, email, soru })
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Sunucu hatasi.' });
    }

    const raw = await response.text();

    try {
      const data = JSON.parse(raw);
      const answer = data.output || data.response || data.text || data.message || data.cevap || JSON.stringify(data);
      return res.json({ answer });
    } catch {
      return res.json({ answer: raw });
    }
  } catch (error) {
    console.error('Webhook hatasi:', error.message);
    return res.status(502).json({ error: 'Sunucuya ulasilamiyor.' });
  }
});

// --- Saglik kontrolu ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Sunucuyu baslat ---
app.listen(PORT, () => {
  console.log(`Proxy server ${PORT} portunda calisiyor`);
});
