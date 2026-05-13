"""
Proactive AI Engine — APScheduler tabanlı arka plan analiz motoru.
Her 5 dakikada veritabanını analiz eder, kritik durumlar için AI Insight üretir.
"""
import os
import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from database import SessionLocal
from models import AIInsight, Order, Product, Customer, OrderItem, NotificationLog

# WebSocket broadcast callback — main.py tarafından set edilir
_broadcast_callback = None

def set_broadcast_callback(callback):
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
            print(f"[insight_engine] broadcast hatası: {e}")


def _create_insight(
    db: Session,
    type_: str,
    severity: str,
    title: str,
    description: str,
    suggested_action: str,
    extra_data: Optional[dict] = None
) -> Optional[AIInsight]:
    """Aynı tipte çözülmemiş insight varsa oluşturma."""
    existing = db.query(AIInsight).filter(
        AIInsight.type == type_,
        AIInsight.is_resolved == False,
        AIInsight.title == title
    ).first()
    if existing:
        return None

    insight = AIInsight(
        type=type_,
        severity=severity,
        title=title,
        description=description,
        suggested_action=suggested_action,
        extra_data=extra_data or {}
    )
    db.add(insight)

    # Bildirim kaydı
    notif = NotificationLog(
        type="insight",
        title=title,
        message=description,
        extra_data={"severity": severity, "insight_type": type_}
    )
    db.add(notif)
    db.commit()
    db.refresh(insight)
    return insight


# ─────────────────────────────────────────────
# ANALİZ FONKSİYONLARI
# ─────────────────────────────────────────────

def analyze_critical_stocks(db: Session) -> list:
    """Kritik stok seviyesindeki ürünleri tespit et."""
    insights_created = []
    critical_products = db.query(Product).filter(
        Product.stock_quantity <= Product.min_stock_threshold
    ).all()

    for product in critical_products:
        pct = 0 if product.min_stock_threshold == 0 else \
              round(product.stock_quantity / product.min_stock_threshold * 100)

        if product.stock_quantity == 0:
            severity = "critical"
            title = f"Stok Tükendi: {product.name}"
            desc = f"{product.name} tamamen tükendi. Stok: 0 / Min: {product.min_stock_threshold}"
            action = f"{product.name} için acil sipariş ver. Önerilen miktar: {product.min_stock_threshold * 3} adet."
        elif pct <= 30:
            severity = "critical"
            title = f"Kritik Stok: {product.name}"
            desc = f"{product.name} kritik seviyede. Stok: {product.stock_quantity} (Min: {product.min_stock_threshold}, %{pct})"
            action = f"{product.name} için satın alma taslağı oluştur. Önerilen miktar: {product.min_stock_threshold * 3} adet."
        else:
            severity = "warning"
            title = f"Düşük Stok: {product.name}"
            desc = f"{product.name} minimum eşiğin altında. Stok: {product.stock_quantity} / Min: {product.min_stock_threshold}"
            action = f"{product.name} stokunu yakında yenile."

        insight = _create_insight(
            db, "stock_critical", severity, title, desc, action,
            extra_data={"product_id": product.id, "stock": product.stock_quantity, "min": product.min_stock_threshold}
        )
        if insight:
            insights_created.append(insight)

    return insights_created


