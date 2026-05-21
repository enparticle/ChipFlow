import { createClient } from '@supabase/supabase-js'

// ── Supabase ─────────────────────────────────────────────
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── FastAPI backend ───────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:  (path, params = {}) => {
    const url = new URL(BASE + path)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    return fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
  },
  post:   (path, body) => request('POST',   path, body),
  delete: (path)       => request('DELETE',  path),
}

// ── Supabase experiment log save ─────────────────────────
export async function saveLogToSupabase(payload) {
  const { error } = await supabase
    .from('experimental_logs')
    .insert([payload])
  if (error) throw new Error(error.message)
}

// ── Supabase: fetch logs for a chip ─────────────────────
export async function fetchLogsFromSupabase(chipId, limit = 200) {
  const { data, error } = await supabase
    .from('experimental_logs')
    .select('*')
    .eq('chip_id', chipId)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}
