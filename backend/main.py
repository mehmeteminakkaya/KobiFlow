"""
Nexus — AI Operasyon Merkezi
FastAPI + SQLAlchemy + NVIDIA/Llama + WebSocket + OCR + Simülasyon
"""
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List, Optional

import uvicorn
from fastapi import (FastAPI, Depends, HTTPException, WebSocket,
                     WebSocketDisconnect, UploadFile, File,
                     Request, status)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db, engine, Base, run_migrations
from models import Order, Product, Customer, AIInsight, NotificationLog, User
from agent import chat_with_agent, chat_with_agent_stream
from seed_data import seed
from auth import (create_access_token, authenticate_user, get_optional_user,
                  ensure_default_admin, hash_password)
from insight_engine import (start_scheduler, stop_scheduler,
                             run_analysis_now, set_broadcast_callback)
from simulation import run_simulation, set_sim_broadcast_callback
from prediction import calculate_stock_predictions, get_revenue_analytics
from ocr_service import process_invoice
from websocket_manager import manager


# ─────────────────────────────────────────────
# LIFECYCLE
# ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    db = next(get_db())
    try:
        seed()
        ensure_default_admin(db)
    finally:
        db.close()

    set_broadcast_callback(manager.broadcast)
    set_sim_broadcast_callback(manager.broadcast)
    start_scheduler()

    # Simülasyon: her 90 saniyede bir yeni sipariş + sipariş ilerletme
    from apscheduler.triggers.interval import IntervalTrigger
    from insight_engine import scheduler
    scheduler.add_job(
        run_simulation,
        trigger=IntervalTrigger(seconds=90),
        id="live_simulation",
        replace_existing=True,
        next_run_time=datetime.utcnow() + timedelta(seconds=30)
    )

    yield

    stop_scheduler()


app = FastAPI(
    title="Nexus — AI Operasyon Merkezi",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basit rate limiting
_request_counts: dict = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = int(time.time() / 60)
    key = f"{client_ip}:{now}"
    _request_counts[key] = _request_counts.get(key, 0) + 1
    _request_counts.pop(f"{client_ip}:{now - 1}", None)
    if _request_counts[key] > 120:
        return JSONResponse(status_code=429, content={"detail": "Çok fazla istek. Lütfen bekleyin."})
    return await call_next(request)


# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "manager"

class UpdateStockRequest(BaseModel):
    product_id: int
    quantity_change: int
    reason: Optional[str] = None


# ─────────────────────────────────────────────
# SYSTEM
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Nexus — AI Operasyon Merkezi ☕", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy", "time": datetime.utcnow().isoformat(), "ws_connections": manager.connection_count}

@app.post("/admin/reset-db")
def reset_db():
    try:
        seed(force=True)
        return {"success": True, "message": "Nexus verisi yüklendi ✅"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# WEBSOCKET
# ─────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await manager.send_personal({
            "type": "connected",
            "message": "Nexus AI'ya bağlandınız.",
            "server_time": datetime.utcnow().isoformat()
        }, websocket)
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await manager.send_personal({"type": "pong"}, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

@app.post("/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı adı veya şifre hatalı")
    token = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role}
    }

@app.post("/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten alınmış.")
    user = User(
        username=request.username,
        email=request.email,
        hashed_password=hash_password(request.password),
        role=request.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me")
def me(current_user: Optional[User] = Depends(get_optional_user)):
    if not current_user:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "user": {"id": current_user.id, "username": current_user.username, "email": current_user.email, "role": current_user.role}
    }


# ─────────────────────────────────────────────
# CHAT
# ─────────────────────────────────────────────

