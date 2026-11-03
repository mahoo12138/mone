import { getSupabase } from './supabase'
import type { NotificationChannel, NotificationChannelInput } from '../types'

interface ChannelRow {
  id: string
  name: string
  type: NotificationChannel['type']
  config: Record<string, string>
  enabled: boolean
  created_at: string
}

function target(row: ChannelRow) {
  if (row.type === 'telegram') return `Chat ID •••• ${row.config.chat_id?.slice(-4) ?? '----'}`
  return `Webhook •••• ${row.config.webhook_url?.slice(-4) ?? '----'}`
}

function mapChannel(row: ChannelRow): NotificationChannel {
  return { id: row.id, name: row.name, type: row.type, target: target(row), config: row.config, enabled: row.enabled, createdAt: row.created_at }
}

export async function listNotificationChannels() {
  const { data, error } = await getSupabase().from('notification_channels').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as ChannelRow[]).map(mapChannel)
}

export async function createNotificationChannel(input: NotificationChannelInput) {
  const { data, error } = await getSupabase().from('notification_channels').insert({
    name: input.name, type: input.type, config: input.config, enabled: true,
  }).select('*').single()
  if (error) throw error
  return mapChannel(data as ChannelRow)
}

export async function deleteNotificationChannel(id: string) {
  const { error } = await getSupabase().from('notification_channels').delete().eq('id', id)
  if (error) throw error
}

export async function setNotificationChannelEnabled(id: string, enabled: boolean) {
  const { error } = await getSupabase().from('notification_channels').update({ enabled }).eq('id', id)
  if (error) throw error
}
