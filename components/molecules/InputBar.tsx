'use client'

import React, { useRef } from 'react'
import { Input } from '../atoms/Input'
import { CopyIcon, CheckIcon } from '../atoms/Icon'

interface InputBarProps {
    url: string
    setUrl: (url: string) => void
    onCopy: () => void
    onClear: () => void
    copied: boolean
}

export function InputBar({ url, setUrl, onCopy, onClear, copied }: InputBarProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    return (
        <div
            className="input-bar-container"
            style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
        >
            <span style={{
                padding: '0 12px',
                fontSize: '11px',
                color: 'var(--text-dim)',
                letterSpacing: '0.1em',
                flexShrink: 0,
                userSelect: 'none',
            }}>
                URL
            </span>

            <Input
                ref={inputRef}
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onPaste={e => {
                    const pasted = e.clipboardData.getData('text')
                    setUrl(pasted)
                    e.preventDefault()
                }}
                placeholder="https://example.com"
                spellCheck={false}
            />

            {url && (
                <button
                    onClick={onCopy}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '8px',
                        cursor: 'pointer',
                        color: copied ? 'var(--green)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '6px',
                        transition: 'color 0.15s',
                        flexShrink: 0,
                    }}
                    title="Copy URL"
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
            )}

            {url && (
                <button
                    onClick={onClear}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '0 8px',
                        cursor: 'pointer',
                        color: 'var(--text-dim)',
                        fontSize: '16px',
                        lineHeight: 1,
                        borderRadius: '6px',
                        flexShrink: 0,
                    }}
                    title="Clear"
                >
                    ×
                </button>
            )}
        </div>
    )
}
