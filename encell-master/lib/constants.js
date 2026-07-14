export const D = { ETH: 0.789, WAT: 1.000, MIX: 0.910 }

export const BRANCH = {
  EW: {
    T1: 'Ethanol',
    T2: 'Water',
    T1Label: '에탄올',
    T2Label: '물',
    direction: '에탄올 → 물',
    d1: D.ETH,
    d2: D.WAT,
    p1: 'P1 — 에탄올 (kPa)',
    p2: 'P2 — 물 (kPa)',
    m1: 'M1 초기 — 에탄올 (g)',
    m2: 'M2 초기 — 물 (g)',
    m1f: 'M1 최종 — 에탄올 (g)',
    m2f: 'M2 최종 — 물 (g)',
    c1: 'T1 — 에탄올',
    c2: 'T2 — 물',
  },
  WE: {
    T1: 'Water',
    T2: 'Ethanol',
    T1Label: '물',
    T2Label: '에탄올',
    direction: '물 → 에탄올',
    d1: D.WAT,
    d2: D.ETH,
    p1: 'P1 — 물 (kPa)',
    p2: 'P2 — 에탄올 (kPa)',
    m1: 'M1 초기 — 물 (g)',
    m2: 'M2 초기 — 에탄올 (g)',
    m1f: 'M1 최종 — 물 (g)',
    m2f: 'M2 최종 — 에탄올 (g)',
    c1: 'T1 — 물',
    c2: 'T2 — 에탄올',
  },
}

export const calcVol = (mi, mf, density) => Math.abs(mi - mf) / density * 1000
export const calcFlow = (mi, mf, density, dur) => Math.abs(mi - mf) / density * (60 / dur)
