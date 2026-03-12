'use client'

import { MainLayout } from '@/components/templates/MainLayout'
import { QRGenerator } from '@/components/organisms/QRGenerator'

export default function Home() {
  return (
    <MainLayout>
      <QRGenerator />
    </MainLayout>
  )
}
