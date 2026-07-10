'use client'

function finiteNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatFlow(value, digits = 4) {
  const n = finiteNumber(value)
  return n == null ? '—' : `${n.toFixed(digits)} mL/min`
}

function formatSigned(value, digits = 4) {
  const n = finiteNumber(value)
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)} mL/min`
}

function formatNumber(value, digits = 2) {
  const n = finiteNumber(value)
  return n == null ? '—' : n.toFixed(digits)
}

function getCorrectionValue(preview, channel) {
  const direct = finiteNumber(preview?.[`${channel}_correction`])
  if (direct != null) return direct
  return finiteNumber(preview?.[`${channel}_correction`]?.correction_mL_min)
}

function getCandidate(preview, channel) {
  return preview?.[`${channel}_candidate`] || (
    typeof preview?.[`${channel}_correction`] === 'object'
      ? preview?.[`${channel}_correction`]
      : null
  ) || {}
}

function statusLabel(status) {
  if (status === 'candidate_preview') return 'Preview candidate'
  if (status === 'candidate_caution') return 'Caution'
  if (status === 'hold') return 'Hold'
  return status || 'No candidate'
}

function statusStyle(status) {
  if (status === 'candidate_preview') {
    return { background: 'rgba(46, 204, 113, 0.12)', borderColor: 'rgba(46, 204, 113, 0.35)', color: '#69d99a' }
  }
  if (status === 'candidate_caution') {
    return { background: 'rgba(240, 160, 48, 0.12)', borderColor: 'rgba(240, 160, 48, 0.35)', color: '#f0b45a' }
  }
  if (status === 'hold') {
    return { background: 'rgba(231, 76, 60, 0.12)', borderColor: 'rgba(231, 76, 60, 0.35)', color: '#ff8b80' }
  }
  return { background: 'rgba(126, 179, 255, 0.10)', borderColor: 'rgba(126, 179, 255, 0.25)', color: '#9dbdf0' }
}

function ChannelRow({ channel, label, raw, preview }) {
  const candidate = getCandidate(preview, channel)
  const status = candidate.status || ''
  const correction = getCorrectionValue(preview, channel)
  const previewValue = finiteNumber(preview?.[`${channel}_preview`])
  const cv = finiteNumber(candidate.cv_actual_percent)
  const loo = finiteNumber(candidate.mean_abs_error_corrected_loo)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1.1fr',
      gap: '12px',
      alignItems: 'stretch',
      padding: '12px',
      border: '1px solid #1A2540',
      borderRadius: '12px',
      background: '#09101d',
    }}>
      <div>
        <div style={{ color: '#4A6090', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
        <div style={{ color: '#E8F0FF', fontWeight: 700 }}>{formatFlow(raw)}</div>
        <div style={{ color: '#566b90', fontSize: '11px', marginTop: '2px' }}>current /predict</div>
      </div>
      <div>
        <div style={{ color: '#4A6090', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Correction</div>
        <div style={{ color: correction == null ? '#566b90' : '#7EB3FF', fontWeight: 700 }}>{formatSigned(correction)}</div>
        <div style={{ color: '#566b90', fontSize: '11px', marginTop: '2px' }}>not applied</div>
      </div>
      <div>
        <div style={{ color: '#4A6090', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Preview</div>
        <div style={{ color: previewValue == null ? '#566b90' : '#C8D4F0', fontWeight: 700 }}>{formatFlow(previewValue)}</div>
        <div style={{ color: '#566b90', fontSize: '11px', marginTop: '2px' }}>{previewValue == null ? 'hold / unavailable' : 'raw + correction'}</div>
      </div>
      <div>
        <span style={{
          display: 'inline-block',
          border: '1px solid',
          borderRadius: '999px',
          padding: '3px 10px',
          fontSize: '11px',
          fontWeight: 700,
          ...statusStyle(status),
        }}>{statusLabel(status)}</span>
        <div style={{ color: '#6D82A8', fontSize: '11px', marginTop: '8px' }}>
          n={candidate.n ?? '—'} · CV={formatNumber(cv, 2)}% · LOO MAE={formatNumber(loo, 4)}
        </div>
      </div>
    </div>
  )
}

export default function DeviceCorrectionPreview({ preview, rawQ1, rawQ2 }) {
  if (!preview || !preview.available) return null

  const q1Status = getCandidate(preview, 'q1')?.status
  const q2Status = getCandidate(preview, 'q2')?.status
  const statuses = new Set([q1Status, q2Status].filter(Boolean))
  const hasHold = statuses.has('hold')
  const hasCaution = statuses.has('candidate_caution')

  return (
    <section style={{
      marginTop: '16px',
      padding: '16px',
      borderRadius: '16px',
      border: '1px solid rgba(126, 179, 255, 0.22)',
      background: 'linear-gradient(135deg, rgba(26, 58, 122, 0.18), rgba(7, 12, 24, 0.92))',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ color: '#7EB3FF', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            DEVICE correction preview
          </div>
          <h3 style={{ margin: '4px 0 4px', color: '#E8F0FF' }}>DEVICE_02 보정 미리보기</h3>
          <p style={{ margin: 0, color: '#7B8DB0', fontSize: '13px', lineHeight: 1.5 }}>
            기존 q1/q2는 바꾸지 않고, 후보 보정값을 적용했을 때의 참고값만 보여줍니다.
          </p>
        </div>
        <span style={{
          border: '1px solid rgba(126, 179, 255, 0.35)',
          borderRadius: '999px',
          padding: '5px 12px',
          color: '#9dbdf0',
          background: 'rgba(126, 179, 255, 0.10)',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          applied = {String(!!preview.applied)}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        <ChannelRow channel="q1" label="Q1 / T1" raw={rawQ1} preview={preview} />
        <ChannelRow channel="q2" label="Q2 / T2" raw={rawQ2} preview={preview} />
      </div>

      <div style={{ marginTop: '12px', color: hasHold ? '#ffb0a8' : hasCaution ? '#f0c27a' : '#75d69a', fontSize: '12px', lineHeight: 1.5 }}>
        {hasHold
          ? 'Hold 채널은 반복 검증이 부족해서 preview 값을 계산하지 않습니다. 추가 실험 후 승격 여부를 판단하세요.'
          : hasCaution
            ? 'Caution 후보가 포함되어 있습니다. 참고값으로만 보고 운영 적용 전 추가 검증이 필요합니다.'
            : 'Candidate preview 조건입니다. 그래도 실제 /predict 값에는 아직 적용되지 않습니다.'}
      </div>
    </section>
  )
}
