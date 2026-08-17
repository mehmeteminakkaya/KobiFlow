// ── BrewHive AI Mock & Offline Demo Data Store ────────────────────────
export const INITIAL_CUSTOMERS = [
  { id: 1, name: "Kadıköy Şubesi (Moda)", email: "kadikoy@brewhive.com", phone: "0216 330 10 01", branch: "Kadıköy" },
  { id: 2, name: "Beşiktaş Şubesi (Akaretler)", email: "besiktas@brewhive.com", phone: "0212 260 10 02", branch: "Beşiktaş" },
  { id: 3, name: "Şişli Şubesi (Bomonti)", email: "sisli@brewhive.com", phone: "0212 240 10 03", branch: "Şişli" },
  { id: 4, name: "İstanbul Grand Otel", email: "siparis@istanbulgrand.com", phone: "0533 200 20 01", branch: "B2B Kurumsal" },
  { id: 5, name: "Maslak Plaza Ofisleri", email: "tedarik@maslakplaza.com", phone: "0534 300 30 01", branch: "B2B Kurumsal" },
  { id: 6, name: "Barista Akademi", email: "egitim@baristaakademi.com", phone: "0535 400 40 01", branch: "B2B Kurumsal" },
  { id: 7, name: "Etkinlik Catering A.Ş.", email: "etkinlik@catering.com.tr", phone: "0536 500 50 01", branch: "B2B Kurumsal" },
  { id: 8, name: "Teknokent Kafeteryası", email: "siparis@teknokent.com", phone: "0212 555 01 01", branch: "B2B Kurumsal" },
  { id: 9, name: "Ahmet Yılmaz", email: "ahmet.yilmaz@gmail.com", phone: "0542 312 45 67", branch: "Kadıköy" },
  { id: 10, name: "Fatma Demir", email: "fatma.demir@outlook.com", phone: "0543 421 56 78", branch: "Beşiktaş" },
  { id: 11, name: "Mehmet Kaya", email: "mkaya@hotmail.com", phone: "0545 532 67 89", branch: "Şişli" },
  { id: 12, name: "Ayşe Şahin", email: "ayse.sahin@gmail.com", phone: "0546 643 78 90", branch: "Kadıköy" }
]

export const INITIAL_PRODUCTS = [
  { id: 1, name: "Filtre Kahve (Guatemala)", category: "Kahve", price: 85.0, stock_quantity: 480, min_stock_threshold: 100, branch: "Kadıköy" },
  { id: 2, name: "Double Espresso", category: "Kahve", price: 80.0, stock_quantity: 520, min_stock_threshold: 120, branch: "Beşiktaş" },
  { id: 3, name: "Iced Americano", category: "Kahve", price: 90.0, stock_quantity: 350, min_stock_threshold: 80, branch: "Şişli" },
  { id: 4, name: "Oat Milk Latte (Yulaf)", category: "Kahve", price: 140.0, stock_quantity: 29, min_stock_threshold: 50, branch: "Kadıköy" },
  { id: 5, name: "Flat White", category: "Kahve", price: 135.0, stock_quantity: 260, min_stock_threshold: 80, branch: "Beşiktaş" },
  { id: 6, name: "Organik Cold Brew (250ml)", category: "Kahve", price: 110.0, stock_quantity: 18, min_stock_threshold: 40, branch: "Şişli" },
  { id: 7, name: "Karamel Macchiato", category: "Kahve", price: 145.0, stock_quantity: 190, min_stock_threshold: 60, branch: "Kadıköy" },
  { id: 8, name: "Demlik Doğu Karadeniz Çayı", category: "Çay", price: 50.0, stock_quantity: 420, min_stock_threshold: 90, branch: "Kadıköy" },
  { id: 9, name: "Japon Matcha Latte", category: "Çay", price: 130.0, stock_quantity: 45, min_stock_threshold: 50, branch: "Beşiktaş" },
  { id: 10, name: "Masala Chai Latte", category: "Çay", price: 95.0, stock_quantity: 160, min_stock_threshold: 50, branch: "Şişli" },
  { id: 11, name: "Belçika Sıcak Çikolata", category: "Sıcak Çikolata", price: 130.0, stock_quantity: 310, min_stock_threshold: 70, branch: "Kadıköy" },
  { id: 12, name: "Fransız Tereyağlı Kruvasan", category: "Unlu Mamüller", price: 80.0, stock_quantity: 14, min_stock_threshold: 30, branch: "Beşiktaş" },
  { id: 13, name: "San Sebastian Cheesecake", category: "Unlu Mamüller", price: 160.0, stock_quantity: 22, min_stock_threshold: 25, branch: "Şişli" },
  { id: 14, name: "Yaban Mersinli Muffin", category: "Unlu Mamüller", price: 85.0, stock_quantity: 65, min_stock_threshold: 30, branch: "Kadıköy" },
  { id: 15, name: "Madagaskar Vanilya Şurubu", category: "Şurup", price: 35.0, stock_quantity: 12, min_stock_threshold: 20, branch: "Beşiktaş" },
  { id: 16, name: "Etiyopya Yirgacheffe Çekirdek (250g)", category: "Kahve Çekirdeği", price: 480.0, stock_quantity: 55, min_stock_threshold: 15, branch: "Kadıköy" },
  { id: 17, name: "Kolombiya Supremo Çekirdek (250g)", category: "Kahve Çekirdeği", price: 420.0, stock_quantity: 36, min_stock_threshold: 12, branch: "Şişli" },
  { id: 18, name: "Barista Edition Yulaf Sütü (1L)", category: "Hammadde", price: 75.0, stock_quantity: 8, min_stock_threshold: 24, branch: "Kadıköy" }
]

