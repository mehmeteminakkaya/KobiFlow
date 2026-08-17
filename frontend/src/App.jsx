import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'

import {
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_INSIGHTS,
  REVENUE_CHART_DATA,
  CATEGORY_DISTRIBUTION,
  SAMPLE_OCR_INVOICE
} from './mockData.js'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace('https://', 'wss://')
  .replace('http://', 'ws://') + '/ws'

// ── Icon Library (lucide-inspired inline SVG) ────────────
const ICON_PATHS = {
  coffee:       <><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
  store:        <><path d="M3 7l1.5-3h15L21 7"/><path d="M3 7v13h18V7"/><path d="M3 7h18"/><path d="M8 11v3a4 4 0 008 0v-3"/></>,
  bell:         <><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></>,
  power:        <><path d="M18.36 6.64a9 9 0 11-12.72 0"/><line x1="12" y1="2" x2="12" y2="12"/></>,
  user:         <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0114 0v1"/></>,
  search:       <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  send:         <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  mic:          <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><line x1="12" y1="18" x2="12" y2="22"/></>,
  micOff:       <><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0019 12v-2"/><path d="M5 10v2a7 7 0 0012 5"/><path d="M15 9.34V5a3 3 0 00-5.68-1.33"/><path d="M9 9v3a3 3 0 005.12 2.12"/></>,
  close:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:        <><polyline points="20 6 9 17 4 12"/></>,
  plus:         <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  trash:        <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 01-2 2H8.5a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></>,
  play:         <><polygon points="6 4 20 12 6 20 6 4"/></>,
  refresh:      <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M20.49 15A9 9 0 015.64 18.36L1 14"/></>,
  alertCircle:  <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  alertTriangle:<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  info:         <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  checkCircle:  <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  trendingUp:   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  trendingDown: <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>,
  package:      <><path d="M16.5 9.4L7.55 4.24"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  truck:        <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  clock:        <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  layoutDash:   <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
  barChart:     <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  sparkles:     <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75L19 14z"/><path d="M5 16l.75 2.25L8 19l-2.25.75L5 22l-.75-2.25L2 19l2.25-.75L5 16z"/></>,
  scan:         <><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></>,
  database:     <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/></>,
  bot:          <><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="14" r="1.2"/><line x1="12" y1="4" x2="12" y2="8"/><circle cx="12" cy="3" r="1"/><line x1="3" y1="14" x2="2" y2="14"/><line x1="22" y1="14" x2="21" y2="14"/></>,
  fileText:     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
  zap:          <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  cloudUpload:  <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/><polyline points="16 16 12 12 8 16"/></>,
}

function Icon({ name, size = 16, className = '', style }) {
  const path = ICON_PATHS[name] || ICON_PATHS.coffee
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {path}
    </svg>
  )
}

const STATUS = {
  pending:   { label: 'Bekliyor',     cls: 'badge-pending' },
  shipped:   { label: 'Kargoda/Yolda',cls: 'badge-shipped' },
  delivered: { label: 'Teslim Edildi',cls: 'badge-delivered' },
  cancelled: { label: 'İptal Edildi', cls: 'badge-cancelled' },
}

const SEVERITY_CONFIG = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', iconName: 'alertCircle',   label: 'Kritik Stok' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  iconName: 'alertTriangle', label: 'Operasyonel Uyarı' },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  iconName: 'info',          label: 'Fırsat & Trend' },
  success:  { color: '#34d399', bg: 'rgba(52,211,153,0.10)',  iconName: 'checkCircle',   label: 'Yüksek Performans' },
}

function timeAgo(dateStr) {
  if (!dateStr) return 'şimdi'
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return `${diff}s önce`
  if (diff < 3600) return `${Math.floor(diff/60)}dk önce`
  if (diff < 86400) return `${Math.floor(diff/3600)}s önce`
  return `${Math.floor(diff/86400)}g önce`
}

