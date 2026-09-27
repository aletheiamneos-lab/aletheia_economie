import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from './api'

export type StudentAccessStatus = 'active' | 'blocked'
export type TestReportType = 'final' | 'admission' | 'recap'

export interface StudentAccessRecord {
  id: string
  name: string
  email: string
  status: StudentAccessStatus
  isOnline: boolean
  device: string
  lastLogin: string | null
  lastLogout: string | null
  lastActivity: string | null
}

export interface StudentActivityRecord {
  id: string
  studentId: string
  studentEmail?: string
  currentTest: string
  progress: number
  started: number
  completed: number
  score: number | null
  total?: number | null
  state: 'În lucru' | 'Finalizat' | 'Abandonat' | 'Inactiv'
  updatedAt?: string
}

export interface StudentTestReport {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  type: TestReportType
  testName: string
  testId?: string | null
  submittedAt: string
  score: number
  total: number
  elapsedSeconds: number
  archiveCode: string
  chapterNumber?: number | null
  year?: number | null
  session?: string | null
  variant?: string | null
  economyRange?: string | null
  questionIds?: string[]
  answers?: Record<string, string>
}

export interface UsageMeter {
  usedBytes: number
  limitBytes: number
  remainingBytes: number
  percent: number
}

export interface AdminUsage {
  plan: string
  database: UsageMeter & { activeDataBytes: number; rows: number }
  storage: UsageMeter & { files: number }
  tables: Array<{ name: string; label: string; rows: number; bytes: number }>
  measuredAt: string
}

interface AdminOverview {
  students: StudentAccessRecord[]
  reports: StudentTestReport[]
  activity: StudentActivityRecord[]
  syncedAt: string
}

const REFRESH_INTERVAL_MS = 20_000

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Operațiunea nu a putut fi finalizată.'
}

export function useAdminData(enabled: boolean) {
  const [students, setStudents] = useState<StudentAccessRecord[]>([])
  const [activity, setActivity] = useState<StudentActivityRecord[]>([])
  const [reports, setReports] = useState<StudentTestReport[]>([])
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<AdminUsage | null>(null)
  const [usageError, setUsageError] = useState('')
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const refreshUsage = useCallback(async () => {
    if (!enabledRef.current) return
    try {
      setUsage(await apiRequest<AdminUsage>('/api/admin/usage'))
      setUsageError('')
    } catch (reason) {
      setUsageError(messageOf(reason))
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!enabledRef.current) return
    setLoading(true)
    try {
      const overview = await apiRequest<AdminOverview>('/api/admin/overview')
      if (!enabledRef.current) return
      setStudents(overview.students)
      setReports(overview.reports)
      setActivity(overview.activity)
      setLastSync(new Date(overview.syncedAt))
      setLoadError('')
    } catch (reason) {
      setLoadError(messageOf(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStudents([])
      setReports([])
      setActivity([])
      setLastSync(null)
      setUsage(null)
      return
    }
    void refresh()
    void refreshUsage()
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [enabled, refresh, refreshUsage])

  const run = useCallback(async (action: () => Promise<unknown>) => {
    try {
      await action()
      await Promise.all([refresh(), refreshUsage()])
      return null
    } catch (reason) {
      return messageOf(reason)
    }
  }, [refresh])

  const addStudent = useCallback((name: string, email: string) => run(() => apiRequest('/api/admin/students', { body: { name, email } })), [run])
  const setBlocked = useCallback((studentId: string, blocked: boolean) => run(() => apiRequest(`/api/admin/students/${studentId}`, { method: 'PATCH', body: { blocked } })), [run])
  const setAllBlocked = useCallback((blocked: boolean) => run(() => apiRequest('/api/admin/students/block-all', { body: { blocked } })), [run])
  const disconnectStudent = useCallback((studentId: string) => run(() => apiRequest(`/api/admin/students/${studentId}/disconnect`, { body: {} })), [run])
  const removeStudent = useCallback((studentId: string) => run(() => apiRequest(`/api/admin/students/${studentId}`, { method: 'DELETE' })), [run])

  const deleteReports = useCallback((ids: string[]) => run(() => apiRequest('/api/admin/reports/delete', { body: { ids } })), [run])
  const clearFinishedActivity = useCallback(() => run(() => apiRequest('/api/admin/activity/clear', { body: {} })), [run])

  return { students, activity, reports, usage, usageError, refreshUsage, deleteReports, clearFinishedActivity, lastSync, loadError, loading, refresh, addStudent, setBlocked, setAllBlocked, disconnectStudent, removeStudent }
}

export type AdminDataApi = ReturnType<typeof useAdminData>
