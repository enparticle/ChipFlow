'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/Shell'
import { api } from '@/lib/client'

function Field({ label, id, value, onChange, step = '0.0001', min, max }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        step={step}
        min={min}
        max={max}
      />
    </div>
  )
}

function fmt(value, digits = 1) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits) : '—'
}

function signed(value, digits = 1) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`
}

function isActiveOffset(offset) {
  return Number(offset.enabled) === 1 && Number(offset.approved) === 1
}

function OffsetCard({ offset, onApprove, onDisable, busy }) {
  const active = isActiveOffset(offset)

  return (
    <article className={`admin-offset-card${active ? ' active' : ''}`}>
      <div className="admin-offset-head">
        <div className="meta-row">
          <span className={active ? 'badge badge-cyan' : 'badge badge-gray'}>
            {active ? '적용 중' : '적용 대기'}
          </span>
          <span className="badge badge-blue">ID {offset.id}</span>
          <span className="badge badge-gray">{offset.scope_type || '—'}</span>
          <span className="badge badge-gray">{offset.branch || '—'}</span>
          <span className="badge badge-gray">{offset.pressure_band || '—'}</span>
          <span className="badge badge-gray">{offset.condition_type || '—'}</span>
        </div>

        <div className="admin-offset-actions">
          {!active && (
            <button className="btn btn-p" type="button" onClick={() => onApprove(offset.id)} disabled={busy}>
              보정값 적용
            </button>
          )}
          {active && (
            <button className="btn btn-g danger" type="button" onClick={() => onDisable(offset.id)} disabled={busy}>
              사용 중지
            </button>
          )}
        </div>
      </div>

      <div className="admin-condition-line">
        조건 <strong>{offset.condition_key || '—'}</strong>
      </div>

      <div className="q-row">
        <div className="q-item">
          <div className="q-label">T1 보정량</div>
          <div className="q-val">{signed(offset.t1_offset_uL)} µL</div>
        </div>
        <div className="q-item">
          <div className="q-label">T2 보정량</div>
          <div className="q-val">{signed(offset.t2_offset_uL)} µL</div>
        </div>
        <div className="q-item">
          <div className="q-label">사용 데이터</div>
          <div className="q-val">{offset.n_used ?? '—'} / {offset.n_samples ?? '—'}</div>
        </div>
      </div>

      <div className="q-row">
        <div className="q-item">
          <div className="q-label">T1 평균 오차</div>
          <div className="q-val">{fmt(offset.mae_t1_before_uL)} → {fmt(offset.mae_t1_after_uL)} µL</div>
        </div>
        <div className="q-item">
          <div className="q-label">T2 평균 오차</div>
          <div className="q-val">{fmt(offset.mae_t2_before_uL)} → {fmt(offset.mae_t2_after_uL)} µL</div>
        </div>
        <div className="q-item">
          <div className="q-label">승인 / 사용 상태</div>
          <div className="q-val">{offset.approved ?? 0} / {offset.enabled ?? 0}</div>
        </div>
      </div>

      {offset.notes && <div className="admin-offset-note">메모: {offset.notes}</div>}
    </article>
  )
}

export default function CalibrationPage() {
  const { chip, loadChips } = useApp()
  const [form, setForm] = useState({
    k1: '', k2: '', kout: '', alpha: '', c_eth: '', c_wat: '', loss_const: '', p_offset: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [legacyOpen, setLegacyOpen] = useState(false)
  const [offsets, setOffsets] = useState([])
  const [offsetLoading, setOffsetLoading] = useState(false)
  const [offsetBusy, setOffsetBusy] = useState(false)
  const [minSamples, setMinSamples] = useState('3')
  const [scope, setScope] = useState('condition')

  const set = key => value => setForm(prev => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (!chip) return
    setForm({
      k1: chip.k1 ?? '',
      k2: chip.k2 ?? '',
      kout: chip.kout ?? '',
      alpha: chip.alpha ?? '',
      c_eth: chip.c_eth ?? '',
      c_wat: chip.c_wat ?? '',
      loss_const: chip.loss_const ?? '',
      p_offset: chip.p_offset ?? '',
    })
  }, [chip])

  const showMessage = useCallback((text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
  }, [])

  const loadOffsets = useCallback(async () => {
    setOffsetLoading(true)
    try {
      const out = await api.get('/calibration/offsets?limit=100')
      setOffsets(Array.isArray(out) ? out : [])
    } catch (e) {
      showMessage('보정값 목록을 불러오지 못했습니다: ' + e.message, 'error')
    } finally {
      setOffsetLoading(false)
    }
  }, [showMessage])

  useEffect(() => { loadOffsets() }, [loadOffsets])

  const activeOffsets = useMemo(() => offsets.filter(isActiveOffset), [offsets])
  const candidateOffsets = useMemo(() => offsets.filter(offset => !isActiveOffset(offset)), [offsets])

  async function saveParameters() {
    if (!chip) return
    if (!confirm('현재 로트의 물리 파라미터를 변경하시겠습니까? 일반 실험자는 변경하지 않는 것을 권장합니다.')) return

    setSaving(true)
    setMessage('')
    try {
      await api.post('/update_params', {
        chip_id: chip.chip_id,
        ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, +value])),
      })
      await loadChips()
      showMessage('칩 파라미터를 저장했습니다.')
    } catch (e) {
      showMessage('파라미터 저장 실패: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function recomputeCandidates() {
    if (!confirm('유효한 실험 기록으로 보정 후보를 다시 계산하시겠습니까? 기존 적용 중인 보정값은 유지됩니다.')) return

    setOffsetBusy(true)
    setMessage('')
    try {
      const out = await api.post('/calibration/recompute', {
        scope,
        min_samples: Number(minSamples),
        auto_approve: false,
      })
      const ids = out.inserted_candidate_ids || []
      showMessage(`보정 후보 계산 완료. 생성된 후보: ${ids.length ? ids.join(', ') : '없음'}`)
      await loadOffsets()
    } catch (e) {
      showMessage('보정 후보 계산 실패: ' + e.message, 'error')
    } finally {
      setOffsetBusy(false)
    }
  }

  async function approveOffset(id) {
    if (!id) return
    if (!confirm(`보정값 ID ${id}를 실제 예측에 적용하시겠습니까? 다음 예측부터 즉시 반영됩니다.`)) return

    setOffsetBusy(true)
    setMessage('')
    try {
      await api.post('/calibration/approve', { id })
      showMessage(`보정값 ID ${id}를 적용했습니다.`)
      await loadOffsets()
    } catch (e) {
      showMessage('보정값 적용 실패: ' + e.message, 'error')
    } finally {
      setOffsetBusy(false)
    }
  }

  async function disableOffset(id) {
    if (!id) return
    if (!confirm(`보정값 ID ${id} 사용을 중지하시겠습니까? 다음 예측부터 기본 모델을 사용합니다.`)) return

    setOffsetBusy(true)
    setMessage('')
    try {
      await api.post('/calibration/disable', { id })
      showMessage(`보정값 ID ${id} 사용을 중지했습니다.`)
      await loadOffsets()
    } catch (e) {
      showMessage('보정값 사용 중지 실패: ' + e.message, 'error')
    } finally {
      setOffsetBusy(false)
    }
  }

  async function runLegacy(path, label) {
    showMessage(`${label} 실행 중…`)
    try {
      await api.post(path, { chip_id: chip?.chip_id })
      showMessage(`${label} 실행 완료.`)
    } catch (e) {
      showMessage(`${label} 실행 실패: ${e.message}`, 'error')
    }
  }

  return (
    <div className="page-content admin-page">
      <section className="experiment-hero admin-hero">
        <div>
          <span className="eyebrow">관리자 전용</span>
          <h1>보정값 관리</h1>
          <p>실험 데이터로 생성된 보정 후보를 검토하고 적용하거나 중지합니다.</p>
        </div>
        <button className="btn btn-g" type="button" onClick={loadOffsets} disabled={offsetLoading}>
          {offsetLoading ? '불러오는 중…' : '목록 새로고침'}
        </button>
      </section>

      {message && <div className={`notice-box ${messageType === 'error' ? 'danger' : 'success'}`}>{message}</div>}

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><span className="panel-title">보정 후보 계산</span></div>
          <div className="panel-body">
            <p className="admin-help">유효한 실험 기록을 기준으로 새로운 보정 후보를 계산합니다. 후보는 자동 적용되지 않습니다.</p>
            <div className="field-row-2">
              <div className="field">
                <label htmlFor="scope">보정 범위</label>
                <select id="scope" value={scope} onChange={e => setScope(e.target.value)}>
                  <option value="condition">동일 조건</option>
                  <option value="family">유사 조건군</option>
                </select>
              </div>
              <Field label="최소 실험 수" id="minSamples" value={minSamples} onChange={setMinSamples} min="1" step="1" />
            </div>
            <div className="btn-row">
              <button className="btn btn-p" type="button" onClick={recomputeCandidates} disabled={offsetBusy}>
                {offsetBusy ? '계산 중…' : '보정 후보 다시 계산'}
              </button>
            </div>
            <div className="admin-warning">적용 중인 보정값은 예측 결과에 즉시 반영됩니다. 변경 전 조건과 오차 지표를 확인하세요.</div>
          </div>
        </section>

        <details className="panel admin-parameter-panel">
          <summary className="panel-head"><span className="panel-title">칩 파라미터 직접 수정</span><span>고급 설정</span></summary>
          <div className="panel-body">
            <p className="admin-help">현재 로트: <strong>{chip?.chip_id || '선택되지 않음'}</strong>. 검증된 값이 아니라면 변경하지 마세요.</p>
            <div className="field-row-2">
              <Field label="k1" id="k1" value={form.k1} onChange={set('k1')} />
              <Field label="k2" id="k2" value={form.k2} onChange={set('k2')} />
              <Field label="kout" id="kout" value={form.kout} onChange={set('kout')} />
              <Field label="alpha" id="alpha" value={form.alpha} onChange={set('alpha')} />
              <Field label="c_eth" id="cEth" value={form.c_eth} onChange={set('c_eth')} step="0.000001" />
              <Field label="c_wat" id="cWat" value={form.c_wat} onChange={set('c_wat')} step="0.000001" />
              <Field label="loss_const" id="lossConst" value={form.loss_const} onChange={set('loss_const')} />
              <Field label="p_offset" id="pOffset" value={form.p_offset} onChange={set('p_offset')} />
            </div>
            <div className="btn-row">
              <button className="btn btn-g danger" type="button" onClick={saveParameters} disabled={saving || !chip}>
                {saving ? '저장 중…' : '파라미터 저장'}
              </button>
            </div>
          </div>
        </details>
      </div>

      <section className="panel">
        <div className="panel-head">
          <span className="panel-title">현재 적용 중인 보정값</span>
          <span className="badge badge-cyan">{activeOffsets.length}개 적용 중</span>
        </div>
        <div className="panel-body admin-offset-list">
          {offsetLoading && <div className="empty-comparison">보정값을 불러오는 중…</div>}
          {!offsetLoading && activeOffsets.length === 0 && <div className="empty-comparison">현재 적용 중인 보정값이 없습니다.</div>}
          {activeOffsets.map(offset => (
            <OffsetCard key={`active-${offset.id}`} offset={offset} onApprove={approveOffset} onDisable={disableOffset} busy={offsetBusy} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <span className="panel-title">적용 대기 보정 후보</span>
          <span className="badge badge-gray">{candidateOffsets.length}개 후보</span>
        </div>
        <div className="panel-body admin-offset-list">
          {candidateOffsets.length === 0 && <div className="empty-comparison">적용 대기 중인 후보가 없습니다.</div>}
          {candidateOffsets.map(offset => (
            <OffsetCard key={`candidate-${offset.id}`} offset={offset} onApprove={approveOffset} onDisable={disableOffset} busy={offsetBusy} />
          ))}
        </div>
      </section>

      <details className="panel legacy-panel">
        <summary className="panel-head"><span className="panel-title">사용 중지된 기존 개발 기능</span><span>개발자 전용</span></summary>
        <div className="panel-body">
          <label className="dev-toggle">
            <input type="checkbox" checked={legacyOpen} onChange={e => setLegacyOpen(e.target.checked)} />
            기존 기능 버튼 표시
          </label>
          {legacyOpen && (
            <div className="dev-sec open">
              <p className="admin-help">현재 백엔드에서 사용하지 않는 기존 기능입니다. 보정 관리 또는 오프라인 재학습 절차를 사용하세요.</p>
              <button className="btn btn-g full" type="button" onClick={() => runLegacy('/fine_tune_model', '기존 Fine-tune')}>기존 Fine-tune</button>
              <button className="btn btn-g full" type="button" onClick={() => runLegacy('/auto_calibrate', '기존 Auto Calibrate')}>기존 Auto Calibrate</button>
              <button className="btn btn-g full" type="button" onClick={() => runLegacy('/calibrate_hydrostatic', '기존 정수압 보정')}>기존 정수압 보정</button>
              <button className="btn btn-g full danger" type="button" onClick={() => runLegacy('/retrain_master', '기존 전체 재학습')}>기존 전체 재학습</button>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
