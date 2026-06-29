'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/Shell'
import { api } from '@/lib/client'
import { BRANCH } from '@/lib/constants'

const PRESETS = [
  { label: '저유량', q1: 2, q2: 2 },
  { label: '표준', q1: 5, q2: 5 },
  { label: '고유량', q1: 8, q2: 8 },
]

function FlowField({ label, value, onChange, unit, hint, min = '0', step = '0.1' }) {
  return (
    <div className="inverse-field">
      <label>{label}</label>
      <div className="inverse-input-wrap">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          inputMode="decimal"
          onChange={event => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function SetupSummary({ device, lot, branch }) {
  const branchInfo = BRANCH[branch]
  return (
    <div className="inverse-setup-summary">
      <div>
        <span>장비</span>
        <strong>{device?.display_name || device?.device_id || '선택 필요'}</strong>
        <small>{device?.device_id || '왼쪽 메뉴에서 선택하세요'}</small>
      </div>
      <div>
        <span>카트리지 로트</span>
        <strong>{lot?.display_name || lot?.lot_id || '선택 필요'}</strong>
        <small>{lot?.lot_id || '왼쪽 메뉴에서 선택하세요'}</small>
      </div>
      <div>
        <span>유체 방향</span>
        <strong>{branchInfo.direction}</strong>
        <small>T1 {branchInfo.T1Label} · T2 {branchInfo.T2Label}</small>
      </div>
    </div>
  )
}

function PressureCard({ code, fluid, value, maxPressure }) {
  const numeric = Number(value)
  const ratio = Number.isFinite(numeric) && Number(maxPressure) > 0
    ? Math.min(100, Math.max(0, numeric / Number(maxPressure) * 100))
    : 0

  return (
    <div className="pressure-result-card">
      <div className="pressure-result-label">
        <span>{code}</span>
        <strong>{fluid} 압력</strong>
      </div>
      <div className="pressure-result-value">
        <strong>{Number.isFinite(numeric) ? numeric.toFixed(1) : '—'}</strong>
        <span>kPa</span>
      </div>
      <div className="pressure-gauge" aria-hidden="true">
        <span style={{ width: `${ratio}%` }} />
      </div>
      <small>설정 상한 {Number(maxPressure).toFixed(0)} kPa의 {ratio.toFixed(0)}%</small>
    </div>
  )
}

function FlowComparisonRow({ label, target, predicted, duration, volumeUL }) {
  const difference = Number(predicted) - Number(target)
  const within = Math.abs(difference) <= Math.max(0.05, Math.abs(Number(target)) * 0.03)
  const volumeML = Number.isFinite(Number(volumeUL))
    ? Number(volumeUL) / 1000
    : Number(predicted) * Number(duration) / 60

  return (
    <tr>
      <th>{label}</th>
      <td>{Number(target).toFixed(3)} mL/min</td>
      <td>{Number(predicted).toFixed(3)} mL/min</td>
      <td className={within ? 'inverse-good' : 'inverse-review'}>
        {difference >= 0 ? '+' : ''}{difference.toFixed(3)} mL/min
      </td>
      <td>{volumeML.toFixed(3)} mL</td>
      <td><span className={`inverse-result-status ${within ? 'ok' : 'review'}`}>{within ? '목표 근접' : '차이 확인'}</span></td>
    </tr>
  )
}

export default function InverseSetupPage() {
  const { chip, device, lot, branch, setBranch } = useApp()
  const branchInfo = BRANCH[branch]

  const [target1, setTarget1] = useState('5')
  const [target2, setTarget2] = useState('5')
  const [duration, setDuration] = useState('20')
  const [temperature, setTemperature] = useState('24')
  const [mass1, setMass1] = useState('15')
  const [mass2, setMass2] = useState('15')
  const [maxPressure, setMaxPressure] = useState('600')

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setResult(null)
    setError('')
    setMessage('')
  }, [device?.device_id, lot?.lot_id, branch])

  function update(setter) {
    return value => {
      setter(value)
      setResult(null)
      setError('')
      setMessage('')
    }
  }

  const validation = useMemo(() => {
    const values = [target1, target2, duration, temperature, mass1, mass2, maxPressure].map(Number)
    if (!device || !lot || !chip) return '장비와 카트리지 로트를 먼저 선택하세요.'
    if (!values.every(Number.isFinite)) return '입력값을 숫자로 확인하세요.'
    if (Number(target1) <= 0 || Number(target2) <= 0) return '목표 유량은 0보다 커야 합니다.'
    if (Number(duration) <= 0) return '실험 시간은 0보다 커야 합니다.'
    if (Number(mass1) <= 0 || Number(mass2) <= 0) return '초기 질량은 0보다 커야 합니다.'
    if (Number(maxPressure) <= 0) return '최대 압력은 0보다 커야 합니다.'
    return ''
  }, [target1, target2, duration, temperature, mass1, mass2, maxPressure, device, lot, chip])

  async function calculatePressure() {
    if (validation) {
      setError(validation)
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    setResult(null)

    try {
      const base = {
        chip_id: chip.chip_id,
        device_id: device.device_id,
        lot_id: lot.lot_id,
        branch,
        duration: Number(duration),
        temp_device: Number(temperature),
        m1_loading: Number(mass1),
        m2_loading: Number(mass2),
      }

      const inverse = await api.post('/solve_inverse', {
        ...base,
        tq1: Number(target1),
        tq2: Number(target2),
        p_max: Number(maxPressure),
      })

      if (inverse.status && inverse.status !== 'success') {
        throw new Error(inverse.message || '압력 조건을 찾지 못했습니다.')
      }

      const verified = await api.post('/predict', {
        ...base,
        p1: Number(inverse.p1),
        p2: Number(inverse.p2),
        p3: 0,
      })

      setResult({
        ...inverse,
        ...verified,
        p1: Number(inverse.p1),
        p2: Number(inverse.p2),
        q1: Number(verified.q1 ?? inverse.q1),
        q2: Number(verified.q2 ?? inverse.q2),
        target1: Number(target1),
        target2: Number(target2),
        duration: Number(duration),
        maxPressure: Number(maxPressure),
      })

      setTimeout(() => {
        document.getElementById('inverse-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } catch (err) {
      setError('필요 압력을 계산하지 못했습니다. 입력값과 백엔드 연결을 확인하세요.\n' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function copySetup() {
    if (!result) return
    const text = [
      'ChipFlow 압력 설정',
      `장비: ${device?.display_name || device?.device_id} (${device?.device_id})`,
      `로트: ${lot?.display_name || lot?.lot_id} (${lot?.lot_id})`,
      `유체 방향: ${branchInfo.direction} (${branch})`,
      `${branchInfo.T1Label} 목표 유량: ${Number(target1).toFixed(3)} mL/min`,
      `${branchInfo.T2Label} 목표 유량: ${Number(target2).toFixed(3)} mL/min`,
      `실험 시간: ${Number(duration).toFixed(0)} sec`,
      `P1 (${branchInfo.T1Label}): ${Number(result.p1).toFixed(1)} kPa`,
      `P2 (${branchInfo.T2Label}): ${Number(result.p2).toFixed(1)} kPa`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setMessage('압력 설정값을 클립보드에 복사했습니다.')
    } catch {
      setMessage('복사하지 못했습니다. 화면의 압력값을 직접 확인해 주세요.')
    }
  }

  const targetTolerance = Math.max(0.05, Math.max(Number(target1), Number(target2)) * 0.03)
  const maxFlowError = result
    ? Math.max(Math.abs(result.q1 - Number(target1)), Math.abs(result.q2 - Number(target2)))
    : null
  const targetReached = result ? maxFlowError <= targetTolerance : false
  const atPressureLimit = result
    ? result.p1 >= Number(maxPressure) * 0.98 || result.p2 >= Number(maxPressure) * 0.98
    : false

  return (
    <div className="page-content inverse-first-page">
      <section className="inverse-hero">
        <div>
          <span className="eyebrow">주요 기능</span>
          <h1>목표 유량을 입력하면 필요한 압력을 계산합니다</h1>
          <p>원하는 유량과 실험 시간을 입력하고, 장비에 설정할 P1·P2 압력값을 확인하세요.</p>
        </div>
        <div className="inverse-purpose-badge">
          <span>1</span>
          <div><strong>목표 유량 입력</strong><small>mL/min</small></div>
          <b>→</b>
          <span>2</span>
          <div><strong>필요 압력 확인</strong><small>kPa</small></div>
        </div>
      </section>

      {error && <div className="notice-box danger" role="alert">{error}</div>}
      {message && <div className="notice-box success" role="status">{message}</div>}

      <section className="workflow-card inverse-setup-card">
        <div className="inverse-section-heading">
          <span>1</span>
          <div>
            <h2>실험 대상 확인</h2>
            <p>선택한 장비와 로트에 맞춰 압력을 계산합니다.</p>
          </div>
        </div>

        <SetupSummary device={device} lot={lot} branch={branch} />

        <div className="inverse-direction-grid">
          {Object.entries(BRANCH).map(([code, info]) => (
            <button
              key={code}
              type="button"
              className={branch === code ? 'selected' : ''}
              onClick={() => setBranch(code)}
            >
              <span>{code}</span>
              <strong>{info.direction}</strong>
              <small>T1 {info.T1Label} · T2 {info.T2Label}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="workflow-card inverse-target-card">
        <div className="inverse-section-heading">
          <span>2</span>
          <div>
            <h2>목표 유량과 실험 시간 입력</h2>
            <p>연구자가 원하는 유량 조건을 입력합니다.</p>
          </div>
        </div>

        <div className="inverse-preset-row">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                update(setTarget1)(String(preset.q1))
                update(setTarget2)(String(preset.q2))
              }}
            >
              <strong>{preset.label}</strong>
              <span>{preset.q1} / {preset.q2} mL/min</span>
            </button>
          ))}
        </div>

        <div className="inverse-primary-inputs">
          <FlowField
            label={`${branchInfo.T1Label} 목표 유량 (T1)`}
            value={target1}
            onChange={update(setTarget1)}
            unit="mL/min"
            step="0.001"
            hint={`P1으로 제어하는 ${branchInfo.T1Label} 유량`}
          />
          <FlowField
            label={`${branchInfo.T2Label} 목표 유량 (T2)`}
            value={target2}
            onChange={update(setTarget2)}
            unit="mL/min"
            step="0.001"
            hint={`P2로 제어하는 ${branchInfo.T2Label} 유량`}
          />
          <FlowField
            label="실험 시간"
            value={duration}
            onChange={update(setDuration)}
            unit="초"
            min="1"
            step="1"
            hint="예상 총 토출량 계산에 반영됩니다."
          />
        </div>

        <details className="inverse-advanced-settings">
          <summary>고급 설정</summary>
          <div className="inverse-advanced-grid">
            <FlowField label="장비 온도" value={temperature} onChange={update(setTemperature)} unit="°C" step="0.1" />
            <FlowField label={`${branchInfo.T1Label} 초기 질량 (M1)`} value={mass1} onChange={update(setMass1)} unit="g" step="0.0001" />
            <FlowField label={`${branchInfo.T2Label} 초기 질량 (M2)`} value={mass2} onChange={update(setMass2)} unit="g" step="0.0001" />
            <FlowField label="최대 허용 압력" value={maxPressure} onChange={update(setMaxPressure)} unit="kPa" step="10" />
          </div>
        </details>

        <div className="inverse-main-action">
          <button className="btn btn-p btn-large" type="button" onClick={calculatePressure} disabled={loading || !!validation}>
            {loading ? <><span className="spin on" />필요 압력 계산 중…</> : '필요 압력 계산'}
          </button>
          <span>{validation || '입력한 목표 유량에 가장 가까운 압력 조합을 탐색합니다.'}</span>
        </div>
      </section>

      {result && (
        <section id="inverse-result" className="workflow-card inverse-result-section slide-in">
          <div className="inverse-section-heading result">
            <span>3</span>
            <div>
              <h2>장비에 설정할 압력</h2>
              <p>아래 P1·P2 값을 장비에 입력하세요.</p>
            </div>
            <span className={`inverse-result-summary ${targetReached && !atPressureLimit ? 'ok' : 'review'}`}>
              {atPressureLimit ? '압력 상한 확인' : targetReached ? '목표 유량에 근접' : '목표와 차이 확인'}
            </span>
          </div>

          <div className="pressure-result-grid">
            <PressureCard code="P1" fluid={branchInfo.T1Label} value={result.p1} maxPressure={maxPressure} />
            <PressureCard code="P2" fluid={branchInfo.T2Label} value={result.p2} maxPressure={maxPressure} />
          </div>

          {atPressureLimit && (
            <div className="inverse-limit-warning">
              계산된 압력이 설정 상한에 가깝습니다. 목표 유량 또는 최대 허용 압력을 검토하세요.
            </div>
          )}

          <div className="inverse-result-table-wrap">
            <table className="inverse-result-table">
              <thead>
                <tr>
                  <th>유체</th>
                  <th>목표 유량</th>
                  <th>예상 유량</th>
                  <th>차이</th>
                  <th>{Number(duration).toFixed(0)}초 예상 토출량</th>
                  <th>판정</th>
                </tr>
              </thead>
              <tbody>
                <FlowComparisonRow
                  label={`${branchInfo.T1Label} (T1)`}
                  target={target1}
                  predicted={result.q1}
                  duration={duration}
                  volumeUL={result.final_volume1_uL}
                />
                <FlowComparisonRow
                  label={`${branchInfo.T2Label} (T2)`}
                  target={target2}
                  predicted={result.q2}
                  duration={duration}
                  volumeUL={result.final_volume2_uL}
                />
              </tbody>
            </table>
          </div>

          <div className="inverse-volume-summary">
            <div><span>예상 총 토출량</span><strong>{(Number(result.final_total_uL) / 1000).toFixed(3)} mL</strong></div>
            <div><span>실험 시간</span><strong>{Number(duration).toFixed(0)} sec</strong></div>
            <div><span>보정 상태</span><strong>{result.calibration_applied ? '해당 장비·로트 보정 적용' : '기본 모델 사용'}</strong></div>
          </div>

          <div className="inverse-result-actions">
            <button className="btn btn-p" type="button" onClick={copySetup}>압력 설정값 복사</button>
            <Link href="/experiment" className="btn btn-g">압력 기준 예측·실험 기록으로 이동</Link>
          </div>

          <details className="technical-details inverse-details">
            <summary>계산 상세 정보 보기</summary>
            <div className="technical-grid">
              <div><span>장비</span><strong>{device?.device_id}</strong></div>
              <div><span>로트</span><strong>{lot?.lot_id}</strong></div>
              <div><span>유체 방향</span><strong>{branchInfo.direction} ({branch})</strong></div>
              <div><span>모델</span><strong>{result.champion_name || '—'}</strong></div>
              <div><span>압력 구간</span><strong>{result.pressure_band || '—'}</strong></div>
              <div><span>조건 유형</span><strong>{result.condition_type || '—'}</strong></div>
              <div><span>최대 유량 오차</span><strong>{maxFlowError.toFixed(4)} mL/min</strong></div>
              <div><span>허용 판정 기준</span><strong>{targetTolerance.toFixed(4)} mL/min</strong></div>
              <div><span>보정 적용</span><strong>{result.calibration_applied ? 'Yes' : 'No'}</strong></div>
            </div>
          </details>
        </section>
      )}
    </div>
  )
}
