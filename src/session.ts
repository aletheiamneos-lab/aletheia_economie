import { useCallback, useState } from 'react'
import type { SessionState, UserRole } from './types'

export const defaultSession: SessionState = {
  isAuthenticated: false,
  userName: '',
  userEmail: '',
  completedSections: [],
  completedActivities: [],
  completedChapters: [],
  completedRecapTests: [],
  notes: '',
  lastVisitedSections: {},
  lastChapter: 1,
  userRole: 'student',
}

function namespacedKey(chapterNumber: number, id: string) {
  return `c${chapterNumber}:${id}`
}

export function useSessionState() {
  const [session, setSession] = useState<SessionState>(defaultSession)

  const selectChapter = useCallback((chapterNumber: number) => {
    setSession((current) => current.lastChapter === chapterNumber ? current : { ...current, lastChapter: chapterNumber })
  }, [])

  const toggleSection = useCallback((chapterNumber: number, sectionId: string) => {
    const key = namespacedKey(chapterNumber, sectionId)
    setSession((current) => ({
      ...current,
      completedSections: current.completedSections.includes(key)
        ? current.completedSections.filter((id) => id !== key)
        : [...current.completedSections, key],
      lastVisitedSections: { ...current.lastVisitedSections, [chapterNumber]: sectionId },
      lastChapter: chapterNumber,
    }))
  }, [])

  const completeActivity = useCallback((chapterNumber: number, activityId: string) => {
    const key = namespacedKey(chapterNumber, activityId)
    setSession((current) => current.completedActivities.includes(key)
      ? current
      : { ...current, completedActivities: [...current.completedActivities, key], lastChapter: chapterNumber })
  }, [])

  const saveNotes = useCallback((notes: string) => {
    setSession((current) => ({ ...current, notes }))
  }, [])

  const setLastVisitedSection = useCallback((chapterNumber: number, sectionId: string) => {
    setSession((current) => ({
      ...current,
      lastVisitedSections: { ...current.lastVisitedSections, [chapterNumber]: sectionId },
      lastChapter: chapterNumber,
    }))
  }, [])

  const toggleChapterCompletion = useCallback((chapterNumber: number) => {
    setSession((current) => ({
      ...current,
      completedChapters: current.completedChapters.includes(chapterNumber)
        ? current.completedChapters.filter((number) => number !== chapterNumber)
        : [...current.completedChapters, chapterNumber],
      lastChapter: chapterNumber,
    }))
  }, [])

  const toggleRecapCompletion = useCallback((chapterNumber: number) => {
    setSession((current) => ({
      ...current,
      completedRecapTests: current.completedRecapTests.includes(chapterNumber)
        ? current.completedRecapTests.filter((number) => number !== chapterNumber)
        : [...current.completedRecapTests, chapterNumber],
    }))
  }, [])

  const login = useCallback((user: { name: string; email: string; role: UserRole }) => {
    setSession((current) => ({
      ...current,
      isAuthenticated: true,
      userName: user.name.trim(),
      userEmail: user.email.trim().toLowerCase(),
      userRole: user.role,
    }))
  }, [])

  const logout = useCallback(() => {
    setSession({ ...defaultSession })
  }, [])

  const getChapterState = useCallback((chapterNumber: number) => {
    const prefix = `c${chapterNumber}:`
    return {
      completedSections: session.completedSections.filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length)),
      completedActivities: session.completedActivities.filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length)),
      lastVisitedSection: session.lastVisitedSections[chapterNumber],
      completed: session.completedChapters.includes(chapterNumber),
      recapCompleted: session.completedRecapTests.includes(chapterNumber),
    }
  }, [session])

  return {
    session,
    getChapterState,
    selectChapter,
    toggleSection,
    completeActivity,
    saveNotes,
    setLastVisitedSection,
    toggleChapterCompletion,
    toggleRecapCompletion,
    login,
    logout,
  }
}

export type SessionApi = ReturnType<typeof useSessionState>