def analyze_delayed_orders(db: Session) -> list:
    """24 saatten fazla bekleyen siparişleri tespit et."""
    insights_created = []
    cutoff = datetime.utcnow() - timedelta(hours=24)

    delayed = db.query(Order).filter(
        Order.status == "pending",
        Order.created_at <= cutoff
    ).all()

    if len(delayed) >= 3:
        order_ids = [o.id for o in delayed]
        title = f"{len(delayed)} Sipariş 24+ Saat Bekliyor"
        desc = (f"{len(delayed)} sipariş 24 saatten fazla 'Bekliyor' durumunda. "
                f"Sipariş ID'leri: {', '.join(['#'+str(i) for i in order_ids[:5]])}"
                f"{'...' if len(order_ids) > 5 else ''}")
        action = "Bekleyen siparişleri incele ve kargo durumlarını güncelle."

        insight = _create_insight(
            db, "order_delayed", "warning", title, desc, action,
            extra_data={"order_ids": order_ids, "count": len(delayed)}
        )
        if insight:
            insights_created.append(insight)
    elif len(delayed) > 0:
        for order in delayed:
            hours_waiting = int((datetime.utcnow() - order.created_at.replace(tzinfo=None)).total_seconds() / 3600)
            customer_name = order.customer.name if order.customer else "Bilinmiyor"
            title = f"Bekleyen Sipariş: #{order.id} ({customer_name})"
            desc = f"#{order.id} numaralı sipariş {hours_waiting} saattir bekliyor. Müşteri: {customer_name}"
            action = f"#{order.id} siparişini kargoya ver veya iptal et."

            insight = _create_insight(
                db, "order_delayed", "warning", title, desc, action,
                extra_data={"order_id": order.id, "hours": hours_waiting, "customer": customer_name}
            )
            if insight:
                insights_created.append(insight)

    return insights_created


def analyze_sales_trends(db: Session) -> list:
    """Satış düşüşlerini tespit et (bu haftayı geçen hafta ile karşılaştır)."""
    insights_created = []
    now = datetime.utcnow()

    this_week_start = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)
    last_week_end = this_week_start

    this_week_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= this_week_start,
        Order.status != "cancelled"
    ).scalar() or 0.0

    last_week_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= last_week_start,
        Order.created_at < last_week_end,
        Order.status != "cancelled"
    ).scalar() or 0.0

    if last_week_revenue > 0:
        change_pct = ((this_week_revenue - last_week_revenue) / last_week_revenue) * 100

        if change_pct <= -20:
            title = f"Satışlar %{abs(round(change_pct))} Düştü"
            desc = (f"Bu hafta ciro: ₺{this_week_revenue:.2f} | "
                    f"Geçen hafta: ₺{last_week_revenue:.2f} | "
                    f"Değişim: %{round(change_pct)}")
            action = "Müşterilere promosyon kodu gönder veya indirimli ürünleri öne çıkar."
            severity = "critical" if change_pct <= -40 else "warning"

            insight = _create_insight(db, "sales_drop", severity, title, desc, action,
                extra_data={"this_week": this_week_revenue, "last_week": last_week_revenue, "change_pct": round(change_pct, 1)})
            if insight:
                insights_created.append(insight)

        elif change_pct >= 20:
            title = f"Satışlar %{abs(round(change_pct))} Arttı"
            desc = (f"Bu hafta ciro: ₺{this_week_revenue:.2f} | "
                    f"Geçen hafta: ₺{last_week_revenue:.2f} | "
                    f"Değişim: +%{round(change_pct)}")
            action = "Stokları kontrol et, yüksek talep gören ürünleri yenile."

            insight = _create_insight(db, "sales_rise", "success", title, desc, action,
                extra_data={"change_pct": round(change_pct, 1)})
            if insight:
                insights_created.append(insight)

    return insights_created


def analyze_loyal_customers(db: Session) -> list:
    """Son 2 haftada 3+ sipariş veren müşterileri tespit et."""
    insights_created = []
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)

    loyal = (
        db.query(Customer, func.count(Order.id).label("order_count"),
                 func.sum(Order.total_amount).label("total_spent"))
        .join(Order, Customer.id == Order.customer_id)
        .filter(Order.created_at >= two_weeks_ago, Order.status != "cancelled")
        .group_by(Customer.id)
        .having(func.count(Order.id) >= 3)
        .all()
    )

    for customer, order_count, total_spent in loyal:
        title = f"Sadık Müşteri: {customer.name}"
        desc = (f"{customer.name} son 2 haftada {order_count} sipariş verdi. "
                f"Toplam harcama: ₺{total_spent:.2f}")
        action = f"{customer.name}'e %10 sadakat indirimi tanımlamayı düşün."

        insight = _create_insight(db, "loyal_customer", "success", title, desc, action,
            extra_data={"customer_id": customer.id, "order_count": int(order_count), "total_spent": float(total_spent)})
        if insight:
            insights_created.append(insight)

    return insights_created


