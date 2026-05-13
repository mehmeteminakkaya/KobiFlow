"""
Fincan Kahve — Seed Data
3 İstanbul şubesi (Kadıköy, Beşiktaş, Şişli), 32 ürün, 9 kategori,
100 sipariş (son 45 gün). Gerçekçi fiyatlar ve Türkçe veriler.
"""
import random
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models import Customer, Product, Order, OrderItem, Shipment

Base.metadata.create_all(bind=engine)

# ── Müşteriler ─────────────────────────────────────────────────────────────
CUSTOMERS = [
    # Şube hesapları
    {"name": "Kadıköy Şubesi",          "email": "kadikoy@fincankahve.com",   "phone": "0532 100 10 01"},
    {"name": "Beşiktaş Şubesi",         "email": "besiktas@fincankahve.com",  "phone": "0532 100 10 02"},
    {"name": "Şişli Şubesi",            "email": "sisli@fincankahve.com",     "phone": "0532 100 10 03"},
    # Kurumsal / toptan müşteriler
    {"name": "İstanbul Grand Otel",     "email": "siparis@istanbulgrand.com", "phone": "0533 200 20 01"},
    {"name": "Maslak Plaza Ofisleri",   "email": "tedarik@maslakplaza.com",   "phone": "0534 300 30 01"},
    {"name": "Barista Akademi",         "email": "egitim@baristaakademi.com", "phone": "0535 400 40 01"},
    {"name": "Etkinlik Catering A.Ş.", "email": "etkinlik@catering.com.tr",  "phone": "0536 500 50 01"},
    {"name": "Havalimanı Lounge",       "email": "lounge@havalimanı.com",     "phone": "0537 600 60 01"},
    # Bireysel müşteriler
    {"name": "Ahmet Yılmaz",           "email": "ahmet.yilmaz@gmail.com",    "phone": "0542 312 45 67"},
    {"name": "Fatma Demir",            "email": "fatma.demir@outlook.com",   "phone": "0543 421 56 78"},
    {"name": "Mehmet Kaya",            "email": "mkaya@hotmail.com",         "phone": "0545 532 67 89"},
    {"name": "Ayşe Şahin",            "email": "ayse.sahin@gmail.com",      "phone": "0546 643 78 90"},
    {"name": "Emre Yıldız",           "email": "emre.yildiz@gmail.com",     "phone": "0541 754 89 01"},
    {"name": "Selin Koç",             "email": "selin.koc@gmail.com",       "phone": "0544 865 90 12"},
    {"name": "Burak Arslan",           "email": "burak.arslan@gmail.com",    "phone": "0547 976 01 23"},
    {"name": "Ceren Öztürk",          "email": "ceren.ozturk@gmail.com",    "phone": "0548 087 12 34"},
    {"name": "Teknokent Kafeteryası", "email": "siparis@teknokent.com",     "phone": "0212 555 01 01"},
    {"name": "Üsküdar Toplantı Mrk.", "email": "info@uskudartm.com",        "phone": "0216 555 02 02"},
]

