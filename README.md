# Nexus — KOBİ Operasyon Asistanı

> YZTA 5.0 AI Hackathon — AI Geliştirme Kategorisi

KOBİ'lerin günlük operasyonlarını doğal dil üzerinden yönetmelerine olanak tanıyan, yapay zeka destekli operasyon merkezi. İşletme yöneticisi Türkçe konuşur, sistem hem yanıt verir hem aksiyon alır.

---

## 🎯 Problem

Küçük işletmeler günde 2–3 saatini "siparişim nerede?", "stokta ne kaldı?" gibi tekrar eden operasyonel sorulara harcıyor. Bu süre müşteri kaybına, stok tükenmesine ve ölçekleme güçlüğüne dönüşüyor.

## 💡 Çözüm

Doğal dil ile iletişim kurulan, gerçek aksiyonlar alabilen AI asistanı:

```
"Bugün kaç sipariş var?"         → Anlık sipariş listesi
"Kritik stokta ne var?"          → Uyarı verir
"128 numaralı siparişi iptal et" → Gerçekten günceller
"Bu hafta en çok ne sattık?"     → Analiz + grafik
```

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────┐
│                   KULLANICI (React)                  │
│         Chat Arayüzü  │  Dashboard  │  WebSocket     │
└──────────────────────────────────────────────────────┘
                         │ REST + WebSocket
┌──────────────────────────────────────────────────────┐
│                 FastAPI Backend (Python)              │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  AI Agent   │  │ Insight      │  │  Auth      │  │
│  │  (Pre-fetch │  │ Engine       │  │  (JWT)     │  │
│  │  + LLM)     │  │ (APScheduler)│  │            │  │
│  └──────┬──────┘  └──────────────┘  └────────────┘  │
│         │                                            │
│  ┌──────┴──────────────────────────────────────┐    │
│  │          Tool Executor (9 araç)              │    │
│  │  get_orders │ get_stock │ update_order │ ... │    │
│  └──────┬──────────────────────────────────────┘    │
│         │                                            │
│  ┌──────┴──────┐  ┌──────────┐  ┌───────────────┐  │
│  │   SQLite    │  │  FAISS   │  │  OCR Service  │  │
│  │ (SQLAlchemy)│  │  (RAG)   │  │  (Tesseract)  │  │
│  └─────────────┘  └──────────┘  └───────────────┘  │
└──────────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────┐
│              NVIDIA NIM (LLM API)                    │
│    mistralai/mistral-nemo-12b-instruct (Ana model)   │
│    meta/llama-3.3-70b-instruct (RAG için)            │
│    nvidia/nv-embedqa-e5-v5 (Embedding)               │
└──────────────────────────────────────────────────────┘
```

---

## 🤖 Yapay Zeka Yaklaşımı

### Pre-fetch Strategy (Tool Calling yerine)
Klasik function calling yerine **keyword tabanlı pre-fetch** kullandık:
1. Kullanıcı mesajı anahtar kelimeler açısından analiz edilir
2. İlgili veriler DB'den **tek sorguda** çekilir
3. Veri + mesaj birlikte LLM'e gönderilir → tek API çağrısı

**Neden?** Daha az gecikme, daha güvenilir sonuç, daha az hata.

### Neden NVIDIA NIM API? (Gemini yerine)
Hackathon'da Gemini önerilmekle birlikte, NVIDIA NIM tercih edilmiştir. Gerekçeler:
- **Ücretsiz kullanım limiti:** NVIDIA NIM API ücretsiz katmanı prototipleme için yeterli kotayı sunmaktadır.
- **Model çeşitliliği:** Tek platform üzerinden chat (Mistral Nemo 12B), RAG (Llama 3.3 70B) ve embedding (NV-EmbedQA E5) modellerine erişim sağlanmıştır.
- **OpenAI uyumlu SDK:** `openai` Python SDK'sı ile çalıştığı için ileride Gemini veya başka bir sağlayıcıya geçiş tek satır değişiklikle mümkündür.

### Proaktif AI Engine
APScheduler ile her 5 dakikada arka planda çalışır:
- Kritik stok tespiti → otomatik `AIInsight` üretir
- Geciken sipariş tespiti → yöneticiye bildirim
- Kargo gecikme riski tespiti → önceden uyarı
- WebSocket ile anlık push notification

### RAG (Retrieval-Augmented Generation)
LangChain + FAISS ile belge hafızası:
- PDF, DOCX, XLSX, TXT destekli
- Çok dilli embedding (Türkçe/İngilizce)
- İşletmenin kendi belgelerine soru sormak için

### Stok Tahmin Motoru
- Son 30 günlük satış verisi + son 7 günlük trend
- Her ürün için tahmini tükenme günü hesaplama
- Risk seviyesi: `critical` / `warning` / `safe`

---

## ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 💬 AI Chat | Doğal dil ile sipariş, stok, müşteri sorguları — streaming yanıt |
| 📊 Dashboard | Anlık özet: bekleyen siparişler, kritik stoklar, günlük ciro |
| 📈 Analitik | Gelir trendi, kategori bazlı ciro, en çok satan ürünler |
| 🔔 Proaktif İçgörüler | AI'ın her 5 dakikada ürettiği stok/gecikme/trend uyarıları |
| 📦 Sipariş Yönetimi | Sipariş listesi, durum güncelleme, kargo takibi |
| 🗄️ Stok Yönetimi | Ürün stok durumu, kritik eşik uyarıları, stok güncelleme |
| 🧾 OCR Tarama | Fatura görüntüsünden ürün verisi çıkarma → stoka otomatik işleme |
| ⚡ Canlı Simülasyon | Her 90 saniyede gerçek zamanlı sipariş/kargo güncellemesi |
| 🔄 WebSocket | Anlık push bildirimler, dashboard canlı güncelleme |
| 🔐 JWT Auth | Token tabanlı kimlik doğrulama, rol yönetimi |

---

## 🚀 Kurulum

### Gereksinimler
- Python 3.10+
- Node.js 18+
- NVIDIA NIM API Key ([alın](https://build.nvidia.com/))
- **Tesseract OCR (Windows İçin):** Fatura tarama özelliğinin çalışması için [buradan](https://github.com/UB-Mannheim/tesseract/wiki) indirin ve `C:\Program Files\Tesseract-OCR\` dizinine kurun. Kurarken "Additional script data" → "Turkish" seçeneğini işaretlemeyi unutmayın.

### Backend

```bash
cd backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# .env dosyasını düzenle: NVIDIA_API_KEY ve JWT_SECRET ekle

