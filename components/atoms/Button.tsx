'use client'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary'
    isGenerating?: boolean
}

export function Button({ variant = 'primary', isGenerating, children, style, onMouseEnter, onMouseLeave, ...props }: ButtonProps) {
    const isPrimary = variant === 'primary'

    const baseStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        borderRadius: '10px',
        fontSize: '12px',
        fontFamily: "'DM Mono', monospace",
        letterSpacing: '0.08em',
        cursor: isGenerating ? 'default' : 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        ...style
    }

    const primaryStyle: React.CSSProperties = {
        background: isGenerating ? 'var(--surface)' : 'var(--accent)',
        border: isGenerating ? '1px solid var(--border)' : '1px solid var(--accent)',
        color: isGenerating ? 'var(--text-dim)' : 'var(--accent-contrast)',
    }

    const secondaryStyle: React.CSSProperties = {
        background: 'var(--surface)',
        color: isGenerating ? 'var(--text-dim)' : 'var(--text)',
    }

    const finalStyle = isPrimary ? { ...baseStyle, ...primaryStyle } : { ...baseStyle, ...secondaryStyle }

    return (
        <button
            style={finalStyle}
            disabled={isGenerating}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            {...props}
        >
            {isGenerating && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                    animation: 'shimmer 2s infinite',
                }} />
            )}
            {children}
        </button>
    )
}