# ── Ürünler — Türkçe isimler, gerçekçi İstanbul kafesi fiyatları ────────────
PRODUCTS = [
    # ── Kahve ─────────────────────────────────────────────────────────────
    {"name": "Filtre Kahve",            "category": "Kahve",           "price":  85.0, "stock": 480, "min": 100},
    {"name": "Espresso",                "category": "Kahve",           "price":  80.0, "stock": 520, "min": 120},
    {"name": "Americano",               "category": "Kahve",           "price":  90.0, "stock": 350, "min":  80},
    {"name": "Latte",                   "category": "Kahve",           "price": 140.0, "stock": 290, "min":  80},
    {"name": "Cappuccino",              "category": "Kahve",           "price": 135.0, "stock": 260, "min":  80},
    {"name": "Organik Filtre Kahve",    "category": "Kahve",           "price": 100.0, "stock": 180, "min":  60},
    {"name": "Özel Harman Filtre",      "category": "Kahve",           "price": 110.0, "stock": 210, "min":  60},

    # ── Çay ───────────────────────────────────────────────────────────────
    {"name": "Demlik Çay",              "category": "Çay",             "price":  50.0, "stock": 420, "min":  90},
    {"name": "Siyah Çay",              "category": "Çay",             "price":  45.0, "stock": 300, "min":  70},
    {"name": "Yeşil Çay",              "category": "Çay",             "price":  55.0, "stock": 240, "min":  60},
    {"name": "Bitki Çayı",             "category": "Çay",             "price":  60.0, "stock":  85, "min":  50},
    {"name": "Masala Chai",             "category": "Çay",             "price":  70.0, "stock": 160, "min":  50},
    {"name": "Ihlamur",                "category": "Çay",             "price":  65.0, "stock": 130, "min":  40},

    # ── Sıcak Çikolata ────────────────────────────────────────────────────
    {"name": "Sıcak Çikolata",         "category": "Sıcak Çikolata",  "price": 130.0, "stock": 310, "min":  70},
    {"name": "Bitter Sıcak Çikolata",  "category": "Sıcak Çikolata",  "price": 145.0, "stock":  72, "min":  40},

    # ── Unlu Mamüller ─────────────────────────────────────────────────────
    {"name": "Çikolatalı Kruvasan",    "category": "Unlu Mamüller",   "price":  80.0, "stock": 144, "min":  40},
    {"name": "Bademli Kruvasan",       "category": "Unlu Mamüller",   "price":  85.0, "stock": 120, "min":  40},
    {"name": "Kruvasan",               "category": "Unlu Mamüller",   "price":  65.0, "stock": 150, "min":  50},
    {"name": "Yulaf Kurabiyesi",       "category": "Unlu Mamüller",   "price":  70.0, "stock": 110, "min":  40},
    {"name": "Zencefilli Kurabiye",    "category": "Unlu Mamüller",   "price":  70.0, "stock":  80, "min":  30},
    {"name": "Fındıklı Bisküvi",       "category": "Unlu Mamüller",   "price":  55.0, "stock":  95, "min":  30},
    {"name": "Poğaça",                 "category": "Unlu Mamüller",   "price":  65.0, "stock": 100, "min":  35},

    # ── Şurup ─────────────────────────────────────────────────────────────
    {"name": "Vanilya Şurubu",         "category": "Şurup",           "price":  20.0, "stock":  60, "min":  20},
    {"name": "Fındık Şurubu",          "category": "Şurup",           "price":  22.0, "stock":  45, "min":  15},
    {"name": "Şekersiz Vanilya Şurubu","category": "Şurup",           "price":  25.0, "stock":  38, "min":  15},
    {"name": "Karamel Şurubu",         "category": "Şurup",           "price":  22.0, "stock":  42, "min":  15},

    # ── Kahve Çekirdeği ───────────────────────────────────────────────────
    {"name": "Organik Çekirdek (250g)","category": "Kahve Çekirdeği", "price": 480.0, "stock":  55, "min":  15},
    {"name": "Özel Harman Çekirdek (250g)","category":"Kahve Çekirdeği","price":380.0,"stock":  48, "min":  15},
    {"name": "Premium Çekirdek (250g)","category": "Kahve Çekirdeği", "price": 550.0, "stock":  30, "min":  10},
    {"name": "Espresso Çekirdeği (250g)","category":"Kahve Çekirdeği","price": 420.0, "stock":  36, "min":  12},

    # ── Yaprak Çay ────────────────────────────────────────────────────────
    {"name": "Seylan Çayı (100g)",     "category": "Yaprak Çay",      "price": 160.0, "stock":  40, "min":  12},
    {"name": "Yeşil Yaprak Çay (100g)","category": "Yaprak Çay",      "price": 140.0, "stock":  28, "min":  10},
]

# Sipariş dağılım ağırlıkları (kahve ve çay ağırlıklı)
PRODUCT_WEIGHTS = {
    "Kahve":           0.40,
    "Çay":             0.28,
    "Unlu Mamüller":   0.16,
    "Sıcak Çikolata":  0.08,
    "Şurup":           0.04,
    "Kahve Çekirdeği": 0.02,
    "Yaprak Çay":      0.02,
}

STATUSES = [
    "pending", "pending", "pending",
    "shipped", "shipped",
    "delivered", "delivered", "delivered", "delivered",
    "cancelled",
]
CARRIERS = ["Yurtiçi Kargo", "MNG Kargo", "Aras Kargo", "PTT Kargo"]


