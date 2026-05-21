'use client'
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/client'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

const NAV = [
  { href: '/',             icon: '⚗', label: '실험 및 기록' },
  { href: '/inverse',      icon: '⇄', label: '역해석' },
  { href: '/calibration',  icon: '⊕', label: '보정' },
  { href: '/landscape',    icon: '◈', label: '3D 분석' },
]

export default function Shell({ children }) {
  const [chips, setChips]      = useState([])
  const [chip,  setChip]       = useState(null)
  const [branch, setBranch]    = useState('EW')
  const [dropOpen, setDrop]    = useState(false)
  const pathname = usePathname()

  const loadChips = useCallback(async () => {
    try {
      const data = await api.get('/chips')
      setChips(data)
      if (data.length) setChip(c => c ?? data[0])
    } catch (e) { console.error('chip load:', e.message) }
  }, [])

  useEffect(() => { loadChips() }, [loadChips])

  const showBranch = ['/', '/inverse'].includes(pathname)

  return (
    <AppCtx.Provider value={{ chip, chips, branch, setBranch, loadChips }}>
      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-icon">⬡</div>
            <div>
              <div className="sb-name">enCELL</div>
              <div className="sb-sub">MASTER SYSTEM</div>
            </div>
          </div>

          <div className="sb-sec">Active Chip</div>
          <div className="chip-wrap">
            <button className="chip-btn" onClick={() => setDrop(o => !o)}>
              <span className="chip-dot" />
              <span style={{ fontSize: 12 }}>{chip?.display_name || chip?.chip_id || '로딩 중…'}</span>
              <span style={{ color: 'var(--t3)', fontSize: 11, marginLeft: 'auto' }}>▾</span>
            </button>
            {dropOpen && (
              <div className="chip-dd">
                {chips.map(c => (
                  <div key={c.chip_id} className="chip-opt"
                    onClick={() => { setChip(c); setDrop(false) }}>
                    {c.display_name || c.chip_id}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sb-sec">Navigation</div>
          <nav className="sb-nav">
            {NAV.map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className={`nav-item${pathname === href ? ' active' : ''}`}>
                <span className="nav-ic">{icon}</span>{label}
              </Link>
            ))}
          </nav>

          {chip && (
            <div className="params-box">
              <div className="params-title">Parameters</div>
              {[['K1', chip.k1?.toFixed(4)], ['K2', chip.k2?.toFixed(4)],
                ['Kout', chip.kout?.toFixed(4)], ['Alpha', chip.alpha?.toFixed(4)],
                ['C_eth', chip.c_eth?.toFixed(6)], ['C_wat', chip.c_wat?.toFixed(6)]
              ].map(([k, v]) => (
                <div className="p-row" key={k}>
                  <span className="p-k">{k}</span>
                  <span className="p-v">{v ?? '—'}</span>
                </div>
              ))}
              <button className="sb-btn" onClick={loadChips}>↻ 새로고침</button>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <div className="main">
          <div className="topbar">
            <div>
              <div className="page-h">{NAV.find(n => n.href === pathname)?.label ?? 'enCELL'}</div>
              <div className="page-s">
                {pathname === '/'            && 'EXPERIMENT · PREDICT · RECORD'}
                {pathname === '/inverse'     && 'INVERSE SOLVE · PRESSURE FINDER'}
                {pathname === '/calibration' && 'CALIBRATION · PARAMETERS'}
                {pathname === '/landscape'   && 'BATCH PREDICT · VISUALIZATION'}
              </div>
            </div>
            {showBranch && (
              <div className="br-wrap">
                <div className="br-toggle">
                  {['EW', 'WE'].map(b => (
                    <button key={b} className={`btab${branch === b ? ' active' : ''}`}
                      onClick={() => setBranch(b)}>{b}</button>
                  ))}
                </div>
                <div className="br-desc">
                  T1 = <b>{branch === 'EW' ? 'Ethanol' : 'Water'}</b>
                  {' · '}
                  T2 = <b>{branch === 'EW' ? 'Water' : 'Ethanol'}</b>
                </div>
              </div>
            )}
          </div>
          <div className="page-scroll">{children}</div>
        </div>
      </div>
    </AppCtx.Provider>
  )
}
