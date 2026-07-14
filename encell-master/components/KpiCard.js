'use client'

export default function KpiCard({ label, valueUL, accent = 'tot', helper }) {
  const value = Number(valueUL)
  const hasValue = Number.isFinite(value)
  const ml = hasValue ? value / 1000 : null

  return (
    <div className={`friendly-kpi-card ${accent}`}>
      <div className="friendly-kpi-top">
        <span className={`friendly-kpi-dot ${accent}`} />
        <span>{label}</span>
      </div>
      <div className="friendly-kpi-value">
        <strong>{ml == null ? '—' : ml.toFixed(4)}</strong>
        {ml != null && <span>mL</span>}
      </div>
      <div className="friendly-kpi-helper">
        {helper && <span>{helper}</span>}
        {hasValue && <b>{value.toFixed(1)} µL</b>}
      </div>
    </div>
  )
}
