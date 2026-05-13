"""
Tool executor: AI'ın çağırdığı fonksiyon isimlerini gerçek DB işlemlerine bağlar.
"""
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Order, Product, Customer, OrderItem, Shipment


def execute_tool(tool_name: str, args: dict, db: Session) -> dict:
    """Araç adına göre doğru DB fonksiyonunu çağırır."""
    handlers = {
        "get_orders": get_orders,
        "get_stock_status": get_stock_status,
        "update_order_status": update_order_status,
        "get_daily_summary": get_daily_summary,
        "get_sales_analysis": get_sales_analysis,
        "update_stock": update_stock,
        "get_insights": get_insights,
        "get_stock_predictions": get_stock_predictions,
        "get_customers": get_customers,
        "get_shipping_status": get_shipping_status,
    }
    handler = handlers.get(tool_name)
    if not handler:
        return {"error": f"Bilinmeyen araç: {tool_name}"}
    return handler(db, **args)


# ─────────────────────────────────────────────
# ARAÇ FONKSİYONLARI
# ─────────────────────────────────────────────

def get_orders(db: Session, status: str = None, date_filter: str = None, customer_name: str = None) -> dict:
    query = db.query(Order).join(Customer)

    if status:
        query = query.filter(Order.status == status)

    if date_filter:
        now = datetime.utcnow()
        if date_filter == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "yesterday":
            start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(hour=0, minute=0, second=0, microsecond=0)
            query = query.filter(Order.created_at >= start, Order.created_at < end)
            orders = query.order_by(Order.created_at.desc()).all()
            return _format_orders(orders)
        elif date_filter == "this_week":
            start = now - timedelta(days=now.weekday())
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif date_filter == "this_month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = None

        if start:
            query = query.filter(Order.created_at >= start)

    if customer_name:
        query = query.filter(Customer.name.ilike(f"%{customer_name}%"))

    orders = query.order_by(Order.created_at.desc()).limit(50).all()
    return _format_orders(orders)


def _format_orders(orders) -> dict:
    result = []
    for o in orders:
        result.append({
            "id": o.id,
            "customer": o.customer.name if o.customer else "Bilinmiyor",
            "status": o.status,
            "total_amount": o.total_amount,
            "created_at": o.created_at.strftime("%d.%m.%Y %H:%M") if o.created_at else None,
            "cargo_tracking_no": o.cargo_tracking_no
        })
    return {
        "total": len(result),
        "orders": result
    }


def get_stock_status(db: Session, product_name: str = None, only_critical: bool = False) -> dict:
    query = db.query(Product)

    if product_name:
        query = query.filter(Product.name.ilike(f"%{product_name}%"))

    if only_critical:
        query = query.filter(Product.stock_quantity <= Product.min_stock_threshold)

    products = query.order_by(Product.stock_quantity.asc()).all()
    result = []
    for p in products:
        is_critical = p.stock_quantity <= p.min_stock_threshold
        pct = round(p.stock_quantity / p.min_stock_threshold * 100) if p.min_stock_threshold else 100
        if p.stock_quantity == 0:
            durum = "BITTI"
        elif is_critical:
            durum = "KRİTİK"
        elif pct < 150:
            durum = "UYARI"
        else:
            durum = "Normal"
        result.append({
            "name": p.name,
            "category": p.category,
            "stok": p.stock_quantity,
            "minimum": p.min_stock_threshold,
            "fiyat": p.price,
            "durum": durum,
            "is_critical": is_critical,
        })

    critical_count = sum(1 for p in result if p["is_critical"])
    return {
        "total_products": len(result),
        "critical_count": critical_count,
        "products": result
    }


def update_order_status(db: Session, order_id: int, new_status: str) -> dict:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"success": False, "error": f"Sipariş #{order_id} bulunamadı."}

    old_status = order.status
    order.status = new_status

    # Kargo durumunu da güncelle
    if new_status == "shipped" and order.shipment:
        order.shipment.status = "in_transit"
    elif new_status == "delivered" and order.shipment:
        order.shipment.status = "delivered"

    db.commit()
    return {
        "success": True,
        "order_id": order_id,
        "old_status": old_status,
        "new_status": new_status,
        "customer": order.customer.name if order.customer else "Bilinmiyor"
    }


def get_daily_summary(db: Session) -> dict:
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Bugünkü siparişler
    today_orders = db.query(Order).filter(Order.created_at >= today_start).count()
    pending_orders = db.query(Order).filter(Order.status == "pending").count()
    shipped_orders = db.query(Order).filter(Order.status == "shipped").count()

    # Kritik stoklar
    critical_products = db.query(Product).filter(
        Product.stock_quantity <= Product.min_stock_threshold
    ).all()

    # Bugünkü ciro
    today_revenue_result = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= today_start
    ).scalar()
    today_revenue = today_revenue_result or 0.0

    return {
        "date": now.strftime("%d.%m.%Y"),
        "today_orders": today_orders,
        "pending_orders": pending_orders,
        "shipped_orders": shipped_orders,
        "today_revenue": round(today_revenue, 2),
        "critical_stock_count": len(critical_products),
        "critical_products": [
            {"name": p.name, "stock": p.stock_quantity, "min": p.min_stock_threshold}
            for p in critical_products[:5]
        ]
    }


