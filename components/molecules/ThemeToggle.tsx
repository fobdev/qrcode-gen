'use client'

import React from 'react'
import { SunIcon, MoonIcon } from '../atoms/Icon'

interface ThemeToggleProps {
    theme: 'light' | 'dark'
    toggleTheme: () => void
}

export function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
    return (
        <button
            onClick={toggleTheme}
            style={{
                position: 'fixed',
                top: '1.5rem',
                right: '1.5rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text)',
                transition: 'all 0.2s var(--ease-out-expo)',
                zIndex: 100,
                boxShadow: '0 4px 12px var(--shadow)',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'scale(1)'
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <div className="animate-scale-in" key={theme}>
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </div>
        </button>
    )
}
