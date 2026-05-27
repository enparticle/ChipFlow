'use client'
import { useState } from 'react'
import { useApp } from '@/components/Shell'
import { api } from '@/lib/client'

function Field({ label, id, value, onChange, step, placeholder, type = 'number' }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {type === 'text'
        ? <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: 'var(--surface2)', border: '1px solid var(--b1)', borderRadius: 'var(--rs)', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', color: 'var(--t1)', outline: 'none', width: '100%' }} />
        : <input id={id} type="number" value={value} onChange={e => onChange(e.target.value)} step={step} placeholder={placeholder} />
      }
    </div>
  )
}

function Section({ title, color = 'var(--blue)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 14px' }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</div>
    </div>
  )
}

// ── Device 관리 ──────────────────────────────────────────
function DeviceManager({ devices, onRefresh }) {
  const [name,    setName]    = useState('')
  const [did,     setDid]     = useState('')
  const [poff,    setPoff]    = useState('0')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  async function add() {
    if (!did.trim() || !name.trim()) return setMsg('Device ID와 이름을 입력하세요')
    setSaving(true); setMsg('')
    try {
      await api.post('/devices', { device_id: did.trim(), display_name: name.trim(), p_offset_device: +poff })
      setMsg('✓ 장비 추가 완료'); setDid(''); setName(''); setPoff('0')
      onRefresh()
    } catch (e) { setMsg('실패: ' + e.message) }
    finally { setSaving(false) }
  }

  async function del(device_id) {
    if (!confirm(`"${device_id}" 장비를 삭제하시겠습니까?`)) return
    try { await api.delete(`/devices/${device_id}`); onRefresh() }
    catch (e) { setMsg('삭제 실패: ' + e.message) }
  }

  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Device 장비 관리</span></div>
      <div className="panel-body">
        {msg && <div className="err-bar" style={msg.startsWith('✓') ? { background: 'var(--green-bg)', borderColor: 'rgba(22,163,74,.2)', color: 'var(--green)', marginBottom: 12 } : { marginBottom: 12 }}>{msg}</div>}

        {/* 목록 */}
        <Section title="등록된 장비" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {devices.length === 0 && <div style={{ fontSize: 13, color: 'var(--t3)' }}>등록된 장비 없음</div>}
          {devices.map(d => (
            <div key={d.device_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--b1)', borderRadius: 'var(--rs)', padding: '10px 14px' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{d.display_name}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, fontFamily: 'DM Mono,monospace' }}>
                  ID: {d.device_id} · P_offset: {d.p_offset_device}
                </div>
              </div>
              {d.device_id !== 'DEVICE_DEFAULT' && (
                <button className="btn btn-g" style={{ padding: '5px 12px', fontSize: 12, color: 'var(--red)', borderColor: 'rgba(220,38,38,.2)' }}
                  onClick={() => del(d.device_id)}>삭제</button>
              )}
            </div>
          ))}
        </div>

        {/* 추가 폼 */}
        <Section title="새 장비 추가" color="var(--green)" />
        <div className="field-row-3" style={{ marginBottom: 10 }}>
          <Field label="Device ID" id="did" value={did} onChange={setDid} type="text" placeholder="예: DEVICE_A" />
          <Field label="장비 이름" id="dname" value={name} onChange={setName} type="text" placeholder="예: 실험실 장비 A" />
          <Field label="P_offset_device" id="dpoff" value={poff} onChange={setPoff} step="0.01" />
        </div>
        <button className="btn btn-p" onClick={add} disabled={saving}>
          {saving ? '추가 중…' : '+ 장비 추가'}
        </button>
      </div>
    </div>
  )
}