@app.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Mesaj boş olamaz.")
    history = [{"role": m.role, "content": m.content} for m in request.history]
    result = chat_with_agent(user_message=request.message, history=history, db=db)
    return result

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, db: Session = Depends(get_db)):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Mesaj boş olamaz.")
    history = [{"role": m.role, "content": m.content} for m in request.history]

    def generate():
        for chunk in chat_with_agent_stream(user_message=request.message, history=history, db=db):
            yield chunk

    return StreamingResponse(generate(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = now - timedelta(days=7)
    last_week_start = now - timedelta(days=14)

    total_orders = db.query(Order).count()
    pending   = db.query(Order).filter(Order.status == "pending").count()
    shipped   = db.query(Order).filter(Order.status == "shipped").count()
    delivered = db.query(Order).filter(Order.status == "delivered").count()
    cancelled = db.query(Order).filter(Order.status == "cancelled").count()

    today_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= today_start).scalar() or 0.0

    week_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= week_start, Order.status != "cancelled").scalar() or 0.0

    last_week_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.created_at >= last_week_start,
        Order.created_at < week_start,
        Order.status != "cancelled").scalar() or 0.0

    revenue_change = 0.0
    if last_week_revenue > 0:
        revenue_change = round(((week_revenue - last_week_revenue) / last_week_revenue) * 100, 1)

    critical_stocks = db.query(Product).filter(
        Product.stock_quantity <= Product.min_stock_threshold).count()

    unresolved_insights = db.query(AIInsight).filter(AIInsight.is_resolved == False).count()

    recent_orders = db.query(Order).join(Customer).order_by(Order.created_at.desc()).limit(5).all()

    category_data = db.query(
        Product.category, func.count(Product.id).label("count")
    ).group_by(Product.category).all()

    from models import OrderItem
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    top_products = (
        db.query(Product.name, func.sum(OrderItem.quantity).label("qty"))
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.created_at >= month_start, Order.status != "cancelled")
        .group_by(Product.id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(7).all()
    )

    return {
        "summary": {
            "total_orders": total_orders,
            "pending": pending, "shipped": shipped,
            "delivered": delivered, "cancelled": cancelled,
            "today_revenue": round(float(today_revenue), 2),
            "week_revenue": round(float(week_revenue), 2),
            "revenue_change_pct": revenue_change,
            "critical_stocks": critical_stocks,
            "unresolved_insights": unresolved_insights,
        },
        "recent_orders": [
            {"id": o.id, "customer": o.customer.name, "status": o.status,
             "total": o.total_amount, "date": o.created_at.strftime("%d.%m.%Y") if o.created_at else None}
            for o in recent_orders
        ],
        "categories":    [{"name": c.category, "count": c.count} for c in category_data],
        "top_products":  [{"name": p.name, "qty": int(p.qty)} for p in top_products],
    }


# ─────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────

@app.get("/analytics/revenue")
def get_revenue(db: Session = Depends(get_db)):
    return get_revenue_analytics(db)

@app.get("/analytics/predictions")
def get_predictions(db: Session = Depends(get_db)):
    return {"predictions": calculate_stock_predictions(db)}


# ─────────────────────────────────────────────
# INSIGHTS
# ─────────────────────────────────────────────

@app.get("/insights")
def get_insights(resolved: Optional[bool] = None, severity: Optional[str] = None,
                 limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(AIInsight)
    if resolved is not None:
        query = query.filter(AIInsight.is_resolved == resolved)
    if severity:
        query = query.filter(AIInsight.severity == severity)
    insights = query.order_by(AIInsight.created_at.desc()).limit(limit).all()
    return {
        "total": len(insights),
        "insights": [
            {
                "id": i.id, "type": i.type, "severity": i.severity,
                "title": i.title, "description": i.description,
                "suggested_action": i.suggested_action, "extra_data": i.extra_data,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "is_resolved": i.is_resolved,
                "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
            }
            for i in insights
        ]
    }

@app.post("/insights/{insight_id}/resolve")
async def resolve_insight(insight_id: int, db: Session = Depends(get_db)):
    insight = db.query(AIInsight).filter(AIInsight.id == insight_id).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight bulunamadı.")
    insight.is_resolved = True
    insight.resolved_at = datetime.utcnow()
    db.commit()
    await manager.broadcast({"type": "insight_resolved", "insight_id": insight_id})
    return {"success": True}

@app.post("/insights/analyze")
async def trigger_analysis():
    run_analysis_now()
    return {"success": True, "message": "Analiz başlatıldı."}


# ─────────────────────────────────────────────
# PRODUCTS
# ─────────────────────────────────────────────

@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.stock_quantity.asc()).all()
    return [
        {
            "id": p.id, "name": p.name, "category": p.category,
            "price": p.price, "stock": p.stock_quantity,
            "min_threshold": p.min_stock_threshold,
            "is_critical": p.stock_quantity <= p.min_stock_threshold,
            "daily_avg_consumption": p.daily_avg_consumption or 0.0
        }
        for p in products
    ]

