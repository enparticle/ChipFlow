'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/Shell'
import { api } from '@/lib/client'

function Field({ label, id, value, onChange, step = '0.0001', min, max, type = 'number' }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        step={step}
        min={min}
        max={max}
      />
    </div>
  )
}

function fmt(v, digits = 1) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(digits) : '-'
}

function signed(v, digits = 1) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`
}

function isActiveOffset(o) {
  return Number(o.enabled) === 1 && Number(o.approved) === 1
}

function OffsetCard({ offset, onApprove, onDisable, busy }) {
  const active = isActiveOffset(offset)
  const condition = offset.condition_key || '-'

  return (
    <div
      style={{
        border: '1px solid var(--b1)',
        borderRadius: 14,
        padding: 14,
        background: active ? 'rgba(34, 197, 94, 0.07)' : 'rgba(148, 163, 184, 0.06)',
        display: 'grid',
        gap: 10,
      }}
    >
      <div className="meta-row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div className="meta-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className={active ? 'badge badge-cyan' : 'badge badge-gray'}>
            {active ? 'ACTIVE' : 'CANDIDATE'}
          </span>
          <span className="badge badge-blue">ID {offset.id}</span>
          <span className="badge badge-gray">{offset.scope_type || '-'}</span>
          <span className="badge badge-gray">{offset.branch || '-'}</span>
          <span className="badge badge-gray">{offset.pressure_band || '-'}</span>
          <span className="badge badge-gray">{offset.condition_type || '-'}</span>
        </div>

        <div className="meta-row" style={{ gap: 8 }}>
          {!active && (
            <button className="btn btn-p" onClick={() => onApprove(offset.id)} disabled={busy}>
              Approve
            </button>
          )}
          {active && (
            <button className="btn btn-g danger" onClick={() => onDisable(offset.id)} disabled={busy}>
              Disable
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--t2)' }}>
        Condition: <b>{condition}</b>
      </div>

      <div className="q-row">
        <div className="q-item">
          <div className="q-label">T1 offset</div>
          <div className="q-val">{signed(offset.t1_offset_uL)} 쨉L</div>
        </div>
        <div className="q-item">
          <div className="q-label">T2 offset</div>
          <div className="q-val">{signed(offset.t2_offset_uL)} 쨉L</div>
        </div>
        <div className="q-item">
          <div className="q-label">Samples</div>
          <div className="q-val">{offset.n_used ?? '-'} / {offset.n_samples ?? '-'}</div>
        </div>
      </div>

      <div className="q-row">
        <div className="q-item">
          <div className="q-label">MAE T1 before ??after</div>
          <div className="q-val">{fmt(offset.mae_t1_before_uL)} -&gt; {fmt(offset.mae_t1_after_uL)}</div>
        </div>
        <div className="q-item">
          <div className="q-label">MAE T2 before ??after</div>
          <div className="q-val">{fmt(offset.mae_t2_before_uL)} -&gt; {fmt(offset.mae_t2_after_uL)}</div>
        </div>
        <div className="q-item">
          <div className="q-label">Approved / Enabled</div>
          <div className="q-val">{offset.approved ?? 0} / {offset.enabled ?? 0}</div>
        </div>
      </div>

      {offset.notes && (
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>
          Notes: {offset.notes}
        </div>
      )}
    </div>
  )
}

export default function CalibrationPage() {
  const { chip, loadChips } = useApp()

  const [f, setF] = useState({
    k1: '',
    k2: '',
    kout: '',
    alpha: '',
    c_eth: '',
    c_wat: '',
    loss_const: '',
    p_offset: '',
  })

  const set = k => v => setF(prev => ({ ...prev, [k]: v }))

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [devOpen, setDevOpen] = useState(false)

  const [offsets, setOffsets] = useState([])
  const [offsetLoading, setOffsetLoading] = useState(false)
  const [offsetBusy, setOffsetBusy] = useState(false)
  const [minSamples, setMinSamples] = useState('3')
  const [scope, setScope] = useState('condition')

  useEffect(() => {
    if (chip) {
      setF({
        k1: chip.k1 ?? '',
        k2: chip.k2 ?? '',
        kout: chip.kout ?? '',
        alpha: chip.alpha ?? '',
        c_eth: chip.c_eth ?? '',
        c_wat: chip.c_wat ?? '',
        loss_const: chip.loss_const ?? '',
        p_offset: chip.p_offset ?? '',
      })
    }
  }, [chip])

  const loadOffsets = useCallback(async () => {
    setOffsetLoading(true)
    try {
      const out = await api.get('/calibration/offsets?limit=100')
      setOffsets(Array.isArray(out) ? out : [])
    } catch (e) {
      setMsg('Offset load failed: ' + e.message)
    } finally {
      setOffsetLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOffsets()
  }, [loadOffsets])

  const activeOffsets = useMemo(
    () => offsets.filter(isActiveOffset),
    [offsets]
  )

  const candidateOffsets = useMemo(
    () => offsets.filter(o => !isActiveOffset(o)),
    [offsets]
  )

  async function save() {
    if (!chip) return
    setSaving(true)
    setMsg('')
    try {
      await api.post('/update_params', {
        chip_id: chip.chip_id,
        ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, +v])),
      })
      await loadChips()
      setMsg('Saved chip parameters.')
    } catch (e) {
      setMsg('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function recomputeCandidates() {
    setOffsetBusy(true)
    setMsg('')
    try {
      const out = await api.post('/calibration/recompute', {
        scope,
        min_samples: Number(minSamples),
        auto_approve: false,
      })
      setMsg(`Candidate recompute complete. Inserted IDs: ${(out.inserted_candidate_ids || []).join(', ') || 'none'}`)
      await loadOffsets()
    } catch (e) {
      setMsg('Candidate recompute failed: ' + e.message)
    } finally {
      setOffsetBusy(false)
    }
  }

  async function approveOffset(id) {
    if (!id) return
    setOffsetBusy(true)
    setMsg('')
    try {
      await api.post('/calibration/approve', { id })
      setMsg(`Approved offset ID ${id}.`)
      await loadOffsets()
    } catch (e) {
      setMsg('Approve failed: ' + e.message)
    } finally {
      setOffsetBusy(false)
    }
  }

  async function disableOffset(id) {
    if (!id) return
    if (!confirm(`Disable offset ID ${id}?`)) return
    setOffsetBusy(true)
    setMsg('')
    try {
      await api.post('/calibration/disable', { id })
      setMsg(`Disabled offset ID ${id}.`)
      await loadOffsets()
    } catch (e) {
      setMsg('Disable failed: ' + e.message)
    } finally {
      setOffsetBusy(false)
    }
  }

  async function dev(path, label) {
    setMsg(`${label} running...`)
    try {
      await api.post(path, { chip_id: chip?.chip_id })
      setMsg(`${label} complete.`)
    } catch (e) {
      setMsg('Failed: ' + e.message)
    }
  }

  return (
    <div className="page-content">
      {msg && (
        <div
          className="err-bar"
          style={{
            background: 'rgba(52,211,153,.08)',
            borderColor: 'rgba(52,211,153,.3)',
            color: 'var(--green)',
          }}
        >
          {msg}
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Manual Chip Parameter Update</span>
          </div>
          <div className="panel-body">
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
              Current chip: <b>{chip?.chip_id || 'none selected'}</b>
            </div>

            <div className="field-row-2">
              <Field label="k1" id="k1" value={f.k1} onChange={set('k1')} />
              <Field label="k2" id="k2" value={f.k2} onChange={set('k2')} />
              <Field label="kout" id="kout" value={f.kout} onChange={set('kout')} />
              <Field label="alpha" id="alpha" value={f.alpha} onChange={set('alpha')} />
              <Field label="c_eth" id="c_eth" value={f.c_eth} onChange={set('c_eth')} step="0.000001" />
              <Field label="c_wat" id="c_wat" value={f.c_wat} onChange={set('c_wat')} step="0.000001" />
              <Field label="loss_const" id="loss_const" value={f.loss_const} onChange={set('loss_const')} />
              <Field label="p_offset" id="p_offset" value={f.p_offset} onChange={set('p_offset')} />
            </div>

            <div className="btn-row">
              <button className="btn btn-p" onClick={save} disabled={saving || !chip}>
                {saving ? 'Saving...' : 'Save Parameters'}
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Calibration Candidate Tools</span>
          </div>
          <div className="panel-body">
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
              Recompute condition-level or family-level offset candidates from valid calibration observations.
            </div>

            <div className="field-row-2">
              <div className="field">
                <label htmlFor="scope">Scope</label>
                <select id="scope" value={scope} onChange={e => setScope(e.target.value)}>
                  <option value="condition">condition</option>
                  <option value="family">family</option>
                </select>
              </div>

              <Field
                label="Minimum samples"
                id="minSamples"
                value={minSamples}
                onChange={setMinSamples}
                min="1"
                step="1"
              />
            </div>

            <div className="btn-row">
              <button className="btn btn-p" onClick={recomputeCandidates} disabled={offsetBusy}>
                {offsetBusy ? 'Running...' : 'Recompute Candidates'}
              </button>
              <button className="btn btn-g" onClick={loadOffsets} disabled={offsetLoading}>
                {offsetLoading ? 'Loading...' : 'Refresh Offsets'}
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--t3)' }}>
              Active offsets affect /predict immediately. Disable is available for rollback.
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <span className="panel-title">Active Calibration Offsets</span>
          <div className="meta-row">
            <span className="badge badge-cyan">{activeOffsets.length} active</span>
          </div>
        </div>

        <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
          {offsetLoading && <div style={{ color: 'var(--t2)' }}>Loading offsets...</div>}
          {!offsetLoading && activeOffsets.length === 0 && (
            <div style={{ color: 'var(--t2)' }}>No active offsets.</div>
          )}
          {activeOffsets.map(o => (
            <OffsetCard
              key={`active-${o.id}`}
              offset={o}
              onApprove={approveOffset}
              onDisable={disableOffset}
              busy={offsetBusy}
            />
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <span className="panel-title">Candidate / Recent Offsets</span>
          <div className="meta-row">
            <span className="badge badge-gray">{candidateOffsets.length} candidate</span>
          </div>
        </div>

        <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
          {candidateOffsets.length === 0 && (
            <div style={{ color: 'var(--t2)' }}>No pending candidates.</div>
          )}

          {candidateOffsets.map(o => (
            <OffsetCard
              key={`candidate-${o.id}`}
              offset={o}
              onApprove={approveOffset}
              onDisable={disableOffset}
              busy={offsetBusy}
            />
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <span className="panel-title">Legacy Developer Functions</span>
        </div>

        <div className="panel-body">
          <label className="dev-toggle">
            <input
              type="checkbox"
              checked={devOpen}
              onChange={e => setDevOpen(e.target.checked)}
            />
            Show disabled legacy tools
          </label>

          {devOpen && (
            <div className="dev-sec open">
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 10 }}>
                These endpoints are intentionally disabled or legacy. Use calibration offsets and offline retrain pipeline instead.
              </div>

              <button className="btn btn-g full" onClick={() => dev('/fine_tune_model', 'Fine-tune')}>
                Fine-tune
              </button>
              <button className="btn btn-g full" onClick={() => dev('/auto_calibrate', 'Auto Calibrate')}>
                Auto Calibrate
              </button>
              <button className="btn btn-g full" onClick={() => dev('/calibrate_hydrostatic', 'Hydrostatic calibration')}>
                Hydrostatic calibration
              </button>
              <button
                className="btn btn-g full danger"
                onClick={() => {
                  if (confirm('Run legacy retrain endpoint? This is disabled in current backend.')) {
                    dev('/retrain_master', 'Retrain master')
                  }
                }}
              >
                Retrain master
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
