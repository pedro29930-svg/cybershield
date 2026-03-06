import bcrypt from 'bcryptjs'
import supabase from '../../../lib/supabase'
import { signToken, makeTokenCookie } from '../../../lib/auth'
import { rateLimit } from '../../../lib/rateLimit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!rateLimit(req, res, { max: 10, windowMs: 60_000 })) return

  const { name, email, password } = req.body || {}

  if (!name?.trim())                                      return res.status(400).json({ error: 'Nome obrigatório.' })
  if (!email?.trim())                                     return res.status(400).json({ error: 'E-mail obrigatório.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))         return res.status(400).json({ error: 'E-mail inválido.' })
  if (!password || password.length < 6)                   return res.status(400).json({ error: 'Senha mínima de 6 caracteres.' })

  const emailLower = email.toLowerCase().trim()

  const { data: existing } = await supabase
    .from('users').select('id').eq('email', emailLower).maybeSingle()
  if (existing) return res.status(409).json({ error: 'E-mail já cadastrado.' })

  const passwordHash = await bcrypt.hash(password, 12)

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name: name.trim(), email: emailLower, password_hash: passwordHash, plan: 'free', scans_used: 0 })
    .select('id, name, email, plan, scans_used')
    .single()

  if (error) { console.error('[register]', error); return res.status(500).json({ error: 'Erro ao criar conta.' }) }

  const token = signToken({ userId: user.id, email: user.email, plan: user.plan })
  res.setHeader('Set-Cookie', makeTokenCookie(token))
  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, scansUsed: 0, history: [] }
  })
}
