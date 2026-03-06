import supabase from '../../lib/supabase'
import { requireAuth } from '../../lib/auth'
import { rateLimit } from '../../lib/rateLimit'

const PLAN_LIMITS = { free: 5, base: 100, plus: Infinity }

const SCAM_RULES = [
  { re: /urgente/gi,                      score: 12, msg: 'Linguagem de urgência — tática de pressão' },
  { re: /agora mesmo/gi,                  score: 10, msg: 'Pressão de tempo imediata' },
  { re: /expira em \d+/gi,                score: 14, msg: 'Prazo artificial para criar pânico' },
  { re: /pix imediato/gi,                 score: 20, msg: 'Solicitação de PIX imediato' },
  { re: /ganhe dinheiro/gi,               score: 20, msg: 'Promessa de ganhos fáceis' },
  { re: /prêmio|premiado/gi,              score: 18, msg: 'Promessa de prêmio — isca clássica' },
  { re: /taxa de liberação/gi,            score: 28, msg: 'Taxa falsa para liberar valor' },
  { re: /depósito garantido/gi,           score: 22, msg: 'Garantia falsa de depósito' },
  { re: /dinheiro fácil/gi,               score: 20, msg: 'Oferta de dinheiro fácil' },
  { re: /senha|token de acesso/gi,        score: 18, msg: 'Solicitação de credenciais' },
  { re: /confirme seus dados/gi,          score: 20, msg: 'Coleta de dados pessoais' },
  { re: /atualiz.{0,15}cadastro/gi,       score: 18, msg: 'Pretexto para roubar dados cadastrais' },
  { re: /bloqueio de conta/gi,            score: 22, msg: 'Ameaça de bloqueio — phishing bancário' },
  { re: /central de segurança/gi,         score: 20, msg: 'Falsa central de segurança' },
  { re: /correios|sedex/gi,               score: 12, msg: 'Golpe via Correios é recorrente' },
  { re: /receita federal/gi,              score: 16, msg: 'Fraude imitando Receita Federal' },
  { re: /clique aqui|acesse o link/gi,    score: 12, msg: 'Call-to-action de phishing' },
  { re: /whatsapp.{0,20}(clique|link)/gi, score: 16, msg: 'Golpe via WhatsApp detectado' },
  { re: /promoção imperdível/gi,          score: 18, msg: 'Promoção de isca' },
  { re: /verifique agora/gi,              score: 15, msg: 'Pressão para ação imediata' },
]

const BANK_HOMOGLYPHS = [
  'bradescoonline','itauacess','caixasegura','nubankseguro',
  'santanderverify','bradesc0','nubank-seguro','itau-acesso',
]

function detectInputType(t) {
  if (/https?:\/\//i.test(t))               return 'URL'
  if (/www\./i.test(t))                      return 'Domínio'
  if (/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(t.trim())) return 'Chave PIX (aleatória)'
  if (/^\d{11}$/.test(t.replace(/\D/g,''))) return 'CPF / Chave PIX'
  if (/@/.test(t) && !t.includes('http'))   return 'Chave PIX / E-mail'
  if (/instagram|facebook|twitter|tiktok|x\.com/i.test(t)) return 'Perfil em rede social'
  return 'Mensagem de texto'
}

function analyzeInput(raw) {
  const lower = raw.toLowerCase()
  let score = 0
  const reasons = []

  for (const rule of SCAM_RULES) {
    rule.re.lastIndex = 0
    if (rule.re.test(raw)) { score += rule.score; reasons.push({ sev: rule.score >= 20 ? 'danger' : 'warn', msg: rule.msg }) }
  }
  if (/http:\/\//i.test(raw))                                            { score += 20; reasons.push({ sev:'danger', msg:'Protocolo HTTP inseguro (sem HTTPS)' }) }
  if (/\.(ru|xyz|top|tk|click|buzz|gq|ml|cf|ga|men|loan|win|bid)\b/i.test(raw)) { score += 25; reasons.push({ sev:'danger', msg:'Extensão de domínio de alto risco' }) }
  if (/bit\.ly|tinyurl|t\.co|goo\.gl|short\.link|ow\.ly|rb\.gy/i.test(raw))     { score += 18; reasons.push({ sev:'warn',   msg:'Link encurtado — destino real oculto' }) }
  if (/https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(raw))                    { score += 28; reasons.push({ sev:'danger', msg:'URL aponta para endereço IP diretamente' }) }
  if (/%[0-9a-fA-F]{2}/.test(raw))                                      { score += 15; reasons.push({ sev:'warn',   msg:'URL com caracteres codificados (ofuscação)' }) }
  for (const bk of BANK_HOMOGLYPHS) {
    if (lower.includes(bk)) { score += 35; reasons.push({ sev:'danger', msg:`Domínio imita banco real: "${bk}"` }); break }
  }
  if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(raw)) { score += 15; reasons.push({ sev:'warn', msg:'CPF exposto na mensagem' }) }
  if (raw.length > 280)                        { score += 8;  reasons.push({ sev:'info', msg:'Mensagem extensa — possível distração cognitiva' }) }

  score = Math.min(score, 100)
  return { score, status: score>=55?'Alto risco':score>=25?'Suspeito':'Seguro', reasons: reasons.sort((a,b)=>sevOrd(b.sev)-sevOrd(a.sev)) }
}

function sevOrd(s) { return {danger:3,warn:2,info:1}[s]||0 }

async function checkVirusTotal(input) {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) return null
  try {
    const isUrl = /https?:\/\//.test(input)
    if (isUrl) {
      const sub  = await fetch('https://www.virustotal.com/api/v3/urls', {
        method:'POST', headers:{'x-apikey':key,'Content-Type':'application/x-www-form-urlencoded'},
        body:`url=${encodeURIComponent(input)}`,
      })
      const id = (await sub.json())?.data?.id
      if (!id) return null
      await new Promise(r=>setTimeout(r,2500))
      const res  = await fetch(`https://www.virustotal.com/api/v3/analyses/${id}`, { headers:{'x-apikey':key} })
      return (await res.json())?.data?.attributes?.stats || null
    } else {
      const domain = input.replace(/^(https?:\/\/)?(www\.)?/,'').split('/')[0]
      const res    = await fetch(`https://www.virustotal.com/api/v3/domains/${encodeURIComponent(domain)}`, { headers:{'x-apikey':key} })
      return (await res.json())?.data?.attributes?.last_analysis_stats || null
    }
  } catch { return null }
}