def get_sales_analysis(db: Session, period: str = "this_month") -> dict:
    now = datetime.utcnow()
    if period == "this_week":
        start = now - timedelta(days=now.weekday())
    elif period == "this_month":
        start = now.replace(day=1)
    else:  # last_30_days
        start = now - timedelta(days=30)

    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    # En çok satan ürünler
    top_products = (
        db.query(
            Product.name,
            Product.category,
            func.sum(OrderItem.quantity).label("total_qty"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("total_revenue")
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.created_at >= start)
        .filter(Order.status != "cancelled")
        .group_by(Product.id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
        .all()
    )

    # Kategori bazlı ciro
    category_revenue = (
        db.query(
            Product.category,
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.created_at >= start)
        .filter(Order.status != "cancelled")
        .group_by(Product.category)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price).desc())
        .all()
    )

    total_revenue = sum(r.revenue for r in category_revenue)

    return {
        "period": period,
        "start_date": start.strftime("%d.%m.%Y"),
        "total_revenue": round(total_revenue, 2),
        "top_products": [
            {
                "name": p.name,
                "category": p.category,
                "quantity_sold": int(p.total_qty),
                "revenue": round(float(p.total_revenue), 2)
            }
            for p in top_products
        ],
        "category_breakdown": [
            {
                "category": r.category,
                "revenue": round(float(r.revenue), 2)
            }
            for r in category_revenue
        ]
    }


def get_insights(db: Session, severity: str = None) -> dict:
    from models import AIInsight
    query = db.query(AIInsight).filter(AIInsight.is_resolved == False)
    if severity:
        query = query.filter(AIInsight.severity == severity)
    insights = query.order_by(AIInsight.created_at.desc()).limit(10).all()
    return {
        "total": len(insights),
        "insights": [
            {"id": i.id, "type": i.type, "severity": i.severity,
             "title": i.title, "description": i.description,
             "suggested_action": i.suggested_action}
            for i in insights
        ]
    }

def get_stock_predictions(db: Session) -> dict:
    try:
        from prediction import calculate_stock_predictions
        preds = calculate_stock_predictions(db)
        critical = [p for p in preds if p["risk_level"] in ("critical", "warning")]
        return {
            "total_products": len(preds),
            "at_risk_count": len(critical),
            "predictions": preds[:10]
        }
    except Exception as e:
        return {"error": str(e)}

def get_customers(db: Session, top_by_spending: bool = False) -> dict:
    from sqlalchemy import func
    from models import Order
    query = (
        db.query(
            Customer,
            func.count(Order.id).label("order_count"),
            func.sum(Order.total_amount).label("total_spent")
        )
        .outerjoin(Order, Customer.id == Order.customer_id)
        .group_by(Customer.id)
    )
    if top_by_spending:
        query = query.order_by(func.sum(Order.total_amount).desc())
    customers = query.limit(10).all()
    return {
        "total": len(customers),
        "customers": [
            {
                "id": c.id, "name": c.name, "email": c.email,
                "order_count": int(oc or 0), "total_spent": round(float(ts or 0), 2)
            }
            for c, oc, ts in customers
        ]
    }

def get_shipping_status(db: Session, only_delayed: bool = False) -> dict:
    """Kargo durumlarını getirir. only_delayed=True ise sadece geciken kargoları döner."""
    from datetime import datetime, timedelta

    query = db.query(Shipment).join(Order).join(Customer)

    if only_delayed:
        # Tahmini teslim tarihi geçmiş ve hâlâ teslim edilmemiş
        query = query.filter(
            Shipment.status != "delivered",
            Shipment.estimated_delivery < datetime.utcnow()
        )

    shipments = query.all()
    now = datetime.utcnow()

    result = []
    for s in shipments:
        order = s.order
        customer = order.customer
        is_delayed = (
            s.estimated_delivery
            and s.estimated_delivery < now
            and s.status != "delivered"
        )
        delay_days = 0
        if is_delayed and s.estimated_delivery:
            delay_days = (now - s.estimated_delivery).days

        result.append({
            "sipariş": order.id,
            "müşteri": customer.name if customer else "—",
            "kargo": s.carrier,
            "takip_no": order.cargo_tracking_no or "—",
            "durum": s.status,
            "tahmini_teslim": str(s.estimated_delivery.date()) if s.estimated_delivery else "—",
            "gecikme": f"{delay_days} gün gecikmiş" if is_delayed else "Zamanında",
            "is_delayed": is_delayed,
        })

    delayed_count = sum(1 for r in result if r["is_delayed"])

    return {
        "total_shipments": len(result),
        "delayed_count": delayed_count,
        "shipments": result[:10]
    }


def update_stock(db: Session, product_name: str, quantity_change: int) -> dict:
    product = db.query(Product).filter(Product.name.ilike(f"%{product_name}%")).first()
    if not product:
        return {"success": False, "error": f"'{product_name}' adında ürün bulunamadı."}

    old_qty = product.stock_quantity
    product.stock_quantity = max(0, product.stock_quantity + quantity_change)
    db.commit()

    durum = "KRİTİK" if product.stock_quantity <= product.min_stock_threshold else "Normal"
    return {
        "ürün": product.name,
        "eski_stok": old_qty,
        "yeni_stok": product.stock_quantity,
        "değişim": quantity_change,
        "durum": durum,
    }
