import { createClient } from '@supabase/supabase-js'

// ── Supabase ──────────────────────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.includes('your-project')) return null
  return createClient(url, key)
}
export const supabase = getSupabase()

export async function saveLog(payload) {
  const sb = supabase
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다')
  const { error } = await sb.from('experimental_logs').insert([payload])
  if (error) throw new Error(error.message)
}

export async function fetchLogs(chipId, limit = 200) {
  const sb = supabase
  if (!sb) return []
  const { data, error } = await sb
    .from('experimental_logs')
    .select('*')
    .eq('chip_id', chipId)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}

// ── FastAPI backend ───────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  get: async (path, params = {}) => {
    const url = new URL(BASE + path)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  post:   (path, body) => req('POST', path, body),
  put:    (path, body) => req('PUT',  path, body),
  delete: (path)       => req('DELETE', path),
}
