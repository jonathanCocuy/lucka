import type { Metadata } from 'next'
import { en } from '@/lib/i18n/en'
import { Settings } from './settings'

export const metadata: Metadata = { title: en.meta.settingsTitle }

export default function SettingsPage() {
  return <Settings />
}
