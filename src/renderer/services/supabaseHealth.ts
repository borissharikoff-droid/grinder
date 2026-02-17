import { supabase } from '../lib/supabase'

export interface SupabaseHealthResult {
  ok: boolean
  checks: Array<{ name: string; ok: boolean; detail: string }>
}

export async function runSupabaseHealthCheck(): Promise<SupabaseHealthResult> {
  if (!supabase) {
    return {
      ok: false,
      checks: [{ name: 'supabase_client', ok: false, detail: 'Supabase is not configured' }],
    }
  }

  const checks: SupabaseHealthResult['checks'] = []

  const skillsCheck = await supabase
    .from('user_skills')
    .select('user_id', { head: true, count: 'exact' })
    .limit(1)
  checks.push({
    name: 'table_user_skills',
    ok: !skillsCheck.error,
    detail: skillsCheck.error?.message ?? 'reachable',
  })

  const friendshipsDeleteCheck = await supabase
    .from('friendships')
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000000')
    .select('id')
  checks.push({
    name: 'rls_friendships_delete',
    ok: !friendshipsDeleteCheck.error,
    detail: friendshipsDeleteCheck.error?.message ?? 'policy seems present',
  })

  return {
    ok: checks.every((c) => c.ok),
    checks,
  }
}