def _weighted_products(products, n=3):
    """Kategori ağırlığına göre ürün seç."""
    weights = [PRODUCT_WEIGHTS.get(p.category, 0.01) for p in products]
    total = sum(weights)
    weights = [w / total for w in weights]
    chosen = set()
    result = []
    attempts = 0
    while len(result) < n and attempts < 30:
        idx = random.choices(range(len(products)), weights=weights, k=1)[0]
        if idx not in chosen:
            chosen.add(idx)
            result.append(products[idx])
        attempts += 1
    return result


def seed(force: bool = False):
    db = SessionLocal()
    try:
        if not force and db.query(Customer).count() > 0:
            existing = db.query(Customer).first()
            if existing and "Kadıköy" in (existing.name or ""):
                print("[OK] Fincan Kahve verisi zaten yüklü, atlanıyor.")
                return
            elif existing:
                print("[!] Eski veri tespit edildi, Fincan Kahve verisiyle yenileniyor...")
                force = True

        if force:
            from models import OrderItem, Shipment, AIInsight, NotificationLog
            db.query(OrderItem).delete()
            db.query(Shipment).delete()
            db.query(Order).delete()
            db.query(Product).delete()
            db.query(Customer).delete()
            db.query(AIInsight).delete()
            db.query(NotificationLog).delete()
            db.commit()
            print("[*] Eski veri temizlendi.")

        print("[*] Fincan Kahve verisi yükleniyor...")

        # Müşteriler
        customers = []
        for c in CUSTOMERS:
            customer = Customer(name=c["name"], email=c["email"], phone=c["phone"])
            db.add(customer)
            customers.append(customer)
        db.flush()

        # Ürünler
        products = []
        for p in PRODUCTS:
            product = Product(
                name=p["name"],
                category=p["category"],
                price=p["price"],
                stock_quantity=p["stock"],
                min_stock_threshold=p["min"],
            )
            db.add(product)
            products.append(product)
        db.flush()

        # Siparişler — 100 adet, son 45 gün
        # Hafta sonu ve akşamlar daha yoğun
        monthly_multipliers = {0: 1.0, 1: 1.0, 2: 1.05, 3: 1.15, 4: 1.22, 5: 1.35}
        now = datetime.utcnow()

        for i in range(100):
            customer = random.choice(customers)
            status = random.choice(STATUSES)
            days_ago = random.randint(0, 44)
            created = now - timedelta(days=days_ago,
                                      hours=random.randint(7, 22),
                                      minutes=random.randint(0, 59))

            # Sabah saatleri yoğun (8-11 peak)
            if created.hour < 7:
                created = created.replace(hour=random.randint(8, 10))

            order = Order(
                customer_id=customer.id,
                status=status,
                created_at=created,
                cargo_tracking_no=f"FK{random.randint(100000, 999999)}"
                    if status in ["shipped", "delivered"] else None,
            )
            db.add(order)
            db.flush()

            # 1-4 ürün kalemi — kategori ağırlıklı seçim
            month_key = min(created.month - 1, 5)
            multiplier = monthly_multipliers.get(month_key, 1.0)

            num_items = random.choices([1, 2, 3, 4], weights=[0.40, 0.35, 0.15, 0.10])[0]
            chosen = _weighted_products(products, num_items)

            total = 0.0
            for prod in chosen:
                if prod.category in ("Kahve Çekirdeği", "Yaprak Çay"):
                    qty = random.randint(1, 3)
                elif prod.category == "Unlu Mamüller":
                    qty = random.randint(1, 6)
                else:
                    qty = random.choices([1, 2, 3], weights=[0.55, 0.35, 0.10])[0]

                unit_price = round(prod.price * random.uniform(0.97, 1.03) * multiplier, 2)
                item = OrderItem(
                    order_id=order.id,
                    product_id=prod.id,
                    quantity=qty,
                    unit_price=unit_price,
                )
                db.add(item)
                total += qty * unit_price

            order.total_amount = round(total, 2)

            if status in ("shipped", "delivered"):
                est = created + timedelta(days=random.randint(1, 3))
                shipment = Shipment(
                    order_id=order.id,
                    carrier=random.choice(CARRIERS),
                    status="delivered" if status == "delivered" else "in_transit",
                    estimated_delivery=est,
                )
                db.add(shipment)

        db.commit()
        print(f"[OK] {len(CUSTOMERS)} müşteri, {len(PRODUCTS)} ürün, 100 sipariş yüklendi.")

    except Exception as e:
        db.rollback()
        print(f"[HATA] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed(force=True)
