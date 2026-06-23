'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/client'
import { BRANCH } from '@/lib/constants'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

const NAV = [
  { href: '/', icon: '◉', label: '실험 예측·기록', subtitle: '일반 사용자' },
  { href: '/inverse', icon: '↔', label: '목표 유량으로 압력 찾기' },
  { href: '/landscape', icon: '⌁', label: '유량 지도' },
  { href: '/calibration', icon: '⚙', label: '보정 관리', admin: true },
  { href: '/manage', icon: '▣', label: '장비·로트 관리', admin: true },
]

const PAGE_COPY = {
  '/': ['실험 예측·기록', '실험 조건을 입력하고 결과를 안전하게 저장합니다.'],
  '/inverse': ['목표 유량으로 압력 찾기', '원하는 유량에 맞는 압력 조건을 계산합니다.'],
  '/landscape': ['유량 지도', '압력 조건에 따른 유량 변화를 확인합니다.'],
  '/calibration': ['보정 관리', '승인된 보정값과 적용 대기 후보를 관리합니다.'],
  '/manage': ['장비·로트 관리', '실험에 사용할 장비와 카트리지 로트를 관리합니다.'],
}

function Dropdown({ label, items, selected, onSelect, idKey, nameKey, loading }) {
  const [open, setOpen] = useState(false)
  const selectedText = selected?.[nameKey] || selected?.[idKey]

  return (
    <div className="setup-dropdown">
      <label>{label}</label>
      <button
        type="button"
        className={`setup-select${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={`setup-status-dot${selected ? ' selected' : ''}`} />
        <span className="setup-select-text">{loading ? '불러오는 중…' : selectedText || '선택하세요'}</span>
        <span className="setup-chevron">⌄</span>
      </button>

      {open && (
        <div className="setup-options">
          {items.length === 0 ? (
            <div className="setup-option empty">등록된 항목이 없습니다.</div>
          ) : items.map(item => (
            <button
              type="button"
              key={item[idKey]}
              className={`setup-option${selected?.[idKey] === item[idKey] ? ' selected' : ''}`}
              onClick={() => {
                onSelect(item)
                setOpen(false)
              }}
            >
              <strong>{item[nameKey] || item[idKey]}</strong>
              {item[nameKey] && <span>{item[idKey]}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Shell({ children }) {
  const [devices, setDevices] = useState([])
  const [lots, setLots] = useState([])
  const [device, setDevice] = useState(null)
  const [lot, setLot] = useState(null)
  const [branch, setBranch] = useState('EW')
  const [loadingSetup, setLoadingSetup] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const loadAll = useCallback(async () => {
    setLoadingSetup(true)
    setLoadError('')
    try {
      const [devs, ls] = await Promise.all([api.get('/devices'), api.get('/lots')])
      setDevices(Array.isArray(devs) ? devs : [])
      setLots(Array.isArray(ls) ? ls : [])
      if (Array.isArray(devs) && devs.length) setDevice(current => current ?? devs[0])
      if (Array.isArray(ls) && ls.length) setLot(current => current ?? ls[0])
    } catch (e) {
      console.error('setup load failed:', e.message)
      setLoadError('백엔드에 연결하지 못했습니다.')
    } finally {
      setLoadingSetup(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const chip = lot ? {
    chip_id: lot.lot_id,
    display_name: lot.display_name,
    k1: lot.k1,
    k2: lot.k2,
    kout: lot.kout,
    alpha: lot.alpha,
    c_eth: lot.c_eth,
    c_wat: lot.c_wat,
    loss_const: lot.loss_const,
    p_offset: lot.p_offset_lot,
  } : null

  const [pageTitle, pageSubtitle] = PAGE_COPY[pathname] || ['enCELL Master', '미세유체 실험 지원 시스템']
  const showTopDirection = pathname === '/inverse'

  return (
    <AppCtx.Provider value={{
      chip,
      device,
      lot,
      devices,
      lots,
      branch,
      setBranch,
      loadAll,
      loadChips: loadAll,
      loadingSetup,
      loadError,
    }}>
      <div className="shell">
        {mobileOpen && <button type="button" className="mobile-overlay" aria-label="메뉴 닫기" onClick={() => setMobileOpen(false)} />}

        <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
          <div className="sb-logo">
            <div className="sb-icon">e</div>
            <div>
              <div className="sb-name">enCELL Master</div>
              <div className="sb-sub">실험 예측·기록 시스템</div>
            </div>
            <button type="button" className="sidebar-close" aria-label="메뉴 닫기" onClick={() => setMobileOpen(false)}>×</button>
          </div>

          <div className="sidebar-section-title">실험 준비</div>
          <div className="sidebar-setup">
            <Dropdown
              label="사용 장비"
              items={devices}
              selected={device}
              onSelect={setDevice}
              idKey="device_id"
              nameKey="display_name"
              loading={loadingSetup}
            />
            <Dropdown
              label="카트리지 로트"
              items={lots}
              selected={lot}
              onSelect={setLot}
              idKey="lot_id"
              nameKey="display_name"
              loading={loadingSetup}
            />

            <div className={`backend-state${loadError ? ' error' : ''}`}>
              <span />
              {loadingSetup ? '연결 확인 중' : loadError || '백엔드 연결됨'}
              <button type="button" onClick={loadAll}>새로고침</button>
            </div>
          </div>

          <div className="sidebar-section-title">메뉴</div>
          <nav className="sb-nav">
            {NAV.map(({ href, icon, label, admin }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item${pathname === href ? ' active' : ''}`}
              >
                <span className="nav-ic" aria-hidden="true">{icon}</span>
                <span className="nav-copy">
                  <strong>{label}</strong>
                  {admin && <small>관리자</small>}
                </span>
              </Link>
            ))}
          </nav>

          {lot && (
            <details className="sidebar-details">
              <summary>선택 정보 보기</summary>
              <div className="sidebar-details-body">
                <div><span>로트</span><strong>{lot.lot_id}</strong></div>
                <div><span>장비</span><strong>{device?.device_id || '—'}</strong></div>
                <div><span>K1 / K2</span><strong>{lot.k1?.toFixed(2) ?? '—'} / {lot.k2?.toFixed(2) ?? '—'}</strong></div>
                <div><span>Kout</span><strong>{lot.kout?.toFixed(2) ?? '—'}</strong></div>
              </div>
            </details>
          )}
        </aside>

        <div className="main">
          <header className="topbar">
            <div className="topbar-title-wrap">
              <button type="button" className="mobile-menu-button" aria-label="메뉴 열기" onClick={() => setMobileOpen(true)}>☰</button>
              <div>
                <div className="page-h">{pageTitle}</div>
                <div className="page-s">{pageSubtitle}</div>
              </div>
            </div>

            {showTopDirection && (
              <div className="top-direction-control">
                {Object.entries(BRANCH).map(([code, item]) => (
                  <button
                    type="button"
                    key={code}
                    className={branch === code ? 'active' : ''}
                    onClick={() => setBranch(code)}
                  >
                    <strong>{item.direction}</strong>
                    <span>{code}</span>
                  </button>
                ))}
              </div>
            )}
          </header>

          <main className="page-scroll">{children}</main>
        </div>
      </div>
    </AppCtx.Provider>
  )
}
