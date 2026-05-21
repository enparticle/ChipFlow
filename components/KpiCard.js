'use client'
import { useCountUp } from '@/hooks/useCountUp'

export default function KpiCard({ label, valueUL, accent, delay = 0 }) {
  const mL = valueUL != null ? valueUL / 1000 : null
  const animated = useCountUp(mL, 4, 680)

  const accentStyle = {
    t1:  'linear-gradient(90deg,#3B82F6,#22D3EE)',
    t2:  'linear-gradient(90deg,#34D399,#6EE7B7)',
    tot: 'linear-gradient(90deg,#424D6B,#8B9AC8)',
  }

  return (
    <div className="kpi-item" style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi-accent" style={{ background: accentStyle[accent] }} />
      <div className="kpi-label">{label}</div>
      <div>
        <span className={`kpi-val${animated === null ? ' empty' : ''}`}>
          {animated !== null ? animated.toFixed(4) : '—'}
        </span>
        {animated !== null && <span className="kpi-unit"> mL</span>}
      </div>
      <div className="kpi-sub">
        {valueUL != null ? `${valueUL.toFixed(1)} µL` : ''}
      </div>
    </div>
  )
}
