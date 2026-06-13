import { useCallback, useEffect, useState } from 'react'
import { db } from './data'
import type { QmsRecord, User } from './types'

export function useCollection(slug: string) {
  const [rows, setRows] = useState<QmsRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setRows(await db().list(slug))
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    reload()
  }, [reload])

  return { rows, loading, error, reload }
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const reload = useCallback(async () => {
    try {
      setUsers(await db().listUsers())
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  return { users, reload }
}
