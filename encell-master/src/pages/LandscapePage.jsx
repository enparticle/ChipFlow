import { useEffect, useRef, useState } from 'react'
import Topbar from '../components/Topbar'
import { api } from '../lib/client'

function Field({ label, id, value, onChange, step = '1', children }) {
  if (children) return (
    <div className="field"><label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>{children}</select>
    </div>
  )
  return (
    <div className="field"><label htmlFor={id}>{label}</label>
      <input id={id} type="number" value={value} onChange={e => onChange(e.target.value)} step={step}/>
    </div>
  )
}

export default function LandscapePage({ chip }) {
  const plotRef = useRef(null)
  const [port, setPort]   = useState('q1')
  const [res, setRes]     = useState('20')
  const [pmin, setPmin]   = useState('0')
  const [pmax, setPmax]   = useState('600')
  const [temp, setTemp]   = useState('24')
  const [lm1, setLm1]    = useState('15')
  const [lm2, setLm2]    = useState('15')
  const [loading, setLoading] = useState(false)
  const [error, setError]    = useState('')

  // load Plotly from CDN if not already present
  useEffect(() => {
    if (window.Plotly) return
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.30.0/plotly.min.js'
    document.head.appendChild(s)
  }, [])

  async function render() {
    if (!chip) return setError('칩을 먼저 선택하세요')
    setError(''); setLoading(true)
    try {
      const r = +res, mn = +pmin, mx = +pmax
      const grid = [], p1a = [], p2a = []
      for (let i = 0; i < r; i++) for (let j = 0; j < r; j++) {
        const v1 = mn + (mx - mn) * i / (r - 1)
        const v2 = mn + (mx - mn) * j / (r - 1)
        grid.push({ p1: v1, p2: v2, temp_device: +temp, m1_loading: +lm1, m2_loading: +lm2 })
        p1a.push(v1); p2a.push(v2)
      }
      const out = await api.post('/predict_batch', { chip_id: chip.chip_id, grid_data: grid })
      const z = [], p1g = [], p2g = []
      for (let i = 0; i < r; i++) {
        z.push([]); p1g.push([]); p2g.push([])
        for (let j = 0; j < r; j++) {
          z[i].push(out[port][i * r + j])
          p1g[i].push(p1a[i * r + j])
          p2g[i].push(p2a[i * r + j])
        }
      }
      window.Plotly?.newPlot(plotRef.current, [{
        type: 'surface', z, x: p1g, y: p2g,
        colorscale: [['0','#0D1117'],['0.5','#1D4ED8'],['1','#22D3EE']],
        opacity: 0.92,
        contours: { z: { show: true, usecolormap: true, project: { z: true } } },
      }], {
        paper_bgcolor: '#0D1117', plot_bgcolor: '#0D1117',
        scene: {
          xaxis: { title: 'P1 (kPa)', gridcolor: 'rgba(255,255,255,.07)', backgroundcolor: '#07090F', color: '#8B9AC8' },
          yaxis: { title: 'P2 (kPa)', gridcolor: 'rgba(255,255,255,.07)', backgroundcolor: '#07090F', color: '#8B9AC8' },
          zaxis: { title: `${port.toUpperCase()} (ml/min)`, gridcolor: 'rgba(255,255,255,.07)', color: '#8B9AC8' },
        },
        margin: { l: 0, r: 0, t: 36, b: 0 },
        font: { family: 'DM Mono,monospace', size: 11, color: '#8B9AC8' },
        title: { text: `${chip.chip_id} · ${port.toUpperCase()}`, font: { size: 14, color: '#F0F4FF' } },
      }, { responsive: true })
    } catch (e) { setError('실패: ' + e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="page-wrap">
      <Topbar title="3D Flow Landscape" sub="BATCH PREDICT · SURFACE VISUALIZATION" showBranch={false}/>
      <div className="page-content">
        {error && <div className="err-bar">{error}</div>}
        <div className="ls-controls">
          <div className="panel">
            <div className="panel-head"><span className="panel-title">시각화 설정</span></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="포트" id="port" value={port} onChange={setPort}>
                <option value="q1">Q1</option>
                <option value="q2">Q2</option>
                <option value="q3">Q3</option>
              </Field>
              <Field label="해상도" id="res" value={res} onChange={setRes} step="1"/>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">압력 범위 (kPa)</span></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="최솟값" id="pmin" value={pmin} onChange={setPmin}/>
              <Field label="최댓값" id="pmax" value={pmax} onChange={setPmax}/>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title">실험 조건</span></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="온도 (°C)" id="ltemp" value={temp} onChange={setTemp} step="0.1"/>
              <Field label="M1 (g)"   id="lm1"   value={lm1}  onChange={setLm1}  step="0.0001"/>
              <Field label="M2 (g)"   id="lm2"   value={lm2}  onChange={setLm2}  step="0.0001"/>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-p" onClick={render} disabled={loading}>
            {loading ? <><span className="spin on"/><span>렌더링 중…</span></> : '◈  3D 렌더링'}
          </button>
        </div>
        <div ref={plotRef} className="plot-div"/>
      </div>
    </div>
  )
}
