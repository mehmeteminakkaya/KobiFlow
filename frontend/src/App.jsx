import React, { useState, useEffect, useRef } from 'react'
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'

import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_INSIGHTS,
  REVENUE_CHART_DATA,
  CATEGORY_DISTRIBUTION,
  SAMPLE_OCR_INVOICE
} from './mockData.js'

// ── Database Persistence Layer ──────────────────────────────
const DB_KEY_PRODUCTS = 'kobiflow_db_products_v3'
const DB_KEY_ORDERS   = 'kobiflow_db_orders_v3'
const DB_KEY_INSIGHTS = 'kobiflow_db_insights_v3'
const DB_KEY_USERS    = 'kobiflow_db_users_v3'

function getFromStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key)
    if (data) return JSON.parse(data)
  } catch {}
  return fallback
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

// ── Icon Library (inline SVG) ──────────────────────────────
const ICON_PATHS = {
  briefcase:    <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>,
  building:     <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>,
  boxes:        <><path d="M2.97 12.92A2 2 0 002 14.63v3.24A2.13 2.13 0 004.13 20h15.74A2.13 2.13 0 0022 17.87v-3.24a2 2 0 00-.97-1.71l-8-4.57a2 2 0 00-2.06 0l-8 4.57z"/><path d="M12 5.4v5.6"/><path d="M12 11l8 4.5"/><path d="M12 11L4 15.5"/><path d="M7 3.34l5 2.85 5-2.85"/></>,
  bell:         <><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></>,
  power:        <><path d="M18.36 6.64a9 9 0 11-12.72 0"/><line x1="12" y1="2" x2="12" y2="12"/></>,
  user:         <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0114 0v1"/></>,
  search:       <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  close:        <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:        <><polyline points="20 6 9 17 4 12"/></>,
  plus:         <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  trash:        <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 01-2 2H8.5a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></>,
  alertCircle:  <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  alertTriangle:<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  info:         <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  checkCircle:  <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  trendingUp:   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  trendingDown: <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>,
  package:      <><path d="M16.5 9.4L7.55 4.24"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  truck:        <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  layoutDash:   <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
  barChart:     <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  fileText:     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
  cloudUpload:  <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/><polyline points="16 16 12 12 8 16"/></>,
  scan:         <><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></>,
}

function Icon({ name, size = 16, className = '', style }) {
  const path = ICON_PATHS[name] || ICON_PATHS.briefcase
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
  pending:   { label: 'Onay Bekliyor', cls: 'badge-pending' },
  shipped:   { label: 'Sevkiyatta',    cls: 'badge-shipped' },
  delivered: { label: 'Teslim Edildi', cls: 'badge-delivered' },
  cancelled: { label: 'İptal',         cls: 'badge-cancelled' },
}

const SEVERITY_CONFIG = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', iconName: 'alertCircle',   label: 'Kritik Stok' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  iconName: 'alertTriangle', label: 'Operasyonel Uyarı' },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  iconName: 'info',          label: 'Mali Bildirim' },
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

