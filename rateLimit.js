const store = new Map()

export function rateLimit(req, res, { max = 20, windowMs = 60_000 } = {}) {
  const ip  = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim()
  const now = Date.now()
  const e   = store.get(ip) || { count: 0, resetAt: now + windowMs }
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + windowMs }
  e.count++
  store.set(ip, e)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, max - e.count))
  if (e.count > max) { res.status(429).json({ error: 'Muitas requisições. Aguarde 1 minuto.' }); return false }
  return true
}
