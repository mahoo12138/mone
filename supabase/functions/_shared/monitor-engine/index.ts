import type { CheckResult, HttpConfig, MonitorRecord, TcpConfig } from '../types.ts'
import { checkHttp } from './http.ts'
import { checkTcp } from './tcp.ts'

export async function runCheck(monitor: MonitorRecord): Promise<CheckResult> {
  if (monitor.type === 'http') return checkHttp(monitor.config as unknown as HttpConfig)
  return checkTcp(monitor.config as unknown as TcpConfig)
}
