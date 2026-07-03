'use client'

import React, { useRef } from 'react'
import { ImageIcon, TrashIcon } from '../atoms/Icon'

interface LogoControlProps {
    logoSrc: string | null
    onLogoChange: (src: string | null) => void
    sizeRatio: number
    onSizeRatioChange: (ratio: number) => void
    tooLongForLogo?: boolean
    grayscale: boolean
    onGrayscaleChange: (grayscale: boolean) => void
    onLogoUpload: (original: string, grayscale: string) => void
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2MB, generous for an embedded raster logo

// Converts to grayscale so the logo matches the QR code's monochrome look,
// regardless of the source image's original colors.
function toGrayscale(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const px = imageData.data
            for (let i = 0; i < px.length; i += 4) {
                const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
                px[i] = px[i + 1] = px[i + 2] = gray
            }
            ctx.putImageData(imageData, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = reject
        img.src = dataUrl
    })
}

export function LogoControl({ logoSrc, onLogoChange, sizeRatio, onSizeRatioChange, tooLongForLogo, grayscale, onGrayscaleChange, onLogoUpload }: LogoControlProps) {
    const fileRef = useRef<HTMLInputElement>(null)

    function handleFile(file: File | undefined) {
        if (!file) return
        if (!file.type.startsWith('image/')) return
        if (file.size > MAX_LOGO_BYTES) return
        const reader = new FileReader()
        reader.onload = () => {
            const original = reader.result as string
            toGrayscale(original).then(gray => onLogoUpload(original, gray))
        }
        reader.readAsDataURL(file)
    }

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }}>
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={e => handleFile(e.target.files?.[0])}
                style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '11px',
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                        flex: 1,
                    }}
                >
                    <ImageIcon />
                    {logoSrc ? 'REPLACE LOGO' : 'ADD LOGO'}
                </button>

                {logoSrc && (
                    <button
                        onClick={() => onLogoChange(null)}
                        title="Remove logo"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                        }}
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>

            {logoSrc && tooLongForLogo && (
                <div className="animate-slide-down" style={{
                    fontSize: '11px',
                    color: '#f87171',
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: '0.02em',
                    lineHeight: 1.5,
                }}>
                    ↳ URL too long for a logo overlay — showing the code without it.
                </div>
            )}

            {logoSrc && !tooLongForLogo && (
                <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontSize: '10px',
                        color: 'var(--text-dim)',
                        letterSpacing: '0.08em',
                        flexShrink: 0,
                        width: '32px',
                    }}>
                        SIZE
                    </span>
                    <input
                        type="range"
                        min={0.3}
                        max={1}
                        step={0.01}
                        value={sizeRatio}
                        onChange={e => onSizeRatioChange(parseFloat(e.target.value))}
                        style={{
                            flex: 1,
                            accentColor: 'var(--accent)',
                            cursor: 'pointer',
                        }}
                    />
                    <span style={{
                        fontSize: '10px',
                        color: 'var(--text-dim)',
                        letterSpacing: '0.05em',
                        flexShrink: 0,
                        width: '32px',
                        textAlign: 'right',
                    }}>
                        {Math.round(sizeRatio * 100)}%
                    </span>
                </div>
            )}

            {logoSrc && !tooLongForLogo && (
                <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontSize: '10px',
                        color: 'var(--text-dim)',
                        letterSpacing: '0.08em',
                        flexShrink: 0,
                        width: '32px',
                    }}>
                        COLOR
                    </span>
                    <div style={{
                        display: 'flex',
                        flex: 1,
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                    }}>
                        <button
                            onClick={() => onGrayscaleChange(false)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                background: grayscale ? 'var(--surface)' : 'var(--accent)',
                                color: grayscale ? 'var(--text-muted)' : 'var(--accent-contrast)',
                                fontSize: '10px',
                                fontFamily: "'DM Mono', monospace",
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                            }}
                        >
                            ORIGINAL
                        </button>
                        <button
                            onClick={() => onGrayscaleChange(true)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                background: grayscale ? 'var(--accent)' : 'var(--surface)',
                                color: grayscale ? 'var(--accent-contrast)' : 'var(--text-muted)',
                                fontSize: '10px',
                                fontFamily: "'DM Mono', monospace",
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                            }}
                        >
                            BLACK & WHITE
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
