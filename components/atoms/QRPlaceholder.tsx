'use client'

import React from 'react'

export function QRPlaceholder() {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fcfcfc',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Subtle Grid Animation */}
            <div style={{
                position: 'absolute',
                inset: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gridTemplateRows: 'repeat(12, 1fr)',
                gap: '2px',
                opacity: 0.1,
            }}>
                {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} style={{
                        background: 'black',
                        borderRadius: '1px',
                        animation: `pulse 2s infinite ${Math.random() * 2}s`
                    }} />
                ))}
            </div>

            {/* Scanning Line */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--green), transparent)',
                boxShadow: '0 0 15px var(--green)',
                animation: 'scan 1.5s linear infinite',
                zIndex: 2,
            }} />

            {/* Loading Text */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
            }}>
                <span style={{
                    color: 'var(--text-dim)',
                    fontSize: '10px',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    animation: 'blink 1.5s ease-in-out infinite',
                }}>
                    GENERATING
                </span>
            </div>
        </div>
    )
}