export const INITIAL_ORDERS = [
  {
    id: 1084,
    customer: "Kadıköy Şubesi (Moda)",
    total_amount: 1420.0,
    status: "pending",
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    branch: "Kadıköy",
    items: [
      { product_name: "Etiyopya Yirgacheffe Çekirdek (250g)", quantity: 2, unit_price: 480.0 },
      { product_name: "Barista Edition Yulaf Sütü (1L)", quantity: 6, unit_price: 75.0 }
    ],
    shipment: { carrier: "Özel Kurye", tracking: "BH-KDK-084", estimated: "Bugün 14:30" }
  },
  {
    id: 1083,
    customer: "İstanbul Grand Otel",
    total_amount: 4850.0,
    status: "shipped",
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    branch: "B2B Kurumsal",
    items: [
      { product_name: "Filtre Kahve (Guatemala)", quantity: 30, unit_price: 85.0 },
      { product_name: "Double Espresso", quantity: 25, unit_price: 80.0 },
      { product_name: "Kolombiya Supremo Çekirdek (250g)", quantity: 1, unit_price: 420.0 }
    ],
    shipment: { carrier: "Yurtiçi Kargo", tracking: "YK-9842109", estimated: "Yarın 11:00" }
  },
  {
    id: 1082,
    customer: "Beşiktaş Şubesi (Akaretler)",
    total_amount: 980.0,
    status: "delivered",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    branch: "Beşiktaş",
    items: [
      { product_name: "Fransız Tereyağlı Kruvasan", quantity: 10, unit_price: 80.0 },
      { product_name: "Oat Milk Latte (Yulaf)", quantity: 2, unit_price: 140.0 }
    ],
    shipment: { carrier: "MNG Kargo", tracking: "MNG-338291", estimated: "Teslim Edildi" }
  },
  {
    id: 1081,
    customer: "Maslak Plaza Ofisleri",
    total_amount: 3200.0,
    status: "delivered",
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    branch: "B2B Kurumsal",
    items: [
      { product_name: "Organik Cold Brew (250ml)", quantity: 20, unit_price: 110.0 },
      { product_name: "Iced Americano", quantity: 10, unit_price: 90.0 }
    ],
    shipment: { carrier: "Aras Kargo", tracking: "ARAS-774102", estimated: "Teslim Edildi" }
  },
  {
    id: 1080,
    customer: "Şişli Şubesi (Bomonti)",
    total_amount: 720.0,
    status: "pending",
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    branch: "Şişli",
    items: [
      { product_name: "San Sebastian Cheesecake", quantity: 4, unit_price: 160.0 },
      { product_name: "Double Espresso", quantity: 1, unit_price: 80.0 }
    ],
    shipment: { carrier: "Özel Kurye", tracking: "BH-SSL-080", estimated: "Bugün 16:00" }
  }
]

