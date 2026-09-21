import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'webwatch-academy:v1'
const empty = { milestones: {}, quiz: {}, practice: {}, theme: null }

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved ? { ...empty, ...saved } : empty
  } catch {
    return empty
  }
}

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can be blocked (private mode). Progress then lasts for this tab only.
    }
  }, [state])

  const update = useCallback((section, id, patch) => {
    setState((current) => ({
      ...current,
      [section]: { ...current[section], [id]: { ...current[section][id], ...patch } },
    }))
  }, [])

  const value = useMemo(() => ({
    state,
    milestone: (id) => state.milestones[id] || {},
    setMilestone: (id, patch) => update('milestones', id, patch),
    setQuiz: (id, patch) => update('quiz', id, patch),
    setPractice: (id, patch) => update('practice', id, patch),
    setTheme: (theme) => setState((current) => ({ ...current, theme })),
    reset: () => setState({ ...empty, theme: state.theme }),
  }), [state, update])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  return useContext(ProgressContext)
}

export function statusOf(entry) {
  return entry?.status || 'not-started'
}
