import { useCallback, useEffect, useState } from 'react'

export type StudentAccessStatus = 'active' | 'blocked'
export type TestReportType = 'final' | 'admission'

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
  currentTest: string
  progress: number
  started: number
  completed: number
  score: number | null
  state: 'În lucru' | 'Finalizat' | 'Abandonat' | 'Inactiv'
}

export interface StudentTestReport {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  type: TestReportType
  testName: string
  submittedAt: string
  score: number
  total: number
  elapsedSeconds: number
  archiveCode: string
  chapterNumber?: number
  year?: number
  session?: string
  variant?: string
  economyRange?: string
}

const ACCESS_STORAGE_KEY = 'economia-admin-access-v1'

const initialStudents: StudentAccessRecord[] = [
  { id: 'student-andrei', name: 'Andrei Popescu', email: 'andrei@exemplu.ro', status: 'active', isOnline: true, device: 'Laptop · Chrome', lastLogin: '2026-09-15T17:42:00+03:00', lastLogout: '2026-09-14T20:18:00+03:00', lastActivity: '2026-09-15T19:54:00+03:00' },
  { id: 'student-maria', name: 'Maria Ionescu', email: 'maria@exemplu.ro', status: 'active', isOnline: false, device: 'Mobil · Safari', lastLogin: '2026-09-15T15:10:00+03:00', lastLogout: '2026-09-15T16:26:00+03:00', lastActivity: '2026-09-15T16:25:00+03:00' },
  { id: 'student-radu', name: 'Radu Pavel', email: 'radu@exemplu.ro', status: 'blocked', isOnline: false, device: '—', lastLogin: '2026-09-12T18:04:00+03:00', lastLogout: '2026-09-12T19:31:00+03:00', lastActivity: '2026-09-12T19:30:00+03:00' },
]

const initialActivity: StudentActivityRecord[] = [
  { id: 'activity-1', studentId: 'student-andrei', currentTest: 'Test final · Capitolul 12', progress: 63, started: 1, completed: 0, score: null, state: 'În lucru' },
  { id: 'activity-2', studentId: 'student-maria', currentTest: 'Admitere 2025 · G1', progress: 100, started: 2, completed: 2, score: 24, state: 'Finalizat' },
  { id: 'activity-3', studentId: 'student-radu', currentTest: 'Test final · Capitolul 09', progress: 37, started: 1, completed: 0, score: null, state: 'Abandonat' },
]

export const initialReports: StudentTestReport[] = [
  { id: 'report-1', studentId: 'student-andrei', studentName: 'Andrei Popescu', studentEmail: 'andrei@exemplu.ro', type: 'final', testName: 'Test final · Piața monetară', submittedAt: '2026-09-14T18:36:00+03:00', score: 25, total: 30, elapsedSeconds: 2384, archiveCode: 'CAP12-A9F2D1', chapterNumber: 12 },
  { id: 'report-2', studentId: 'student-maria', studentName: 'Maria Ionescu', studentEmail: 'maria@exemplu.ro', type: 'admission', testName: 'Admitere 2025 · G1', submittedAt: '2026-09-15T16:25:00+03:00', score: 24, total: 30, elapsedSeconds: 2960, archiveCode: 'ADM25-G1-7C42', year: 2025, session: '23 iulie 2025', variant: 'G1', economyRange: '51–80' },
  { id: 'report-3', studentId: 'student-andrei', studentName: 'Andrei Popescu', studentEmail: 'andrei@exemplu.ro', type: 'final', testName: 'Test final · Piața muncii', submittedAt: '2026-09-13T20:08:00+03:00', score: 21, total: 30, elapsedSeconds: 2645, archiveCode: 'CAP16-C0847E', chapterNumber: 16 },
  { id: 'report-4', studentId: 'student-radu', studentName: 'Radu Pavel', studentEmail: 'radu@exemplu.ro', type: 'admission', testName: 'Admitere 2024 · G2', submittedAt: '2026-09-12T19:29:00+03:00', score: 18, total: 30, elapsedSeconds: 3188, archiveCode: 'ADM24-G2-28E1', year: 2024, session: '23 iulie 2024', variant: 'G2', economyRange: '51–80' },
  { id: 'report-5', studentId: 'student-maria', studentName: 'Maria Ionescu', studentEmail: 'maria@exemplu.ro', type: 'final', testName: 'Test final · Cererea și oferta', submittedAt: '2026-09-10T17:14:00+03:00', score: 27, total: 30, elapsedSeconds: 2110, archiveCode: 'CAP06-F31B20', chapterNumber: 6 },
]

