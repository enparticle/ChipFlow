'use client';

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatFlow(value, digits = 4) {
  const n = finiteNumber(value);
  return n == null ? "-" : `${n.toFixed(digits)} mL/min`;
}

function formatCorrection(value, digits = 4) {
  const n = finiteNumber(value);
  if (n == null) return "-";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)} mL/min`;
}

function formatNumber(value, digits = 3) {
  const n = finiteNumber(value);
  return n == null ? "-" : n.toFixed(digits);
}

function getStatus(candidate) {
  return String(candidate?.status || "no_candidate");
}

function statusStyle(status) {
  if (status === "candidate_preview") {
    return {
      color: "#BBF7D0",
      background: "rgba(34,197,94,0.16)",
      border: "1px solid rgba(34,197,94,0.45)",
    };
  }

  if (status === "candidate_caution") {
    return {
      color: "#FDE68A",
      background: "rgba(245,158,11,0.16)",
      border: "1px solid rgba(245,158,11,0.45)",
    };
  }

  if (status === "hold") {
    return {
      color: "#FCA5A5",
      background: "rgba(239,68,68,0.16)",
      border: "1px solid rgba(239,68,68,0.45)",
    };
  }

  return {
    color: "#CBD5E1",
    background: "rgba(148,163,184,0.12)",
    border: "1px solid rgba(148,163,184,0.35)",
  };
}

function ChannelRow({ label, rawValue, correction, previewValue, candidate }) {
  const status = getStatus(candidate);
  const isHold = status === "hold";
  const hasPreview = finiteNumber(previewValue) != null;

  return (
    <div
      style={{
        border: "1px solid rgba(96,165,250,0.22)",
        borderRadius: 14,
        padding: "14px 16px",
        background: "rgba(15,23,42,0.92)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ color: "#E0F2FE", fontSize: 15, fontWeight: 800 }}>
          {label}
        </div>
        <span
          style={{
            ...statusStyle(status),
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <div>
          <div style={{ color: "#93C5FD", fontSize: 11, fontWeight: 700 }}>
            Raw prediction
          </div>
          <div style={{ color: "#F8FAFC", fontSize: 15, fontWeight: 800 }}>
            {formatFlow(rawValue)}
          </div>
        </div>

        <div>
          <div style={{ color: "#93C5FD", fontSize: 11, fontWeight: 700 }}>
            Correction
          </div>
          <div style={{ color: correction == null ? "#94A3B8" : "#FDE68A", fontSize: 15, fontWeight: 800 }}>
            {formatCorrection(correction)}
          </div>
        </div>

        <div>
          <div style={{ color: "#93C5FD", fontSize: 11, fontWeight: 700 }}>
            Preview
          </div>
          <div style={{ color: hasPreview ? "#86EFAC" : "#94A3B8", fontSize: 15, fontWeight: 800 }}>
            {formatFlow(previewValue)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          color: "#CBD5E1",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>n = {candidate?.n ?? "-"}</span>
        <span>CV = {formatNumber(candidate?.cv_actual_percent, 2)}%</span>
        <span>LOO MAE = {formatNumber(candidate?.mean_abs_error_corrected_loo, 4)}</span>
        {isHold && <span style={{ color: "#FCA5A5" }}>Hold: 추가 검증 필요</span>}
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

  const rawQ1 =
    props?.rawQ1 ??
    props?.q1 ??
    prediction?.q1 ??
    prediction?.q1_ml_min ??
    null;

  const rawQ2 =
    props?.rawQ2 ??
    props?.q2 ??
    prediction?.q2 ??
    prediction?.q2_ml_min ??
    null;

  const q1Candidate = preview.q1_candidate || preview.q1_correction_candidate || {};
  const q2Candidate = preview.q2_candidate || preview.q2_correction_candidate || {};

  const q1Status = getStatus(q1Candidate);
  const q2Status = getStatus(q2Candidate);
  const statuses = new Set([q1Status, q2Status]);

  const hasHold = statuses.has("hold");
  const hasCaution = statuses.has("candidate_caution");
  const isApplied = preview.applied === true || preview.apply_to_predict === true;

  return (
    <section
      style={{
        marginTop: 24,
        marginBottom: 24,
        borderRadius: 18,
        border: "1px solid rgba(59,130,246,0.35)",
        background:
          "linear-gradient(135deg, rgba(2,6,23,0.98), rgba(15,23,42,0.98))",
        boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
        padding: 20,
        color: "#F8FAFC",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              color: "#60A5FA",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            DEVICE correction preview
          </div>
          <div style={{ color: "#FFFFFF", fontSize: 19, fontWeight: 900 }}>
            DEVICE_02 보정 미리보기
          </div>
          <div style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600, marginTop: 5 }}>
            실제 q1/q2 예측값은 바꾸지 않고, 후보 보정 적용 시 참고값만 보여줍니다.
          </div>
        </div>

        <div
          style={{
            color: isApplied ? "#FCA5A5" : "#86EFAC",
            background: isApplied ? "rgba(239,68,68,0.16)" : "rgba(34,197,94,0.16)",
            border: isApplied ? "1px solid rgba(239,68,68,0.45)" : "1px solid rgba(34,197,94,0.45)",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          applied = {String(Boolean(isApplied))}
        </div>
      </div>

      <div
        style={{
          color: "#BFDBFE",
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        device_id = {preview.device_id || "-"} / pressure_case = {preview.pressure_case || "-"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <ChannelRow
          label="Q1 / T1"
          rawValue={rawQ1}
          correction={preview.q1_correction}
          previewValue={preview.q1_preview}
          candidate={q1Candidate}
        />

        <ChannelRow
          label="Q2 / T2"
          rawValue={rawQ2}
          correction={preview.q2_correction}
          previewValue={preview.q2_preview}
          candidate={q2Candidate}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "12px 14px",
          borderRadius: 12,
          background: hasHold
            ? "rgba(127,29,29,0.28)"
            : hasCaution
              ? "rgba(120,53,15,0.28)"
              : "rgba(20,83,45,0.25)",
          border: hasHold
            ? "1px solid rgba(248,113,113,0.42)"
            : hasCaution
              ? "1px solid rgba(251,191,36,0.42)"
              : "1px solid rgba(74,222,128,0.38)",
          color: hasHold ? "#FECACA" : hasCaution ? "#FDE68A" : "#BBF7D0",
          fontSize: 13,
          fontWeight: 750,
          lineHeight: 1.55,
        }}
      >
        {hasHold
          ? "일부 채널이 hold 상태입니다. hold 채널은 preview 값을 계산하지 않으며, 추가 실험 검증이 필요합니다."
          : hasCaution
            ? "candidate_caution 조건입니다. 방향성은 있지만 운영 적용 전 추가 검증이 필요합니다."
            : "candidate_preview 조건입니다. 현재는 실제 적용이 아닌 미리보기로만 표시됩니다."}
      </div>
    </section>
  );
}

export default DeviceCorrectionPreview;
