'use client'
import { useState } from 'react'
import { useApp } from '@/components/Shell'
import { api } from '@/lib/client'

function Field({ label, id, value, onChange, step = '0.1' }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" value={value} onChange={e => onChange(e.target.value)} step={step} />
    </div>
  )
}

const PRESETS = [{ l: '저속 2/2', q1: 2, q2: 2 }, { l: '표준 5/5', q1: 5, q2: 5 }, { l: '최대 10/10', q1: 10, q2: 10 }]

export default function InversePage() {
  const { chip, branch } = useApp()
  const [tq1, setTq1] = useState('5')
  const [tq2, setTq2] = useState('5')
  const [temp, setTemp] = useState('24')
  const [im1, setIm1] = useState('15')
  const [im2, setIm2] = useState('15')
  const [pmax, setPmax] = useState('600')
  const [res, setRes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (!chip) return setError('칩을 먼저 선택하세요')
    setError(''); setLoading(true)
    try {
      const r = await api.post('/solve_inverse', { chip_id: chip.chip_id, tq1: +tq1, tq2: +tq2, temp_device: +temp, m1_loading: +im1, m2_loading: +im2, p_max: +pmax, branch })
      setRes(r)
    } catch (e) { setError('실패: ' + e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="page-content">
      {error && <div className="err-bar">{error}</div>}
      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">목표 유량 설정</span></div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="preset-row">
              {PRESETS.map(p => (
                <button key={p.l} className="preset-btn" onClick={() => { setTq1(String(p.q1)); setTq2(String(p.q2)) }}>{p.l}</button>
              ))}
            </div>
            <div className="field-row-2">
              <Field label="목표 Q1 (ml/min)" id="tq1" value={tq1} onChange={setTq1} step="0.001" />
              <Field label="목표 Q2 (ml/min)" id="tq2" value={tq2} onChange={setTq2} step="0.001" />
            </div>
            <div className="divider" />
            <div className="field-row-3">
              <Field label="온도 (°C)"   id="it"  value={temp} onChange={setTemp} />
              <Field label="M1 질량 (g)" id="im1" value={im1}  onChange={setIm1}  step="0.0001" />
              <Field label="M2 질량 (g)" id="im2" value={im2}  onChange={setIm2}  step="0.0001" />
            </div>
            <Field label="최대 압력 (kPa)" id="pmax" value={pmax} onChange={setPmax} step="10" />
            <div className="btn-row" style={{ marginTop: 4 }}>
              <button className="btn btn-p" onClick={run} disabled={loading}>
                {loading ? <><span className="spin on" /><span>탐색 중…</span></> : '⇄  압력 탐색'}
              </button>
            </div>
          </div>
        </div>

        {res && (
          <div className="panel slide-in">
            <div className="panel-head"><span className="panel-title">탐색 결과</span></div>
            <div className="panel-body">
              <div className="res-strip">
                <div className="rs-item"><div className="rs-lbl">P1 권장</div><div className="rs-val">{(+res.p1).toFixed(2)} kPa</div></div>
                <div className="rs-item"><div className="rs-lbl">P2 권장</div><div className="rs-val">{(+res.p2).toFixed(2)} kPa</div></div>
                <div className="rs-item"><div className="rs-lbl">예상 Q1</div><div className="rs-val">{(+res.q1).toFixed(4)}</div></div>
                <div className="rs-item"><div className="rs-lbl">예상 Q2</div><div className="rs-val">{(+res.q2).toFixed(4)}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
