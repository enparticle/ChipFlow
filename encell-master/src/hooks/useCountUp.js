import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, decimals = 4, duration = 650, deps = []) {
  const [value, setValue] = useState(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (target === null || target === undefined) { setValue(null); return }
    const start = 0
    const t0 = performance.now()

    function step(now) {
      const prog = Math.min((now - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - prog, 3)
      setValue(parseFloat((start + (target - start) * ease).toFixed(decimals)))
      if (prog < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ...deps])

  return value
}