// ── Lot 관리 ─────────────────────────────────────────────
function LotManager({ lots, onRefresh }) {
  const empty = { lot_id:'', display_name:'', k1:'9.0', k2:'14.8', kout:'10.0', alpha:'1.12', c_eth:'0.0045', c_wat:'0.0055', loss_const:'0.18', p_offset_lot:'0.0' }
  const [form,    setForm]    = useState(empty)
  const [editing, setEditing] = useState(null) // lot_id being edited
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  const setF = k => v => setForm(f => ({ ...f, [k]: v }))

  async function add() {
    if (!form.lot_id.trim() || !form.display_name.trim()) return setMsg('Lot ID와 이름을 입력하세요')
    setSaving(true); setMsg('')
    try {
      await api.post('/lots', { ...form, ...Object.fromEntries(['k1','k2','kout','alpha','c_eth','c_wat','loss_const','p_offset_lot'].map(k => [k, +form[k]])) })
      setMsg('✓ 로트 추가 완료'); setForm(empty); onRefresh()
    } catch (e) { setMsg('실패: ' + e.message) }
    finally { setSaving(false) }
  }

  async function save(lot_id) {
    setSaving(true); setMsg('')
    try {
      await api.put(`/lots/${lot_id}`, { ...Object.fromEntries(['k1','k2','kout','alpha','c_eth','c_wat','loss_const','p_offset_lot'].map(k => [k, +form[k]])), display_name: form.display_name })
      setMsg('✓ 수정 완료'); setEditing(null); onRefresh()
    } catch (e) { setMsg('실패: ' + e.message) }
    finally { setSaving(false) }
  }

  async function del(lot_id) {
    if (!confirm(`"${lot_id}" 로트를 삭제하시겠습니까?`)) return
    try { await api.delete(`/lots/${lot_id}`); onRefresh() }
    catch (e) { setMsg('삭제 실패: ' + e.message) }
  }

  function startEdit(lot) {
    setEditing(lot.lot_id)
    setForm({ ...lot, p_offset_lot: lot.p_offset_lot ?? 0 })
  }

  const ParamFields = ({ f, setF }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 10 }}>
      {[['k1','K1','0.0001'],['k2','K2','0.0001'],['kout','Kout','0.0001'],['alpha','Alpha','0.0001'],
        ['c_eth','C_eth','0.000001'],['c_wat','C_wat','0.000001'],['loss_const','Loss','0.0001'],['p_offset_lot','P_offset_lot','0.01']
      ].map(([key, lbl, step]) => (
        <Field key={key} label={lbl} id={`lot_${key}`} value={f[key]} onChange={setF(key)} step={step} />
      ))}
    </div>
  )

  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Lot 카트리지 관리</span></div>
      <div className="panel-body">
        {msg && <div className="err-bar" style={msg.startsWith('✓') ? { background: 'var(--green-bg)', borderColor: 'rgba(22,163,74,.2)', color: 'var(--green)', marginBottom: 12 } : { marginBottom: 12 }}>{msg}</div>}

        {/* 목록 */}
        <Section title="등록된 로트" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {lots.length === 0 && <div style={{ fontSize: 13, color: 'var(--t3)' }}>등록된 로트 없음</div>}
          {lots.map(l => (
            <div key={l.lot_id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--b1)', borderRadius: editing === l.lot_id ? 'var(--rs) var(--rs) 0 0' : 'var(--rs)', padding: '10px 14px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{l.display_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, fontFamily: 'DM Mono,monospace' }}>
                    ID: {l.lot_id} · K1: {l.k1} · K2: {l.k2} · Kout: {l.kout}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-g" style={{ padding: '5px 12px', fontSize: 12 }}
                    onClick={() => editing === l.lot_id ? setEditing(null) : startEdit(l)}>
                    {editing === l.lot_id ? '닫기' : '수정'}
                  </button>
                  {l.lot_id !== 'EF1_LOT_DEFAULT' && (
                    <button className="btn btn-g" style={{ padding: '5px 12px', fontSize: 12, color: 'var(--red)', borderColor: 'rgba(220,38,38,.2)' }}
                      onClick={() => del(l.lot_id)}>삭제</button>
                  )}
                </div>
              </div>
              {/* 인라인 편집 */}
              {editing === l.lot_id && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--b1)', borderTop: 'none', borderRadius: '0 0 var(--rs) var(--rs)', padding: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Field label="표시 이름" id="edit_name" value={form.display_name} onChange={setF('display_name')} type="text" />
                  </div>
                  <ParamFields f={form} setF={setF} />
                  <div className="btn-row">
                    <button className="btn btn-p" onClick={() => save(l.lot_id)} disabled={saving}>{saving ? '저장 중…' : '💾 저장'}</button>
                    <button className="btn btn-g" onClick={() => setEditing(null)}>취소</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 추가 폼 */}
        <Section title="새 로트 추가" color="var(--green)" />
        <div className="field-row-2" style={{ marginBottom: 10 }}>
          <Field label="Lot ID" id="lid" value={form.lot_id} onChange={setF('lot_id')} type="text" placeholder="예: EF1_LOT_002" />
          <Field label="로트 이름" id="lname" value={form.display_name} onChange={setF('display_name')} type="text" placeholder="예: EF1 2차 로트" />
        </div>
        <ParamFields f={form} setF={setF} />
        <button className="btn btn-p" style={{ marginTop: 14 }} onClick={add} disabled={saving}>
          {saving ? '추가 중…' : '+ 로트 추가'}
        </button>
      </div>
    </div>
  )
}

// ── 페이지 ────────────────────────────────────────────────
export default function ManagePage() {
  const { devices, lots, loadAll } = useApp()
  return (
    <div className="page-content">
      <DeviceManager devices={devices} onRefresh={loadAll} />
      <LotManager    lots={lots}       onRefresh={loadAll} />
    </div>
  )
}