python main.py
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### İlk Giriş

```
Kullanıcı: admin
Şifre:     admin123
```

İlk başlatmada demo verileri (8 müşteri, 32 ürün, 100 sipariş) otomatik yüklenir.

---

## 📁 Proje Yapısı

```
kobi-asistan/
├── backend/
│   ├── main.py              # FastAPI uygulaması + tüm endpoint'ler
│   ├── agent.py             # AI agent (pre-fetch + LLM)
│   ├── tools.py             # Tool tanımları (9 araç)
│   ├── tool_executor.py     # DB operasyonları
│   ├── models.py            # SQLAlchemy modelleri
│   ├── database.py          # DB bağlantısı
│   ├── seed_data.py         # Demo veri yükleyici
│   ├── auth.py              # JWT kimlik doğrulama
│   ├── insight_engine.py    # Proaktif AI motoru
│   ├── prediction.py        # Stok tahmin motoru
│   ├── simulation.py        # Gerçek zamanlı sipariş/kargo simülasyonu
│   ├── ocr_service.py       # Fatura OCR (Tesseract + Vision LLM)
│   ├── websocket_manager.py # WebSocket yönetimi
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx          # Ana uygulama (chat + dashboard)
│       └── index.css
├── .gitignore
└── README.md
```

---

## 🛠️ Kullanılan Teknolojiler

**Backend:** FastAPI, Python, SQLAlchemy, SQLite, APScheduler, LangChain, FAISS, Tesseract OCR

**AI / LLM:** NVIDIA NIM API — Mistral Nemo 12B (chat), Llama 3.1 8B (yedek)

**Frontend:** React, Recharts, WebSocket

---

## 📹 Demo

[YouTube Demo Linki]

---

## 📹 Demo Senaryosu

Video'da gösterilen akış:
1. **Giriş:** Problem tanımı — KOBİ'ler günde 2-3 saat operasyona harcıyor
2. **Mimari:** FastAPI + NVIDIA NIM + React tek ekran gösterimi
3. **Canlı Demo:**
   - AI'a "Bugün bekleyen siparişler neler?" diye sorma
   - Kritik stok uyarısı alma
   - Fatura fotoğrafı yükleyip OCR ile stoka işleme
   - Doğal dille workflow oluşturma
4. **Değer:** Sıfır insan müdahalesi, anlık bilgi, proaktif uyarılar

---

## 👤 Geliştirici

**Mehmet Emin Akkaya**
- Portfolio: [mehmeteminakkaya.com](https://mehmeteminakkaya.com)
- GitHub: [@mehmeteminakkaya](https://github.com/mehmeteminakkaya)
- LinkedIn: [in/mehmeteminakkaya](https://www.linkedin.com/in/mehmeteminakkaya/)
- Hackathon: YZTA 5.0 — AI Geliştirme Hackathon

