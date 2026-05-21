import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/',           icon: '⚗', label: '실험 및 기록' },
  { to: '/inverse',    icon: '⇄', label: '역해석' },
  { to: '/calibration',icon: '⊕', label: '보정' },
  { to: '/landscape',  icon: '◈', label: '3D 분석' },
]

export default function Sidebar({ chips, currentChip, onSelectChip, onRefresh }) {
  const [dropOpen, setDropOpen] = useState(false)

  return (
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
        <button className="chip-btn" onClick={() => setDropOpen(o => !o)}>
          <div className="chip-btn-left">
            <span className="chip-dot" />
            <span>{currentChip?.display_name || currentChip?.chip_id || '선택 없음'}</span>
          </div>
          <span className="chip-caret">▾</span>
        </button>
        {dropOpen && (
          <div className="chip-dd">
            {chips.map(c => (
              <div
                key={c.chip_id}
                className="chip-opt"
                onClick={() => { onSelectChip(c); setDropOpen(false) }}
              >
                {c.display_name || c.chip_id}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sb-sec">Navigation</div>
      <nav className="sb-nav">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-ic">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {currentChip && (
        <div className="params-box">
          <div className="params-title">Parameters</div>
          {[
            ['K1',    currentChip.k1?.toFixed(4)],
            ['K2',    currentChip.k2?.toFixed(4)],
            ['Kout',  currentChip.kout?.toFixed(4)],
            ['Alpha', currentChip.alpha?.toFixed(4)],
            ['C_eth', currentChip.c_eth?.toFixed(6)],
            ['C_wat', currentChip.c_wat?.toFixed(6)],
          ].map(([k, v]) => (
            <div className="p-row" key={k}>
              <span className="p-k">{k}</span>
              <span className="p-v">{v ?? '—'}</span>
            </div>
          ))}
          <button className="sb-btn" onClick={onRefresh}>↻ 새로고침</button>
        </div>
      )}
    </aside>
  )
}
