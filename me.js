import supabase from '../../../lib/supabase'
import { requireAuth } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const payload = requireAuth(req, res)
  if (!payload) return

  const { data: user } = await supabase
    .from('users').select('id, name, email, plan, scans_used').eq('id', payload.userId).single()
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })

  const { data: scans } = await supabase
    .from('scans').select('input, score, status, input_type, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(15)

  const history = (scans || []).map(s => ({
    query: s.input, score: s.score, status: s.status,
    inputType: s.input_type, ts: new Date(s.created_at).getTime(),
  }))

  return res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, scansUsed: user.scans_used, history }
  })
}
