'use client'
import { useState } from 'react'
import { useApp } from '@/components/Shell'
import KpiCard from '@/components/KpiCard'
import { api, saveLog } from '@/lib/client'
import { BRANCH, D, calcVol, calcFlow } from '@/lib/constants'

function Field({ label, id, value, onChange, step = '0.1', min, max, style }) {
  return (
    <div className="field" style={style}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" value={value}
        onChange={e => onChange(e.target.value)}
        step={step} min={min} max={max} />
    </div>
  )
}

export default function ExperimentPage() {
  const { chip, device, lot, branch } = useApp()
  const lb = BRANCH[branch]

  const [p1, setP1]       = useState('223')
  const [p2, setP2]       = useState('200')
  const [m1, setM1]       = useState('15.0000')
  const [m2, setM2]       = useState('20.0000')
  const [tempD, setTempD] = useState('24')
  const [tempA, setTempA] = useState('25')
  const [dur, setDur]     = useState('10')
  const [tare, setTare]   = useState('5.4059')

  const [pred, setPred]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [m1f, setM1f]       = useState('')
  const [m2f, setM2f]       = useState('')
  const [m3f, setM3f]       = useState('')
  const [saving, setSaving] = useState(false)

  const cmp = (() => {
    if (!pred || !m1f || !m2f) return null
    const av1 = calcVol(+m1, +m1f, lb.d1)
    const av2 = calcVol(+m2, +m2f, lb.d2)
    return { av1, av2, avt: av1 + av2, d1: av1 - pred.fv1, d2: av2 - pred.fv2, dt: (av1 + av2) - pred.ft }
  })()

  async function runPredict() {
    if (!chip) return setError('칩을 먼저 선택하세요')
    setError(''); setLoading(true); setPred(null)
    try {
      const base = {
        chip_id: chip.chip_id, branch,
        device_id: device?.device_id,
        lot_id:    lot?.lot_id,
        p1: +p1, p2: +p2, p3: 0,
        duration: +dur, temp_device: +tempD,
        m1_loading: +m1, m2_loading: +m2,
      }
      const r0 = await api.post('/predict', base)
      const d  = +dur
      const r1 = await api.post('/predict', {
        ...base,
        m1_loading: +m1 - r0.q1 * lb.d1 * d / 60,
        m2_loading: +m2 - r0.q2 * lb.d2 * d / 60,
      })
      const q1 = (r0.q1 + r1.q1) / 2, q2 = (r0.q2 + r1.q2) / 2, q3 = (r0.q3 + r1.q3) / 2
      const fv1 = r0.final_volume1_uL ?? q1 * lb.d1 * d / 60 * 1000
      const fv2 = r0.final_volume2_uL ?? q2 * lb.d2 * d / 60 * 1000
      const ft  = r0.final_total_uL  ?? fv1 + fv2
      setPred({
        q1, q2, q3, fv1, fv2, ft,
        champion: r0.champion_name || '—',
        brR: r0.branch || branch,
        mode: r0.hybrid_mode || '—',
        band: r0.pressure_band || '—',
        condition: r0.condition_type || '-',
        targetTolerance: r0.target_tolerance_uL ?? null,
        calibration_applied: !!r0.calibration_applied,
        calibration_offset: r0.calibration_offset || null,
        v1: r0.v1, v2: r0.v2, v3: r0.v3,
        ps: r0.params_snapshot,
      })
      setM1f((+m1 - 0.1).toFixed(4))
      setM2f((+m2 - 0.1).toFixed(4))
      setM3f((+tare + 0.2).toFixed(4))
    } catch (e) {
      setError('예측 실패: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!pred || !chip) return
    setSaving(true)
    try {
      const ps = pred.ps || chip, d = +dur
      const av1 = calcVol(+m1, +m1f, lb.d1)
      const av2 = calcVol(+m2, +m2f, lb.d2)
      const payload = {
        chip_id: chip.chip_id,
        device_id: device?.device_id,
        lot_id: lot?.lot_id,
        timestamp: new Date().toISOString(),
        p1_set: +p1, p2_set: +p2, p3_set: 0, duration: d,
        temp_device: +tempD, temp_ambient: +tempA,
        m1_loading: +m1, m2_loading: +m2, m3_loading: +tare,
        m1_final: +m1f, m2_final: +m2f, m3_final: +m3f,
        k1: ps.k1, k2: ps.k2, kout: ps.kout, alpha: ps.alpha,
        c_eth: ps.c_eth, c_wat: ps.c_wat,
        loss_const: ps.loss_const, p_offset: ps.p_offset,
        q1_pred: pred.q1, q2_pred: pred.q2, q3_pred: pred.q3,
        q1_actual: calcFlow(+m1, +m1f, lb.d1, d),
        q2_actual: calcFlow(+m2, +m2f, lb.d2, d),
        q3_actual: calcFlow(+tare, +m3f, D.MIX, d),
        branch, champion_name: pred.champion,
        final_volume1_uL: pred.fv1, final_volume2_uL: pred.fv2, final_total_uL: pred.ft,
        act_volume1_uL: av1, act_volume2_uL: av2,
        fluid1: lb.T1, fluid2: lb.T2,
      }
      // 백엔드 SQLite + Supabase 동시 저장
      await Promise.all([
        api.post('/record', payload),
        saveLog(payload),
      ])
      alert('✓ 저장 완료')
      setPred(null); setM1f(''); setM2f(''); setM3f('')
    } catch (e) {
      alert('저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-content exp-layout">
      <div className="input-col">
        {error && <div className="err-bar">{error}</div>}

        <div className="panel">
          <div className="panel-head"><span className="panel-title">압력 설정</span></div>
          <div className="panel-body">
            <div className="field-row-2">
              <Field label={lb.p1} id="p1" value={p1} onChange={setP1} min="0" max="800" />
              <Field label={lb.p2} id="p2" value={p2} onChange={setP2} min="0" max="800" />
            </div>
            <div className="divider" />
            <div className="field-row-2">
              <Field label={lb.m1} id="m1" value={m1} onChange={setM1} step="0.0001" />
              <Field label={lb.m2} id="m2" value={m2} onChange={setM2} step="0.0001" />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-title">환경 설정</span></div>
          <div className="panel-body">
            <div className="field-row-3">
              <Field label="장비 온도 (°C)"  id="td" value={tempD} onChange={setTempD} />
              <Field label="환경 온도 (°C)"  id="ta" value={tempA} onChange={setTempA} />
              <Field label="실험 시간 (sec)" id="du" value={dur}   onChange={setDur} step="1" min="1" max="600" />
            </div>
            <div className="divider" />
            <Field label="Tare / M3 빈 비커 (g)" id="tare" value={tare} onChange={setTare} step="0.0001" style={{ maxWidth: 170 }} />
          </div>
        </div>

        <button className="btn btn-p btn-full" onClick={runPredict} disabled={loading}>
          {loading ? <><span className="spin on" /><span>예측 중…</span></> : '▶  예측 실행'}
        </button>
      </div>

      <div className="result-col">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">예측 결과 — Tube-wise Volume</span>
            {pred && (
              <div className="meta-row">
                <span className="badge badge-blue">🏆 {pred.champion}</span>
                <span className="badge badge-cyan">{pred.brR}</span>
                <span className="badge badge-gray">{pred.mode}</span>
                <span className="badge badge-gray">{pred.band}</span>
                {pred.condition && <span className="badge badge-gray">{pred.condition}</span>}
              </div>
            )}
          </div>
          <div className="kpi-grid">
            <KpiCard label={lb.c1} valueUL={pred?.fv1 ?? null} accent="t1"  delay={0} />
            <KpiCard label={lb.c2} valueUL={pred?.fv2 ?? null} accent="t2"  delay={120} />
            <KpiCard label="Total" valueUL={pred?.ft  ?? null} accent="tot" delay={240} />
          </div>
          <div className="q-section">
            <div className="sub-label">유량 참조 (ml/min)</div>
            <div className="q-row">
              {['Q1','Q2','Q3'].map((q, i) => {
                const v = pred ? [pred.q1, pred.q2, pred.q3][i] : null
                return (
                  <div className="q-item" key={q}>
                    <div className="q-label">{q}</div>
                    <div className={`q-val${v == null ? ' empty' : ''}`}>{v != null ? v.toFixed(4) : '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>
          {pred && (
            <div className="q-section" style={{ marginTop: 12 }}>
              <div className="sub-label">Calibration</div>

              {pred.calibration_applied && pred.calibration_offset ? (
                <div style={{
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  background: 'rgba(34, 197, 94, 0.08)',
                  borderRadius: 12,
                  padding: 12,
                  display: 'grid',
                  gap: 8
                }}>
                  <div className="meta-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <span className="badge badge-cyan">Calibration 적용됨</span>
                    <span className="badge badge-gray">ID {pred.calibration_offset.id}</span>
                    <span className="badge badge-gray">{pred.calibration_offset.scope_type}</span>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--t2)' }}>
                    조건: <b>{pred.calibration_offset.condition_key}</b>
                  </div>

                  <div className="q-row">
                    <div className="q-item">
                      <div className="q-label">T1 offset</div>
                      <div className="q-val">
                        {`${pred.calibration_offset.t1_offset_uL >= 0 ? '+' : ''}${(+pred.calibration_offset.t1_offset_uL).toFixed(1)} µL`}
                      </div>
                    </div>

                    <div className="q-item">
                      <div className="q-label">T2 offset</div>
                      <div className="q-val">
                        {`${pred.calibration_offset.t2_offset_uL >= 0 ? '+' : ''}${(+pred.calibration_offset.t2_offset_uL).toFixed(1)} µL`}
                      </div>
                    </div>

                    <div className="q-item">
                      <div className="q-label">Samples</div>
                      <div className="q-val">
                        {pred.calibration_offset.n_used ?? '-'} / {pred.calibration_offset.n_samples ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  border: '1px solid var(--b1)',
                  background: 'rgba(148, 163, 184, 0.08)',
                  borderRadius: 12,
                  padding: 12,
                  color: 'var(--t2)',
                  fontSize: 13
                }}>
                  <div className="meta-row" style={{ marginBottom: 6 }}>
                    <span className="badge badge-gray">Calibration 미적용</span>
                  </div>
                  이 조건에는 승인된 보정값이 없습니다. 기본 v8 예측값을 표시합니다.
                </div>
              )}
            </div>
          )}
        </div>

        {pred && (
          <div className="panel slide-in">
            <div className="panel-head"><span className="panel-title">실측 입력 및 비교</span></div>
            <div className="panel-body">
              <div className="sub-label">실측 최종 질량</div>
              <div className="field-row-3">
                <Field label={lb.m1f} id="m1f" value={m1f} onChange={setM1f} step="0.0001" />
                <Field label={lb.m2f} id="m2f" value={m2f} onChange={setM2f} step="0.0001" />
                <Field label="M3 최종 혼합 (g)" id="m3f" value={m3f} onChange={setM3f} step="0.0001" />
              </div>
            </div>
            <div className="cmp-grid">
              {[
                { head: lb.c1, act: cmp?.av1, prd: pred.fv1, d: cmp?.d1 },
                { head: lb.c2, act: cmp?.av2, prd: pred.fv2, d: cmp?.d2 },
                { head: 'Total', act: cmp?.avt, prd: pred.ft, d: cmp?.dt },
              ].map(({ head, act, prd, d }) => (
                <div className="cmp-item" key={head}>
                  <div className="cmp-head">{head}</div>
                  <div><span className="cmp-act">{act != null ? act.toFixed(1) : '—'}</span><span className="cmp-unit"> µL</span></div>
                  <div className="cmp-pred">예측 {prd.toFixed(1)} µL</div>
                  <div className={`cmp-delta ${d == null ? 'd-em' : Math.abs(d) < 50 ? 'd-ok' : 'd-bad'}`}>
                    {d != null ? `${d >= 0 ? '+' : ''}${d.toFixed(1)} µL` : '실측 대기'}
                  </div>
                </div>
              ))}
            </div>
            <div className="panel-body" style={{ borderTop: '1px solid var(--b1)' }}>
              <div className="btn-row">
                <button className="btn btn-p" onClick={handleSave} disabled={saving}>
                  {saving ? '저장 중…' : '💾  저장'}
                </button>
                <button className="btn btn-g" onClick={() => { setPred(null); setM1f(''); setM2f(''); setM3f('') }}>
                  새 실험
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
