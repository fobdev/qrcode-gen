'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { generateQR, qrToSVG, chooseVersion } from '@/lib/qr'
import { InputBar } from '../molecules/InputBar'
import { QRContainer } from '../molecules/QRContainer'
import { DownloadGroup } from '../molecules/DownloadGroup'

export function QRGenerator() {
    const [url, setUrl] = useState('')
    const [svgString, setSvgString] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [version, setVersion] = useState<number | null>(null)
    const [copied, setCopied] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function isValidUrl(str: string): boolean {
        if (!str.trim()) return false
        try {
            const url = new URL(str)
            return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
            return false
        }
    }

    const generate = useCallback((value: string) => {
        const trimmed = value.trim()
        if (!trimmed) {
            setSvgString(null)
            setError(null)
            setVersion(null)
            return
        }

        if (!isValidUrl(trimmed)) {
            setSvgString(null)
            setError('Enter a valid URL starting with http:// or https://')
            setVersion(null)
            return
        }

        setIsGenerating(true)
        setError(null)

        try {
            const urlBytes = new TextEncoder().encode(trimmed)
            const v = chooseVersion(urlBytes.length)
            setVersion(v)
        } catch (e: unknown) {
            // Version calculation error
        }

        setTimeout(() => {
            try {
                const qr = generateQR(trimmed)
                const svg = qrToSVG(qr, 12, 4)
                setSvgString(svg)
                setVersion(qr.version)
                setError(null)
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Failed to generate QR code')
                setSvgString(null)
                setVersion(null)
            } finally {
                setIsGenerating(false)
            }
        }, 500)
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => generate(url), 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [url, generate])

    function downloadSVG() {
        if (!svgString) return
        const blob = new Blob([svgString], { type: 'image/svg+xml' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'qrcode.svg'
        a.click()
    }

    function downloadPNG() {
        if (!svgString) return
        const blob = new Blob([svgString], { type: 'image/svg+xml' })
        const svgUrl = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
            const scale = 4
            const canvas = document.createElement('canvas')
            canvas.width = img.width * scale
            canvas.height = img.height * scale
            const ctx = canvas.getContext('2d')!
            ctx.imageSmoothingEnabled = false
            ctx.scale(scale, scale)
            ctx.drawImage(img, 0, 0)
            const a = document.createElement('a')
            a.href = canvas.toDataURL('image/png')
            a.download = 'qrcode.png'
            a.click()
            URL.revokeObjectURL(svgUrl)
        }
        img.src = svgUrl
    }

    async function copyUrl() {
        if (!url.trim()) return
        await navigator.clipboard.writeText(url.trim())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const hasQR = !!svgString && !isGenerating
    const urlLen = new TextEncoder().encode(url.trim()).length
    const qrSide = version ? (version * 4 + 25) * 12 : 348

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'all 0.6s var(--ease-out-expo)',
        }}>
            {/* Title */}
            <div
                className="animate-fade-in"
                style={{
                    marginBottom: '2.5rem',
                    textAlign: 'center',
                    animationDelay: '0ms'
                }}
            >
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: 'var(--text)',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                }}>
                    QR
                </h1>
                <p style={{
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 400,
                }}>
                    URL → code
                </p>
            </div>

            <div className="animate-fade-in" style={{ width: '100%', animationDelay: '50ms' }}>
                <InputBar
                    url={url}
                    setUrl={setUrl}
                    onCopy={copyUrl}
                    onClear={() => setUrl('')}
                    copied={copied}
                />
            </div>

            {/* Error Message with smooth entry */}
            <div style={{
                width: '100%',
                height: error ? 'auto' : 0,
                opacity: error ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.4s var(--ease-out-expo)',
            }}>
                {error && (
                    <div className="animate-slide-down" style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: '#f87171',
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: '0.02em',
                    }}>
                        ↳ {error}
                    </div>
                )}
            </div>

            {/* QR Code output section with persistent container for smooth exit */}
            <div style={{
                width: '100%',
                opacity: (svgString || isGenerating) ? 1 : 0,
                transform: (svgString || isGenerating) ? 'translateY(0)' : 'translateY(24px)',
                maxHeight: (svgString || isGenerating) ? '800px' : '0px',
                marginTop: (svgString || isGenerating) ? '2rem' : '0px',
                pointerEvents: (svgString || isGenerating) ? 'auto' : 'none',
                overflow: 'hidden',
                transition: 'all 0.7s var(--ease-out-expo)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
            }}>
                <QRContainer
                    isGenerating={isGenerating}
                    svgString={svgString}
                    qrSide={qrSide}
                />

                <div style={{
                    display: 'flex',
                    gap: '24px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.1em',
                }}>
                    {isGenerating ? (
                        <span style={{ opacity: 0.5, animation: 'blink 1.5s infinite' }}>CALCULATING ATTRIBUTES…</span>
                    ) : (
                        <div className="animate-fade-in" key={version}>
                            <span>V{version} · EC/M · {urlLen}B</span>
                            <span style={{ color: 'var(--text-dim)', marginLeft: '24px' }}>
                                {((version! * 4 + 17))} × {((version! * 4 + 17))} modules
                            </span>
                        </div>
                    )}
                </div>

                <DownloadGroup
                    isGenerating={isGenerating}
                    onDownloadSVG={downloadSVG}
                    onDownloadPNG={downloadPNG}
                />
            </div>

            {/* Hint text with smooth transition */}
            <div style={{
                marginTop: !url ? '1.5rem' : '0px',
                opacity: !url ? 1 : 0,
                transform: !url ? 'translateY(0)' : 'translateY(12px)',
                maxHeight: !url ? '100px' : '0px',
                transition: 'all 0.6s var(--ease-out-expo)',
                pointerEvents: !url ? 'auto' : 'none',
                overflow: 'hidden',
            }}>
                <p style={{
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    letterSpacing: '0.08em',
                    textAlign: 'center',
                    lineHeight: 1.8,
                }}>
                    paste any URL above<br />
                    code generates automatically
                </p>
            </div>
        </div>
    )
}
