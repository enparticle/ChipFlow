'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/Shell'
import KpiCard from '@/components/KpiCard'
import DeviceCorrectionPreview from '@/components/DeviceCorrectionPreview'
import { api, saveLog } from '@/lib/client'
import { BRANCH, D, calcVol, calcFlow } from '@/lib/constants'

function NumberField({
  label,
  id,
  value,
  onChange,
  step = '0.1',
  min,
  max,
  unit,
  hint,
  error,
  disabled = false,
}) {
  return (
    <div className={`friendly-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-unit-wrap">
        <input
          id={id}
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          inputMode="decimal"
        />
        {unit && <span className="input-unit">{unit}</span>}
      </div>
      {error ? (
        <div className="field-message error">{error}</div>
      ) : hint ? (
        <div className="field-message">{hint}</div>
      ) : null}
    </div>
  )
}

function StepHeader({ number, title, description, status = 'idle' }) {
  const statusText = {
    idle: '',
    active: '진행 중',
    done: '완료',
  }[status]

  return (
    <div className="workflow-section-head">
      <span className={`step-number ${status}`}>{status === 'done' ? '✓' : number}</span>
      <div>
        <div className="workflow-title-row">
          <h2>{title}</h2>
          {statusText && <span className={`step-status ${status}`}>{statusText}</span>}
        </div>
        {description && <p>{description}</p>}
      </div>
    </div>
  )
}

function SelectionSummary({ label, value, sub }) {
  return (
    <div className="selection-summary-item">
      <span className="selection-summary-label">{label}</span>
      <strong>{value || '선택되지 않음'}</strong>
      {sub && <span className="selection-summary-sub">{sub}</span>}
    </div>
  )
}

function DifferenceStatus({ value, threshold = 50 }) {
  if (value == null) return <span className="result-status neutral">실측 대기</span>
  const okay = Math.abs(value) <= threshold
  return (
    <span className={`result-status ${okay ? 'ok' : 'review'}`}>
      {okay ? '정상 범위' : '확인 필요'}
    </span>
  )
}

function formatML(valueUL, digits = 4) {
  if (valueUL == null || !Number.isFinite(Number(valueUL))) return '—'
  return (Number(valueUL) / 1000).toFixed(digits)
}

function formatUL(valueUL, digits = 1) {
  if (valueUL == null || !Number.isFinite(Number(valueUL))) return '—'
  return Number(valueUL).toFixed(digits)
}

function finiteNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function averageNumber(a, b) {
  const aa = finiteNumber(a)
  const bb = finiteNumber(b)
  if (aa != null && bb != null) return (aa + bb) / 2
  return aa ?? bb ?? null
}

function firstDefined(...items) {
  return items.find(item => item !== undefined && item !== null)
}

function correctionValue(preview, channel) {
  const direct = finiteNumber(preview?.[`${channel}_correction`])
  if (direct != null) return direct
  return finiteNumber(preview?.[`${channel}_correction`]?.correction_mL_min)
}

function candidateValue(preview, channel) {
  return preview?.[`${channel}_candidate`] || (
    typeof preview?.[`${channel}_correction`] === 'object'
      ? preview?.[`${channel}_correction`]
      : null
  ) || null
}

function buildAveragedDevicePreview(startPreview, endPreview, q1RawAvg, q2RawAvg) {
  const base = startPreview?.available ? startPreview : endPreview?.available ? endPreview : null
  if (!base) return null

  const q1Correction = firstDefined(correctionValue(startPreview, 'q1'), correctionValue(endPreview, 'q1'))
  const q2Correction = firstDefined(correctionValue(startPreview, 'q2'), correctionValue(endPreview, 'q2'))

  const q1PreviewAvg = averageNumber(startPreview?.q1_preview, endPreview?.q1_preview)
  const q2PreviewAvg = averageNumber(startPreview?.q2_preview, endPreview?.q2_preview)

  return {
    ...base,
    available: true,
    applied: false,
    apply_to_predict: false,
    q1_candidate: firstDefined(candidateValue(startPreview, 'q1'), candidateValue(endPreview, 'q1')),
    q2_candidate: firstDefined(candidateValue(startPreview, 'q2'), candidateValue(endPreview, 'q2')),
    q1_correction: q1Correction,
    q2_correction: q2Correction,
    q1_preview: q1PreviewAvg ?? (q1Correction != null ? q1RawAvg + q1Correction : null),
    q2_preview: q2PreviewAvg ?? (q2Correction != null ? q2RawAvg + q2Correction : null),
  }
}

export default function ExperimentPage() {
  const { chip, device, lot, branch, setBranch } = useApp()
  const lb = BRANCH[branch]

  const [p1, setP1] = useState('223')
  const [p2, setP2] = useState('200')
  const [m1, setM1] = useState('15.0000')
  const [m2, setM2] = useState('20.0000')
  const [tempD, setTempD] = useState('24')
  const [tempA, setTempA] = useState('25')
  const [dur, setDur] = useState('20')
  const [tare, setTare] = useState('5.4059')

  const [pred, setPred] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [m1f, setM1f] = useState('')
  const [m2f, setM2f] = useState('')
  const [m3f, setM3f] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (pred) clearPrediction()
    // Device or lot changes invalidate the previous prediction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chip?.chip_id, device?.device_id, lot?.lot_id])

  function clearPrediction() {
    setPred(null)
    setM1f('')
    setM2f('')
    setM3f('')
    setSaveAttempted(false)
    setSaved(false)
    setSaveMessage('')
    setError('')
  }

  function updatePredictionInput(setter) {
    return value => {
      setter(value)
      if (pred) clearPrediction()
    }
  }

  function chooseBranch(nextBranch) {
    if (nextBranch === branch) return
    clearPrediction()
    setBranch(nextBranch)
  }

  const finalErrors = useMemo(() => {
    const errors = { m1: '', m2: '', m3: '' }
    const m1Initial = Number(m1)
    const m2Initial = Number(m2)
    const m3Initial = Number(tare)
    const m1Final = Number(m1f)
    const m2Final = Number(m2f)
    const m3Final = Number(m3f)

    if ((saveAttempted || m1f !== '') && m1f === '') errors.m1 = '최종 질량을 입력하세요.'
    if ((saveAttempted || m2f !== '') && m2f === '') errors.m2 = '최종 질량을 입력하세요.'

    if (m1f !== '' && Number.isFinite(m1Final) && m1Final >= m1Initial) {
      errors.m1 = '최종 질량은 초기 질량보다 작아야 합니다.'
    }
    if (m2f !== '' && Number.isFinite(m2Final) && m2Final >= m2Initial) {
      errors.m2 = '최종 질량은 초기 질량보다 작아야 합니다.'
    }
    if (m3f !== '' && Number.isFinite(m3Final) && m3Final <= m3Initial) {
      errors.m3 = '혼합 용기의 최종 질량이 초기값보다 작거나 같습니다. 값을 확인하세요.'
    }

    return errors
  }, [m1, m2, tare, m1f, m2f, m3f, saveAttempted])

  const cmp = useMemo(() => {
    if (!pred || !m1f || !m2f || finalErrors.m1 || finalErrors.m2) return null

    const av1 = calcVol(+m1, +m1f, lb.d1)
    const av2 = calcVol(+m2, +m2f, lb.d2)
    const avt = av1 + av2

    const co = pred.calibration_offset || null
    const off1 = pred.calibration_applied && co ? +(co.t1_offset_uL || 0) : 0
    const off2 = pred.calibration_applied && co ? +(co.t2_offset_uL || 0) : 0

    const rawFv1 = pred.fv1 - off1
    const rawFv2 = pred.fv2 - off2
    const rawFt = rawFv1 + rawFv2

    return {
      av1,
      av2,
      avt,
      d1: av1 - pred.fv1,
      d2: av2 - pred.fv2,
      dt: avt - pred.ft,
      rawFv1,
      rawFv2,
      rawFt,
      rawD1: av1 - rawFv1,
      rawD2: av2 - rawFv2,
      rawDt: avt - rawFt,
    }
  }, [pred, m1f, m2f, m1, m2, lb.d1, lb.d2, finalErrors.m1, finalErrors.m2])

  function validateSaveBeforeSubmit() {
    const issues = []
    const warnings = []

    const m1i = Number(m1)
    const m2i = Number(m2)
    const m3i = Number(tare)
    const m1Final = Number(m1f)
    const m2Final = Number(m2f)
    const m3Final = Number(m3f)
    const duration = Number(dur)

    if (!pred) issues.push('예상 결과를 먼저 계산하세요.')
    if (!chip) issues.push('카트리지 로트를 선택하세요.')
    if (!device) issues.push('장비를 선택하세요.')
    if (!branch) issues.push('유체 방향을 선택하세요.')
    if (!Number.isFinite(Number(p1)) || !Number.isFinite(Number(p2))) issues.push('압력 값을 확인하세요.')
    if (!Number.isFinite(duration) || duration <= 0) issues.push('실험 시간은 0보다 커야 합니다.')
    if (m1f === '' || m2f === '') issues.push('T1과 T2의 최종 질량을 모두 입력하세요.')
    if (!Number.isFinite(m1Final) || !Number.isFinite(m2Final)) issues.push('최종 질량 값을 확인하세요.')

    if (Number.isFinite(m1i) && Number.isFinite(m1Final) && m1Final >= m1i) {
      issues.push(`${lb.T1Label} 최종 질량은 초기 질량보다 작아야 합니다.`)
    }
    if (Number.isFinite(m2i) && Number.isFinite(m2Final) && m2Final >= m2i) {
      issues.push(`${lb.T2Label} 최종 질량은 초기 질량보다 작아야 합니다.`)
    }

    let av1 = null
    let av2 = null
    let avt = null

    if (issues.length === 0) {
      av1 = calcVol(m1i, m1Final, lb.d1)
      av2 = calcVol(m2i, m2Final, lb.d2)
      avt = av1 + av2

      if (av1 <= 0 || av2 <= 0) issues.push('실측 토출량은 0보다 커야 합니다.')

      const m1Drop = m1i - m1Final
      const m2Drop = m2i - m2Final
      const looksLikeDummy = Math.abs(m1Drop - 0.1) < 0.00005 && Math.abs(m2Drop - 0.1) < 0.00005

      if (looksLikeDummy) {
        issues.push('T1과 T2가 모두 정확히 0.1000 g 감소했습니다. 테스트 입력값인지 확인하세요.')
      }

      if (av1 < 300 || av2 < 300) {
        warnings.push('T1 또는 T2의 실측 토출량이 300 µL 미만입니다.')
      }

      if (pred?.ft && avt < pred.ft * 0.3) {
        warnings.push('실측 총량이 예상 총량의 30% 미만입니다.')
      }

      if (m3f !== '' && Number.isFinite(m3i) && Number.isFinite(m3Final) && m3Final <= m3i) {
        warnings.push('혼합 용기의 최종 질량이 증가하지 않았습니다.')
      }
    }

    return {
      ok: issues.length === 0,
      issues,
      warnings,
      actualVolume1_uL: av1,
      actualVolume2_uL: av2,
      actualTotal_uL: avt,
      quality_flag: warnings.length ? 'review' : 'ok',
      quality_notes: warnings.join(' | '),
    }
  }

  const qualityPreview = useMemo(() => {
    if (!pred) return { kind: 'waiting', title: '예측을 먼저 실행하세요', text: '예상 결과를 계산한 뒤 실측값을 입력할 수 있습니다.' }
    if (!m1f || !m2f) return { kind: 'waiting', title: '실측값 입력 대기', text: 'T1과 T2의 최종 질량을 입력하면 저장 가능 여부를 확인합니다.' }

    const quality = validateSaveBeforeSubmit()
    if (!quality.ok) return { kind: 'blocked', title: '저장할 수 없습니다', text: quality.issues[0], quality }
    if (quality.warnings.length) {
      return {
        kind: 'review',
        title: '확인 후 저장할 수 있습니다',
        text: '검토 필요 상태로 저장되며 자동 보정 데이터에서는 제외됩니다.',
        quality,
      }
    }
    return { kind: 'ready', title: '저장할 준비가 되었습니다', text: '입력값 검증을 통과했습니다.', quality }
  }, [pred, m1f, m2f, m3f, m1, m2, tare, p1, p2, dur, branch, chip, device, lb.T1Label, lb.T2Label])

  async function runPredict() {
    if (!chip || !device) {
      setError('왼쪽 메뉴에서 장비와 카트리지 로트를 먼저 선택하세요.')
      return
    }
    if (![p1, p2, dur, tempD, m1, m2].every(v => Number.isFinite(Number(v)))) {
      setError('압력, 시간, 온도, 초기 질량 값을 확인하세요.')
      return
    }
    if (+p1 < 0 || +p2 < 0 || +dur <= 0 || +m1 <= 0 || +m2 <= 0) {
      setError('압력은 0 이상, 시간과 초기 질량은 0보다 커야 합니다.')
      return
    }

    setError('')
    setSaveMessage('')
    setLoading(true)
    setPred(null)
    setM1f('')
    setM2f('')
    setM3f('')
    setSaved(false)
    setSaveAttempted(false)

    try {
      const base = {
        chip_id: chip.chip_id,
        branch,
        device_id: device?.device_id,
        lot_id: lot?.lot_id,
        cartridge_lot_id: lot?.lot_id,
        p1: +p1,
        p2: +p2,
        p3: 0,
        duration: +dur,
        duration_sec: +dur,
        temp_device: +tempD,
        m1_loading: +m1,
        m2_loading: +m2,
      }
      const r0 = await api.post('/predict', base)
      const duration = +dur
      const r1 = await api.post('/predict', {
        ...base,
        m1_loading: +m1 - r0.q1 * lb.d1 * duration / 60,
        m2_loading: +m2 - r0.q2 * lb.d2 * duration / 60,
      })

      const q1 = (r0.q1 + r1.q1) / 2
      const q2 = (r0.q2 + r1.q2) / 2
      const q3 = (r0.q3 + r1.q3) / 2
      const fv1 = r0.final_volume1_uL ?? q1 * lb.d1 * duration / 60 * 1000
      const fv2 = r0.final_volume2_uL ?? q2 * lb.d2 * duration / 60 * 1000
      const ft = r0.final_total_uL ?? fv1 + fv2
      const deviceCorrectionPreview = buildAveragedDevicePreview(
        r0.device_correction_preview,
        r1.device_correction_preview,
        q1,
        q2,
      )

      setPred({
        q1,
        q2,
        q3,
        fv1,
        fv2,
        ft,
        champion: r0.champion_name || '—',
        brR: r0.branch || branch,
        mode: r0.hybrid_mode || '—',
        band: r0.pressure_band || '—',
        condition: r0.condition_type || '—',
        targetTolerance: r0.target_tolerance_uL ?? null,
        calibration_applied: !!r0.calibration_applied,
        calibration_offset: r0.calibration_offset || null,
        device_correction_preview: deviceCorrectionPreview,
        v1: r0.v1,
        v2: r0.v2,
        v3: r0.v3,
        ps: r0.params_snapshot,
      })

      setTimeout(() => {
        document.getElementById('prediction-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } catch (e) {
      setError('예상 결과를 계산하지 못했습니다. 백엔드 연결과 입력값을 확인하세요.\n' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!pred || !chip) return

    setSaveAttempted(true)
    setSaveMessage('')
    const quality = validateSaveBeforeSubmit()

    if (!quality.ok) return

    if (quality.warnings.length) {
      const proceed = window.confirm(
        '입력값을 다시 확인해 주세요.\n\n' +
        quality.warnings.map(v => `• ${v}`).join('\n') +
        '\n\n계속 저장하면 “검토 필요”로 기록되며 자동 보정 데이터에서는 제외됩니다. 저장하시겠습니까?'
      )
      if (!proceed) return
    }

    setSaving(true)
    setError('')

    try {
      const ps = pred.ps || chip
      const duration = +dur
      const av1 = calcVol(+m1, +m1f, lb.d1)
      const av2 = calcVol(+m2, +m2f, lb.d2)
      const payload = {
        chip_id: chip.chip_id,
        device_id: device?.device_id,
        lot_id: lot?.lot_id,
        timestamp: new Date().toISOString(),
        p1_set: +p1,
        p2_set: +p2,
        p3_set: 0,
        duration,
        temp_device: +tempD,
        temp_ambient: +tempA,
        m1_loading: +m1,
        m2_loading: +m2,
        m3_loading: +tare,
        m1_final: +m1f,
        m2_final: +m2f,
        m3_final: m3f === '' ? null : +m3f,
        k1: ps.k1,
        k2: ps.k2,
        kout: ps.kout,
        alpha: ps.alpha,
        c_eth: ps.c_eth,
        c_wat: ps.c_wat,
        loss_const: ps.loss_const,
        p_offset: ps.p_offset,
        q1_pred: pred.q1,
        q2_pred: pred.q2,
        q3_pred: pred.q3,
        q1_actual: calcFlow(+m1, +m1f, lb.d1, duration),
        q2_actual: calcFlow(+m2, +m2f, lb.d2, duration),
        q3_actual: m3f === '' ? null : calcFlow(+tare, +m3f, D.MIX, duration),
        branch,
        champion_name: pred.champion,
        final_volume1_uL: pred.fv1,
        final_volume2_uL: pred.fv2,
        final_total_uL: pred.ft,
        act_volume1_uL: av1,
        act_volume2_uL: av2,
        fluid1: lb.T1,
        fluid2: lb.T2,
        run_valid: 1,
        run_type: 'normal',
        quality_flag: quality.quality_flag,
        quality_notes: quality.quality_notes,
      }

      await Promise.all([
        api.post('/record', payload),
        saveLog(payload),
      ])

      setSaved(true)
      setSaveMessage(
        quality.quality_flag === 'ok'
          ? '실험 결과가 저장되었습니다. 이 데이터는 보정 후보에 사용할 수 있습니다.'
          : '실험 결과가 “검토 필요”로 저장되었습니다. 자동 보정 데이터에서는 제외됩니다.'
      )
    } catch (e) {
      setError('저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도하세요.\n' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const preparationReady = !!chip && !!device && !!lot
  const actualReady = !!cmp
  const progressSteps = [
    { label: '실험 준비', done: preparationReady, active: !preparationReady },
    { label: '조건 입력', done: !!pred, active: preparationReady && !pred },
    { label: '예측 확인', done: !!pred, active: !!pred && !actualReady },
    { label: '실측 입력', done: actualReady, active: !!pred && !actualReady },
    { label: '결과 저장', done: saved, active: actualReady && !saved },
  ]

  const comparisonRows = cmp ? [
    { label: `${lb.T1Label} (T1)`, predicted: pred.fv1, actual: cmp.av1, difference: cmp.d1, rawPredicted: cmp.rawFv1, rawDifference: cmp.rawD1 },
    { label: `${lb.T2Label} (T2)`, predicted: pred.fv2, actual: cmp.av2, difference: cmp.d2, rawPredicted: cmp.rawFv2, rawDifference: cmp.rawD2 },
    { label: '총 토출량', predicted: pred.ft, actual: cmp.avt, difference: cmp.dt, rawPredicted: cmp.rawFt, rawDifference: cmp.rawDt },
  ] : []

  return (
    <div className="page-content user-workflow-page">
      <section className="experiment-hero">
        <div>
          <span className="eyebrow">실험 예측 및 기록</span>
          <h1>조건을 입력하고 예상 토출량을 확인하세요</h1>
          <p>예측 후 실제 실험값을 입력하면 차이를 자동으로 계산하고 안전하게 기록합니다.</p>
        </div>
        <div className="hero-status">
          <span className={`connection-dot ${preparationReady ? 'ready' : ''}`} />
          {preparationReady ? '장비와 로트 선택 완료' : '장비와 로트를 선택하세요'}
        </div>
      </section>

      <div className="workflow-progress" aria-label="실험 진행 단계">
        {progressSteps.map((step, index) => (
          <div key={step.label} className={`progress-step${step.done ? ' done' : ''}${step.active ? ' active' : ''}`}>
            <span>{step.done ? '✓' : index + 1}</span>
            <strong>{step.label}</strong>
          </div>
        ))}
      </div>

      {error && <div className="notice-box danger" role="alert">{error}</div>}
      {saveMessage && <div className="notice-box success" role="status">{saveMessage}</div>}

      <section className="workflow-card">
        <StepHeader
          number="1"
          title="실험 준비"
          description="사용할 장비, 카트리지 로트와 유체 흐름 방향을 확인합니다."
          status={preparationReady ? 'done' : 'active'}
        />

        <div className="selection-summary-grid">
          <SelectionSummary label="장비" value={device?.display_name || device?.device_id} sub={device?.device_id} />
          <SelectionSummary label="카트리지 로트" value={lot?.display_name || lot?.lot_id} sub={lot?.lot_id} />
        </div>

        {!preparationReady && (
          <div className="inline-guidance">왼쪽 메뉴에서 장비와 카트리지 로트를 선택해 주세요.</div>
        )}

        <div className="direction-block">
          <div className="field-section-label">유체 흐름 방향</div>
          <div className="direction-choice-grid">
            {Object.entries(BRANCH).map(([code, item]) => (
              <button
                key={code}
                type="button"
                className={`direction-card${branch === code ? ' selected' : ''}`}
                onClick={() => chooseBranch(code)}
              >
                <span className="direction-code">{code}</span>
                <strong>{item.direction}</strong>
                <span>T1 {item.T1Label} · T2 {item.T2Label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="workflow-card">
        <StepHeader
          number="2"
          title="실험 조건 입력"
          description="압력, 시간, 온도와 실험 전 초기 질량을 입력합니다."
          status={pred ? 'done' : 'active'}
        />

        <div className="condition-layout">
          <div className="condition-group">
            <h3>압력 및 시간</h3>
            <div className="friendly-field-grid two">
              <NumberField label={`${lb.T1Label} 압력 (P1)`} id="p1" value={p1} onChange={updatePredictionInput(setP1)} min="0" max="800" unit="kPa" hint="압력 게이지 설정값" />
              <NumberField label={`${lb.T2Label} 압력 (P2)`} id="p2" value={p2} onChange={updatePredictionInput(setP2)} min="0" max="800" unit="kPa" hint="압력 게이지 설정값" />
              <NumberField label="실험 시간" id="duration" value={dur} onChange={updatePredictionInput(setDur)} step="1" min="1" max="600" unit="초" />
              <NumberField label="장비 온도" id="tempDevice" value={tempD} onChange={updatePredictionInput(setTempD)} unit="°C" />
            </div>
          </div>

          <div className="condition-group">
            <h3>실험 전 질량</h3>
            <div className="friendly-field-grid two">
              <NumberField label={`${lb.T1Label} 초기 질량 (M1)`} id="m1" value={m1} onChange={updatePredictionInput(setM1)} step="0.0001" unit="g" />
              <NumberField label={`${lb.T2Label} 초기 질량 (M2)`} id="m2" value={m2} onChange={updatePredictionInput(setM2)} step="0.0001" unit="g" />
              <NumberField label="환경 온도" id="tempAmbient" value={tempA} onChange={setTempA} unit="°C" />
              <NumberField label="혼합 용기 초기 질량 (M3/Tare)" id="tare" value={tare} onChange={setTare} step="0.0001" unit="g" hint="선택 입력이지만 기록을 권장합니다." />
            </div>
          </div>
        </div>

        <div className="primary-action-row">
          <button className="btn btn-p btn-large" type="button" onClick={runPredict} disabled={loading || !preparationReady}>
            {loading ? <><span className="spin on" />예상 결과 계산 중…</> : '예상 토출량 계산'}
          </button>
          <span>조건을 변경하면 기존 예측 결과는 자동으로 초기화됩니다.</span>
        </div>
      </section>

      {pred && (
        <section id="prediction-results" className="workflow-card slide-in">
          <StepHeader
            number="3"
            title="예상 결과 확인"
            description="한 번의 실험에서 예상되는 토출량입니다."
            status="done"
          />

          <div className="friendly-kpi-grid">
            <KpiCard label={`${lb.T1Label} (T1)`} valueUL={pred.fv1} accent="t1" helper="회당 예상 토출량" />
            <KpiCard label={`${lb.T2Label} (T2)`} valueUL={pred.fv2} accent="t2" helper="회당 예상 토출량" />
            <KpiCard label="총 토출량" valueUL={pred.ft} accent="tot" helper="T1 + T2" />
          </div>

          <div className={`calibration-friendly-banner ${pred.calibration_applied ? 'applied' : 'base'}`}>
            <div className="calibration-icon">{pred.calibration_applied ? '✓' : 'i'}</div>
            <div>
              <strong>{pred.calibration_applied ? '실험 데이터 보정이 적용되었습니다' : '기본 모델로 예측했습니다'}</strong>
              <p>
                {pred.calibration_applied
                  ? `동일 조건 실험 ${pred.calibration_offset?.n_used ?? pred.calibration_offset?.n_samples ?? '-'}건을 기준으로 예측을 보정했습니다.`
                  : '현재 조건에는 승인된 보정 데이터가 없습니다.'}
              </p>
            </div>
          </div>

          <DeviceCorrectionPreview
  		preview={pred.device_correction_preview}
  		rawQ1={pred.q1}
  		rawQ2={pred.q2}
	/>

          <details className="technical-details">
            <summary>예측 상세 정보 보기</summary>
            <div className="technical-grid">
              <div><span>모델</span><strong>{pred.champion}</strong></div>
              <div><span>예측 방식</span><strong>{pred.mode}</strong></div>
              <div><span>압력 구간</span><strong>{pred.band}</strong></div>
              <div><span>조건 유형</span><strong>{pred.condition}</strong></div>
              <div><span>Q1</span><strong>{pred.q1.toFixed(4)} mL/min</strong></div>
              <div><span>Q2</span><strong>{pred.q2.toFixed(4)} mL/min</strong></div>
              <div><span>Q3</span><strong>{pred.q3.toFixed(4)} mL/min</strong></div>
              {pred.calibration_applied && pred.calibration_offset && (
                <>
                  <div><span>보정 조건</span><strong>{pred.calibration_offset.condition_key}</strong></div>
                  <div><span>T1 보정량</span><strong>{formatUL(pred.calibration_offset.t1_offset_uL)} µL</strong></div>
                  <div><span>T2 보정량</span><strong>{formatUL(pred.calibration_offset.t2_offset_uL)} µL</strong></div>
                </>
              )}
            </div>
          </details>
        </section>
      )}

      {pred && (
        <section className="workflow-card slide-in">
          <StepHeader
            number="4"
            title="실험 후 측정값 입력"
            description="실험이 끝난 뒤 각 용기의 최종 질량을 입력하세요. 실측 토출량은 자동 계산됩니다."
            status={actualReady ? 'done' : 'active'}
          />

          <div className="measurement-grid">
            <div className="measurement-card">
              <div className="measurement-title"><span className="fluid-mark t1" />{lb.T1Label} (T1)</div>
              <div className="initial-mass">초기 질량 <strong>{Number(m1).toFixed(4)} g</strong></div>
              <NumberField label="최종 질량" id="m1Final" value={m1f} onChange={v => { setM1f(v); setSaved(false); setSaveMessage('') }} step="0.0001" unit="g" error={finalErrors.m1} />
              <div className="calculated-volume">
                <span>자동 계산 실측량</span>
                <strong>{cmp ? `${formatML(cmp.av1)} mL` : '—'}</strong>
              </div>
            </div>

            <div className="measurement-card">
              <div className="measurement-title"><span className="fluid-mark t2" />{lb.T2Label} (T2)</div>
              <div className="initial-mass">초기 질량 <strong>{Number(m2).toFixed(4)} g</strong></div>
              <NumberField label="최종 질량" id="m2Final" value={m2f} onChange={v => { setM2f(v); setSaved(false); setSaveMessage('') }} step="0.0001" unit="g" error={finalErrors.m2} />
              <div className="calculated-volume">
                <span>자동 계산 실측량</span>
                <strong>{cmp ? `${formatML(cmp.av2)} mL` : '—'}</strong>
              </div>
            </div>

            <div className="measurement-card optional">
              <div className="measurement-title"><span className="fluid-mark mix" />혼합 용기 (M3)</div>
              <div className="initial-mass">초기 질량 <strong>{Number(tare).toFixed(4)} g</strong></div>
              <NumberField label="최종 질량 (선택)" id="m3Final" value={m3f} onChange={v => { setM3f(v); setSaved(false); setSaveMessage('') }} step="0.0001" unit="g" error={finalErrors.m3} hint="혼합부 질량을 측정한 경우 입력하세요." />
            </div>
          </div>
        </section>
      )}

      {pred && (
        <section className="workflow-card slide-in">
          <StepHeader
            number="5"
            title="결과 확인 및 저장"
            description="예측값과 실측값의 차이를 확인한 뒤 실험 결과를 저장합니다."
            status={saved ? 'done' : actualReady ? 'active' : 'idle'}
          />

          <div className={`quality-state ${qualityPreview.kind}`}>
            <div className="quality-state-icon">
              {qualityPreview.kind === 'ready' ? '✓' : qualityPreview.kind === 'blocked' ? '!' : qualityPreview.kind === 'review' ? '!' : '…'}
            </div>
            <div>
              <strong>{qualityPreview.title}</strong>
              <p>{qualityPreview.text}</p>
            </div>
          </div>

          {comparisonRows.length > 0 ? (
            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>예측값</th>
                    <th>실측값</th>
                    <th>차이</th>
                    <th>판정</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td><strong>{formatML(row.predicted)} mL</strong><small>{formatUL(row.predicted)} µL</small></td>
                      <td><strong>{formatML(row.actual)} mL</strong><small>{formatUL(row.actual)} µL</small></td>
                      <td className={Math.abs(row.difference) <= 50 ? 'difference-ok' : 'difference-review'}>
                        <strong>{row.difference >= 0 ? '+' : ''}{formatML(row.difference)} mL</strong>
                        <small>{row.difference >= 0 ? '+' : ''}{formatUL(row.difference)} µL</small>
                      </td>
                      <td><DifferenceStatus value={row.difference} threshold={index === 2 ? Math.max(50, pred.targetTolerance || 50) : 50} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-comparison">최종 질량을 입력하면 예측값과 실측값을 비교합니다.</div>
          )}

          {cmp && pred.calibration_applied && (
            <details className="technical-details compact">
              <summary>보정 전·후 오차 비교 보기</summary>
              <div className="raw-compare-grid">
                {comparisonRows.map(row => (
                  <div key={row.label} className="raw-compare-card">
                    <strong>{row.label}</strong>
                    <span>기본 모델 오차 {row.rawDifference >= 0 ? '+' : ''}{formatUL(row.rawDifference)} µL</span>
                    <span>보정 후 오차 {row.difference >= 0 ? '+' : ''}{formatUL(row.difference)} µL</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="final-action-row">
            <button
              className="btn btn-p btn-large"
              type="button"
              onClick={handleSave}
              disabled={saving || saved || qualityPreview.kind === 'waiting' || qualityPreview.kind === 'blocked'}
            >
              {saving ? '저장 중…' : saved ? '저장 완료' : qualityPreview.kind === 'review' ? '검토 필요로 저장' : '실험 결과 저장'}
            </button>
            <button className="btn btn-g btn-large" type="button" onClick={clearPrediction}>
              새 실험 시작
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
