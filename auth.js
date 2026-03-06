import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET
if (!SECRET) throw new Error('JWT_SECRET não definido')

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  try { return jwt.verify(token, SECRET) }
  catch { return null }
}

export function extractToken(req) {
  const auth = req.headers['authorization']
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return parseCookies(req.headers.cookie || '')['cs_token'] || null
}

export function requireAuth(req, res) {
  const token   = extractToken(req)
  if (!token)   { res.status(401).json({ error: 'Não autenticado.' }); return null }
  const payload = verifyToken(token)
  if (!payload) { res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' }); return null }
  return payload
}

export function makeTokenCookie(token) {
  const prod = process.env.NODE_ENV === 'production'
  return [`cs_token=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', prod ? 'Secure' : '', 'Max-Age=2592000']
    .filter(Boolean).join('; ')
}

export function clearTokenCookie() {
  return 'cs_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
}

function parseCookies(str) {
  return str.split(';').reduce((acc, p) => {
    const [k, ...v] = p.trim().split('=')
    if (k) acc[k] = decodeURIComponent(v.join('='))
    return acc
  }, {})
}
