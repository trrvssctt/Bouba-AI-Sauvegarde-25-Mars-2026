/**
 * AvatarBouba — 20 animations for the Bouba character
 *
 * Animations:
 *  1. idle         - gentle levitation
 *  2. wave         - arm-swing bonjour
 *  3. thinking     - head-tilt + slow bob
 *  4. talking      - lip-sync micro-scale pulses
 *  5. walking      - horizontal stroll + bob
 *  6. happy        - bouncy jumps
 *  7. celebrate    - spin jump + confetti stars
 *  8. sleeping     - tilt + floating zzz
 *  9. surprised    - pop scale + micro-shake
 * 10. confused     - alternating head tilts
 * 11. loading      - continuous spin
 * 12. nod          - rapid vertical bob
 * 13. shake        - rapid horizontal "non"
 * 14. excited      - rapid small bounces + twist
 * 15. shy          - shrink + tilt + blush
 * 16. angry        - rapid shake + red glow
 * 17. love         - heartbeat pulse + hearts
 * 18. typing       - lean forward + tap
 * 19. search       - panoramic scan left-right
 * 20. arrive       - fly in from below + bounce
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation, AnimatePresence, Variants } from 'motion/react'
import { cn } from '@/src/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

export type AvatarAnimation =
  | 'idle' | 'wave' | 'thinking' | 'talking' | 'walking'
  | 'happy' | 'celebrate' | 'sleeping' | 'surprised' | 'confused'
  | 'loading' | 'nod' | 'shake' | 'excited' | 'shy'
  | 'angry' | 'love' | 'typing' | 'search' | 'arrive'

interface AvatarBoubaProps {
  animation?: AvatarAnimation
  size?: number
  className?: string
  autoIdle?: boolean          // revert to idle after one-shot animations
  onClick?: () => void
  label?: string              // speech bubble text
}

// ─── Particle helpers ───────────────────────────────────────────────────────

function Particle({ emoji, delay = 0 }: { emoji: string; delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -60, x: (Math.random() - 0.5) * 40, scale: [0.5, 1.2, 1, 0.5] }}
      transition={{ duration: 1.8, delay, ease: 'easeOut', repeat: Infinity, repeatDelay: 1.2 }}
      className="absolute pointer-events-none select-none text-xl"
      style={{ bottom: '90%', left: '50%', translateX: '-50%' }}
    >
      {emoji}
    </motion.span>
  )
}

function Stars() {
  const items = ['⭐', '✨', '🌟', '💫', '⚡']
  return (
    <>
      {items.map((s, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.4, 0],
            x: Math.cos((i / items.length) * Math.PI * 2) * 50,
            y: Math.sin((i / items.length) * Math.PI * 2) * 50,
          }}
          transition={{ duration: 0.8, delay: i * 0.1, repeat: Infinity, repeatDelay: 1.5 }}
          className="absolute pointer-events-none select-none text-lg"
          style={{ top: '20%', left: '50%' }}
        >
          {s}
        </motion.span>
      ))}
    </>
  )
}

function Hearts() {
  return (
    <>
      {['❤️', '💜', '💙', '💛'].map((h, i) => (
        <Particle key={i} emoji={h} delay={i * 0.4} />
      ))}
    </>
  )
}

function ZZZ() {
  return (
    <>
      {['z', 'z', 'Z'].map((z, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], y: -(30 + i * 18), x: 10 + i * 8, scale: [0.5, 1 + i * 0.3, 0] }}
          transition={{ duration: 2, delay: i * 0.7, repeat: Infinity, repeatDelay: 0.8 }}
          className="absolute pointer-events-none select-none font-bold text-blue-400"
          style={{ fontSize: `${0.7 + i * 0.2}rem`, top: '10%', right: '-10%' }}
        >
          {z}
        </motion.span>
      ))}
    </>
  )
}

function Confetti() {
  const pieces = Array.from({ length: 12 }, (_, i) => ({
    color: ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'][i % 6],
    angle: (i / 12) * 360,
    dist: 40 + Math.random() * 30,
  }))
  return (
    <>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: Math.cos((p.angle * Math.PI) / 180) * p.dist,
            y: Math.sin((p.angle * Math.PI) / 180) * p.dist,
            rotate: 360,
            scale: [0, 1, 1, 0],
          }}
          transition={{ duration: 1, delay: i * 0.04, repeat: Infinity, repeatDelay: 1.8 }}
          className="absolute pointer-events-none w-2 h-2 rounded-sm"
          style={{ background: p.color, top: '40%', left: '50%' }}
        />
      ))}
    </>
  )
}

function BlushOverlay() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0.25] }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 rounded-inherit pointer-events-none"
        style={{ background: 'radial-gradient(circle at 25% 60%, rgba(255,100,130,0.4) 0%, transparent 55%), radial-gradient(circle at 75% 60%, rgba(255,100,130,0.4) 0%, transparent 55%)', borderRadius: 'inherit' }}
      />
    </>
  )
}

// ─── Animation definitions ──────────────────────────────────────────────────

type AnimDef = {
  variants: Variants
  looping: boolean
  particles?: 'zzz' | 'hearts' | 'stars' | 'confetti' | 'blush'
}

const ANIM_MAP: Record<AvatarAnimation, AnimDef> = {
  idle: {
    looping: true,
    variants: {
      active: {
        y: [0, -8, 0],
        transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
      },
    },
  },
  wave: {
    looping: true,
    variants: {
      active: {
        rotate: [0, -15, 12, -15, 12, -8, 0],
        y: [0, -4, 0],
        transition: { duration: 1.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' },
      },
    },
  },
  thinking: {
    looping: true,
    variants: {
      active: {
        rotate: [0, -8, 0, -6, 0],
        y: [0, -3, 0, -2, 0],
        scale: [1, 1.02, 1],
        transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
      },
    },
  },
  talking: {
    looping: true,
    variants: {
      active: {
        scaleY: [1, 1.04, 0.97, 1.03, 0.98, 1.04, 1],
        scaleX: [1, 0.98, 1.01, 0.98, 1.01, 0.99, 1],
        transition: { duration: 0.35, repeat: Infinity, ease: 'linear' },
      },
    },
  },
  walking: {
    looping: true,
    variants: {
      active: {
        x: [-60, 60],
        y: [0, -6, 0, -6, 0],
        rotate: [0, -3, 0, 3, 0],
        transition: {
          x: { duration: 2.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
          y: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
        },
      },
    },
  },
  happy: {
    looping: true,
    variants: {
      active: {
        y: [0, -20, 0, -14, 0, -8, 0],
        rotate: [0, -5, 5, -3, 3, 0],
        scale: [1, 1.08, 1, 1.05, 1],
        transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.4, ease: 'easeOut' },
      },
    },
  },
  celebrate: {
    looping: true,
    particles: 'confetti',
    variants: {
      active: {
        rotate: [0, 360],
        y: [0, -30, 0],
        scale: [1, 1.15, 1],
        transition: { duration: 0.9, repeat: Infinity, repeatDelay: 1.2, ease: 'easeOut' },
      },
    },
  },
  sleeping: {
    looping: true,
    particles: 'zzz',
    variants: {
      active: {
        rotate: [0, 10, 10],
        y: [0, 2, 0, 2, 0],
        scale: [1, 0.97, 1],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      },
    },
  },
  surprised: {
    looping: false,
    variants: {
      active: {
        scale: [1, 1.3, 0.9, 1.1, 1],
        rotate: [0, -8, 8, -4, 0],
        transition: { duration: 0.6, ease: 'easeOut' },
      },
    },
  },
  confused: {
    looping: true,
    variants: {
      active: {
        rotate: [0, -14, 14, -10, 10, -6, 6, 0],
        y: [0, -2, -2, -2, -2, -2, -2, 0],
        transition: { duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' },
      },
    },
  },
  loading: {
    looping: true,
    variants: {
      active: {
        rotate: [0, 360],
        transition: { duration: 1.2, repeat: Infinity, ease: 'linear' },
      },
    },
  },
  nod: {
    looping: true,
    variants: {
      active: {
        y: [0, -10, 0, -7, 0, -4, 0],
        transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' },
      },
    },
  },
  shake: {
    looping: true,
    variants: {
      active: {
        x: [0, -12, 12, -10, 10, -6, 6, -3, 3, 0],
        transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' },
      },
    },
  },
  excited: {
    looping: true,
    variants: {
      active: {
        y: [0, -14, 0, -10, 0, -7, 0],
        rotate: [0, -6, 6, -4, 4, 0],
        scale: [1, 1.06, 1, 1.04, 1],
        transition: { duration: 0.5, repeat: Infinity, ease: 'easeOut' },
      },
    },
  },
  shy: {
    looping: true,
    particles: 'blush',
    variants: {
      active: {
        rotate: [0, -16],
        scale: [1, 0.88],
        y: [0, 4],
        transition: { duration: 0.5, ease: 'easeOut' },
      },
    },
  },
  angry: {
    looping: true,
    variants: {
      active: {
        x: [0, -8, 8, -7, 7, -5, 5, -3, 3, 0],
        filter: [
          'drop-shadow(0 0 0px rgba(239,68,68,0))',
          'drop-shadow(0 0 12px rgba(239,68,68,0.8))',
          'drop-shadow(0 0 6px rgba(239,68,68,0.5))',
        ],
        transition: { duration: 0.5, repeat: Infinity, repeatDelay: 0.3, ease: 'linear' },
      },
    },
  },
  love: {
    looping: true,
    particles: 'hearts',
    variants: {
      active: {
        scale: [1, 1.12, 1, 1.08, 1],
        filter: [
          'drop-shadow(0 0 0px rgba(236,72,153,0))',
          'drop-shadow(0 0 16px rgba(236,72,153,0.7))',
          'drop-shadow(0 0 0px rgba(236,72,153,0))',
        ],
        transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      },
    },
  },
  typing: {
    looping: true,
    variants: {
      active: {
        rotate: [0, -8, -8, -8, 0],
        y: [0, 4, 4, 4, 0],
        scaleX: [1, 0.96, 0.96, 0.96, 1],
        transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
      },
    },
  },
  search: {
    looping: true,
    variants: {
      active: {
        rotate: [0, -18, 18, -12, 12, -6, 0],
        x: [0, -10, 10, -8, 8, 0],
        transition: { duration: 2.5, repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' },
      },
    },
  },
  arrive: {
    looping: false,
    variants: {
      initial: { y: 80, opacity: 0, scale: 0.5 },
      active: {
        y: [80, -20, 8, -6, 0],
        opacity: [0, 1, 1, 1, 1],
        scale: [0.5, 1.15, 0.95, 1.05, 1],
        transition: { duration: 0.9, ease: 'easeOut' },
      },
    },
  },
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AvatarBouba({
  animation = 'idle',
  size = 64,
  className,
  autoIdle = true,
  onClick,
  label,
}: AvatarBoubaProps) {
  const controls = useAnimation()
  const [currentAnim, setCurrentAnim] = useState<AvatarAnimation>(animation)
  const [showLabel, setShowLabel] = useState(false)
  const labelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCurrentAnim(animation)
  }, [animation])

  useEffect(() => {
    const def = ANIM_MAP[currentAnim]
    controls.start('active')
    if (!def.looping && autoIdle) {
      // One-shot: revert to idle after the animation finishes
      const dur = (def.variants.active as any)?.transition?.duration ?? 1
      const timeout = setTimeout(() => {
        setCurrentAnim('idle')
      }, (dur + 0.1) * 1000)
      return () => clearTimeout(timeout)
    }
  }, [currentAnim])

  useEffect(() => {
    if (label) {
      setShowLabel(true)
      if (labelTimeout.current) clearTimeout(labelTimeout.current)
      labelTimeout.current = setTimeout(() => setShowLabel(false), 4000)
    }
    return () => { if (labelTimeout.current) clearTimeout(labelTimeout.current) }
  }, [label])

  const def = ANIM_MAP[currentAnim]

  const renderParticles = () => {
    switch (def.particles) {
      case 'zzz': return <ZZZ />
      case 'hearts': return <Hearts />
      case 'stars': return <Stars />
      case 'confetti': return <Confetti />
      case 'blush': return <BlushOverlay />
      default: return null
    }
  }

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Particles / overlays */}
      <AnimatePresence>{renderParticles()}</AnimatePresence>

      {/* Speech bubble */}
      <AnimatePresence>
        {showLabel && label && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-border text-secondary text-xs font-medium px-3 py-1.5 rounded-2xl shadow-lg whitespace-nowrap z-10"
          >
            {label}
            {/* Tail */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border -mt-px" />
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar image */}
      <motion.div
        animate={controls}
        initial={(def.variants.initial as any) || { opacity: 1, y: 0, x: 0 }}
        variants={def.variants}
        onClick={onClick}
        className={cn(
          'relative rounded-2xl overflow-hidden select-none',
          onClick && 'cursor-pointer',
        )}
        style={{ width: size, height: size }}
      >
        <img
          src="/avatar-bouba.png"
          alt="Bouba"
          className="w-full h-full object-cover"
          draggable={false}
          onError={e => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
          }}
        />
        {/* Mouth overlay for talking animation — pulsing gradient at chin area */}
        {currentAnim === 'talking' && (
          <motion.div
            animate={{ opacity: [0, 0.25, 0, 0.2, 0], scaleY: [0.5, 1, 0.5, 1, 0.5] }}
            transition={{ duration: 0.35, repeat: Infinity }}
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '22%',
              background: 'linear-gradient(to top, rgba(124,58,237,0.18) 0%, transparent 100%)',
              transformOrigin: 'bottom',
            }}
          />
        )}
      </motion.div>

      {/* Glow ring for active/energetic animations */}
      {['excited', 'celebrate', 'angry', 'love', 'surprised'].includes(currentAnim) && (
        <motion.div
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [0.9, 1.15, 0.9],
          }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: currentAnim === 'angry'
              ? '0 0 18px rgba(239,68,68,0.6)'
              : currentAnim === 'love'
              ? '0 0 18px rgba(236,72,153,0.6)'
              : '0 0 18px rgba(124,58,237,0.5)',
          }}
        />
      )}
    </div>
  )
}

// ─── Hook for declarative control ──────────────────────────────────────────

export function useAvatarAnimation(initialAnim: AvatarAnimation = 'idle') {
  const [animation, setAnimation] = useState<AvatarAnimation>(initialAnim)

  const play = (anim: AvatarAnimation) => setAnimation(anim)

  /** Play a one-shot animation then return to idle */
  const playOnce = (anim: AvatarAnimation, durationMs = 1000) => {
    setAnimation(anim)
    setTimeout(() => setAnimation('idle'), durationMs)
  }

  return { animation, play, playOnce }
}
