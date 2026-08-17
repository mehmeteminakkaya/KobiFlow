// ── KobiFlow KOBİ Operasyon & Envanter Veritabanı ──────────────────
export const INITIAL_CUSTOMERS = [
  { id: 1, name: "Merkez Depo & Lojistik", email: "depo@kobiflow.com", phone: "0212 444 10 01", branch: "Merkez Depo" },
  { id: 2, name: "Kadıköy Satış Şubesi", email: "kadikoy@kobiflow.com", phone: "0216 330 20 02", branch: "Kadıköy Şube" },
  { id: 3, name: "Levent Kurumsal Mağaza", email: "levent@kobiflow.com", phone: "0212 280 30 03", branch: "Levent Şube" },
  { id: 4, name: "Ankara Dağıtım Merkezi", email: "ankara@kobiflow.com", phone: "0312 410 40 04", branch: "Ankara Şube" },
  { id: 5, name: "Aras Endüstriyel Malzemeler A.Ş.", email: "tedarik@arasendustri.com", phone: "0532 100 20 30", branch: "B2B Kurumsal" },
  { id: 6, name: "Yıldız Lojistik & Depolama", email: "siparis@yildizlojistik.com", phone: "0533 200 30 40", branch: "B2B Kurumsal" },
  { id: 7, name: "Mega Tekstil Sanayi Ltd.", email: "muhasebe@megatekstil.com", phone: "0534 300 40 50", branch: "B2B Kurumsal" }
]

export const INITIAL_PRODUCTS = [
  { id: 1, name: "Endüstriyel Streç Film (50cm x 300m)", category: "Ambalaj & Paketleme", price: 285.0, stock_quantity: 450, min_stock_threshold: 80, branch: "Merkez Depo" },
  { id: 2, name: "A4 Fotokopi Kağıdı 80gr (Koli - 5 Paket)", category: "Ofis & Kırtasiye", price: 620.0, stock_quantity: 120, min_stock_threshold: 40, branch: "Kadıköy Şube" },
  { id: 3, name: "Çift Taraflı Akrilik Montaj Bandı (19mm x 50m)", category: "Teknik Hırdavat", price: 145.0, stock_quantity: 310, min_stock_threshold: 60, branch: "Levent Şube" },
  { id: 4, name: "Termal Barkod Etiketi 100x150mm (Rulo)", category: "Ambalaj & Paketleme", price: 180.0, stock_quantity: 14, min_stock_threshold: 50, branch: "Merkez Depo" },
  { id: 5, name: "Nitril Koruyucu İş Eldiveni (100'lü Kutu)", category: "İş Güvenliği", price: 340.0, stock_quantity: 85, min_stock_threshold: 30, branch: "Ankara Şube" },
  { id: 6, name: "Paslanmaz Çelik Civata & Somun Seti (M8x40)", category: "Teknik Hırdavat", price: 420.0, stock_quantity: 210, min_stock_threshold: 50, branch: "Merkez Depo" },
  { id: 7, name: "Endüstriyel Zemin Temizleme Sıvısı (20L Bidon)", category: "Kimyasal & Temizlik", price: 780.0, stock_quantity: 9, min_stock_threshold: 25, branch: "Kadıköy Şube" },
  { id: 8, name: "Koli Bandı Şeffaf 45mm x 100m (Koli - 48 Adet)", category: "Ambalaj & Paketleme", price: 1150.0, stock_quantity: 38, min_stock_threshold: 15, branch: "Levent Şube" },
  { id: 9, name: "Ergonomik Fileli Personel Çalışma Koltuğu", category: "Ofis & Mobilya", price: 3450.0, stock_quantity: 18, min_stock_threshold: 8, branch: "Levent Şube" },
  { id: 10, name: "Kablosuz Lazer Barkod Okuyucu (USB/BT)", category: "Elektronik & Donanım", price: 1850.0, stock_quantity: 24, min_stock_threshold: 10, branch: "Kadıköy Şube" },
  { id: 11, name: "Katlanır Plastik Taşıma Kasası 60x40x32cm", category: "Depolama & Lojistik", price: 295.0, stock_quantity: 160, min_stock_threshold: 40, branch: "Merkez Depo" },
  { id: 12, name: "Dijital Hassas Tartı 30kg / 1gr", category: "Elektronik & Donanım", price: 2100.0, stock_quantity: 12, min_stock_threshold: 5, branch: "Ankara Şube" }
]

