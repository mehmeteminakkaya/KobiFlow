from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="manager")  # admin | manager | viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    phone = Column(String)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)

    orders = relationship("Order", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=0)
    min_stock_threshold = Column(Integer, default=10)
    daily_avg_consumption = Column(Float, default=0.0)  # prediction için

    order_items = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(String, default="pending")  # pending, shipped, delivered, cancelled
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    cargo_tracking_no = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
    shipment = relationship("Shipment", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True)
    carrier = Column(String, default="Yurtiçi Kargo")
    status = Column(String, default="preparing")  # preparing, in_transit, delivered
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    last_update = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    order = relationship("Order", back_populates="shipment")


class AIInsight(Base):
    """Proactive AI Engine tarafından üretilen içgörüler."""
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # stock_critical, order_delayed, sales_drop, loyal_customer, restock_prediction
    severity = Column(String, default="info")  # critical | warning | info | success
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Ek veri (ürün id, sipariş id vs.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class NotificationLog(Base):
    """Sistem bildirimleri."""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # insight | workflow | system
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    extra_data = Column(JSON, nullable=True)
