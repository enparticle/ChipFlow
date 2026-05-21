export const D = { ETH: 0.789, WAT: 1.000, MIX: 0.910 }

export const BRANCH = {
  EW: {
    T1: 'Ethanol', T2: 'Water', d1: D.ETH, d2: D.WAT,
    p1: 'P1 — Ethanol (kPa)', p2: 'P2 — Water (kPa)',
    m1: 'M1 초기 — Ethanol (g)', m2: 'M2 초기 — Water (g)',
    m1f: 'M1 최종 — Ethanol (g)', m2f: 'M2 최종 — Water (g)',
    c1: 'T1 — Ethanol', c2: 'T2 — Water',
  },
  WE: {
    T1: 'Water', T2: 'Ethanol', d1: D.WAT, d2: D.ETH,
    p1: 'P1 — Water (kPa)', p2: 'P2 — Ethanol (kPa)',
    m1: 'M1 초기 — Water (g)', m2: 'M2 초기 — Ethanol (g)',
    m1f: 'M1 최종 — Water (g)', m2f: 'M2 최종 — Ethanol (g)',
    c1: 'T1 — Water', c2: 'T2 — Ethanol',
  },
}

export const calcVol = (mi, mf, density) => Math.abs(mi - mf) / density * 1000
export const calcFlow = (mi, mf, density, dur) => Math.abs(mi - mf) / density * (60 / dur)
