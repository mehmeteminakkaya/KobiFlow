import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace('https://', 'wss://')
  .replace('http://', 'ws://') + '/ws'

// ── Icon Library (lucide-inspired, inline SVG) ────────────
const ICON_PATHS = {
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
  workflow:     <><rect x="3" y="3" width="7" height="6" rx="1"/><rect x="14" y="3" width="7" height="6" rx="1"/><rect x="9" y="15" width="7" height="6" rx="1"/><path d="M6 9v3a2 2 0 002 2h7"/><path d="M17 9v3a2 2 0 01-2 2"/></>,
  database:     <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6"/></>,
  bot:          <><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="14" r="1.2"/><line x1="12" y1="4" x2="12" y2="8"/><circle cx="12" cy="3" r="1"/><line x1="3" y1="14" x2="2" y2="14"/><line x1="22" y1="14" x2="21" y2="14"/></>,
  brain:        <><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 11-5 0V17a2.5 2.5 0 010-5V9.5A2.5 2.5 0 019.5 7"/><path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 105 0V17a2.5 2.5 0 000-5V9.5A2.5 2.5 0 0014.5 7"/></>,
  settings:     <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 010-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V2a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H22a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  lightbulb:    <><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 00-4 10c.74.71 1 1 1 2v1h6v-1c0-1 .26-1.29 1-2a6 6 0 00-4-10z"/></>,
  cloudUpload:  <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/><polyline points="16 16 12 12 8 16"/></>,
  image:        <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
  fileText:     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
  fileSpread:   <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="12" y1="11" x2="12" y2="20"/></>,
  filePdf:      <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="7" y="18" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">PDF</text></>,
  file:         <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  folder:       <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>,
  message:      <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  zap:          <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  arrowUp:      <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
  arrowDown:    <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
  partyPopper:  <><path d="M5.8 11.3L2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="M22 2L17.2 7.4"/><path d="M11 13l3-3"/><path d="M11 13l2.5 2.5"/></>,
  coffee:       <><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
}

function Icon({ name, size = 16, className = '', style }) {
  const path = ICON_PATHS[name]
  if (!path) return null
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

// ── Utilities ──────────────────────────────────────────────
const STATUS = {
  pending:   { label: 'Bekliyor',  cls: 'badge-pending' },
  shipped:   { label: 'Kargoda',   cls: 'badge-shipped' },
  delivered: { label: 'Teslim',    cls: 'badge-delivered' },
  cancelled: { label: 'İptal',     cls: 'badge-cancelled' },
}
const SEVERITY_CONFIG = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', iconName: 'alertCircle',   label: 'Kritik' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  iconName: 'alertTriangle', label: 'Uyarı' },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  iconName: 'info',          label: 'Bilgi' },
  success:  { color: '#34d399', bg: 'rgba(52,211,153,0.10)',  iconName: 'checkCircle',   label: 'İyi' },
}
const CHART_COLORS = ['#6e7bff', '#34d399', '#f59e0b', '#fb923c', '#a78bfa', '#60a5fa', '#f87171', '#2dd4bf']
const TOOLTIP_STYLE = { background: '#16192b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', padding: '8px 12px' }

// Ürün/kategori isimlerini Türkçeye çevir
const TR_NAMES = {
  'Premium Brewed Coffee':    'Premium Demli Kahve',
  'Gourmet Brewed Coffee':    'Gurme Demli Kahve',
  'Organic Brewed Coffee':    'Organik Demli Kahve',
  'Barista Espresso':         'Barista Espresso',
  'Drip Coffee':              'Filtre Kahve',
  'Latte':                    'Latte',
  'Cappuccino':               'Kapuçino',
  'Brewed Chai Tea':          'Demli Chai Çayı',
  'Brewed Black Tea':         'Demli Siyah Çay',
  'Brewed Green Tea':         'Demli Yeşil Çay',
  'Brewed Herbal Tea':        'Demli Bitki Çayı',
  'Chai Tea':                 'Chai Çayı',
  'Herbal Tea':               'Bitki Çayı',
  'Hot Chocolate':            'Sıcak Çikolata',
  'Dark Chocolate':           'Bitter Çikolata',
  'Chocolate Croissant':      'Çikolatalı Kruvasan',
  'Almond Croissant':         'Bademli Kruvasan',
  'Croissant':                'Kruvasan',
  'Oatmeal Scone':            'Yulaf Scone',
  'Ginger Scone':             'Zencefilli Scone',
  'Hazelnut Biscotti':        'Fındıklı Biscotti',
  'Pastry':                   'Pasta',
  'Regular Syrup':            'Sade Şurup',
  'Hazelnut Syrup':           'Fındık Şurubu',
  'Sugar Free Vanilla Syrup': 'Şekersiz Vanilya Şurubu',
  'Caramel Syrup':            'Karamel Şurubu',
  'Organic Beans (250g)':     'Organik Çekirdek (250g)',
  'Gourmet Beans (250g)':     'Gurme Çekirdek (250g)',
  'Premium Beans (250g)':     'Premium Çekirdek (250g)',
  'Espresso Roast Beans':     'Espresso Kavurma Çekirdeği',
  'Chai Tea (100g)':          'Chai Çayı (100g)',
  'Green Tea (100g)':         'Yeşil Çay (100g)',
  // Kategoriler
  'Coffee':             'Kahve',
  'Tea':                'Çay',
  'Drinking Chocolate': 'Sıcak Çikolata',
  'Bakery':             'Fırın',
  'Flavours':           'Şuruplar',
  'Coffee Beans':       'Kahve Çekirdeği',
  'Loose Tea':          'Dökme Çay',
}
const trName = (n) => TR_NAMES[n] || n

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'))
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return `${diff}s önce`
  if (diff < 3600) return `${Math.floor(diff/60)}dk önce`
  if (diff < 86400) return `${Math.floor(diff/3600)}s önce`
  return `${Math.floor(diff/86400)}g önce`
}

