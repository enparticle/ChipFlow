'use client'
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/client'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

const NAV = [
  { href: '/',             icon: 'ti-flask',                  label: '실험 및 기록' },
  { href: '/inverse',      icon: 'ti-arrows-exchange',        label: '역해석' },
  { href: '/calibration',  icon: 'ti-adjustments-horizontal', label: '보정' },
  { href: '/landscape',    icon: 'ti-chart-bubble',           label: '3D 분석' },
]

function Dropdown({ label, items, selected, onSelect, idKey, nameKey }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="chip-wrap">
      <button className="chip-btn" onClick={() => setOpen(o => !o)}>
        <span className="chip-dot" />
        <span style={{ fontSize: 12 }}>{selected?.[nameKey] || selected?.[idKey] || '선택…'}</span>
        <span style={{ color: 'var(--t3)', fontSize: 11, marginLeft: 'auto' }}>▾</span>
      </button>
      {open && (
        <div className="chip-dd">
          {items.map(item => (
            <div key={item[idKey]} className="chip-opt"
              onClick={() => { onSelect(item); setOpen(false) }}>
              {item[nameKey] || item[idKey]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Shell({ children }) {
  const [devices, setDevices]   = useState([])
  const [lots,    setLots]      = useState([])
  const [device,  setDevice]    = useState(null)
  const [lot,     setLot]       = useState(null)
  const [branch,  setBranch]    = useState('EW')
  const pathname = usePathname()

  const loadAll = useCallback(async () => {
    try {
      const [devs, ls] = await Promise.all([api.get('/devices'), api.get('/lots')])
      setDevices(devs)
      setLots(ls)
      if (devs.length) setDevice(d => d ?? devs[0])
      if (ls.length)   setLot(l => l ?? ls[0])
    } catch (e) { console.error('load failed:', e.message) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // lot을 chip 형태로 변환 (기존 페이지 호환)
  const chip = lot ? {
    chip_id:      lot.lot_id,
    display_name: lot.display_name,
    k1: lot.k1, k2: lot.k2, kout: lot.kout, alpha: lot.alpha,
    c_eth: lot.c_eth, c_wat: lot.c_wat,
    loss_const: lot.loss_const, p_offset: lot.p_offset_lot,
  } : null

  const showBranch = ['/', '/inverse'].includes(pathname)

  return (
    <AppCtx.Provider value={{ chip, device, lot, devices, lots, branch, setBranch, loadAll }}>
      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-icon"><i className="ti ti-dna" aria-hidden="true" /></div>
            <div>
              <div className="sb-name">enCELL</div>
              <div className="sb-sub">MASTER SYSTEM</div>
            </div>
          </div>

          {/* 장비 선택 */}
          <div className="sb-sec">Device</div>
          <Dropdown
            items={devices} selected={device} onSelect={setDevice}
            idKey="device_id" nameKey="display_name"
          />

          {/* 로트 선택 */}
          <div className="sb-sec">Lot Cartridge</div>
          <Dropdown
            items={lots} selected={lot} onSelect={setLot}
            idKey="lot_id" nameKey="display_name"
          />

          <div className="sb-sec">Navigation</div>
          <nav className="sb-nav">
            {NAV.map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className={`nav-item${pathname === href ? ' active' : ''}`}>
                <span className="nav-ic"><i className={`ti ${icon}`} aria-hidden="true" /></span>{label}
              </Link>
            ))}
          </nav>

          {/* 파라미터 표시 */}
          {lot && (
            <div className="params-box">
              <div className="params-title">Lot Parameters</div>
              {[
                ['K1',    lot.k1?.toFixed(4)],
                ['K2',    lot.k2?.toFixed(4)],
                ['Kout',  lot.kout?.toFixed(4)],
                ['Alpha', lot.alpha?.toFixed(4)],
                ['C_eth', lot.c_eth?.toFixed(6)],
                ['C_wat', lot.c_wat?.toFixed(6)],
              ].map(([k, v]) => (
                <div className="p-row" key={k}>
                  <span className="p-k">{k}</span>
                  <span className="p-v">{v ?? '—'}</span>
                </div>
              ))}
              {device && (
                <>
                  <div className="params-title" style={{ marginTop: 10 }}>Device</div>
                  <div className="p-row">
                    <span className="p-k">P_offset</span>
                    <span className="p-v">{device.p_offset_device?.toFixed(4) ?? '—'}</span>
                  </div>
                </>
              )}
              <button className="sb-btn" onClick={loadAll}>↻ 새로고침</button>
            </div>
          )}
        </aside>

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
