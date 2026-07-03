'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { generateQR, qrToSVG, chooseVersion, maxLogoRatio, maxUrlBytes } from '@/lib/qr'
import { InputBar } from '../molecules/InputBar'
import { QRContainer } from '../molecules/QRContainer'
import { DownloadGroup } from '../molecules/DownloadGroup'
import { LogoControl } from '../molecules/LogoControl'

const DEFAULT_SCHEME = 'https://'

export function QRGenerator() {
    const [url, setUrl] = useState(DEFAULT_SCHEME)
    const [svgString, setSvgString] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [version, setVersion] = useState<number | null>(null)
    const [copied, setCopied] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [logoOriginal, setLogoOriginal] = useState<string | null>(null)
    const [logoGray, setLogoGray] = useState<string | null>(null)
    const [logoGrayscale, setLogoGrayscale] = useState(true)
    const [logoSizeRatio, setLogoSizeRatio] = useState(0.75) // fraction of the safe max, not of the QR itself
    const [logoTooLongForUrl, setLogoTooLongForUrl] = useState(false)
    const logoSrc = logoGrayscale ? logoGray : logoOriginal
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // "Pristine" covers both a truly empty field and the auto-filled https://
    // scheme the user hasn't typed past yet — both should behave like "nothing
    // entered" for hints, error suppression, and generation triggering.
    function isPristine(value: string): boolean {
        const trimmed = value.trim()
        return !trimmed || trimmed === DEFAULT_SCHEME
    }

    function isValidUrl(str: string): boolean {
        if (!str.trim()) return false
        try {
            const url = new URL(str)
            return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
            return false
        }
    }

    const generate = useCallback((value: string, logo: string | null, sizeRatio: number) => {
        const trimmed = value.trim()
        if (isPristine(trimmed)) {
            setSvgString(null)
            setError(null)
            setVersion(null)
            setLogoTooLongForUrl(false)
            return
        }

        if (!isValidUrl(trimmed)) {
            setSvgString(null)
            setError('Enter a valid URL starting with http:// or https://')
            setVersion(null)
            setLogoTooLongForUrl(false)
            return
        }

        setIsGenerating(true)
        setError(null)

        const urlBytes = new TextEncoder().encode(trimmed)
        // A logo forces EC level H (much lower capacity than M). If the URL doesn't
        // fit at H, fall back to M so the plain QR still generates instead of erroring.
        const fitsAtH = urlBytes.length <= maxUrlBytes('H')
        const applyLogo = !!logo && fitsAtH
        const level = applyLogo ? 'H' : 'M'
        setLogoTooLongForUrl(!!logo && !fitsAtH)

        try {
            const v = chooseVersion(urlBytes.length, level)
            setVersion(v)
        } catch (e: unknown) {
            // Version calculation error
        }

        setTimeout(() => {
            try {
                const qr = generateQR(trimmed, level)
                const logoOpts = applyLogo && logo
                    ? { src: logo, ratio: maxLogoRatio(qr.version) * sizeRatio }
                    : undefined
                const svg = qrToSVG(qr, 12, 4, logoOpts)
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
        debounceRef.current = setTimeout(() => generate(url, logoSrc, logoSizeRatio), 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [url, logoSrc, logoSizeRatio, generate])

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
        if (isPristine(url)) return
        await navigator.clipboard.writeText(url.trim())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const hasQR = !!svgString && !isGenerating
    const urlLen = new TextEncoder().encode(url.trim()).length
    const qrSide = version ? (version * 4 + 25) * 12 : 348
    const showHint = isPristine(url)

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'all 0.6s var(--ease-out-expo)',
        }}>
            {/* Title Lockup */}
            <div
                className="animate-fade-in"
                style={{
                    marginBottom: '3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    animationDelay: '0ms'
                }}
            >
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: 'var(--text)',
                    lineHeight: 0.8,
                    margin: 0,
                    display: 'flex',
                    gap: '0.02em'
                }}>
                    <span>Q</span>
                    <span>R</span>
                </h1>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    marginTop: '1.2rem',
                    fontSize: '10px',
                    fontFamily: "'DM Mono', monospace",
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.1em',
                }}>
                    <div style={{ flex: 1, textAlign: 'right' }}>URL</div>
                    <div style={{
                        padding: '0 1rem',
                        color: 'var(--text-dim)',
                        opacity: 0.8,
                        fontSize: '12px'
                    }}>
                        →
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>code</div>
                </div>
            </div>

            <div className="animate-fade-in" style={{ width: '100%', animationDelay: '50ms' }}>
                <InputBar
                    url={url}
                    setUrl={setUrl}
                    onCopy={copyUrl}
                    onClear={() => setUrl(DEFAULT_SCHEME)}
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
                maxHeight: (svgString || isGenerating) ? '5000px' : '0px',
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
                            <span>V{version} · EC/{logoSrc && !logoTooLongForUrl ? 'H' : 'M'} · {urlLen}B</span>
                            <span style={{ color: 'var(--text-dim)', marginLeft: '24px' }}>
                                {((version! * 4 + 17))} × {((version! * 4 + 17))} modules
                            </span>
                        </div>
                    )}
                </div>

                <LogoControl
                    logoSrc={logoSrc}
                    onLogoChange={() => { setLogoOriginal(null); setLogoGray(null) }}
                    onLogoUpload={(original, gray) => { setLogoOriginal(original); setLogoGray(gray) }}
                    sizeRatio={logoSizeRatio}
                    onSizeRatioChange={setLogoSizeRatio}
                    tooLongForLogo={logoTooLongForUrl}
                    grayscale={logoGrayscale}
                    onGrayscaleChange={setLogoGrayscale}
                />

                <DownloadGroup
                    isGenerating={isGenerating}
                    onDownloadSVG={downloadSVG}
                    onDownloadPNG={downloadPNG}
                />
            </div>

            {/* Hint text with smooth transition */}
            <div style={{
                marginTop: showHint ? '1.5rem' : '0px',
                opacity: showHint ? 1 : 0,
                transform: showHint ? 'translateY(0)' : 'translateY(12px)',
                maxHeight: showHint ? '100px' : '0px',
                transition: 'all 0.6s var(--ease-out-expo)',
                pointerEvents: showHint ? 'auto' : 'none',
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
