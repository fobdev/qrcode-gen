'use client'

import React from 'react'
import { Button } from '../atoms/Button'
import { DownloadIcon } from '../atoms/Icon'

interface DownloadGroupProps {
    isGenerating: boolean
    onDownloadSVG: () => void
    onDownloadPNG: () => void
}

export function DownloadGroup({ isGenerating, onDownloadSVG, onDownloadPNG }: DownloadGroupProps) {
    return (
        <div style={{
            display: 'flex',
            gap: '8px',
            width: '100%',
            animation: 'fadeIn 0.5s ease 0.2s both',
        }}>
            <Button variant="secondary" isGenerating={isGenerating} onClick={onDownloadSVG}>
                <DownloadIcon />
                SVG
            </Button>

            <Button variant="primary" isGenerating={isGenerating} onClick={onDownloadPNG}>
                <DownloadIcon />
                PNG · 4×
            </Button>
        </div>
    )
}
