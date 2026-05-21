import { useEffect, useRef } from 'react'

export default function ParticleCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    let W, H, pts = [], raf

    const N = 85

    function resize() {
      W = cv.width = window.innerWidth
      H = cv.height = window.innerHeight
    }

    function init() {
      pts = Array.from({ length: N }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.3 + 0.4,
        o: Math.random() * 0.45 + 0.12,
        col: Math.random() > 0.5 ? '59,130,246' : '34,211,238',
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 130) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(59,130,246,${(1 - d / 130) * 0.06})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      pts.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.col},${p.o})`
        ctx.fill()
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      })

      raf = requestAnimationFrame(draw)
    }

    resize(); init(); draw()
    window.addEventListener('resize', () => { resize(); init() })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', opacity: 0.5,
      }}
    />
  )
}
