'use client'

import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    // Add any specific props if needed
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ style, ...props }, ref) => {
    return (
        <input
            ref={ref}
            style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: '16px', // Prevents iOS zoom
                fontFamily: "'DM Mono', monospace",
                padding: '12px 0',
                minWidth: 0,
                ...style
            }}
            {...props}
        />
    )
})

Input.displayName = 'Input'
