"""
Nexus — Gerçek Zamanlı Simülasyon Motoru
Her 90 saniyede bir:
  - 1-3 yeni sipariş oluşturur ve stokları düşürür
  - Bekleyen siparişlerin bir kısmını kargoya verir
  - Kargodaki siparişlerin bir kısmını teslim eder
Dashboard'u canlı ve dinamik tutar.
"""
import random
from datetime import datetime, timedelta
from database import SessionLocal
from models import Order, Product, Customer, OrderItem, Shipment, NotificationLog

CARRIERS = ["Yurtiçi Kargo", "MNG Kargo", "Aras Kargo", "PTT Kargo"]

# Kategori ağırlıkları — gerçek bir kafedeki sipariş dağılımı
PRODUCT_WEIGHTS = {
    "Kahve":           0.40,
    "Çay":             0.28,
    "Unlu Mamüller":   0.16,
    "Sıcak Çikolata":  0.08,
    "Şurup":           0.04,
    "Kahve Çekirdeği": 0.02,
    "Yaprak Çay":      0.02,
}

# WebSocket broadcast callback — main.py tarafından set edilir
_broadcast_callback = None

def set_sim_broadcast_callback(callback):
    global _broadcast_callback
    _broadcast_callback = callback


def _broadcast(data: dict):
    if _broadcast_callback:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(_broadcast_callback(data))
            else:
                loop.run_until_complete(_broadcast_callback(data))
        except Exception as e:
            print(f"[sim] broadcast hatası: {e}")


def _weighted_products(products, n: int = 2):
    """Kategori ağırlığına göre rastgele ürün seç."""
    weights = [PRODUCT_WEIGHTS.get(p.category, 0.01) for p in products]
    total = sum(weights)
    weights = [w / total for w in weights]
    chosen = set()
    result = []
    attempts = 0
    while len(result) < n and attempts < 40:
        idx = random.choices(range(len(products)), weights=weights, k=1)[0]
        if idx not in chosen:
            chosen.add(idx)
            result.append(products[idx])
        attempts += 1
    return result


def simulate_new_orders():
    """
    1-3 yeni sipariş oluştur.
    Gerçekçi saat kısıtlaması: 08:00-22:00 arasında daha yoğun.
    """
    now = datetime.utcnow()
    hour = now.hour

    # Gece 23:00-07:00 arası çok seyrek sipariş
    if hour < 7 or hour >= 23:
        if random.random() > 0.15:
            return

    # Sabah ve öğle saatlerinde daha çok sipariş
    if 8 <= hour <= 11 or 12 <= hour <= 14:
        n_orders = random.choices([1, 2, 3], weights=[0.4, 0.4, 0.2])[0]
    else:
        n_orders = random.choices([1, 2, 3], weights=[0.65, 0.28, 0.07])[0]

    db = SessionLocal()
    try:
        customers = db.query(Customer).all()
        products = db.query(Product).filter(Product.stock_quantity > 0).all()

        if not customers or not products:
            return

        created_orders = []

        for _ in range(n_orders):
            customer = random.choice(customers)
            num_items = random.choices([1, 2, 3], weights=[0.50, 0.35, 0.15])[0]
            chosen_products = _weighted_products(products, num_items)

            if not chosen_products:
                continue

            order = Order(
                customer_id=customer.id,
                status="pending",
                created_at=now,
                cargo_tracking_no=None,
            )
            db.add(order)
            db.flush()

            total = 0.0
            for prod in chosen_products:
                # Ürün kategorisine göre miktar belirle
                if prod.category in ("Kahve Çekirdeği", "Yaprak Çay"):
                    qty = random.randint(1, 2)
                elif prod.category == "Unlu Mamüller":
                    qty = random.randint(1, 4)
                elif prod.category == "Şurup":
                    qty = random.randint(1, 3)
                else:
                    qty = random.choices([1, 2, 3], weights=[0.60, 0.30, 0.10])[0]

                # Stok yeterliliği kontrol et
                qty = min(qty, prod.stock_quantity)
                if qty <= 0:
                    continue

                unit_price = round(prod.price * random.uniform(0.98, 1.02), 2)
                item = OrderItem(
                    order_id=order.id,
                    product_id=prod.id,
                    quantity=qty,
                    unit_price=unit_price,
                )
                db.add(item)
                total += qty * unit_price

                # Stoku düş
                prod.stock_quantity = max(0, prod.stock_quantity - qty)

            if total == 0:
                db.delete(order)
                continue

            order.total_amount = round(total, 2)
            created_orders.append((order.id, customer.name, order.total_amount))

            # Bildirim kaydı
            notif = NotificationLog(
                type="system",
                title=f"🛒 Yeni Sipariş #{order.id}",
                message=f"{customer.name} sipariş verdi. Tutar: ₺{order.total_amount:.2f}",
                extra_data={"order_id": order.id, "customer": customer.name}
            )
            db.add(notif)

        db.commit()

        # WebSocket ile bildir
        for oid, cname, total in created_orders:
            _broadcast({
                "type": "new_order",
                "order_id": oid,
                "customer": cname,
                "total": total,
                "message": f"Yeni sipariş: {cname} — ₺{total:.2f}"
            })

        if created_orders:
            print(f"[sim] {len(created_orders)} yeni sipariş oluşturuldu.")

    except Exception as e:
        db.rollback()
        print(f"[sim] Sipariş oluşturma hatası: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def simulate_order_progression():
    """
    Bekleyen siparişleri kargoya ver, kargodakileri teslim et.
    Gerçekçi geçiş olasılıkları ile.
    """
    db = SessionLocal()
    try:
        shipped_count = 0
        delivered_count = 0

        # Pending → Shipped (%30 ihtimal, en az 5 dakika önce oluşturulmuş)
        cutoff = datetime.utcnow() - timedelta(minutes=5)
        pending_orders = db.query(Order).filter(
            Order.status == "pending",
            Order.created_at <= cutoff
        ).all()

        for order in pending_orders:
            if random.random() < 0.30:
                order.status = "shipped"
                order.cargo_tracking_no = f"FK{random.randint(100000, 999999)}"

                # Daha önce shipment oluşturulmamışsa oluştur
                if not order.shipment:
                    shipment = Shipment(
                        order_id=order.id,
                        carrier=random.choice(CARRIERS),
                        status="in_transit",
                        estimated_delivery=datetime.utcnow() + timedelta(days=random.randint(1, 3))
                    )
                    db.add(shipment)
                shipped_count += 1

        # Shipped → Delivered (%25 ihtimal, en az 10 dakika önce kargoya verilmiş)
        shipped_orders = db.query(Order).filter(Order.status == "shipped").all()
        for order in shipped_orders:
            if random.random() < 0.25:
                order.status = "delivered"
                if order.shipment:
                    order.shipment.status = "delivered"
                delivered_count += 1

        db.commit()

        if shipped_count or delivered_count:
            print(f"[sim] {shipped_count} sipariş kargoya verildi, {delivered_count} teslim edildi.")

            _broadcast({
                "type": "order_progression",
                "shipped": shipped_count,
                "delivered": delivered_count,
            })

    except Exception as e:
        db.rollback()
        print(f"[sim] Sipariş ilerletme hatası: {e}")
    finally:
        db.close()


def run_simulation():
    """APScheduler tarafından her 90 saniyede bir çağrılır."""
    print(f"[sim] Simülasyon çalışıyor: {datetime.utcnow().strftime('%H:%M:%S')}")
    simulate_new_orders()
    simulate_order_progression()