export const INITIAL_ORDERS = [
  {
    id: 10482,
    customer: "Aras Endüstriyel Malzemeler A.Ş.",
    total_amount: 14250.0,
    status: "pending",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    branch: "Merkez Depo",
    items: [
      { product_name: "Endüstriyel Streç Film (50cm x 300m)", quantity: 30, unit_price: 285.0 },
      { product_name: "Koli Bandı Şeffaf (Koli - 48 Adet)", quantity: 5, unit_price: 1150.0 }
    ],
    shipment: { carrier: "Yurtiçi Lojistik", tracking: "YRT-849102", estimated: "Yarın 10:00" }
  },
  {
    id: 10481,
    customer: "Kadıköy Satış Şubesi",
    total_amount: 6200.0,
    status: "shipped",
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    branch: "Kadıköy Şube",
    items: [
      { product_name: "A4 Fotokopi Kağıdı 80gr (Koli)", quantity: 10, unit_price: 620.0 }
    ],
    shipment: { carrier: "Şube Sevkiyat Aracı", tracking: "SEVK-KDK-04", estimated: "Bugün 16:30" }
  },
  {
    id: 10480,
    customer: "Mega Tekstil Sanayi Ltd.",
    total_amount: 8840.0,
    status: "delivered",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    branch: "B2B Kurumsal",
    items: [
      { product_name: "Nitril Koruyucu İş Eldiveni (100'lü)", quantity: 20, unit_price: 340.0 },
      { product_name: "Çift Taraflı Montaj Bandı", quantity: 14, unit_price: 145.0 }
    ],
    shipment: { carrier: "MNG Kargo", tracking: "MNG-771920", estimated: "Teslim Edildi" }
  },
  {
    id: 10479,
    customer: "Yıldız Lojistik & Depolama",
    total_amount: 11800.0,
    status: "delivered",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    branch: "B2B Kurumsal",
    items: [
      { product_name: "Katlanır Plastik Taşıma Kasası", quantity: 40, unit_price: 295.0 }
    ],
    shipment: { carrier: "Aras Lojistik", tracking: "ARS-993821", estimated: "Teslim Edildi" }
  }
]

export const INITIAL_INSIGHTS = [
  {
    id: 1,
    type: "stock",
    severity: "critical",
    title: "Merkez Depo: Termal Barkod Etiketi Kritik Seviyede!",
    content: "Termal Barkod Etiketi stoğu 14 ruloya düştü (Kritik Eşik: 50). Günlük sevkiyat hızı dikkate alındığında 24 saat içinde tükenecektir.",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    type: "revenue",
    severity: "success",
    title: "Aylık Ambalaj Malzemesi Satışlarında %28 Artış",
    content: "E-ticaret işletmelerinin paketleme talepleri doğrultusunda Streç Film ve Koli Bandı talebi aylık bazda rekor seviyeye ulaştı.",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: 3,
    type: "stock",
    severity: "warning",
    title: "Kadıköy Şubesi: Zemin Temizlik Sıvısı Yeniden Sipariş Eşiğinde",
    content: "Stokta 9 bidon kaldı. Tedarik süresi 3 iş günü olduğundan yeni sipariş oluşturulması önerilir.",
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  }
]

export const REVENUE_CHART_DATA = [
  { day: "Pzt", ciro: 64200, siparis: 48, merkez: 32000, subeler: 32200 },
  { day: "Sal", ciro: 78500, siparis: 56, merkez: 41000, subeler: 37500 },
  { day: "Çar", ciro: 71300, siparis: 52, merkez: 36500, subeler: 34800 },
  { day: "Per", ciro: 89400, siparis: 64, merkez: 48000, subeler: 41400 },
  { day: "Cum", ciro: 112000, siparis: 82, merkez: 62000, subeler: 50000 },
  { day: "Cts", ciro: 94500, siparis: 70, merkez: 51000, subeler: 43500 },
  { day: "Paz", ciro: 58000, siparis: 40, merkez: 30000, subeler: 28000 }
]

export const CATEGORY_DISTRIBUTION = [
  { name: "Ambalaj & Paketleme", value: 38, color: "#3b82f6" },
  { name: "Teknik Hırdavat", value: 24, color: "#10b981" },
  { name: "Ofis & Kırtasiye", value: 18, color: "#f59e0b" },
  { name: "Elektronik & Donanım", value: 12, color: "#8b5cf6" },
  { name: "İş Güvenliği & Diğer", value: 8, color: "#06b6d4" }
]

export const SAMPLE_OCR_INVOICE = {
  supplier: "Avrasya Toptan Ticaret ve Sanayi A.Ş.",
  invoice_no: "AVR-2026-8941",
  date: "17 Ağustos 2026",
  tax_id: "3480194821",
  items: [
    { name: "Endüstriyel Streç Film (50cm x 300m - 100 Rulo)", quantity: 100, unit_price: 260.0, total: 26000.0 },
    { name: "Termal Barkod Etiketi 100x150 (50 Rulo)", quantity: 50, unit_price: 155.0, total: 7750.0 },
    { name: "Koli Bandı Şeffaf 45x100 (5 Koli)", quantity: 5, unit_price: 1050.0, total: 5250.0 }
  ],
  subtotal: 39000.0,
  tax: 7800.0,
  grand_total: 46800.0
}
