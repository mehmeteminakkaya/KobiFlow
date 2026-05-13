"""
Stock Prediction Engine — günlük tüketim hızından stok tükenme tahmini.
"""
from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Product, OrderItem, Order


def calculate_stock_predictions(db: Session) -> List[Dict]:
    """
    Her ürün için tahmini tükenme günü hesapla.
    Son 30 günlük satış verisi + mevcut stok.
    """
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    # Son 30 gün satışları
    sales_30 = (
        db.query(
            Product.id,
            Product.name,
            Product.category,
            Product.stock_quantity,
            Product.min_stock_threshold,
            Product.price,
            func.sum(OrderItem.quantity).label("sold_30"),
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.created_at >= thirty_days_ago, Order.status != "cancelled")
        .group_by(Product.id)
        .all()
    )

    # Son 7 gün satışları (trend için)
    sales_7_map = {}
    sales_7 = (
        db.query(
            Product.id,
            func.sum(OrderItem.quantity).label("sold_7")
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.created_at >= seven_days_ago, Order.status != "cancelled")
        .group_by(Product.id)
        .all()
    )
    for row in sales_7:
        sales_7_map[row.id] = float(row.sold_7)

    # Tüm ürünleri al (satışı olmayanlar da dahil)
    all_products = {p.id: p for p in db.query(Product).all()}

    result = []
    predicted_set = {row.id for row in sales_30}

    # Satışı olan ürünler
    for row in sales_30:
        daily_avg_30 = float(row.sold_30) / 30.0
        daily_avg_7 = sales_7_map.get(row.id, 0) / 7.0

        # Ağırlıklı ortalama: son 7 gün daha ağırlıklı (trend yakalamak için)
        daily_avg = (daily_avg_7 * 0.6 + daily_avg_30 * 0.4) if daily_avg_7 > 0 else daily_avg_30

        if daily_avg > 0:
            days_until_empty = row.stock_quantity / daily_avg
        else:
            days_until_empty = 999

        # Risk seviyesi
        if days_until_empty <= 2:
            risk = "critical"
            risk_label = "🔴 Kritik"
        elif days_until_empty <= 5:
            risk = "warning"
            risk_label = "🟡 Uyarı"
        elif days_until_empty <= 10:
            risk = "info"
            risk_label = "🔵 İzle"
        else:
            risk = "safe"
            risk_label = "🟢 Güvende"

        # Önerilen sipariş miktarı (2 haftalık stok)
        recommended_order = max(0, int(daily_avg * 14) - row.stock_quantity)

        result.append({
            "product_id": row.id,
            "product_name": row.name,
            "category": row.category,
            "current_stock": row.stock_quantity,
            "min_threshold": row.min_stock_threshold,
            "price": row.price,
            "daily_avg_consumption": round(daily_avg, 2),
            "daily_avg_7d": round(daily_avg_7, 2),
            "daily_avg_30d": round(daily_avg_30, 2),
            "days_until_empty": round(days_until_empty, 1) if days_until_empty < 999 else None,
            "estimated_empty_date": (
                (datetime.utcnow() + timedelta(days=days_until_empty)).strftime("%d.%m.%Y")
                if days_until_empty < 999 else "Belirsiz"
            ),
            "risk_level": risk,
            "risk_label": risk_label,
            "recommended_order_qty": recommended_order,
            "total_sold_30d": int(float(row.sold_30)),
        })

    # Satışı olmayan ürünler
    for product_id, product in all_products.items():
        if product_id not in predicted_set:
            result.append({
                "product_id": product.id,
                "product_name": product.name,
                "category": product.category,
                "current_stock": product.stock_quantity,
                "min_threshold": product.min_stock_threshold,
                "price": product.price,
                "daily_avg_consumption": 0.0,
                "daily_avg_7d": 0.0,
                "daily_avg_30d": 0.0,
                "days_until_empty": None,
                "estimated_empty_date": "Veri yok",
                "risk_level": "safe" if product.stock_quantity > product.min_stock_threshold else "warning",
                "risk_label": "🟢 Güvende" if product.stock_quantity > product.min_stock_threshold else "🟡 Stok Düşük",
                "recommended_order_qty": 0,
                "total_sold_30d": 0,
            })

    # Risk seviyesine göre sırala
    risk_order = {"critical": 0, "warning": 1, "info": 2, "safe": 3}
    result.sort(key=lambda x: (risk_order.get(x["risk_level"], 4), x.get("days_until_empty") or 999))

    return result


def get_revenue_analytics(db: Session) -> Dict:
    """Dashboard için gelir analitiği — son 30 günlük günlük ciro."""
    daily_data = []

    for i in range(29, -1, -1):
        day_start = (datetime.utcnow() - timedelta(days=i)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timedelta(days=1)

        revenue = db.query(func.sum(Order.total_amount)).filter(
            Order.created_at >= day_start,
            Order.created_at < day_end,
            Order.status != "cancelled"
        ).scalar() or 0.0

        order_count = db.query(func.count(Order.id)).filter(
            Order.created_at >= day_start,
            Order.created_at < day_end,
            Order.status != "cancelled"
        ).scalar() or 0

        daily_data.append({
            "date": day_start.strftime("%d/%m"),
            "revenue": round(float(revenue), 2),
            "orders": int(order_count)
        })

    # Top müşteriler (son 30 gün)
    thirty_ago = datetime.utcnow() - timedelta(days=30)
    top_customers = (
        db.query(
            Customer.name,
            func.count(Order.id).label("order_count"),
            func.sum(Order.total_amount).label("total_spent")
        )
        .join(Order, Customer.id == Order.customer_id)
        .filter(Order.created_at >= thirty_ago, Order.status != "cancelled")
        .group_by(Customer.id)
        .order_by(func.sum(Order.total_amount).desc())
        .limit(5)
        .all()
    )

    # Kategori performansı
    category_perf = (
        db.query(
            Product.category,
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue"),
            func.sum(OrderItem.quantity).label("qty")
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.created_at >= thirty_ago, Order.status != "cancelled")
        .group_by(Product.category)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price).desc())
        .all()
    )

    total_revenue_30d = sum(d["revenue"] for d in daily_data)
    avg_daily = total_revenue_30d / 30.0

    return {
        "daily_data": daily_data,
        "total_revenue_30d": round(total_revenue_30d, 2),
        "avg_daily_revenue": round(avg_daily, 2),
        "top_customers": [
            {
                "name": c.name,
                "order_count": int(c.order_count),
                "total_spent": round(float(c.total_spent), 2)
            }
            for c in top_customers
        ],
        "category_performance": [
            {
                "category": c.category,
                "revenue": round(float(c.revenue), 2),
                "quantity": int(c.qty)
            }
            for c in category_perf
        ]
    }


# Import Customer for top_customers query
from models import Customer