async function checkSafeBrowsing(url) {
  const key = process.env.GOOGLE_SAFEBROWSING_KEY
  if (!key || !/https?:\/\//.test(url)) return []
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        client:{clientId:'cybershield',clientVersion:'2.0'},
        threatInfo:{
          threatTypes:['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE'],
          platformTypes:['ANY_PLATFORM'], threatEntryTypes:['URL'],
          threatEntries:[{url}],
        },
      }),
    })
    return (await res.json()).matches?.map(m=>m.threatType) || []
  } catch { return [] }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!rateLimit(req, res, { max: 30, windowMs: 60_000 })) return

  const payload = requireAuth(req, res)
  if (!payload) return

  const { dados } = req.body || {}
  if (!dados || typeof dados !== 'string' || dados.trim().length < 3)
    return res.status(400).json({ error: 'Entrada inválida ou muito curta.' })

  const input = dados.trim().slice(0, 2000)

  const { data: user } = await supabase
    .from('users').select('id, plan, scans_used').eq('id', payload.userId).single()
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })

  const limit = PLAN_LIMITS[user.plan] ?? 5
  if (user.scans_used >= limit)
    return res.status(403).json({ error: 'Limite de consultas atingido.', upgrade: true })

  const analysis  = analyzeInput(input)
  const inputType = detectInputType(input)
  const isPaid    = user.plan === 'base' || user.plan === 'plus'
  const isUrl     = /https?:\/\//.test(input)

  let vtResult = null, sbThreats = []

  if (isPaid && isUrl) {
    ;[vtResult, sbThreats] = await Promise.all([checkVirusTotal(input), checkSafeBrowsing(input)])

    if (vtResult?.malicious > 0) {
      analysis.score = Math.min(analysis.score + Math.min(vtResult.malicious*8,40), 100)
      analysis.reasons.unshift({ sev:'danger', msg:`VirusTotal: ${vtResult.malicious} engines identificaram como malicioso` })
    } else if (vtResult?.suspicious > 0) {
      analysis.score = Math.min(analysis.score + 15, 100)
      analysis.reasons.unshift({ sev:'danger', msg:`VirusTotal: ${vtResult.suspicious} engines marcaram como suspeito` })
    }
    if (sbThreats.length > 0) {
      analysis.score = Math.min(analysis.score + 35, 100)
      analysis.reasons.unshift({ sev:'danger', msg:`Google Safe Browsing: ${sbThreats.join(', ')}` })
    }
    analysis.status = analysis.score>=55?'Alto risco':analysis.score>=25?'Suspeito':'Seguro'
  }

  await supabase.from('users').update({ scans_used: user.scans_used+1 }).eq('id', user.id)
  await supabase.from('scans').insert({
    user_id: user.id, input: input.slice(0,500),
    score: analysis.score, status: analysis.status,
    input_type: inputType, reasons: analysis.reasons,
  })

  return res.status(200).json({
    score: analysis.score, status: analysis.status, inputType,
    reasons: analysis.reasons, enriched: isPaid && isUrl,
    scansUsed: user.scans_used+1, scansLimit: limit===Infinity ? null : limit,
  })
}
