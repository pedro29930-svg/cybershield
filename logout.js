import { clearTokenCookie } from '../../../lib/auth'
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Set-Cookie', clearTokenCookie())
  return res.status(200).json({ ok: true })
}
