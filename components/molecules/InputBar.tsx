'use client'

import React, { useRef } from 'react'
import { Input } from '../atoms/Input'
import { CopyIcon, CheckIcon } from '../atoms/Icon'

const DEFAULT_SCHEME = 'https://'

interface InputBarProps {
    url: string
    setUrl: (url: string) => void
    onCopy: () => void
    onClear: () => void
    copied: boolean
}

export function InputBar({ url, setUrl, onCopy, onClear, copied }: InputBarProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    // While the field is untouched (url is exactly the auto-filled scheme),
    // the real input stays visually empty so the browser's native placeholder
    // renders https://example.com in muted gray — matching how every other
    // "hint" in this app is styled. The moment the user types, we splice their
    // keystroke onto the hidden scheme, and from then on the input shows and
    // edits its real value like a normal field (their typing always renders
    // at full, normal opacity, same as any text they type anywhere else).
    const isPristine = url === DEFAULT_SCHEME
    const displayValue = isPristine ? '' : url

    function handleChange(typed: string) {
        setUrl(isPristine ? DEFAULT_SCHEME + typed : typed)
    }

    function handlePaste(pasted: string) {
        // A pasted value that already carries its own scheme replaces the field
        // outright — no duplicating/prepending the default on top of it.
        setUrl(pasted)
    }

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
                value={displayValue}
                onChange={e => handleChange(e.target.value)}
                onPaste={e => {
                    const pasted = e.clipboardData.getData('text')
                    handlePaste(pasted)
                    e.preventDefault()
                }}
                placeholder="https://example.com"
                spellCheck={false}
            />

            {!isPristine && (
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

            {!isPristine && (
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
