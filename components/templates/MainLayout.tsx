'use client'

import React, { useState, useEffect } from 'react'
import { ThemeToggle } from '../molecules/ThemeToggle'

import { GithubIcon } from '../atoms/Icon'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      // Default to dark, but check system preference if you want
      document.documentElement.setAttribute('data-theme', 'dark')
    }
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      gap: '0',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg)',
      color: 'var(--text)',
      transition: 'background 0.4s var(--ease-out-expo), color 0.4s var(--ease-out-expo)',
    }}>
      {mounted && <ThemeToggle theme={theme} toggleTheme={toggleTheme} />}

      {/* Background grid */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        opacity: 0.3,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Radial vignette */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, var(--bg) 100%)',
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'background 0.4s var(--ease-out-expo)',
      }} />

      {/* Content wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '580px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
      }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '10px',
        color: 'var(--text-dim)',
        letterSpacing: '0.12em',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}>
        <span>NO DEPS · NO TRACKING · OPEN SOURCE ·</span>
        <a
          href="https://github.com/fobdev/qrcode-gen"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-dim)',
            transition: 'all 0.3s var(--ease-out-expo)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text)'
            e.currentTarget.style.filter = 'drop-shadow(0 0 8px var(--text))'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-dim)'
            e.currentTarget.style.filter = 'none'
          }}
        >
          <span>MADE BY FOBDEV</span>
          <GithubIcon />
        </a>
      </div>

      <style>{`
        :root {
          --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
          --ease-in-out-cubic: cubic-bezier(0.65, 0, 0.35, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes qrIn {
          from { opacity: 0; scale: 0.98; filter: blur(4px); }
          to   { opacity: 1; scale: 1; filter: blur(0); }
        }
        @keyframes scan {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .qr-svg-wrapper svg {
          width: 100% !important;
          height: 100% !important;
        }
        input::placeholder { color: var(--text-dim); }
        
        .animate-fade-in { animation: fadeIn 0.6s var(--ease-out-expo) both; }
        .animate-scale-in { animation: scaleIn 0.5s var(--ease-out-expo) both; }
        .animate-slide-down { animation: slideDown 0.4s var(--ease-out-expo) both; }
      `}</style>
    </main>
  )
}