@app.patch("/products/{product_id}/stock")
async def update_product_stock(product_id: int, request: UpdateStockRequest,
                                db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı.")
    old_stock = product.stock_quantity
    product.stock_quantity = max(0, product.stock_quantity + request.quantity_change)
    db.commit()
    await manager.broadcast({
        "type": "stock_update", "product_id": product_id,
        "product_name": product.name, "old_stock": old_stock, "new_stock": product.stock_quantity
    })
    return {"success": True, "product": product.name, "old_stock": old_stock, "new_stock": product.stock_quantity}


# ─────────────────────────────────────────────
# ORDERS
# ─────────────────────────────────────────────

@app.get("/orders")
def get_orders(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Order).join(Customer)
    if status:
        query = query.filter(Order.status == status)
    orders = query.order_by(Order.created_at.desc()).limit(100).all()
    return [
        {
            "id": o.id, "customer": o.customer.name, "status": o.status,
            "total": o.total_amount,
            "date": o.created_at.strftime("%d.%m.%Y %H:%M") if o.created_at else None,
            "tracking": o.cargo_tracking_no
        }
        for o in orders
    ]

@app.patch("/orders/{order_id}/status")
async def update_order(order_id: int, new_status: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı.")
    valid = ["pending", "shipped", "delivered", "cancelled"]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Geçersiz durum. Geçerliler: {valid}")
    old_status = order.status
    order.status = new_status
    if new_status == "shipped" and order.shipment:
        order.shipment.status = "in_transit"
    elif new_status == "delivered" and order.shipment:
        order.shipment.status = "delivered"
    db.commit()
    await manager.broadcast({"type": "order_update", "order_id": order_id,
                              "old_status": old_status, "new_status": new_status})
    return {"success": True, "order_id": order_id, "new_status": new_status}


# ─────────────────────────────────────────────
# OCR — FATURA TARAMA
# ─────────────────────────────────────────────

@app.post("/ocr/scan")
async def scan_invoice(file: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/bmp",
                "image/tiff", "image/webp", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Desteklenmeyen dosya: {file.content_type}")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 10MB'dan büyük olamaz.")
    return await process_invoice(content, file.filename)

@app.post("/ocr/apply-to-stock")
async def apply_ocr_to_stock(items: List[dict], db: Session = Depends(get_db)):
    updated, not_found = [], []
    for item in items:
        name = item.get("name", "")
        qty  = item.get("quantity", 0)
        product = db.query(Product).filter(Product.name.ilike(f"%{name}%")).first()
        if product and qty > 0:
            product.stock_quantity += int(qty)
            updated.append({"product": product.name, "added": qty, "new_stock": product.stock_quantity})
        else:
            not_found.append(name)
    db.commit()
    await manager.broadcast({"type": "stock_update", "source": "ocr", "updated_count": len(updated)})
    return {"success": True, "updated": updated, "not_found": not_found,
            "message": f"{len(updated)} ürün stoku güncellendi."}


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

@app.get("/notifications")
def get_notifications(unread_only: bool = False, limit: int = 30, db: Session = Depends(get_db)):
    query = db.query(NotificationLog)
    if unread_only:
        query = query.filter(NotificationLog.is_read == False)
    notifications = query.order_by(NotificationLog.created_at.desc()).limit(limit).all()
    unread_count  = db.query(NotificationLog).filter(NotificationLog.is_read == False).count()
    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id, "type": n.type, "title": n.title, "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "extra_data": n.extra_data
            }
            for n in notifications
        ]
    }

@app.post("/notifications/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db)):
    n = db.query(NotificationLog).filter(NotificationLog.id == notif_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı.")
    n.is_read = True
    db.commit()
    return {"success": True}

@app.post("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(NotificationLog).update({"is_read": True})
    db.commit()
    return {"success": True}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