// ── Skeleton loader ─────────────────────────────────────────
function Skeleton({ w = '100%', h = 20, radius = 8, style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: radius, ...style }} />
}

// ── useWebSocket hook ───────────────────────────────────────
function useWebSocket(onMessage) {
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      clearInterval(reconnectTimer.current)
      // WS bağlandı
    }
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch {}
    }
    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connect, 3000)
    }
    ws.onerror = () => ws.close()
  }, [onMessage])

  useEffect(() => {
    connect()
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping')
    }, 30000)
    return () => {
      clearInterval(ping)
      clearInterval(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return connected
}

// ── useApi hook ─────────────────────────────────────────────
function useApi(url, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url) return
    setLoading(true)
    const token = localStorage.getItem('token')
    fetch(`${API}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, deps)

  return { data, loading, error, refetch: () => setData(null) }
}

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers
    },
    ...opts
  })
  return res.json()
}

// ── Auth Screen ─────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true); setError('')
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login'
        ? { username, password }
        : { username, password, email, role: 'manager' }
      const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) })
      if (res.access_token) {
        localStorage.setItem('token', res.access_token)
        localStorage.setItem('user', JSON.stringify(res.user || { username }))
        onLogin(res.user || { username })
      } else {
        setError(res.detail || 'Giriş başarısız.')
      }
    } catch { setError('Sunucuya bağlanılamadı.') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 56, height: 56, margin: '0 auto' }}>
            <Icon name="store" size={26} />
          </div>
          <h1>Nexus</h1>
          <p>Operasyon Yönetim Platformu</p>
        </div>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Giriş</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Kayıt</button>
        </div>
        {mode === 'register' && (
          <input className="auth-input" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} type="email" />
        )}
        <input className="auth-input" placeholder="Kullanıcı adı" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="auth-input" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} type="password"
          onKeyDown={e => e.key === 'Enter' && submit()} />
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-btn" onClick={submit} disabled={loading}>
          {loading ? 'Bekleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>
        {mode === 'login' && (
          <p className="auth-hint">Demo: <strong>admin</strong> / <strong>admin123</strong></p>
        )}
      </div>
    </div>
  )
}

// ── Notification Center ─────────────────────────────────────
function NotificationCenter({ count, onClose }) {
  const { data, loading } = useApi('/notifications?limit=20', [])
  const [localData, setLocalData] = useState(null)
  const d = localData || data

  const markAllRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'POST' })
    setLocalData({ ...d, unread_count: 0, notifications: d.notifications.map(n => ({ ...n, is_read: true })) })
  }

  return (
    <div className="notif-panel">
      <div className="notif-header">
        <span><Icon name="bell" size={15} /> Bildirimler {count > 0 && <span className="notif-badge">{count}</span>}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(d?.unread_count > 0) && <button className="notif-action-btn" onClick={markAllRead}>Tümünü Okundu</button>}
          <button className="notif-close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="notif-list">
        {loading && <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>Yükleniyor…</div>}
        {d?.notifications?.map(n => (
          <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
            <div className="notif-icon">
              <Icon name={n.type === 'insight' ? 'sparkles' : n.type === 'workflow' ? 'workflow' : 'bell'} size={14} />
            </div>
            <div className="notif-content">
              <div className="notif-title">{n.title}</div>
              <div className="notif-msg">{n.message}</div>
              <div className="notif-time">{timeAgo(n.created_at)}</div>
            </div>
          </div>
        ))}
        {d?.notifications?.length === 0 && (
          <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
            Bildirim yok
          </div>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────
function Dashboard({ wsEvents }) {
  const { data, loading } = useApi('/dashboard', [wsEvents.length])

  if (loading || !data) return (
    <div className="view">
      <div className="stats-grid">{[1,2,3,4].map(i => <Skeleton key={i} h={120} radius={16} />)}</div>
      <div className="panel-grid"><Skeleton h={300} radius={16} /><Skeleton h={300} radius={16} /></div>
    </div>
  )

  const { summary: s, recent_orders, categories, top_products } = data
  const maxCat = Math.max(...categories.map(c => c.count), 1)

  return (
    <div className="view">
      <div className="stats-grid">
        {[
          { cls:'yellow', icon:'clock',        value: s.pending,         label:'Bekleyen Sipariş', sub:`${s.today_revenue > 0 ? '₺'+s.today_revenue.toLocaleString('tr') : '—'} bugün` },
          { cls:'cyan',   icon:'truck',        value: s.shipped,         label:'Kargoda',          sub:'Transit durumunda' },
          { cls:'green',  icon:'checkCircle',  value: s.delivered,       label:'Teslim Edildi',    sub:`₺${s.week_revenue.toLocaleString('tr')} bu hafta` },
          { cls:'red',    icon:'alertTriangle',value: s.critical_stocks, label:'Kritik Stok',      sub:`${s.unresolved_insights} çözülmemiş içgörü` },
        ].map((c, i) => (
          <div key={i} className={`stat-card ${c.cls}`} style={{ animationDelay: `${i*0.06}s` }}>
            <div className="stat-icon"><Icon name={c.icon} size={16} /></div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-trend">{c.sub}</div>
            {s.revenue_change_pct !== 0 && c.cls === 'green' && (
              <div className={`revenue-badge ${s.revenue_change_pct >= 0 ? 'up' : 'down'}`}>
                <Icon name={s.revenue_change_pct >= 0 ? 'arrowUp' : 'arrowDown'} size={11} />
                %{Math.abs(s.revenue_change_pct)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <div><div className="panel-title">Son Siparişler</div><div className="panel-subtitle">En güncel 5 işlem</div></div>
          </div>
          <div className="panel-body">
            <table className="data-table">
              <thead><tr><th>Sipariş</th><th>Müşteri</th><th>Durum</th><th>Tutar</th><th>Tarih</th></tr></thead>
              <tbody>
                {recent_orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ color: 'var(--text-3)', fontWeight: 500 }}>#{String(o.id).padStart(4, '0')}</td>
                    <td style={{ fontWeight: 600 }}>{o.customer}</td>
                    <td><span className={`badge ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span></td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>₺{o.total?.toFixed(2)}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div><div className="panel-title">Bu Ay En Çok Satan</div><div className="panel-subtitle">Adet bazında</div></div>
          </div>
          <div className="panel-body" style={{ padding: '12px 20px' }}>
            {top_products?.length > 0 ? (
              <ResponsiveContainer width="100%" height={top_products.length * 36 + 20}>
                <BarChart
                  data={top_products.map(p => ({ ...p, name: trName(p.name) }))}
                  layout="vertical"
                  margin={{ left: 4, right: 28, top: 2, bottom: 2 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text-2)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    wrapperStyle={{ outline: 'none' }}
                    formatter={(v) => [v + ' adet', 'Satış']}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="qty" radius={[0, 6, 6, 0]} background={{ fill: 'transparent' }}>
                    {top_products.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              categories.map((c, i) => (
                <div className="cat-item" key={i}>
                  <div className="cat-header"><span style={{ fontWeight: 500 }}>{trName(c.name)}</span><span className="cat-count">{c.count} ürün</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round(c.count/maxCat*100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Analytics ──────────────────────────────────────────────
function Analytics() {
  const { data: revenue, loading: rl } = useApi('/analytics/revenue', [])
  const { data: preds, loading: pl } = useApi('/analytics/predictions', [])

  const loading = rl || pl

  if (loading) return (
    <div className="view">
      <Skeleton h={300} radius={16} style={{ marginBottom: 16 }} />
      <div className="panel-grid"><Skeleton h={240} radius={16} /><Skeleton h={240} radius={16} /></div>
    </div>
  )

  return (
    <div className="view">
      <div className="view-header"><h2>Analitik & Tahminler</h2></div>

      {/* Gelir Trendi */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">Gelir Trendi (Son 30 Gün)</div>
            <div className="panel-subtitle">
              Toplam: <strong style={{ color: 'var(--green)' }}>₺{revenue?.total_revenue_30d?.toLocaleString('tr')}</strong>
              &nbsp;· Günlük Ort: ₺{revenue?.avg_daily_revenue?.toFixed(0)}
            </div>
          </div>
        </div>
        <div className="panel-body" style={{ padding: '20px 20px 8px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenue?.daily_data || []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false}
                interval={Math.floor((revenue?.daily_data?.length || 30) / 6)} />
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `₺${v >= 1000 ? (v/1000).toFixed(1)+'K' : v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`₺${v.toLocaleString('tr')}`, 'Ciro']} />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent)" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel-grid">
        {/* Top Müşteriler */}
        <div className="panel">
          <div className="panel-header">
            <div><div className="panel-title">Top Müşteriler</div><div className="panel-subtitle">Son 30 gün</div></div>
          </div>
          <div className="panel-body" style={{ padding: '12px 20px' }}>
            {(revenue?.top_customers || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={(revenue?.top_customers?.length || 5) * 42 + 16}>
                <BarChart
                  data={(revenue?.top_customers || []).map(c => ({
                    ...c,
                    shortName: c.name?.split(' ').slice(0, 2).join(' ') || c.name,
                  }))}
                  layout="vertical"
                  margin={{ left: 4, right: 52, top: 2, bottom: 2 }}
                  barCategoryGap="22%"
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={128}
                    tick={{ fill: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    wrapperStyle={{ outline: 'none' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    formatter={v => [`₺${Number(v).toLocaleString('tr')}`, 'Harcama']}
                  />
                  <Bar dataKey="total_spent" radius={[0, 6, 6, 0]} barSize={20} background={{ fill: 'transparent' }}
                    label={{ position: 'right', formatter: v => `₺${Number(v) >= 1000 ? (Number(v)/1000).toFixed(1)+'K' : Number(v)}`, fill: 'var(--text-3)', fontSize: 11 }}>
                    {(revenue?.top_customers || []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ color: 'var(--text-3)', padding: 16, fontSize: 13 }}>Veri yükleniyor…</div>}
          </div>
        </div>

        {/* Kategori Pasta */}
        <div className="panel">
          <div className="panel-header">
            <div><div className="panel-title">Kategori Performansı</div><div className="panel-subtitle">Ciro bazında</div></div>
          </div>
          <div className="panel-body" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={(revenue?.category_performance || []).map(d => ({ ...d, category: trName(d.category) }))}
                  cx="50%" cy="45%"
                  innerRadius={52} outerRadius={82} dataKey="revenue" nameKey="category"
                  paddingAngle={4} strokeWidth={0}>
                  {(revenue?.category_performance || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.92} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  wrapperStyle={{ outline: 'none' }}
                  formatter={v => [`₺${Number(v).toLocaleString('tr')}`, 'Ciro']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={v => <span style={{ color: 'var(--text-2)' }}>{trName(v)}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stok Tahminleri */}
      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div><div className="panel-title"><Icon name="trendingDown" size={15} /> Stok Tükenme Tahminleri</div><div className="panel-subtitle">Günlük tüketim hızına göre</div></div>
        </div>
        <div className="panel-body">
          <table className="data-table">
            <thead>
              <tr><th>Ürün</th><th>Kategori</th><th>Mevcut Stok</th><th>Günlük Tüketim</th><th>Tahmini Tükenme</th><th>Risk</th><th>Öneri</th></tr>
            </thead>
            <tbody>
              {(preds?.predictions || []).map(p => (
                <tr key={p.product_id}>
                  <td style={{ fontWeight: 600 }}>{trName(p.product_name)}</td>
                  <td style={{ color: 'var(--text-2)' }}>{trName(p.category)}</td>
                  <td style={{ fontWeight: 700, color: p.risk_level === 'critical' ? 'var(--red)' : p.risk_level === 'warning' ? 'var(--yellow)' : 'var(--green)' }}>
                    {p.current_stock}
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                    {p.daily_avg_consumption > 0 ? `${p.daily_avg_consumption}/gün` : '—'}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {p.days_until_empty ? (
                      <span style={{ color: p.days_until_empty <= 3 ? 'var(--red)' : p.days_until_empty <= 7 ? 'var(--yellow)' : 'var(--text-2)' }}>
                        {p.days_until_empty <= 30 ? `${p.days_until_empty} gün (${p.estimated_empty_date})` : p.estimated_empty_date}
                      </span>
                    ) : <span style={{ color: 'var(--text-3)' }}>Veri yok</span>}
                  </td>
                  <td><span className="badge" style={{ background: SEVERITY_CONFIG[p.risk_level === 'safe' ? 'success' : p.risk_level === 'info' ? 'info' : p.risk_level]?.bg, color: SEVERITY_CONFIG[p.risk_level === 'safe' ? 'success' : p.risk_level === 'info' ? 'info' : p.risk_level]?.color }}>{p.risk_label}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {p.recommended_order_qty > 0 ? `${p.recommended_order_qty} adet al` : '—'}
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

const INSIGHT_TYPE_LABELS = {
  stock_critical:      'Stok',
  order_delayed:       'Sipariş',
  sales_drop:          'Satış Düşüşü',
  sales_rise:          'Satış Artışı',
  sales_surge:         'Satış Artışı',
  revenue_alert:       'Gelir',
  restock_prediction:  'Tahmin',
  loyal_customer:      'Sadık Müşteri',
  prediction:          'Tahmin',
  suggestion:          'Öneri',
}

// ── Insights Feed ──────────────────────────────────────────
function Insights({ wsEvents }) {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [analyzing, setAnalyzing] = useState(false)

  const loadInsights = async () => {
    setLoading(true)
    const data = await apiFetch('/insights?resolved=false&limit=50')
    setInsights(data.insights || [])
    setLoading(false)
  }

  useEffect(() => { loadInsights() }, [wsEvents.filter(e => e.type === 'new_insight').length])

  const resolve = async (id) => {
    await apiFetch(`/insights/${id}/resolve`, { method: 'POST' })
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const triggerAnalysis = async () => {
    setAnalyzing(true)
    await apiFetch('/insights/analyze', { method: 'POST' })
    setTimeout(() => { loadInsights(); setAnalyzing(false) }, 3000)
  }

  const filtered = filter === 'all' ? insights : insights.filter(i => i.severity === filter)

  return (
    <div className="view">
      <div className="view-header">
        <h2>Proaktif AI İçgörüleri</h2>
        <div className="toolbar">
          {['all', 'critical', 'warning', 'info', 'success'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `Tümü (${insights.length})` : SEVERITY_CONFIG[f]?.label}
            </button>
          ))}
          <button className="filter-btn primary" onClick={triggerAnalysis} disabled={analyzing}>
            <Icon name={analyzing ? 'refresh' : 'play'} size={13} />
            {analyzing ? 'Analiz Ediliyor…' : 'Şimdi Analiz Et'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="insights-feed">{[1,2,3].map(i => <Skeleton key={i} h={100} radius={12} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="checkCircle" size={26} /></div>
          <h3>Her şey yolunda</h3>
          <p>Şu an çözüm bekleyen içgörü yok.</p>
        </div>
      ) : (
        <div className="insights-feed">
          {filtered.map(ins => {
            const cfg = SEVERITY_CONFIG[ins.severity] || SEVERITY_CONFIG.info
            return (
              <div key={ins.id} className="insight-item" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                <div className="insight-icon" style={{ background: cfg.bg, color: cfg.color }}>
                  <Icon name={cfg.iconName} size={17} />
                </div>
                <div className="insight-content">
                  <strong>{ins.title}</strong>
                  <p style={{ marginTop: 4 }}>{ins.description}</p>
                  {ins.suggested_action && (
                    <div className="insight-suggestion">
                      <Icon name="lightbulb" size={14} />
                      <em>{ins.suggested_action}</em>
                    </div>
                  )}
                  <div className="insight-actions">
                    <button className="insight-btn primary" onClick={() => resolve(ins.id)}>
                      <Icon name="check" size={12} /> Çözüldü
                    </button>
                    {INSIGHT_TYPE_LABELS[ins.type] && (
                      <span className="insight-type-badge">{INSIGHT_TYPE_LABELS[ins.type]}</span>
                    )}
                  </div>
                </div>
                <div className="insight-time">{timeAgo(ins.created_at)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Products (Stock) ───────────────────────────────────────
function Products() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/products`).then(r => r.json()).then(p => { setProducts(p); setLoading(false) })
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="view"><Skeleton h={400} radius={16} /></div>

  return (
    <div className="view">
      <div className="view-header">
        <h2>Stok Yönetimi</h2>
        <div className="search-box">
          <Icon name="search" size={14} />
          <input placeholder="Ürün veya kategori ara…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Günlük Ort.</th><th>Durum</th></tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const pct = Math.min(100, Math.round(p.stock / (p.min_threshold * 3) * 100))
              const color = p.is_critical ? 'var(--red)' : pct < 60 ? 'var(--yellow)' : 'var(--green)'
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{trName(p.name)}</td>
                  <td style={{ color: 'var(--text-2)' }}>{trName(p.category)}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }}>₺{p.price.toFixed(2)}</td>
                  <td>
                    <div className="stock-cell">
                      <span style={{ fontWeight: 700, color, minWidth: 28 }}>{p.stock}</span>
                      <div className="stock-bar-bg"><div className="stock-bar-fg" style={{ width: `${pct}%`, background: color }} /></div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    {p.daily_avg_consumption > 0 ? `${p.daily_avg_consumption}/gün` : '—'}
                  </td>
                  <td>
                    <span className={`badge ${p.is_critical ? 'badge-critical' : 'badge-ok'}`}>
                      <Icon name={p.is_critical ? 'alertTriangle' : 'check'} size={11} />
                      {p.is_critical ? 'Kritik' : 'Normal'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Orders — simülasyon verisi ─────────────────────────────
const SIM_CUSTOMERS = [
  'Ahmet Yılmaz', 'Fatma Demir', 'Mehmet Kaya', 'Ayşe Şahin',
  'Emre Yıldız', 'Selin Koç', 'Burak Arslan', 'Ceren Öztürk',
  'Ali Çelik', 'Zeynep Güneş', 'Murat Aydın', 'Deniz Polat',
  'Teknokent Kafeteryası', 'Grand Hotel Catering', 'Barista Akademi',
  'İstanbul Otel Grubu', 'Üsküdar Toplantı Mrk.', 'Office Park Haftalık',
]
const SIM_ITEMS = [
  { name: 'Barista Espresso', price: 85 },
  { name: 'Latte', price: 120 },
  { name: 'Kapuçino', price: 115 },
  { name: 'Demli Chai Çayı', price: 93 },
  { name: 'Sıcak Çikolata', price: 135 },
  { name: 'Filtre Kahve', price: 60 },
  { name: 'Çikolatalı Kruvasan', price: 85 },
  { name: 'Bademli Kruvasan', price: 90 },
  { name: 'Organik Çekirdek (250g)', price: 550 },
  { name: 'Fındık Şurubu', price: 28 },
]
let _simCounter = 9000

function _genSimOrder() {
  const customer = SIM_CUSTOMERS[Math.floor(Math.random() * SIM_CUSTOMERS.length)]
  const count = Math.floor(Math.random() * 3) + 1
  let total = 0
  for (let i = 0; i < count; i++) {
    const item = SIM_ITEMS[Math.floor(Math.random() * SIM_ITEMS.length)]
    const qty = Math.floor(Math.random() * 4) + 1
    total += item.price * qty
  }
  return {
    id: `SIM-${++_simCounter}`,
    customer,
    status: 'pending',
    total: Math.round(total),
    tracking: null,
    date: new Date().toLocaleDateString('tr-TR'),
    isSimulated: true,
  }
}

// ── Orders ─────────────────────────────────────────────────
function Orders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [simOrders, setSimOrders] = useState([])
  const [flashId, setFlashId] = useState(null)
  const simRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    const url = filter ? `${API}/orders?status=${filter}` : `${API}/orders`
    fetch(url).then(r => r.json()).then(o => { setOrders(o); setLoading(false) })
  }, [filter])

  // Canlı simülasyon — yalnızca "Tümü" veya "Bekliyor" filtresinde
  useEffect(() => {
    if (filter !== '' && filter !== 'pending') return

    const tick = () => {
      const newOrder = _genSimOrder()
      setSimOrders(prev => [newOrder, ...prev].slice(0, 12))
      setFlashId(newOrder.id)
      setTimeout(() => setFlashId(null), 3000)
      simRef.current = setTimeout(tick, Math.random() * 9000 + 7000) // 7–16 sn
    }
    simRef.current = setTimeout(tick, Math.random() * 5000 + 4000) // ilk tetik 4-9 sn
    return () => clearTimeout(simRef.current)
  }, [filter])

  const filters = [
    { val: '', label: 'Tümü' },
    { val: 'pending', label: 'Bekliyor' },
    { val: 'shipped', label: 'Kargoda' },
    { val: 'delivered', label: 'Teslim' },
    { val: 'cancelled', label: 'İptal' },
  ]

  if (loading) return <div className="view"><Skeleton h={400} radius={16} /></div>

  // Simüle siparişleri sadece "Tümü" ve "Bekliyor" filtresinde göster
  const visibleSim = (filter === '' || filter === 'pending') ? simOrders : []
  const allRows = [...visibleSim, ...orders]

  return (
    <div className="view">
      <div className="view-header">
        <h2>Sipariş Yönetimi</h2>
        <div className="toolbar" style={{ alignItems: 'center', gap: 8 }}>
          <span className="live-badge"><span className="live-dot" />CANLI</span>
          {filters.map(f => (
            <button key={f.val} className={`filter-btn ${filter === f.val ? 'active' : ''}`} onClick={() => setFilter(f.val)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sipariş</th>
              <th>Müşteri</th>
              <th>Durum</th>
              <th>Tutar</th>
              <th>Kargo No</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map(o => (
              <tr key={o.id} className={o.id === flashId ? 'order-new' : ''}>
                <td style={{ color: 'var(--text-3)', fontWeight: 600 }}>
                  {o.isSimulated
                    ? <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>YENI</span>
                    : `#${String(o.id).padStart(4, '0')}`}
                </td>
                <td style={{ fontWeight: 600 }}>{o.customer}</td>
                <td><span className={`badge ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span></td>
                <td style={{ color: 'var(--accent)', fontWeight: 700 }}>₺{Number(o.total)?.toLocaleString('tr')}</td>
                <td style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'monospace' }}>{o.tracking || '—'}</td>
                <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Smart OCR Scan ─────────────────────────────────────────
function SmartScan() {
  const [file, setFile] = useState(null)
  const [fileObj, setFileObj] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const processFile = async (f) => {
    setFile(URL.createObjectURL(f))
    setFileObj(f)
    setScanning(true)
    setResult(null)
    setApplied(false)

    const formData = new FormData()
    formData.append('file', f)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/ocr/scan`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ error: 'Sunucuya bağlanılamadı: ' + e.message, items: [] })
    } finally {
      setScanning(false)
    }
  }

  const applyToStock = async () => {
    if (!result?.items?.length) return
    setApplying(true)
    const items = result.items.map(it => ({ name: it.name, quantity: it.quantity }))
    const res = await apiFetch('/ocr/apply-to-stock', {
      method: 'POST',
      body: JSON.stringify(items)
    })
    setApplying(false)
    setApplied(true)
  }

  return (
    <div className="view">
      <div className="view-header">
        <h2>Akıllı Fatura Tarama</h2>
        <p style={{ color: 'var(--text-3)' }}>Fatura görselini yükle → AI ile analiz et → Stoğa otomatik aktar</p>
      </div>

      <div className="panel-grid" style={{ gridTemplateColumns: result ? '1fr 1fr' : '1fr' }}>
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header"><div className="panel-title">Görsel Yükle</div></div>
          <div className="panel-body" style={{ flex: 1, padding: 20 }}>
            {!file ? (
              <div className="drop-zone"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); processFile(e.dataTransfer.files[0]) }}>
                <div className="drop-icon"><Icon name="image" size={22} /></div>
                <p>Fotoğrafı sürükle veya{' '}
                  <label className="upload-link">
                    bilgisayardan seç
                    <input type="file" hidden accept="image/*,.pdf" onChange={e => processFile(e.target.files[0])} />
                  </label>
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>JPG, PNG, PDF desteklenir</p>
              </div>
            ) : (
              <div className="scan-container">
                {file.includes('blob') && !file.includes('.pdf') && (
                  <img src={file} alt="Fatura" className="scan-image" />
                )}
                {scanning && <div className="scan-laser" />}
                {scanning && (
                  <div className="scan-overlay">
                    <Icon name="scan" size={14} /> AI faturayı analiz ediyor…
                  </div>
                )}
              </div>
            )}
            {file && !scanning && (
              <button className="filter-btn" style={{ marginTop: 16 }} onClick={() => { setFile(null); setResult(null); setApplied(false) }}>
                <Icon name="refresh" size={13} /> Yeni Görsel
              </button>
            )}
          </div>
        </div>

        {result && (
          <div className="panel" style={{ animation: 'fadeUp 0.3s ease' }}>
            <div className="panel-header">
              <div className="panel-title">AI Analiz Sonucu</div>
              <span className={`badge ${result.ai_parsed ? 'badge-ok' : 'badge-pending'}`}>
                <Icon name={result.ai_parsed ? 'check' : 'alertTriangle'} size={11} />
                {result.ai_parsed ? 'AI Başarılı' : 'Sınırlı'}
              </span>
            </div>
            <div className="panel-body" style={{ padding: 20 }}>
              {result.error && (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ color: 'var(--red)', fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Icon name="alertTriangle" size={13} /> Okuma Hatası
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.5 }}>
                    {result.error.includes('Model yanıtı:') ? (
                      <>Görsel net okunamamış olabilir. Daha parlak / düz çekilmiş bir fotoğraf dene.</>
                    ) : result.error}
                  </div>
                </div>
              )}
              {/* Fatura Özeti */}
              <div className="result-card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 12 }}>
                  <div className="result-row"><span>Tedarikçi</span> <strong>{result.supplier || '—'}</strong></div>
                  <div className="result-row"><span>Fatura No</span> <strong>{result.invoice_number || '—'}</strong></div>
                  <div className="result-row"><span>Tarih</span> <strong>{result.date || '—'}</strong></div>
                  {result.due_date && <div className="result-row"><span>Vade</span> <strong>{result.due_date}</strong></div>}
                  <div className="result-row"><span>Ara Toplam</span> <strong>{result.subtotal ? `₺${result.subtotal.toFixed(2)}` : '—'}</strong></div>
                  <div className="result-row">
                    <span>KDV</span>
                    <strong>
                      {result.tax_rate ? `%${result.tax_rate}` : '—'}
                      {result.tax_amount ? ` (₺${result.tax_amount.toFixed(2)})` : ''}
                    </strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(110,123,255,0.08)', border: '1px solid rgba(110,123,255,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ color: 'var(--text-2)', fontSize: 12 }}>Genel Toplam</span>
                  <strong style={{ color: 'var(--accent)', fontSize: 20 }}>{result.total ? `₺${result.total.toFixed(2)}` : '—'}</strong>
                </div>

                {result.notes && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--text-2)', borderLeft: '3px solid var(--border)' }}>
                    <span style={{ fontWeight: 600, marginRight: 6 }}>Not:</span>{result.notes}
                  </div>
                )}

                {result.items?.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Kalemler ({result.items.length} adet)
                    </div>
                    <table className="data-table" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Ürün / Hizmet</th>
                          <th style={{ textAlign: 'center' }}>Adet</th>
                          <th style={{ textAlign: 'right' }}>Birim Fiyat</th>
                          <th style={{ textAlign: 'right' }}>Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((it, i) => (
                          <tr key={i}>
                            <td style={{ maxWidth: 160, wordBreak: 'break-word' }}>{it.name}</td>
                            <td style={{ textAlign: 'center' }}>{it.quantity ?? '—'}</td>
                            <td style={{ textAlign: 'right' }}>{it.unit_price != null ? `₺${Number(it.unit_price).toFixed(2)}` : '—'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {it.total_price != null
                                ? `₺${Number(it.total_price).toFixed(2)}`
                                : (it.unit_price != null && it.quantity != null)
                                  ? `₺${(it.unit_price * it.quantity).toFixed(2)}`
                                  : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!applied ? (
                      <button className="filter-btn primary" style={{ width: '100%', marginTop: 14, justifyContent: 'center', padding: 10 }}
                        onClick={applyToStock} disabled={applying}>
                        <Icon name={applying ? 'refresh' : 'package'} size={14} />
                        {applying ? 'Stoğa işleniyor…' : 'Stoğa Otomatik Aktar'}
                      </button>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--green)', marginTop: 14, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon name="checkCircle" size={14} /> Stok başarıyla güncellendi
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chat quick actions & suggestions ──────────────────────
const QUICK_ACTIONS = [
  { icon: 'coffee',      label: 'Espresso stok durumu',    msg: 'Espresso ve kahve çekirdeği stok durumunu göster' },
  { icon: 'alertCircle', label: 'Kritik stoklar',          msg: 'Kritik stok seviyesindeki ürünleri listele' },
  { icon: 'clock',       label: 'Bekleyen siparişler',     msg: 'Bekleyen siparişleri listele' },
  { icon: 'barChart',    label: 'Bu hafta satış',          msg: 'Bu haftaki satış analizini göster' },
  { icon: 'trendingUp',  label: 'En çok satan içecekler',  msg: 'En çok satan ürünleri ve gelir katkısını göster' },
  { icon: 'package',     label: 'Bakery stok durumu',      msg: 'Pasta ve fırın ürünleri stok durumu' },
  { icon: 'user',        label: 'Kurumsal müşteriler',     msg: 'En çok alışveriş yapan müşterileri göster' },
  { icon: 'layoutDash',  label: 'Günlük özet',             msg: 'Günlük işletme özetini ver' },
]

const SUGGESTIONS_MAP = {
  'espresso':   ['Espresso makinesi bakımı ne zaman yapılmalı?', 'Espresso satış trendi nasıl?'],
  'stok':       ['Hangi ürünlerin stoğu kritik seviyede?', 'Stok yenileme önerisi ver'],
  'sipariş':    ['Bugünkü toplam sipariş sayısı nedir?', 'İptal edilen siparişlerin nedeni nedir?'],
  'satış':      ['Geçen haftaya kıyasla satışlar nasıl?', 'En düşük satış hangi saatte?'],
  'müşteri':    ['Müşteri memnuniyeti skoru nedir?', 'En sadık müşterilerim kimler?'],
  'chai':       ['Chai satışları mevsimsel mi?', 'Chai ürün çeşitlerini listele'],
  'bakery':     ['Bakery ürünlerinde fire oranı nedir?', 'En çok satan bakery ürünü hangisi?'],
  'gelir':      ['Bu ayki gelir hedefine ulaşıldı mı?', 'Kategori bazlı gelir dağılımını göster'],
}

// ── Chat ───────────────────────────────────────────────────
function Chat({ compact = false }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showAllActions, setShowAllActions] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const userMsg = { role: 'user', content: msg }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!res.ok || !res.body) throw new Error('Stream başlatılamadı')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let aiAdded = false
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'token') {
              accumulated += evt.text
              if (!aiAdded) {
                // İlk token gelince balonu ekle — boş balon olmaz
                aiAdded = true
                setMessages(prev => [...prev, { role: 'assistant', content: accumulated, streaming: true, suggestions: [] }])
                setLoading(false)
              } else {
                setMessages(prev => {
                  const copy = [...prev]
                  copy[copy.length - 1] = { ...copy[copy.length - 1], content: accumulated }
                  return copy
                })
              }
            } else if (evt.type === 'done') {
              const lower = accumulated.toLowerCase()
              let suggestions = []
              for (const [key, sugs] of Object.entries(SUGGESTIONS_MAP)) {
                if (lower.includes(key)) { suggestions = sugs; break }
              }
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: accumulated, streaming: false, suggestions }
                return copy
              })
            }
          } catch {}
        }
      }

      if (!aiAdded) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Yanıt alınamadı.', tools: [], streaming: false }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sunucuya bağlanılamadı. Lütfen tekrar deneyin.', tools: [], streaming: false }])
    } finally {
      setLoading(false)
    }
  }

  const toggleListen = () => {
    if (isListening) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Tarayıcınız ses tanımayı desteklemiyor.'); return }
    const r = new SR()
    r.lang = 'tr-TR'; r.interimResults = false
    r.onstart = () => setIsListening(true)
    r.onresult = e => send(e.results[0][0].transcript)
    r.onerror = () => setIsListening(false)
    r.onend = () => setIsListening(false)
    r.start()
  }

  const visibleActions = compact
    ? (showAllActions ? QUICK_ACTIONS : QUICK_ACTIONS.slice(0, 4))
    : QUICK_ACTIONS

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Mesajlar */}
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: compact ? '12px 16px' : '20px 28px' }}>
        {!messages.length && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><Icon name="coffee" size={26} /></div>
            <h2>Merhaba! ☕</h2>
            <p>Nexus operasyon asistanıyım. Stok durumundan siparişlere, satış analizinden müşteri takibine — ne istersen sorabilirsin.</p>
            <div className="quick-actions-grid">
              {visibleActions.map((a, i) => (
                <button key={i} className="quick-action-card" onClick={() => send(a.msg)} disabled={loading}>
                  <Icon name={a.icon} size={14} />
                  {a.label}
                </button>
              ))}
              {compact && !showAllActions && (
                <button className="quick-action-card more" onClick={() => setShowAllActions(true)}>
                  <Icon name="plus" size={13} /> Daha fazla
                </button>
              )}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role === 'user' ? 'user' : ''}`}>
            <div className={`msg-avatar ${m.role === 'user' ? 'user' : 'ai'}`}>
              <Icon name={m.role === 'user' ? 'user' : 'bot'} size={15} />
            </div>
            <div className="msg-wrapper">
              <div className={`msg-bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
                {m.role === 'user' ? <p>{m.content}</p> : (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || ' '}</ReactMarkdown>
                    {m.streaming && <span className="stream-cursor" />}
                  </div>
                )}
              </div>
              {m.suggestions?.length > 0 && (
                <div className="msg-suggestions">
                  {m.suggestions.map((s, si) => <button key={si} className="suggestion-chip" onClick={() => send(s)}>{s}</button>)}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="msg-row">
            <div className="msg-avatar ai"><Icon name="bot" size={15} /></div>
            <div className="msg-bubble ai" style={{ padding: '12px 16px' }}>
              <div className="thinking-bubble">
                <div className="thinking-dot" />
                <div className="thinking-dot" />
                <div className="thinking-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Hızlı aksiyonlar (konuşma başladıktan sonra) */}
      {messages.length > 0 && (
        <div className="prompts" style={{ padding: '10px 18px', borderTop: '1px solid var(--border)' }}>
          {QUICK_ACTIONS.slice(0, compact ? 4 : 6).map((a, i) => (
            <button key={i} className="prompt-chip" onClick={() => send(a.msg)} disabled={loading}>
              <Icon name={a.icon} size={12} />
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Input alanı */}
      <div className="chat-input-area">
        <div className="input-row">
          <button className={`mic-btn ${isListening ? 'listening' : ''}`} onClick={toggleListen} disabled={loading} title="Sesli giriş">
            <Icon name={isListening ? 'micOff' : 'mic'} size={16} />
          </button>
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Sipariş durumu, stok, satış analizi…"
            disabled={loading}
          />
          <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
            <Icon name="send" size={16} />
          </button>
        </div>
        {!compact && (
          <p className="chat-hint">Enter ile gönder · Mikrofon ile sesli komut ver</p>
        )}
      </div>
    </div>
  )
}

// ── Chat Page (tam sayfa görünüm) ──────────────────────────
function ChatPage() {
  return (
    <div className="view chat-page">
      <Chat compact={false} />
    </div>
  )
}

// ── App Root ───────────────────────────────────────────────
const VIEWS = [
  { id: 'dashboard',  icon: 'layoutDash', label: 'Dashboard',      sub: 'Genel Bakış',        comp: Dashboard },
  { id: 'analytics',  icon: 'barChart',   label: 'Analitik',       sub: 'Gelir & Tahminler',  comp: Analytics },
  { id: 'insights',   icon: 'sparkles',   label: 'İçgörüler',      sub: 'Proaktif AI',        comp: Insights },
  { id: 'orders',     icon: 'package',    label: 'Siparişler',     sub: 'Sipariş Yönetimi',   comp: Orders },
  { id: 'products',   icon: 'database',   label: 'Stok',           sub: 'Ürün & Stok',        comp: Products },
  { id: 'scan',       icon: 'scan',       label: 'OCR Tarama',     sub: 'Fatura Analizi',     comp: SmartScan },
]

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [active, setActive] = useState('dashboard')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [wsEvents, setWsEvents] = useState([])
  const [notifCount, setNotifCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)

  const handleWsMessage = useCallback((msg) => {
    setWsEvents(prev => [...prev.slice(-50), msg])
    if (msg.type === 'new_insight') {
      setNotifCount(c => c + 1)
    }
  }, [])

  const wsConnected = useWebSocket(handleWsMessage)

  // Bildirim sayısını yükle
  useEffect(() => {
    apiFetch('/notifications?unread_only=true&limit=1').then(d => {
      setNotifCount(d?.unread_count || 0)
    }).catch(() => {})
  }, [wsEvents.length])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // Auth olmadan demo modda çalışabilir — token yoksa da devam et
  const storedToken = localStorage.getItem('token')

  if (!storedToken && !user) {
    return <AuthScreen onLogin={u => setUser(u)} />
  }

  const view = VIEWS.find(v => v.id === active) || VIEWS[0]
  const Comp = view.comp

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-row">
            <div className="logo-icon"><Icon name="store" size={18} /></div>
            <div className="logo-text"><h1>Nexus</h1><p>Operasyon Yönetim Platformu</p></div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menü</div>
          {VIEWS.map(v => (
            <button key={v.id} className={`nav-item ${active === v.id ? 'active' : ''}`} onClick={() => setActive(v.id)}>
              <span className="nav-icon"><Icon name={v.icon} size={16} /></span>
              <span>{v.label}</span>
              {v.id === 'insights' && notifCount > 0 && <span className="nav-badge">{notifCount}</span>}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar"><Icon name="user" size={14} /></div>
            <div className="user-info">
              <p>{user?.username || 'Yönetici'}</p>
              <p>{user?.role || 'admin'}</p>
            </div>
            <button onClick={logout} className="icon-btn" title="Çıkış">
              <Icon name="power" size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left"><h2>{view.label}</h2><p>· {view.sub}</p></div>
          <div className="topbar-right">
            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button className="topbar-icon-btn" onClick={() => setShowNotif(!showNotif)}>
                <Icon name="bell" size={16} />
                {notifCount > 0 && <span className="topbar-badge">{notifCount > 99 ? '99+' : notifCount}</span>}
              </button>
              {showNotif && <NotificationCenter count={notifCount} onClose={() => setShowNotif(false)} />}
            </div>

            <div className={`status-pill ${wsConnected ? '' : 'disconnected'}`}>
              <div className="status-dot" style={{ background: wsConnected ? 'var(--green)' : 'var(--red)' }} />
              {wsConnected ? 'Canlı' : 'Bağlanıyor'}
            </div>
          </div>
        </header>

        {/* Son WebSocket olayları göstergesi */}
        {wsEvents.slice(-1).map((e, i) => e.type !== 'pong' && e.type !== 'connected' && (
          <div key={i} className="ws-toast">
            {e.type === 'new_insight' ? <><Icon name="sparkles" size={14} /> {e.insight?.title}</> :
             e.type === 'order_update' ? <><Icon name="package" size={14} /> Sipariş #{e.order_id}: {e.new_status}</> :
             e.type === 'stock_update' ? <><Icon name="trendingDown" size={14} /> {e.product_name}: {e.old_stock} → {e.new_stock}</> :
             e.type === 'workflow_created' ? <><Icon name="workflow" size={14} /> Workflow: {e.name}</> : null}
          </div>
        ))}

        <Comp wsEvents={wsEvents} />
      </div>

      {/* FAB */}
      <button className="fab-btn" onClick={() => setIsChatOpen(true)} aria-label="AI asistanı aç">
        <div className="fab-pulse" />
        <Icon name="bot" size={22} />
      </button>

      {/* AI Drawer */}
      <div className={`ai-drawer-overlay ${isChatOpen ? 'open' : ''}`} onClick={() => setIsChatOpen(false)} />
      <div className={`ai-drawer ${isChatOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <div className="logo-icon" style={{ width: 32, height: 32 }}><Icon name="bot" size={16} /></div>
            <div>
              <h3>Nexus AI</h3>
              <p><span className="status-dot" style={{ background: 'var(--green)' }} /> Hazırım, sor bana!</p>
            </div>
          </div>
          <button className="drawer-close" onClick={() => setIsChatOpen(false)}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}><Chat compact={true} /></div>
      </div>
    </>
  )
}
