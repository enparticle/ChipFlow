'use client';

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatFlow(value, digits = 4) {
  const n = finiteNumber(value);
  return n == null ? '—' : `${n.toFixed(digits)} mL/min`;
}

function formatCorrection(value, digits = 4) {
  const n = finiteNumber(value);
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)} mL/min`;
}

function formatNumber(value, digits = 2) {
  const n = finiteNumber(value);
  return n == null ? '—' : n.toFixed(digits);
}

function formatVolumeFromFlow(flow, durationSec, digits = 4) {
  const q = finiteNumber(flow);
  const d = finiteNumber(durationSec);
  if (q == null || d == null || d <= 0) return null;
  return `${(q * d / 60).toFixed(digits)} mL / ${d.toFixed(0)} sec`;
}

function getStatus(candidate) {
  return String(candidate?.status || 'no_candidate');
}

function statusConfig(status) {
  if (status === 'candidate_preview') {
    return {
      label: 'Preview candidate',
      fg: '#047857',
      bg: '#ECFDF5',
      border: '#A7F3D0',
    };
  }
  if (status === 'candidate_caution') {
    return {
      label: 'Caution candidate',
      fg: '#B45309',
      bg: '#FFFBEB',
      border: '#FDE68A',
    };
  }
  if (status === 'hold') {
    return {
      label: 'Hold',
      fg: '#B91C1C',
      bg: '#FEF2F2',
      border: '#FECACA',
    };
  }
  return {
    label: status || 'No candidate',
    fg: '#475569',
    bg: '#F8FAFC',
    border: '#CBD5E1',
  };
}

const styles = {
  section: {
    marginTop: 18,
    marginBottom: 18,
    borderRadius: 16,
    border: '1px solid #D8E4F8',
    background: '#FFFFFF',
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)',
    padding: 20,
    color: '#0F172A',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: '-0.02em',
  },
  desc: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 5,
    lineHeight: 1.45,
  },
  appliedBadge: {
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
  meta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: '#334155',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 14,
  },
  rows: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 12,
  },
  row: {
    border: '1px solid #E2E8F0',
    borderRadius: 14,
    padding: '14px 16px',
    background: '#F8FAFC',
  },
  rowHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  channel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 900,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rawValue: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 900,
  },
  corrValue: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 900,
  },
  previewValue: {
    color: '#047857',
    fontSize: 16,
    fontWeight: 900,
  },
  sub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 650,
    marginTop: 4,
  },
  metrics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    color: '#475569',
    fontSize: 12,
    fontWeight: 700,
  },
  metricPill: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 999,
    padding: '4px 8px',
  },
  note: {
    marginTop: 14,
    padding: '12px 14px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 750,
    lineHeight: 1.55,
  },
};

function ChannelRow({ label, rawValue, correction, previewValue, candidate, durationSec }) {
  const status = getStatus(candidate);
  const cfg = statusConfig(status);
  const isHold = status === 'hold';
  const hasPreview = finiteNumber(previewValue) != null;
  const rawVolume = formatVolumeFromFlow(rawValue, durationSec);
  const previewVolume = formatVolumeFromFlow(previewValue, durationSec);

  return (
    <div style={styles.row}>
      <div style={styles.rowHead}>
        <div style={styles.channel}>{label}</div>
        <span
          style={{
            color: cfg.fg,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 999,
            padding: '5px 10px',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {cfg.label}
        </span>
      </div>

      <div style={styles.grid}>
        <div>
          <div style={styles.label}>현재 /predict</div>
          <div style={styles.rawValue}>{formatFlow(rawValue)}</div>
          {rawVolume && <div style={styles.sub}>{rawVolume}</div>}
        </div>

        <div>
          <div style={styles.label}>보정 후보</div>
          <div style={{ ...styles.corrValue, color: correction == null ? '#94A3B8' : '#2563EB' }}>
            {formatCorrection(correction)}
          </div>
          <div style={styles.sub}>not applied</div>
        </div>

        <div>
          <div style={styles.label}>Preview</div>
          <div style={{ ...styles.previewValue, color: hasPreview ? '#047857' : '#94A3B8' }}>
            {formatFlow(previewValue)}
          </div>
          {previewVolume && <div style={styles.sub}>{previewVolume}</div>}
          {!hasPreview && <div style={styles.sub}>hold 또는 후보 없음</div>}
        </div>
      </div>

      <div style={styles.metrics}>
        <span style={styles.metricPill}>n={candidate?.n ?? '—'}</span>
        <span style={styles.metricPill}>CV={formatNumber(candidate?.cv_actual_percent, 2)}%</span>
        <span style={styles.metricPill}>LOO MAE={formatNumber(candidate?.mean_abs_error_corrected_loo, 4)}</span>
        {isHold && <span style={{ ...styles.metricPill, color: '#B91C1C', borderColor: '#FECACA', background: '#FEF2F2' }}>추가 검증 필요</span>}
      </div>
    </div>
  );
}

export function DeviceCorrectionPreview(props) {
  const prediction = props?.prediction || props?.result || props?.data || {};
  const preview =
    props?.preview ||
    prediction?.device_correction_preview ||
    props?.device_correction_preview ||
    null;

  if (!preview || preview.available !== true) {
    return null;
  }

  const rawQ1 = props?.rawQ1 ?? props?.q1 ?? prediction?.q1 ?? prediction?.q1_ml_min ?? null;
  const rawQ2 = props?.rawQ2 ?? props?.q2 ?? prediction?.q2 ?? prediction?.q2_ml_min ?? null;
  const durationSec = props?.durationSec ?? props?.duration ?? prediction?.duration_sec ?? prediction?.duration ?? null;

  const q1Candidate = preview.q1_candidate || preview.q1_correction_candidate || {};
  const q2Candidate = preview.q2_candidate || preview.q2_correction_candidate || {};
  const q1Status = getStatus(q1Candidate);
  const q2Status = getStatus(q2Candidate);
  const hasHold = q1Status === 'hold' || q2Status === 'hold';
  const hasCaution = q1Status === 'candidate_caution' || q2Status === 'candidate_caution';
  const isApplied = preview.applied === true || preview.apply_to_predict === true;

  const appliedStyle = isApplied
    ? { color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }
    : { color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0' };

  const noteStyle = hasHold
    ? { background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }
    : hasCaution
      ? { background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }
      : { background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857' };

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>DEVICE correction preview</div>
          <div style={styles.title}>DEVICE_02 보정 미리보기</div>
          <div style={styles.desc}>
            기존 q1/q2는 그대로 두고, 후보 보정값을 적용했을 때의 참고값만 보여줍니다.
          </div>
        </div>
        <div style={{ ...styles.appliedBadge, ...appliedStyle }}>
          applied = {String(Boolean(isApplied))}
        </div>
      </div>

      <div style={styles.meta}>
        <span>device_id: {preview.device_id || '—'}</span>
        <span>·</span>
        <span>pressure: {preview.pressure_case || '—'}</span>
        {durationSec && <><span>·</span><span>duration: {Number(durationSec).toFixed(0)} sec</span></>}
      </div>

      <div style={styles.rows}>
        <ChannelRow
          label="Q1 / T1"
          rawValue={rawQ1}
          correction={preview.q1_correction}
          previewValue={preview.q1_preview}
          candidate={q1Candidate}
          durationSec={durationSec}
        />
        <ChannelRow
          label="Q2 / T2"
          rawValue={rawQ2}
          correction={preview.q2_correction}
          previewValue={preview.q2_preview}
          candidate={q2Candidate}
          durationSec={durationSec}
        />
      </div>

      <div style={{ ...styles.note, ...noteStyle }}>
        {hasHold
          ? '일부 채널이 hold 상태입니다. hold 채널은 preview 값을 계산하지 않으며, 추가 실험 검증이 필요합니다.'
          : hasCaution
            ? 'candidate_caution 조건입니다. 방향성은 있지만 운영 적용 전 추가 검증이 필요합니다.'
            : 'candidate_preview 조건입니다. 현재는 실제 적용이 아닌 미리보기로만 표시됩니다.'}
      </div>
    </section>
  );
}

export default DeviceCorrectionPreview;