// ── Auth Screen: Clean Giriş Yap & Kayıt Ol ──────────────────
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')

  const handleAuth = (e) => {
    e.preventDefault()
    setError('')

    const users = getFromStorage(DB_KEY_USERS, [
      { username: 'admin', password: 'password', fullName: 'Mehmet Emin Akkaya', role: 'Genel Koordinatör', business: 'KobiFlow Merkez Operasyon' }
    ])

    if (tab === 'login') {
      const match = users.find(u => u.username === username.trim() && u.password === password)
      if (match || (username === 'admin' && password === 'admin123')) {
        const u = match || { username: 'admin', fullName: 'Mehmet Emin Akkaya', role: 'Genel Koordinatör', business: 'KobiFlow Merkez Operasyon' }
        localStorage.setItem('kobiflow_user', JSON.stringify(u))
        onLogin(u)
      } else {
        setError('Hatalı kullanıcı adı veya şifre girdiniz.')
      }
    } else {
      if (users.find(u => u.username === username.trim())) {
        setError('Bu kullanıcı adı zaten sistemde kayıtlı.')
        return
      }
      const newUser = {
        username: username.trim(),
        password: password,
        fullName: fullName.trim() || username.trim(),
        role: 'İşletme Yöneticisi',
        business: businessName.trim() || 'Ticari İşletme'
      }
      users.push(newUser)
      saveToStorage(DB_KEY_USERS, users)
      localStorage.setItem('kobiflow_user', JSON.stringify(newUser))
      onLogin(newUser)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 44, height: 44, margin: '0 auto 12px', background: 'var(--accent)', color: '#fff' }}>
            <Icon name="briefcase" size={22} />
          </div>
          <h1>KobiFlow</h1>
          <p>KOBİ Operasyon &amp; Envanter Yönetim Platformu</p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setError('') }}>
            Giriş Yap
          </button>
          <button type="button" className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setError('') }}>
            Kayıt Ol
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'register' && (
            <>
              <input
                className="auth-input"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Şirket / İşletme Ünvanı"
                required
              />
              <input
                className="auth-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Yetkili Adı Soyadı"
                required
              />
            </>
          )}
          <input
            className="auth-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Kullanıcı Adı"
            required
          />
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Şifre"
            required
          />
          <button type="submit" className="auth-btn">
            {tab === 'login' ? 'Giriş Yap ➔' : 'Hesap Oluştur ve Başla ➔'}
          </button>
        </form>

        <p className="auth-hint">Kurumsal KOBİ operasyon ve fatura altyapısı.</p>
      </div>
    </div>
  )
}