export const INITIAL_INSIGHTS = [
  {
    id: 1,
    type: "stock",
    severity: "critical",
    title: "Kadıköy Şubesi: Yulaf Sütü Kritik Seviyede!",
    content: "Kadıköy şubesinde 'Barista Edition Yulaf Sütü' 8 kutu kaldı (Minimum eşik: 24). Hafta sonu tüketim hızı dikkate alındığında 18 saat içinde tükenecektir.",
    recommendation: "Beşiktaş şubesinden 10 kutu transfer edin veya toptancıdan acil sipariş geçin.",
    action_type: "reorder",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    is_read: false
  },
  {
    id: 2,
    type: "revenue",
    severity: "success",
    title: "Cold Brew Satışlarında %42 Hafta Başı Artışı",
    content: "Hava sıcaklığının artmasıyla beraber Şişli ve Beşiktaş şubelerinde Cold Brew ve Buzlu Latte talebi geçen haftaya göre %42 yükseldi.",
    recommendation: "Soğuk demleme ünitelerinin kapasitesini %30 artırın ve 250ml şişe stoğunu tazeleyin.",
    action_type: "scale_production",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    is_read: false
  },
  {
    id: 3,
    type: "anomaly",
    severity: "warning",
    title: "Beşiktaş Şubesi: Kruvasan Fire Oranı Alarmı",
    content: "Dün akşam kapanışında Beşiktaş şubesinde 14 adet kruvasan satılamadan son kullanma süresine ulaştı.",
    recommendation: "Öğleden sonra 17:00 sonrası 'Kahve + Kruvasan' akşam menüsü indirimi tetikleyin.",
    action_type: "create_campaign",
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    is_read: true
  }
]

export const REVENUE_CHART_DATA = [
  { day: "Pzt", ciro: 18450, siparis: 142, kadikoy: 7200, besiktas: 6100, sisli: 5150 },
  { day: "Sal", ciro: 21300, siparis: 168, kadikoy: 8400, besiktas: 7200, sisli: 5700 },
  { day: "Çar", ciro: 19800, siparis: 155, kadikoy: 7900, besiktas: 6600, sisli: 5300 },
  { day: "Per", ciro: 24600, siparis: 190, kadikoy: 9800, besiktas: 8400, sisli: 6400 },
  { day: "Cum", ciro: 34200, siparis: 265, kadikoy: 14100, besiktas: 11200, sisli: 8900 },
  { day: "Cts", ciro: 42800, siparis: 330, kadikoy: 18200, besiktas: 14500, sisli: 10100 },
  { day: "Paz", ciro: 39500, siparis: 310, kadikoy: 16800, besiktas: 13600, sisli: 9100 }
]

export const CATEGORY_DISTRIBUTION = [
  { name: "Specialty Kahve", value: 48, color: "#d97706" },
  { name: "Çay & Matcha", value: 20, color: "#10b981" },
  { name: "Unlu Mamül & Pasta", value: 18, color: "#f59e0b" },
  { name: "Sıcak Çikolata", value: 8, color: "#8b5cf6" },
  { name: "Perakende Çekirdek", value: 6, color: "#ec4899" }
]

export const SAMPLE_OCR_INVOICE = {
  supplier: "Kavurmahane Roastery & Kahve San. Tic. A.Ş.",
  invoice_no: "KVR-2026-0489",
  date: "17 Ağustos 2026",
  tax_id: "9840192831",
  items: [
    { name: "Etiyopya Yirgacheffe Çekirdek (60kg Çuval)", quantity: 2, unit_price: 18500.0, total: 37000.0 },
    { name: "Kolombiya Supremo Çekirdek (60kg Çuval)", quantity: 3, unit_price: 16200.0, total: 48600.0 },
    { name: "Barista Edition Yulaf Sütü (Koli - 12x1L)", quantity: 20, unit_price: 840.0, total: 16800.0 },
    { name: "Madagaskar Doğal Vanilya Şurubu (6x750ml)", quantity: 5, unit_price: 1100.0, total: 5500.0 }
  ],
  subtotal: 107900.0,
  tax: 21580.0,
  grand_total: 129480.0
}
