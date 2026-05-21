'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/components/Shell'
import { api } from '@/lib/client'

function Field({ label, id, value, onChange, step = '0.0001' }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" value={value} onChange={e => onChange(e.target.value)} step={step} />
    </div>
  )
}

export default function CalibrationPage() {
  const { chip, loadChips } = useApp()
  const [f, setF] = useState({ k1:'', k2:'', kout:'', alpha:'', c_eth:'', c_wat:'', loss_const:'', p_offset:'' })
  const set = k => v => setF(prev => ({ ...prev, [k]: v }))
  const [saving, setSaving] = useState(false)
  const [devOpen, setDev] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (chip) setF({ k1: chip.k1, k2: chip.k2, kout: chip.kout, alpha: chip.alpha, c_eth: chip.c_eth, c_wat: chip.c_wat, loss_const: chip.loss_const, p_offset: chip.p_offset })
  }, [chip])

  async function save() {
    if (!chip) return
    setSaving(true); setMsg('')
    try {
      await api.post('/update_params', { chip_id: chip.chip_id, ...Object.fromEntries(Object.entries(f).map(([k,v])=>[k,+v])) })
      await loadChips(); setMsg('✓ 저장 완료')
    } catch (e) { setMsg('실패: ' + e.message) }
    finally { setSaving(false) }
  }

  async function dev(path, label) {
    setMsg(`${label} 실행 중…`)
    try { await api.post(path, { chip_id: chip?.chip_id }); setMsg(`✓ ${label} 완료`) }
    catch (e) { setMsg('실패: ' + e.message) }
  }

  return (
    <div className="page-content">
      {msg && <div className="err-bar" style={{ background:'rgba(52,211,153,.08)', borderColor:'rgba(52,211,153,.3)', color:'var(--green)' }}>{msg}</div>}
      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">파라미터 수동 수정</span></div>
          <div className="panel-body">
            <div className="field-row-2">
              <Field label="k1"         id="k1"   value={f.k1}        onChange={set('k1')} />
              <Field label="k2"         id="k2"   value={f.k2}        onChange={set('k2')} />
              <Field label="kout"       id="kout" value={f.kout}      onChange={set('kout')} />
              <Field label="alpha"      id="al"   value={f.alpha}     onChange={set('alpha')} />
              <Field label="c_eth"      id="ce"   value={f.c_eth}     onChange={set('c_eth')} step="0.000001" />
              <Field label="c_wat"      id="cw"   value={f.c_wat}     onChange={set('c_wat')} step="0.000001" />
              <Field label="loss_const" id="lc"   value={f.loss_const}onChange={set('loss_const')} />
              <Field label="p_offset"   id="po"   value={f.p_offset}  onChange={set('p_offset')} />
            </div>
            <div className="btn-row">
              <button className="btn btn-p" onClick={save} disabled={saving}>{saving ? '저장 중…' : '💾  저장'}</button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-title">개발자 기능</span></div>
          <div className="panel-body">
            <label className="dev-toggle">
              <input type="checkbox" checked={devOpen} onChange={e => setDev(e.target.checked)} /> 기능 표시
            </label>
            {devOpen && (
              <div className="dev-sec open">
                <button className="btn btn-g full" onClick={() => dev('/fine_tune_model','Fine-tune')}>🧠 Fine-tune</button>
                <button className="btn btn-g full" onClick={() => dev('/auto_calibrate','Auto Calibrate')}>⚙️ Auto Calibrate</button>
                <button className="btn btn-g full" onClick={() => dev('/calibrate_hydrostatic','수두압 보정')}>⚖️ 수두압 보정</button>
                <button className="btn btn-g full danger" onClick={() => { if(confirm('마스터 재학습?')) dev('/retrain_master','재학습') }}>🔁 마스터 재학습</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
