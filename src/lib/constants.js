export const DENSITY = { ETH: 0.789, WAT: 1.000, MIX: 0.910 }

export const BRANCH = {
  EW: {
    T1: 'Ethanol', T2: 'Water',
    d1: DENSITY.ETH, d2: DENSITY.WAT,
    p1Label: 'P1 — Ethanol (kPa)', p2Label: 'P2 — Water (kPa)',
    m1Label: 'M1 초기 — Ethanol (g)', m2Label: 'M2 초기 — Water (g)',
    m1fLabel: 'M1 최종 — Ethanol (g)', m2fLabel: 'M2 최종 — Water (g)',
    c1: 'T1 — Ethanol', c2: 'T2 — Water',
  },
  WE: {
    T1: 'Water', T2: 'Ethanol',
    d1: DENSITY.WAT, d2: DENSITY.ETH,
    p1Label: 'P1 — Water (kPa)', p2Label: 'P2 — Ethanol (kPa)',
    m1Label: 'M1 초기 — Water (g)', m2Label: 'M2 초기 — Ethanol (g)',
    m1fLabel: 'M1 최종 — Water (g)', m2fLabel: 'M2 최종 — Ethanol (g)',
    c1: 'T1 — Water', c2: 'T2 — Ethanol',
  },
}

export function calcActualVolumes(m1i, m2i, m1f, m2f, branch) {
  const lb = BRANCH[branch]
  return {
    av1: Math.abs(m1i - m1f) / lb.d1 * 1000,
    av2: Math.abs(m2i - m2f) / lb.d2 * 1000,
  }
}

export function calcActualFlow(mi, mf, density, duration) {
  return Math.abs(mi - mf) / density * (60 / duration)
}
