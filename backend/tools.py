"""
AI Tool Definitions — NVIDIA/Llama function calling için araç tanımları.
"""

TOOLS = [
    {
        "name": "get_orders",
        "description": (
            "Siparişleri listele. Durum (pending/shipped/delivered/cancelled), "
            "tarih (today/yesterday/this_week/this_month) veya müşteri adına göre filtrele."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["pending", "shipped", "delivered", "cancelled"]
                },
                "date_filter": {
                    "type": "string",
                    "enum": ["today", "yesterday", "this_week", "this_month"]
                },
                "customer_name": {"type": "string"}
            },
            "required": []
        }
    },
    {
        "name": "get_stock_status",
        "description": "Ürün stok durumunu kontrol et. Belirli ürün veya sadece kritikler.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string"},
                "only_critical": {"type": "boolean"}
            },
            "required": []
        }
    },
    {
        "name": "update_order_status",
        "description": "Belirli bir siparişin durumunu güncelle.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {"type": "integer"},
                "new_status": {
                    "type": "string",
                    "enum": ["pending", "shipped", "delivered", "cancelled"]
                }
            },
            "required": ["order_id", "new_status"]
        }
    },
    {
        "name": "get_daily_summary",
        "description": "Günlük özet: bugünkü siparişler, kritik stoklar, kargo durumu, ciro.",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_sales_analysis",
        "description": "Satış analizi: en çok satan ürünler, kategori bazlı ciro, trend bilgisi.",
        "parameters": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["this_week", "this_month", "last_30_days"]
                }
            },
            "required": []
        }
    },
    {
        "name": "update_stock",
        "description": "Bir ürünün stok miktarını güncelle (artır veya azalt).",
        "parameters": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string"},
                "quantity_change": {"type": "integer"}
            },
            "required": ["product_name", "quantity_change"]
        }
    },
    {
        "name": "get_insights",
        "description": "Sistemin ürettiği proaktif AI içgörülerini getir. Kritik stoklar, geciken siparişler, satış trendleri.",
        "parameters": {
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "enum": ["critical", "warning", "info", "success"]
                }
            },
            "required": []
        }
    },
    {
        "name": "get_stock_predictions",
        "description": "Stok tükenme tahminlerini getir. Hangi ürünler kaç günde bitecek?",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_customers",
        "description": "Müşteri listesini getir. En sadık müşteriler, toplam harcama bilgisi.",
        "parameters": {
            "type": "object",
            "properties": {
                "top_by_spending": {"type": "boolean"}
            },
            "required": []
        }
    }
]