def analyze_stock_predictions(db: Session) -> list:
    """Günlük tüketim hızına göre stok tükenme tahminleri üret."""
    insights_created = []
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    products_with_sales = (
        db.query(
            Product,
            func.sum(OrderItem.quantity).label("total_sold")
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.created_at >= thirty_days_ago, Order.status != "cancelled")
        .group_by(Product.id)
        .all()
    )

    for product, total_sold in products_with_sales:
        daily_avg = float(total_sold) / 30.0
        if daily_avg > 0 and product.stock_quantity > 0:
            days_until_empty = product.stock_quantity / daily_avg
            product.daily_avg_consumption = round(daily_avg, 2)

            if days_until_empty <= 3 and product.stock_quantity > product.min_stock_threshold:
                title = f"Tahmin: {product.name} {int(days_until_empty)} Günde Bitiyor"
                desc = (f"{product.name} mevcut tüketim hızında ({daily_avg:.1f}/gün) "
                        f"yaklaşık {int(days_until_empty)} gün içinde tükenir. "
                        f"Mevcut stok: {product.stock_quantity}")
                action = f"{product.name} için en geç {int(days_until_empty)} gün içinde sipariş ver."

                insight = _create_insight(db, "restock_prediction", "warning", title, desc, action,
                    extra_data={"product_id": product.id, "days_until_empty": int(days_until_empty),
                     "daily_avg": round(daily_avg, 2), "current_stock": product.stock_quantity})
                if insight:
                    insights_created.append(insight)

    db.commit()
    return insights_created


# ─────────────────────────────────────────────
# ANA ANALİZ İŞİ
# ─────────────────────────────────────────────

def run_analysis():
    """APScheduler tarafından düzenli olarak çağrılır."""
    db = SessionLocal()
    try:
        print(f"[insight_engine] Analiz başladı: {datetime.utcnow().strftime('%H:%M:%S')}")
        all_insights = []
        all_insights += analyze_critical_stocks(db)
        all_insights += analyze_delayed_orders(db)
        all_insights += analyze_sales_trends(db)
        all_insights += analyze_loyal_customers(db)
        all_insights += analyze_stock_predictions(db)

        if all_insights:
            print(f"[insight_engine] {len(all_insights)} yeni içgörü oluşturuldu.")
            for ins in all_insights:
                _broadcast({
                    "type": "new_insight",
                    "insight": {
                        "id": ins.id,
                        "type": ins.type,
                        "severity": ins.severity,
                        "title": ins.title,
                        "description": ins.description,
                        "suggested_action": ins.suggested_action,
                        "created_at": ins.created_at.isoformat() if ins.created_at else None
                    }
                })
        else:
            print("[insight_engine] Yeni içgörü yok.")

    except Exception as e:
        print(f"[insight_engine] HATA: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


# ─────────────────────────────────────────────
# SCHEDULER
# ─────────────────────────────────────────────

scheduler = BackgroundScheduler(timezone="UTC")


def start_scheduler():
    """FastAPI startup'ta çağrılır."""
    if not scheduler.running:
        scheduler.add_job(
            run_analysis,
            trigger=IntervalTrigger(minutes=5),
            id="insight_analysis",
            replace_existing=True,
            next_run_time=datetime.utcnow() + timedelta(seconds=10)  # 10 saniye sonra ilk çalıştırma
        )
        scheduler.start()
        print("[insight_engine] Scheduler başlatıldı (5 dakikada bir analiz)")


def stop_scheduler():
    """FastAPI shutdown'da çağrılır."""
    if scheduler.running:
        scheduler.shutdown()
        print("[insight_engine] Scheduler durduruldu.")


def run_analysis_now():
    """API üzerinden manuel tetikleme için."""
    run_analysis()