function loadStudents() {
  try {
    const stored = window.localStorage.getItem(ACCESS_STORAGE_KEY)
    if (stored) return JSON.parse(stored) as StudentAccessRecord[]
  } catch {
    // The in-memory access list remains available if storage is restricted.
  }
  return initialStudents
}

export function useAdminData() {
  const [students, setStudents] = useState<StudentAccessRecord[]>(loadStudents)
  const [activity, setActivity] = useState<StudentActivityRecord[]>(initialActivity)
  const [reports] = useState<StudentTestReport[]>(initialReports)

  useEffect(() => {
    try {
      window.localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(students))
    } catch {
      // The prototype still works in memory when local storage is unavailable.
    }
  }, [students])

  useEffect(() => {
    const syncAccessList = (event: StorageEvent) => {
      if (event.key !== ACCESS_STORAGE_KEY || !event.newValue) return
      try {
        setStudents(JSON.parse(event.newValue) as StudentAccessRecord[])
      } catch {
        // Ignore malformed data; production persistence will validate server payloads.
      }
    }
    window.addEventListener('storage', syncAccessList)
    return () => window.removeEventListener('storage', syncAccessList)
  }, [])

  const authorizeStudent = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase()
    return students.find((student) => student.email.toLowerCase() === normalized) ?? null
  }, [students])

  const addStudent = useCallback((name: string, email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (students.some((student) => student.email.toLowerCase() === normalizedEmail)) return 'Adresa există deja în lista de acces.'
    const student: StudentAccessRecord = {
      id: `student-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      status: 'active',
      isOnline: false,
      device: '—',
      lastLogin: null,
      lastLogout: null,
      lastActivity: null,
    }
    setStudents((current) => [student, ...current])
    return null
  }, [students])

  const setBlocked = useCallback((studentId: string, blocked: boolean) => {
    setStudents((current) => current.map((student) => student.id === studentId ? { ...student, status: blocked ? 'blocked' : 'active', isOnline: blocked ? false : student.isOnline } : student))
  }, [])

  const setAllBlocked = useCallback((blocked: boolean) => {
    setStudents((current) => current.map((student) => ({ ...student, status: blocked ? 'blocked' : 'active', isOnline: blocked ? false : student.isOnline })))
  }, [])

  const disconnectStudent = useCallback((studentId: string) => {
    const now = new Date().toISOString()
    setStudents((current) => current.map((student) => student.id === studentId ? { ...student, isOnline: false, lastLogout: now, lastActivity: now } : student))
    setActivity((current) => current.map((entry) => entry.studentId === studentId && entry.state === 'În lucru' ? { ...entry, state: 'Abandonat' } : entry))
  }, [])

  const connectStudent = useCallback((email: string) => {
    const now = new Date().toISOString()
    const normalized = email.trim().toLowerCase()
    const device = /Mobi|Android/i.test(window.navigator.userAgent) ? 'Mobil · Browser' : 'Desktop · Browser'
    setStudents((current) => current.map((student) => student.email.toLowerCase() === normalized
      ? { ...student, isOnline: true, device, lastLogin: now, lastActivity: now }
      : student))
  }, [])

  const registerAndConnectStudent = useCallback((name: string, email: string) => {
    const now = new Date().toISOString()
    const normalizedEmail = email.trim().toLowerCase()
    const device = /Mobi|Android/i.test(window.navigator.userAgent) ? 'Mobil · Browser' : 'Desktop · Browser'
    setStudents((current) => {
      const existing = current.find((student) => student.email.toLowerCase() === normalizedEmail)
      if (existing) {
        return current.map((student) => student.id === existing.id
          ? { ...student, name: name.trim(), isOnline: true, device, lastLogin: now, lastActivity: now }
          : student)
      }
      const student: StudentAccessRecord = {
        id: `student-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        status: 'active',
        isOnline: true,
        device,
        lastLogin: now,
        lastLogout: null,
        lastActivity: now,
      }
      return [student, ...current]
    })
  }, [])

  const disconnectStudentByEmail = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase()
    const now = new Date().toISOString()
    setStudents((current) => current.map((student) => student.email.toLowerCase() === normalized
      ? { ...student, isOnline: false, lastLogout: now, lastActivity: now }
      : student))
  }, [])

  const removeStudent = useCallback((studentId: string) => {
    setStudents((current) => current.filter((student) => student.id !== studentId))
    setActivity((current) => current.filter((entry) => entry.studentId !== studentId))
  }, [])

  return { students, activity, reports, authorizeStudent, addStudent, setBlocked, setAllBlocked, disconnectStudent, connectStudent, registerAndConnectStudent, disconnectStudentByEmail, removeStudent }
}

export type AdminDataApi = ReturnType<typeof useAdminData>
