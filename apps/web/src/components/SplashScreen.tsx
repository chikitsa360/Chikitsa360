'use client'

import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible')

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('fading'), 2200)
    const doneTimer = setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, 2800)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  if (phase === 'done') return null

  return (
    <div
      className="splash-screen"
      style={{ opacity: phase === 'fading' ? 0 : 1, pointerEvents: phase === 'fading' ? 'none' : 'auto' }}
      aria-hidden="true"
    >
      {/* Animated background orbs */}
      <div className="splash-orb splash-orb--1" />
      <div className="splash-orb splash-orb--2" />
      <div className="splash-orb splash-orb--3" />

      {/* Center content */}
      <div className="splash-content">
        {/* Pulsing ring behind logo */}
        <div className="splash-ring splash-ring--outer" />
        <div className="splash-ring splash-ring--inner" />

        {/* Logo */}
        <div className="splash-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.assets.logoUrl}
            alt={brand.assets.logoAlt}
            className="splash-logo"
          />
        </div>

        {/* Tagline */}
        {brand.meta.tagline && (
          <p className="splash-tagline">{brand.meta.tagline}</p>
        )}

        {/* Animated loading dots */}
        <div className="splash-dots">
          <span className="splash-dot splash-dot--1" />
          <span className="splash-dot splash-dot--2" />
          <span className="splash-dot splash-dot--3" />
        </div>
      </div>

      <style>{`
        .splash-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f1f5c 0%, #1b40af 40%, #008f7a 100%);
          transition: opacity 0.6s ease;
          overflow: hidden;
        }

        /* Background orbs */
        .splash-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: orbFloat 6s ease-in-out infinite;
        }
        .splash-orb--1 {
          width: 500px; height: 500px;
          background: rgba(0, 176, 155, 0.25);
          top: -100px; right: -100px;
          animation-delay: 0s;
        }
        .splash-orb--2 {
          width: 400px; height: 400px;
          background: rgba(27, 64, 175, 0.35);
          bottom: -80px; left: -80px;
          animation-delay: 2s;
        }
        .splash-orb--3 {
          width: 300px; height: 300px;
          background: rgba(0, 176, 155, 0.15);
          top: 50%; left: 20%;
          animation-delay: 4s;
        }

        /* Pulsing rings */
        .splash-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.15);
          animation: ringPulse 2.4s ease-out infinite;
        }
        .splash-ring--outer {
          width: 260px; height: 260px;
          animation-delay: 0s;
        }
        .splash-ring--inner {
          width: 200px; height: 200px;
          border-color: rgba(0, 176, 155, 0.3);
          animation-delay: 0.6s;
        }

        /* Center wrapper */
        .splash-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          animation: contentRise 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        /* Logo */
        .splash-logo-wrap {
          width: 280px;
          padding: 24px 32px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1);
          animation: logoPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }
        .splash-logo {
          width: 100%;
          height: auto;
          display: block;
        }

        /* Tagline */
        .splash-tagline {
          color: rgba(255, 255, 255, 0.80);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center;
          animation: fadeUp 0.6s ease 0.5s both;
        }

        /* Loading dots */
        .splash-dots {
          display: flex;
          gap: 8px;
          animation: fadeUp 0.6s ease 0.7s both;
        }
        .splash-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.6);
          animation: dotBounce 1.2s ease-in-out infinite;
        }
        .splash-dot--1 { animation-delay: 0s; }
        .splash-dot--2 { animation-delay: 0.2s; background: rgba(0,176,155,0.8); }
        .splash-dot--3 { animation-delay: 0.4s; }

        /* Keyframes */
        @keyframes contentRise {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoPop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(0.85); opacity: 0.6; }
          50%  { transform: scale(1.05); opacity: 0.2; }
          100% { transform: scale(0.85); opacity: 0.6; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
