'use client'
import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, decimals = 4, duration = 680) {
  const [val, setVal] = useState(null)
  const raf = useRef(null)

  useEffect(() => {
    if (target == null) { setVal(null); return }
    const t0 = performance.now()
    const tick = now => {
      const p = Math.min((now - t0) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(parseFloat((target * e).toFixed(decimals)))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, decimals, duration])

  return val
}
