'use client'

import React from 'react'
import { QRPlaceholder } from '../atoms/QRPlaceholder'

interface QRContainerProps {
    isGenerating: boolean
    svgString: string | null
    qrSide: number
}

export function QRContainer({ isGenerating, svgString, qrSide }: QRContainerProps) {
    return (
        <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            boxShadow: '0 20px 40px -10px var(--shadow)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 25px 50px -12px var(--shadow)'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 20px 40px -10px var(--shadow)'
            }}
        >
            <div style={{
                width: `${qrSide}px`,
                height: `${qrSide}px`,
                maxWidth: 'calc(100vw - 80px)',
                maxHeight: 'calc(100vw - 80px)',
                position: 'relative'
            }}>
                {isGenerating ? (
                    <QRPlaceholder />
                ) : (
                    <div
                        dangerouslySetInnerHTML={{ __html: svgString! }}
                        className="qr-svg-wrapper"
                        style={{
                            display: 'block',
                            lineHeight: 0,
                            animation: 'qrIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            width: '100%',
                            height: '100%',
                        }}
                    />
                )}
            </div>
        </div>
    )
}