// ── Auth Screen with Instant 1-Click Demo Mode ──────────────
function AuthScreen({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDemoMode = () => {
    const demoUser = { id: 1, username: 'admin', role: 'Genel Koordinatör', is_demo: true }
    localStorage.setItem('token', 'brewhive-demo-jwt-token')
    localStorage.setItem('user', JSON.stringify(demoUser))
    onLogin(demoUser)
  }

  const submit = async (e) => {
    if (e) e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
      } else {
        throw new Error('Giriş başarısız')
      }
    } catch {
      // If backend is not running, seamlessly log into Demo Mode
      handleDemoMode()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 48, height: 48, background: 'var(--accent-soft)', color: 'var(--accent-2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="coffee" size={26} />
          </div>
          <h2>BrewHive AI</h2>
          <p>Artisan Kahve Zinciri &amp; Akıllı Operasyon Yönetimi</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="button primary full" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Yönetici Girişi Yap ➔'}
          </button>
        </form>

        <div className="auth-divider"><span>VEYA</span></div>

        <button type="button" onClick={handleDemoMode} className="button secondary full demo-btn">
          ☕ Canlı Demo Moduna Gir (Hemen İncele ➔)
        </button>
        
        <p className="auth-footer-hint">Kadıköy, Beşiktaş &amp; Şişli şube verileriyle tam interaktif simülasyon.</p>
      </div>
    </div>
  )
}