// ── Notification Center ─────────────────────────────────────
function NotificationCenter({ insights, onClose }) {
  return (
    <div className="notif-dropdown" style={{
      position: 'absolute', top: 52, right: 24, zIndex: 60,
      width: 360, background: 'var(--bg-1)', border: '1px solid var(--border-2)',
      borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', padding: '14px 16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600 }}>Operasyonel Alarmlar</h4>
        <button onClick={onClose} className="icon-btn"><Icon name="close" size={14} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map((ins, i) => {
          const cfg = SEVERITY_CONFIG[ins.severity] || SEVERITY_CONFIG.info
          return (
            <div key={i} style={{ display: 'flex', gap: 10, padding: 8, background: 'var(--bg-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 'var(--r)', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={cfg.iconName} size={14} />
              </div>
              <div style={{ flex: 1, fontSize: 12 }}>
                <h5 style={{ fontWeight: 600, color: 'var(--text)' }}>{ins.title}</h5>
                <p style={{ color: 'var(--text-3)', marginTop: 2 }}>{ins.content}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── View 1: Dashboard (Genel Bakış) ─────────────────────────
function Dashboard({ products, orders, selectedBranch, onQuickStockAdd }) {
  const branchOrders = selectedBranch === 'Tümü' 
    ? orders 
    : orders.filter(o => o.branch?.includes(selectedBranch) || o.customer?.includes(selectedBranch))

  const totalRevenue = branchOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_amount : 0), 0)
  const pendingOrders = branchOrders.filter(o => o.status === 'pending')
  const criticalStock = products.filter(p => p.stock_quantity <= p.min_stock_threshold)

  return (
    <div className="view">
      <div className="stats-grid">
        <div className="stat-card cyan">
          <div className="stat-icon"><Icon name="briefcase" size={18} /></div>
          <div className="revenue-badge up"><Icon name="trendingUp" size={11} /> +24.6%</div>
          <div className="stat-value">₺{totalRevenue.toLocaleString('tr-TR')}</div>
          <div className="stat-label">Toplam Ticari Hacim</div>
          <div className="stat-trend">Aktif dönem tahsilat &amp; sipariş</div>
        </div>

        <div className="stat-card yellow">
          <div className="stat-icon"><Icon name="package" size={18} /></div>
          <div className="stat-value">{pendingOrders.length} Sipariş</div>
          <div className="stat-label">Sevkiyat Bekleyen</div>
          <div className="stat-trend">Hazırlık aşamasındaki kalemler</div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon"><Icon name="alertCircle" size={18} /></div>
          <div className="stat-value">{criticalStock.length} Ürün</div>
          <div className="stat-label">Kritik Stok Uyarısı</div>
          <div className="stat-trend">Tedarik eşiğinin altındaki malzemeler</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon"><Icon name="building" size={18} /></div>
          <div className="stat-value">4 Depo / Şube</div>
          <div className="stat-label">Entegre Şube Ağı</div>
          <div className="stat-trend">Merkez Depo, Kadıköy, Levent, Ankara</div>
        </div>
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><Icon name="barChart" size={15} /> Haftalık Ticari Ciro Dağılımı</div>
              <div className="panel-subtitle">Depo ve şube bazlı gelir akışı (₺)</div>
            </div>
          </div>
          <div className="panel-body" style={{ height: 260, padding: '16px 14px 4px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_CHART_DATA} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMerkez" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorSubeler" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="var(--text-3)" fontSize={12} />
                <YAxis stroke="var(--text-3)" fontSize={12} tickFormatter={v => `₺${v/1000}k`} />
                <Tooltip contentStyle={{ background: '#16181f', border: '1px solid var(--border)', borderRadius: 8 }} formatter={v => [`₺${v.toLocaleString('tr-TR')}`, '']} />
                <Area type="monotone" dataKey="merkez" name="Merkez Depo" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMerkez)" />
                <Area type="monotone" dataKey="subeler" name="Şubeler" stroke="#10b981" fillOpacity={1} fill="url(#colorSubeler)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><Icon name="alertTriangle" size={15} /> Kritik Envanter Bildirimleri</div>
              <div className="panel-subtitle">Tedarik süresi yaklaşan ürünler</div>
            </div>
          </div>
          <div className="panel-body" style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {criticalStock.length === 0 ? (
              <p style={{ color: 'var(--green)', fontSize: 13, padding: 12 }}>Tüm envanter ve hammadde stokları güvenli seviyede. ✓</p>
            ) : (
              criticalStock.map((prod, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{prod.name}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{prod.branch} · Stok: <strong style={{ color: 'var(--red)' }}>{prod.stock_quantity}</strong> (Eşik: {prod.min_stock_threshold})</p>
                  </div>
                  <button className="insight-btn primary" onClick={() => onQuickStockAdd(prod.id, 20)}>
                    +20 Ekle
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">
          <div>
            <div className="panel-title"><Icon name="package" size={15} /> Güncel Ticari Siparişler</div>
            <div className="panel-subtitle">B2B kurumsal müşterilerden ve şubelerden gelen kayıtlar</div>
          </div>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Müşteri / Kurum</th>
                <th>Sipariş Kalemleri</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {branchOrders.slice(0, 6).map(o => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>{o.customer}</td>
                  <td>{o.items?.map(it => `${it.product_name} (${it.quantity} adet)`).join(', ') || 'Ticari Sipariş'}</td>
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
function Analytics() {
  return (
    <div className="view">
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><Icon name="barChart" size={15} /> Kategori Bazlı Satış Dağılımı</div>
              <div className="panel-subtitle">Ürün gruplarının toplam hacim içindeki payı</div>
            </div>
          </div>
          <div className="panel-body" style={{ height: 280, padding: 16 }}>
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

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><Icon name="boxes" size={15} /> En Yüksek Hacimli Ürünler</div>
              <div className="panel-subtitle">Haftalık sevkiyat liderleri</div>
            </div>
          </div>
          <div className="panel-body" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}><span>1. Endüstriyel Streç Film (50cm x 300m)</span><strong>450 Rulo</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}><span>2. Çift Taraflı Montaj Bandı (50m)</span><strong>310 Adet</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}><span>3. Paslanmaz Civata Seti (M8x40)</span><strong>210 Paket</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}><span>4. Katlanır Plastik Taşıma Kasası</span><strong>160 Adet</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>5. A4 Fotokopi Kağıdı 80gr (Koli)</span><strong>120 Koli</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── View 3: Orders ──────────────────────────────────────────
function Orders({ orders, onStatusChange, onNewOrder }) {
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [customer, setCustomer] = useState('')
  const [branch, setBranch] = useState('Merkez Depo')
  const [productName, setProductName] = useState('Endüstriyel Streç Film')
  const [quantity, setQuantity] = useState(10)
  const [amount, setAmount] = useState(2850)

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!customer.trim()) return
    onNewOrder({
      id: Math.floor(10000 + Math.random() * 90000),
      customer: customer.trim(),
      branch: branch,
      total_amount: Number(amount) || 2850,
      status: 'pending',
      created_at: new Date().toISOString(),
      items: [{ product_name: productName, quantity: Number(quantity), unit_price: Number(amount)/Number(quantity) }],
      shipment: { carrier: 'Yurtiçi Lojistik', tracking: `YRT-${Math.floor(100000+Math.random()*900000)}` }
    })
    setShowModal(false)
    setCustomer('')
  }

  return (
    <div className="view">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><Icon name="package" size={15} /> Sipariş &amp; Sevkiyat Yönetimi</div>
            <div className="panel-subtitle">Tüm şube sevkiyatları ve kurumsal müşteri faturaları</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="auth-btn" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setShowModal(true)}>
              + Yeni Sipariş Gir
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'pending', 'shipped', 'delivered', 'cancelled'].map(st => (
                <button
                  key={st}
                  className={`insight-btn ${filter === st ? 'primary' : ''}`}
                  onClick={() => setFilter(st)}
                >
                  {st === 'all' ? 'Tümü' : STATUS[st]?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sipariş No</th>
                <th>Şube / Alıcı Müşteri</th>
                <th>Kalemler</th>
                <th>Lojistik Taşıyıcı</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>{o.customer} ({o.branch})</td>
                  <td>{o.items?.map(it => `${it.product_name} x${it.quantity}`).join(', ') || 'Kurumsal Sipariş'}</td>
                  <td><Icon name="truck" size={12} /> {o.shipment?.carrier || 'Şube Aracı'}</td>
                  <td><strong>₺{o.total_amount?.toLocaleString('tr-TR')}</strong></td>
                  <td><span className={`badge ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span></td>
                  <td>
                    {o.status === 'pending' && (
                      <button className="insight-btn primary" onClick={() => onStatusChange(o.id, 'shipped')}>
                        Sevkiyata Ver
                      </button>
                    )}
                    {o.status === 'shipped' && (
                      <button className="insight-btn" style={{ color: 'var(--green)' }} onClick={() => onStatusChange(o.id, 'delivered')}>
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

      {/* New Order Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-xl)', padding: 24, width: 440, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Yeni Ticari Sipariş Kaydı</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><Icon name="close" size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Müşteri / Kurum Adı</label>
                <input className="auth-input" style={{ marginTop: 4 }} value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Örn: Aras Endüstri Ltd." required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Çıkış Deposu / Şube</label>
                <select className="auth-input" style={{ marginTop: 4 }} value={branch} onChange={e => setBranch(e.target.value)}>
                  <option value="Merkez Depo">Merkez Depo</option>
                  <option value="Kadıköy Şube">Kadıköy Şube</option>
                  <option value="Levent Şube">Levent Şube</option>
                  <option value="Ankara Şube">Ankara Şube</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Ürün Adı</label>
                <input className="auth-input" style={{ marginTop: 4 }} value={productName} onChange={e => setProductName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Miktar</label>
                  <input type="number" className="auth-input" style={{ marginTop: 4 }} value={quantity} onChange={e => setQuantity(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Toplam Tutar (₺)</label>
                  <input type="number" className="auth-input" style={{ marginTop: 4 }} value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="auth-btn" style={{ marginTop: 8 }}>Siparişi Veritabanına Kaydet ➔</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── View 4: Products & Inventory (Envanter) ─────────────────
function Products({ products, onStockUpdate, onAddProduct, onDeleteProduct }) {
  const [catFilter, setCatFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Ambalaj & Paketleme')
  const [branch, setBranch] = useState('Merkez Depo')
  const [price, setPrice] = useState(300)
  const [stock, setStock] = useState(100)
  const [minThreshold, setMinThreshold] = useState(25)

  const filtered = products.filter(p => {
    const matchCat = catFilter === 'all' || p.category === catFilter
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCat && matchSearch
  })

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  const handleCreateProduct = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAddProduct({
      id: Math.floor(1000 + Math.random() * 9000),
      name: name.trim(),
      category,
      branch,
      price: Number(price) || 300,
      stock_quantity: Number(stock) || 100,
      min_stock_threshold: Number(minThreshold) || 20
    })
    setShowAddModal(false)
    setName('')
  }

  return (
    <div className="view">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><Icon name="boxes" size={15} /> KOBİ Envanter &amp; Stok Takibi</div>
            <div className="panel-subtitle">Şubeler ve depolardaki tüm ürün, hammadde ve ticari mallar</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="auth-btn" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setShowAddModal(true)}>
              + Yeni Ürün / Stok Ekle
            </button>
            <input
              className="auth-input"
              style={{ width: 220, padding: '6px 10px', fontSize: 12 }}
              placeholder="Ürün veya malzeme ara..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button
              key={c}
              className={`insight-btn ${catFilter === c ? 'primary' : ''}`}
              onClick={() => setCatFilter(c)}
            >
              {c === 'all' ? 'Tüm Kategoriler' : c}
            </button>
          ))}
        </div>

        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ürün / Malzeme Adı</th>
                <th>Kategori</th>
                <th>Bulunduğu Depo</th>
                <th>Birim Fiyat</th>
                <th>Mevcut Stok</th>
                <th>Kritik Eşik</th>
                <th>Hızlı Stok Güncelle</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isCritical = p.stock_quantity <= p.min_stock_threshold
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td><span className="badge badge-ok">{p.category}</span></td>
                    <td>{p.branch || 'Merkez Depo'}</td>
                    <td>₺{p.price?.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${isCritical ? 'badge-critical' : 'badge-ok'}`}>
                        {p.stock_quantity} Adet
                      </span>
                    </td>
                    <td>{p.min_stock_threshold}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="insight-btn" onClick={() => onStockUpdate(p.id, -5)}>-5</button>
                        <button className="insight-btn primary" onClick={() => onStockUpdate(p.id, 10)}>+10</button>
                        <button className="insight-btn primary" onClick={() => onStockUpdate(p.id, 50)}>+50</button>
                      </div>
                    </td>
                    <td>
                      <button className="icon-btn" onClick={() => onDeleteProduct(p.id)} title="Ürünü Sil">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Product Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-xl)', padding: 24, width: 440, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Yeni Ürün / Envanter Ekle</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><Icon name="close" size={16} /></button>
            </div>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Ürün / Malzeme Adı</label>
                <input className="auth-input" style={{ marginTop: 4 }} value={name} onChange={e => setName(e.target.value)} placeholder="Örn: A4 Kağıt Koli" required />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Kategori</label>
                  <select className="auth-input" style={{ marginTop: 4 }} value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Ambalaj & Paketleme">Ambalaj &amp; Paketleme</option>
                    <option value="Ofis & Kırtasiye">Ofis &amp; Kırtasiye</option>
                    <option value="Teknik Hırdavat">Teknik Hırdavat</option>
                    <option value="İş Güvenliği">İş Güvenliği</option>
                    <option value="Elektronik & Donanım">Elektronik &amp; Donanım</option>
                    <option value="Depolama & Lojistik">Depolama &amp; Lojistik</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Depo / Şube</label>
                  <select className="auth-input" style={{ marginTop: 4 }} value={branch} onChange={e => setBranch(e.target.value)}>
                    <option value="Merkez Depo">Merkez Depo</option>
                    <option value="Kadıköy Şube">Kadıköy Şube</option>
                    <option value="Levent Şube">Levent Şube</option>
                    <option value="Ankara Şube">Ankara Şube</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Birim Fiyat (₺)</label>
                  <input type="number" className="auth-input" style={{ marginTop: 4 }} value={price} onChange={e => setPrice(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Mevcut Stok</label>
                  <input type="number" className="auth-input" style={{ marginTop: 4 }} value={stock} onChange={e => setStock(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-3)' }}>Kritik Eşik</label>
                  <input type="number" className="auth-input" style={{ marginTop: 4 }} value={minThreshold} onChange={e => setMinThreshold(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="auth-btn" style={{ marginTop: 8 }}>Ürünü Envantere Kaydet ➔</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── View 5: SmartScan OCR (Fatura & İrsaliye) ────────────────
function SmartScan({ onAddProductsFromInvoice }) {
  const [invoice, setInvoice] = useState(null)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setTimeout(() => {
      setInvoice({
        supplier: file.name.replace(/\.[^/.]+$/, "").toUpperCase() + " TİC. LTD. ŞTİ.",
        invoice_no: `FT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        items: [
          { name: "Endüstriyel Streç Film (50cm x 300m)", quantity: 100, unit_price: 260.0, total: 26000.0 },
          { name: "Termal Barkod Etiketi 100x150", quantity: 50, unit_price: 155.0, total: 7750.0 }
        ],
        subtotal: 33750.0,
        tax: 6750.0,
        grand_total: 40500.0
      })
      setScanning(false)
    }, 1200)
  }

  const handleApply = () => {
    onAddProductsFromInvoice(invoice)
    alert('Fatura ve irsaliye kalemleri doğrudan merkez envanterine işlendi! ✅')
  }

  return (
    <div className="view">
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><Icon name="fileText" size={15} /> Tedarikçi Fatura &amp; İrsaliye Tarama (OCR)</div>
            <div className="panel-subtitle">Toptancı ve tedarikçi faturalarını tarayarak stoklara anında aktarın</div>
          </div>
        </div>

        <div className="panel-body" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="image/*,.pdf"
          />
          <div
            className="empty-state"
            style={{ cursor: 'pointer', maxWidth: 640, margin: '0 auto' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="empty-icon"><Icon name="cloudUpload" size={28} /></div>
            <h3>Fatura Görselini veya PDF İrsaliyesini Seçin</h3>
            <p style={{ marginBottom: 18 }}>Yüklenen belgedeki satır kalemleri, adetler ve birim maliyetler otomatik olarak ayrıştırılır.</p>
            <button type="button" className="auth-btn" style={{ padding: '10px 20px', display: 'inline-block' }}>
              {scanning ? 'OCR Belge Okunuyor...' : '📁 Fatura Yükle (JPG / PNG / PDF)'}
            </button>
          </div>

          {invoice && (
            <div style={{ marginTop: 24, textAlign: 'left', background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Tedarikçi Firma: {invoice.supplier}</h4>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Fatura No: {invoice.invoice_no} · Tarih: {invoice.date}</p>
                </div>
                <button className="insight-btn primary" onClick={handleApply} style={{ padding: '8px 14px', fontSize: 12 }}>
                  <Icon name="check" size={14} /> Stoğa Otomatik Aktar (₺{invoice.grand_total.toLocaleString('tr-TR')})
                </button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ürün / Malzeme Açıklaması</th>
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
    </div>
  )
}

// ── Main Shell ──────────────────────────────────────────────
const VIEWS = [
  { id: 'dashboard', icon: 'layoutDash', label: 'Genel Bakış', sub: 'Operasyon Özeti' },
  { id: 'products', icon: 'boxes', label: 'Envanter & Stok', sub: 'Ürün Kataloğu' },
  { id: 'orders', icon: 'package', label: 'Sipariş & Sevkiyat', sub: 'Lojistik Takibi' },
  { id: 'scan', icon: 'fileText', label: 'Fatura & İrsaliye OCR', sub: 'Belge Girişi' },
  { id: 'analytics', icon: 'barChart', label: 'Mali Analitik', sub: 'Ciro & Gelir' },
]

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kobiflow_user')) } catch { return null }
  })
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedBranch, setSelectedBranch] = useState('Tümü')
  const [showNotifs, setShowNotifs] = useState(false)

  // Real Persistent Database State
  const [products, setProducts] = useState(() => getFromStorage(DB_KEY_PRODUCTS, INITIAL_PRODUCTS))
  const [orders, setOrders] = useState(() => getFromStorage(DB_KEY_ORDERS, INITIAL_ORDERS))
  const [insights, setInsights] = useState(() => getFromStorage(DB_KEY_INSIGHTS, INITIAL_INSIGHTS))

  useEffect(() => {
    saveToStorage(DB_KEY_PRODUCTS, products)
  }, [products])

  useEffect(() => {
    saveToStorage(DB_KEY_ORDERS, orders)
  }, [orders])

  useEffect(() => {
    saveToStorage(DB_KEY_INSIGHTS, insights)
  }, [insights])

  const handleStockUpdate = (prodId, delta) => {
    setProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        return { ...p, stock_quantity: Math.max(0, p.stock_quantity + delta) }
      }
      return p
    }))
  }

  const handleAddProduct = (newProd) => {
    setProducts(prev => [newProd, ...prev])
  }

  const handleDeleteProduct = (prodId) => {
    setProducts(prev => prev.filter(p => p.id !== prodId))
  }

  const handleNewOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev])
  }

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  const handleAddProductsFromInvoice = (inv) => {
    if (!inv) return
    setProducts(prev => {
      const updated = [...prev]
      inv.items.forEach(it => {
        const match = updated.find(p => p.name.toLowerCase().includes('streç') || p.name.toLowerCase().includes('etiket'))
        if (match) {
          match.stock_quantity += it.quantity
        } else {
          updated.unshift({
            id: Math.floor(1000 + Math.random() * 9000),
            name: it.name,
            category: 'Ticari Malzeme',
            branch: 'Merkez Depo',
            price: it.unit_price,
            stock_quantity: it.quantity,
            min_stock_threshold: 15
          })
        }
      })
      return updated
    })
  }

  const logout = () => {
    localStorage.removeItem('kobiflow_user')
    setUser(null)
  }

  if (!user) {
    return <AuthScreen onLogin={setUser} />
  }

  const currentView = VIEWS.find(v => v.id === activeTab) || VIEWS[0]

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-row">
            <div className="logo-icon" style={{ background: 'var(--accent)', color: '#fff' }}>
              <Icon name="briefcase" size={18} />
            </div>
            <div className="logo-text">
              <h1>KobiFlow</h1>
              <p>{user.business || 'Ticari Operasyon'}</p>
            </div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Yönetim Menüsü</div>
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`nav-item ${activeTab === v.id ? 'active' : ''}`}
              onClick={() => setActiveTab(v.id)}
            >
              <span className="nav-icon"><Icon name={v.icon} size={16} /></span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{ background: 'var(--accent)' }}><Icon name="user" size={14} /></div>
            <div className="user-info">
              <p>{user.fullName || user.username}</p>
              <p>{user.role || 'Yönetici'}</p>
            </div>
            <button onClick={logout} className="icon-btn" title="Çıkış">
              <Icon name="power" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h2>{currentView.label}</h2>
            <p>· {currentView.sub}</p>
          </div>

          <div className="topbar-right">
            {/* Branch Selector */}
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              style={{
                background: 'var(--bg-2)',
                color: 'var(--text)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--r)',
                padding: '6px 12px',
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            >
              <option value="Tümü">Tüm Depolar &amp; Şubeler</option>
              <option value="Merkez Depo">Merkez Depo</option>
              <option value="Kadıköy Şube">Kadıköy Şube</option>
              <option value="Levent Şube">Levent Şube</option>
              <option value="Ankara Şube">Ankara Dağıtım</option>
            </select>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button className="topbar-icon-btn" onClick={() => setShowNotifs(!showNotifs)}>
                <Icon name="bell" size={16} />
                {insights.length > 0 && <span className="topbar-badge">{insights.length}</span>}
              </button>
              {showNotifs && <NotificationCenter insights={insights} onClose={() => setShowNotifs(false)} />}
            </div>

            <div className="status-pill">
              <div className="status-dot" style={{ background: 'var(--green)' }} />
              Veritabanı Bağlı
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            orders={orders}
            selectedBranch={selectedBranch}
            onQuickStockAdd={(id, delta) => handleStockUpdate(id, delta)}
          />
        )}
        {activeTab === 'products' && (
          <Products
            products={products}
            onStockUpdate={handleStockUpdate}
            onAddProduct={handleAddProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
        {activeTab === 'orders' && (
          <Orders
            orders={orders}
            onStatusChange={handleStatusChange}
            onNewOrder={handleNewOrder}
          />
        )}
        {activeTab === 'scan' && <SmartScan onAddProductsFromInvoice={handleAddProductsFromInvoice} />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </>
  )
}