// ── Notification Center ─────────────────────────────────────
function NotificationCenter({ insights, onClose }) {
  return (
    <div className="notif-dropdown">
      <div className="notif-header">
        <h4>Şube &amp; Stok Bildirimleri</h4>
        <button onClick={onClose} className="icon-btn"><Icon name="close" size={14} /></button>
      </div>
      <div className="notif-list">
        {insights.map((ins, i) => {
          const cfg = SEVERITY_CONFIG[ins.severity] || SEVERITY_CONFIG.info
          return (
            <div key={i} className="notif-item">
              <div className="notif-badge" style={{ background: cfg.bg, color: cfg.color }}>
                <Icon name={cfg.iconName} size={14} />
              </div>
              <div className="notif-body">
                <h5>{ins.title}</h5>
                <p>{ins.content}</p>
                <span className="notif-time">{timeAgo(ins.created_at)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── View 1: Dashboard ───────────────────────────────────────
function Dashboard({ products, orders, insights, selectedBranch, onQuickStockAdd }) {
  const branchOrders = selectedBranch === 'Tümü' 
    ? orders 
    : orders.filter(o => o.branch?.includes(selectedBranch) || o.customer?.includes(selectedBranch))

  const totalRevenue = branchOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_amount : 0), 0)
  const pendingOrders = branchOrders.filter(o => o.status === 'pending')
  const criticalStock = products.filter(p => p.stock_quantity <= p.min_stock_threshold)

  return (
    <div className="view dashboard-view">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Toplam Ciro (Bugün)</span>
            <div className="kpi-icon" style={{ color: 'var(--accent-2)', background: 'var(--accent-soft)' }}>
              <Icon name="coffee" size={18} />
            </div>
          </div>
          <div className="kpi-value">₺{totalRevenue.toLocaleString('tr-TR')}</div>
          <div className="kpi-sub positive"><Icon name="trendingUp" size={12} /> Geçen haftaya göre +%18.4</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Bekleyen / Hazırlanan</span>
            <div className="kpi-icon" style={{ color: 'var(--amber)', background: 'var(--amber-soft)' }}>
              <Icon name="package" size={18} />
            </div>
          </div>
          <div className="kpi-value">{pendingOrders.length} Sipariş</div>
          <div className="kpi-sub"><Icon name="clock" size={12} /> Ortalama hazırlık: 4.8 dk</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Kritik Stok Uyarısı</span>
            <div className="kpi-icon" style={{ color: 'var(--red)', background: 'var(--red-soft)' }}>
              <Icon name="alertCircle" size={18} />
            </div>
          </div>
          <div className="kpi-value">{criticalStock.length} Kalem</div>
          <div className="kpi-sub negative"><Icon name="trendingDown" size={12} /> Yulaf sütü &amp; Kruvasan acil</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Aktif Şube Sayısı</span>
            <div className="kpi-icon" style={{ color: 'var(--green)', background: 'var(--green-soft)' }}>
              <Icon name="store" size={18} />
            </div>
          </div>
          <div className="kpi-value">3 Şube + B2B</div>
          <div className="kpi-sub positive"><Icon name="checkCircle" size={12} /> Kadıköy, Beşiktaş, Şişli</div>
        </div>
      </div>

      {/* Main Grid: Revenue Chart & Critical Stock */}
      <div className="grid-2-1">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Haftalık Şube Gelir Dağılımı</h3>
              <p className="card-subtitle">Kadıköy, Beşiktaş ve Şişli anlık ciro performansı</p>
            </div>
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_CHART_DATA} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKadikoy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorBesiktas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="var(--text-3)" fontSize={12} />
                <YAxis stroke="var(--text-3)" fontSize={12} tickFormatter={v => `₺${v/1000}k`} />
                <Tooltip contentStyle={{ background: '#16181f', border: '1px solid var(--border)', borderRadius: 8 }} formatter={v => [`₺${v.toLocaleString('tr-TR')}`, '']} />
                <Area type="monotone" dataKey="kadikoy" name="Kadıköy" stroke="#d97706" fillOpacity={1} fill="url(#colorKadikoy)" />
                <Area type="monotone" dataKey="besiktas" name="Beşiktaş" stroke="#10b981" fillOpacity={1} fill="url(#colorBesiktas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actionable Critical Stock List */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Kritik Stok Alarmları</h3>
              <p className="card-subtitle">Eşiğin altına düşen hammaddeler</p>
            </div>
          </div>
          <div className="critical-stock-list">
            {criticalStock.map((prod, i) => (
              <div key={i} className="critical-item">
                <div>
                  <h4>{prod.name}</h4>
                  <p>{prod.branch} · Stok: <strong style={{ color: 'var(--red)' }}>{prod.stock_quantity}</strong> (Min: {prod.min_stock_threshold})</p>
                </div>
                <button className="button small primary" onClick={() => onQuickStockAdd(prod.id, 20)}>
                  +20 Ekle
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Canlı Sipariş Akışı</h3>
            <p className="card-subtitle">Şubelerden ve B2B kurumsal müşterilerden gelen son siparişler</p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Müşteri / Şube</th>
                <th>Kalemler</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Zaman</th>
              </tr>
            </thead>
            <tbody>
              {branchOrders.slice(0, 5).map(o => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>{o.customer}</td>
                  <td>{o.items?.map(it => `${it.product_name} (${it.quantity})`).join(', ') || 'Kahve & Tatlı'}</td>
                  <td><strong>₺{o.total_amount?.toLocaleString('tr-TR')}</strong></td>
                  <td><span className={`badge ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span></td>
                  <td>{timeAgo(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── View 2: Analytics ───────────────────────────────────────
function Analytics({ products, orders }) {
  return (
    <div className="view analytics-view">
      <div className="grid-2-1">
        <div className="card">
          <div className="card-header">
            <h3>Kategori Bazlı Satış Hacmi</h3>
            <p className="card-subtitle">Haftalık sipariş dağılım yüzdeleri</p>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CATEGORY_DISTRIBUTION} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}>
                  {CATEGORY_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#16181f', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Günün En Çok Satanları</h3>
            <p className="card-subtitle">Adet bazında lider içecek &amp; tatlılar</p>
          </div>
          <div className="top-product-list">
            <div className="top-p-item"><span>1. Double Espresso</span><strong>520 Porsiyon</strong></div>
            <div className="top-p-item"><span>2. Filtre Kahve (Guatemala)</span><strong>480 Porsiyon</strong></div>
            <div className="top-p-item"><span>3. Doğu Karadeniz Çayı</span><strong>420 Bardak</strong></div>
            <div className="top-p-item"><span>4. Iced Americano</span><strong>350 Porsiyon</strong></div>
            <div className="top-p-item"><span>5. Belçika Sıcak Çikolata</span><strong>310 Porsiyon</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── View 3: Orders ──────────────────────────────────────────
function Orders({ orders, onStatusChange }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="view orders-view">
      <div className="card">
        <div className="card-header-flex">
          <div>
            <h3>Sipariş &amp; Lojistik Yönetimi</h3>
            <p className="card-subtitle">Şube transferleri ve müşteri siparişleri</p>
          </div>
          <div className="filter-chips">
            {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map(st => (
              <button key={st} className={`chip-btn ${filter === st ? 'active' : ''}`} onClick={() => setFilter(st)}>
                {st === 'all' ? 'Tümü' : STATUS[st]?.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Şube / Müşteri</th>
                <th>Sipariş Detayı</th>
                <th>Kargo / Kurye</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>{o.customer}</td>
                  <td>{o.items?.map(it => `${it.product_name} x${it.quantity}`).join(', ') || 'Özel Sipariş'}</td>
                  <td><span className="carrier-tag"><Icon name="truck" size={12} /> {o.shipment?.carrier || 'Özel Kurye'} ({o.shipment?.tracking || 'Takip No Yok'})</span></td>
                  <td><strong>₺{o.total_amount?.toLocaleString('tr-TR')}</strong></td>
                  <td><span className={`badge ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span></td>
                  <td>
                    {o.status === 'pending' && (
                      <button className="button tiny primary" onClick={() => onStatusChange(o.id, 'shipped')}>
                        Kargoya Ver
                      </button>
                    )}
                    {o.status === 'shipped' && (
                      <button className="button tiny success" onClick={() => onStatusChange(o.id, 'delivered')}>
                        Teslim Et
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── View 4: Products & Inventory ────────────────────────────
function Products({ products, onStockUpdate }) {
  const [catFilter, setCatFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = products.filter(p => {
    const matchCat = catFilter === 'all' || p.category === catFilter
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCat && matchSearch
  })

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  return (
    <div className="view products-view">
      <div className="card">
        <div className="card-header-flex">
          <div>
            <h3>Kahve &amp; Hammadde Envanteri</h3>
            <p className="card-subtitle">Şubelerdeki çekirdek, süt, şurup ve pastane stokları</p>
          </div>
          <div className="search-box">
            <Icon name="search" size={14} />
            <input placeholder="Ürün veya çekirdek ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="filter-chips">
          {categories.map(c => (
            <button key={c} className={`chip-btn ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>
              {c === 'all' ? 'Tüm Kategoriler' : c}
            </button>
          ))}
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ürün / Çekirdek</th>
                <th>Kategori</th>
                <th>Şube</th>
                <th>Birim Fiyat</th>
                <th>Mevcut Stok</th>
                <th>Kritik Eşik</th>
                <th>Hızlı Ekle / Azalt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isCritical = p.stock_quantity <= p.min_stock_threshold
                return (
                  <tr key={p.id} className={isCritical ? 'row-critical' : ''}>
                    <td><strong>{p.name}</strong></td>
                    <td><span className="category-pill">{p.category}</span></td>
                    <td>{p.branch || 'Merkez Depo'}</td>
                    <td>₺{p.price?.toFixed(2)}</td>
                    <td>
                      <span className={`stock-badge ${isCritical ? 'critical' : 'normal'}`}>
                        {p.stock_quantity} Adet
                      </span>
                    </td>
                    <td>{p.min_stock_threshold}</td>
                    <td>
                      <div className="stock-controls">
                        <button className="stock-btn" onClick={() => onStockUpdate(p.id, -5)}>-5</button>
                        <button className="stock-btn add" onClick={() => onStockUpdate(p.id, 10)}>+10</button>
                        <button className="stock-btn add" onClick={() => onStockUpdate(p.id, 50)}>+50</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── View 5: SmartScan OCR ───────────────────────────────────
function SmartScan({ onAddProductsFromInvoice }) {
  const [invoice, setInvoice] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  const handleDemoScan = () => {
    setScanning(true)
    setTimeout(() => {
      setInvoice(SAMPLE_OCR_INVOICE)
      setScanning(false)
      setUploaded(true)
    }, 1200)
  }

  const handleApply = () => {
    onAddProductsFromInvoice(invoice)
    alert('Faturadaki ürünler ve miktarlar merkez stoğa başarıyla işlendi! ✅')
  }

  return (
    <div className="view scan-view">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Akıllı Fatura &amp; Fiş OCR Tarayıcısı</h3>
            <p className="card-subtitle">Toptancıdan gelen kahve çekirdeği ve hammadde faturalarını anında stoğa aktarın</p>
          </div>
        </div>

        <div className="upload-dropzone" onClick={handleDemoScan}>
          <div className="upload-icon"><Icon name="cloudUpload" size={36} /></div>
          <h4>Fatura görselini veya PDF dosyasını buraya sürükleyin</h4>
          <p>Desteklenen formatlar: JPG, PNG, PDF (Gemini 1.5 Flash OCR)</p>
          <button type="button" className="button primary demo-scan-btn">
            {scanning ? 'OCR Fatura Taranıyor...' : '📑 Örnek Kahve Tedarik Faturası Yükle (Demo OCR)'}
          </button>
        </div>

        {invoice && (
          <div className="ocr-result-card">
            <div className="ocr-result-header">
              <div>
                <h4>Taranan Fatura: {invoice.supplier}</h4>
                <p>Fatura No: <strong>{invoice.invoice_no}</strong> · Tarih: <strong>{invoice.date}</strong></p>
              </div>
              <button className="button success" onClick={handleApply}>
                <Icon name="check" size={16} /> Stoğa Otomatik Aktar (₺{invoice.grand_total.toLocaleString('tr-TR')})
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Ürün Açıklaması</th>
                  <th>Miktar</th>
                  <th>Birim Fiyat</th>
                  <th>Toplam Tutar</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i}>
                    <td><strong>{it.name}</strong></td>
                    <td>{it.quantity}</td>
                    <td>₺{it.unit_price.toLocaleString('tr-TR')}</td>
                    <td><strong>₺{it.total.toLocaleString('tr-TR')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── View 6: AI Co-Pilot Chat ────────────────────────────────
function Chat({ compact = false }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Merhaba! Ben **BrewHive AI** operasyon asistanınızım. ☕🐝\n\nKadıköy, Beşiktaş ve Şişli şubelerimizin stok durumunu sorabilir, ciro analizi isteyebilir veya doğrudan sipariş güncelleyebilirsiniz.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  const send = (msgText) => {
    const text = msgText || input
    if (!text.trim() || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    setTimeout(() => {
      let reply = ''
      const lower = text.toLowerCase()

      if (lower.includes('yulaf') || lower.includes('süt') || lower.includes('kadıköy')) {
        reply = `🥛 **Kadıköy Şubesi Yulaf Sütü Durumu:**\n\n* **Mevcut Stok:** 8 Kutu (Kritik Eşik: 24)\n* **Tükenme Tahmini:** ~18 saat içinde tükenecektir.\n* **Öneri:** Beşiktaş şubesinden 10 kutu transfer oluşturuldu veya toptancı faturası bekleniyor.`
      } else if (lower.includes('ciro') || lower.includes('satış') || lower.includes('gelir')) {
        reply = `📊 **Haftalık Ciro Özeti:**\n\n* **Bugünkü Toplam Ciro:** ₺39.500 (Hedefin %112'si)\n* **Lider Şube:** Kadıköy (₺16.800)\n* **En Çok Satan:** Double Espresso (520 adet) & Filtre Kahve (480 adet)`
      } else if (lower.includes('sipariş') || lower.includes('bekleyen')) {
        reply = `📦 **Bekleyen Siparişler:**\n\n* **#1084** — Kadıköy Şubesi (₺1.420) — Hazırlanıyor\n* **#1080** — Şişli Şubesi (₺720) — Kurye Atandı`
      } else {
        reply = `☕ **BrewHive AI Yanıtı:**\n\n"${text}" sorgusu operasyonel veritabanında incelendi. 3 şubenin kahve ve unlu mamül akışı sorunsuz devam ediyor. Başka bir şube veya stok sorgulamak ister misiniz?`
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setLoading(false)
    }, 600)
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div className={`chat-container ${compact ? 'compact' : ''}`}>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="msg-avatar">
              <Icon name={m.role === 'user' ? 'user' : 'bot'} size={14} />
            </div>
            <div className="msg-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <div className="msg-avatar"><Icon name="bot" size={14} /></div>
            <div className="msg-content"><span className="thinking-dots">Yapay zekâ yanıtlıyor...</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-input-bar">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Örn: Kadıköy yulaf sütü kaç kaldı? Ciro durumu nedir?"
        />
        <button className="button primary icon-only" onClick={() => send()} disabled={!input.trim() || loading}>
          <Icon name="send" size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Main Shell ──────────────────────────────────────────────
const VIEWS = [
  { id: 'dashboard', icon: 'layoutDash', label: 'Dashboard', sub: 'Canlı Operasyon' },
  { id: 'analytics', icon: 'barChart', label: 'Analitik & Tahmin', sub: 'Ciro & Talep' },
  { id: 'orders', icon: 'package', label: 'Siparişler', sub: 'Şube & Lojistik' },
  { id: 'products', icon: 'coffee', label: 'Kahve & Stok', sub: 'Envanter' },
  { id: 'scan', icon: 'scan', label: 'Akıllı Fatura OCR', sub: 'Fatura Girişi' },
]

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedBranch, setSelectedBranch] = useState('Tümü')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)

  // Local state initialized with rich mock data
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [insights, setInsights] = useState(INITIAL_INSIGHTS)

  const handleStockUpdate = (prodId, delta) => {
    setProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        const newStock = Math.max(0, p.stock_quantity + delta)
        return { ...p, stock_quantity: newStock }
      }
      return p
    }))
  }

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  const handleAddProductsFromInvoice = (inv) => {
    if (!inv) return
    setProducts(prev => {
      const updated = [...prev]
      inv.items.forEach(it => {
        const match = updated.find(p => p.name.toLowerCase().includes('çekirdek') || p.name.toLowerCase().includes('yulaf'))
        if (match) match.stock_quantity += (it.quantity * 10)
      })
      return updated
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (!user) {
    return <AuthScreen onLogin={setUser} />
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon"><Icon name="coffee" size={20} /></div>
          <div>
            <h1 className="brand-title">BrewHive AI</h1>
            <p className="brand-sub">Specialty Coffee SaaS</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`nav-item ${activeTab === v.id ? 'active' : ''}`}
              onClick={() => setActiveTab(v.id)}
            >
              <Icon name={v.icon} size={18} />
              <span>{v.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar"><Icon name="user" size={14} /></div>
            <div className="user-meta">
              <strong>{user.username || 'Barista Müdürü'}</strong>
              <span>{user.role || 'Genel Koordinatör'}</span>
            </div>
            <button onClick={logout} className="logout-btn" title="Çıkış"><Icon name="power" size={15} /></button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h2>{VIEWS.find(v => v.id === activeTab)?.label}</h2>
            <span className="topbar-sub">· {VIEWS.find(v => v.id === activeTab)?.sub}</span>
          </div>

          <div className="topbar-right">
            {/* Branch Selector */}
            <div className="branch-selector">
              <Icon name="store" size={14} />
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                <option value="Tümü">Tüm Şubeler (3 Şube + B2B)</option>
                <option value="Kadıköy">Kadıköy (Moda)</option>
                <option value="Beşiktaş">Beşiktaş (Akaretler)</option>
                <option value="Şişli">Şişli (Bomonti)</option>
              </select>
            </div>

            {/* Notification Bell */}
            <div className="notif-wrapper">
              <button className="topbar-btn" onClick={() => setShowNotifs(!showNotifs)}>
                <Icon name="bell" size={16} />
                {insights.length > 0 && <span className="badge-count">{insights.length}</span>}
              </button>
              {showNotifs && <NotificationCenter insights={insights} onClose={() => setShowNotifs(false)} />}
            </div>

            <div className="live-badge">
              <span className="live-dot" />
              <span>Canlı Simülasyon</span>
            </div>
          </div>
        </header>

        <div className="content-body">
          {activeTab === 'dashboard' && (
            <Dashboard
              products={products}
              orders={orders}
              insights={insights}
              selectedBranch={selectedBranch}
              onQuickStockAdd={(id, delta) => handleStockUpdate(id, delta)}
            />
          )}
          {activeTab === 'analytics' && <Analytics products={products} orders={orders} />}
          {activeTab === 'orders' && <Orders orders={orders} onStatusChange={handleStatusChange} />}
          {activeTab === 'products' && <Products products={products} onStockUpdate={handleStockUpdate} />}
          {activeTab === 'scan' && <SmartScan onAddProductsFromInvoice={handleAddProductsFromInvoice} />}
        </div>
      </main>

      {/* Floating AI Chat Assistant */}
      <button className="floating-ai-btn" onClick={() => setIsChatOpen(true)} title="BrewHive AI Asistanı Aç">
        <Icon name="bot" size={22} />
        <span className="ai-btn-pulse" />
      </button>

      {/* AI Drawer Modal */}
      {isChatOpen && (
        <div className="ai-drawer-backdrop" onClick={() => setIsChatOpen(false)}>
          <div className="ai-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="ai-drawer-header">
              <div className="ai-title-row">
                <div className="ai-logo"><Icon name="bot" size={16} /></div>
                <div>
                  <h4>BrewHive AI Co-Pilot</h4>
                  <p>● Doğal dille stok ve ciro asistanınız</p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setIsChatOpen(false)}><Icon name="close" size={16} /></button>
            </div>
            <Chat compact={false} />
          </div>
        </div>
      )}
    </div>
  )
}
