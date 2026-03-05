export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ error: "Método não permitido" })
}

const { dados } = req.body

let risco = 0
let motivos = []

// detectar palavras usadas em golpes
const palavrasGolpe = [
"pix","urgente","promoção","ganhe",
"prêmio","correios","taxa",
"liberar","clique","segurança"
]

palavrasGolpe.forEach(palavra => {

if(dados.toLowerCase().includes(palavra)){

risco++
motivos.push(`Contém palavra suspeita: ${palavra}`)

}

})

// consulta VirusTotal

let virusTotalMalicious = false

try {

const response = await fetch("https://www.virustotal.com/api/v3/urls", {

method: "POST",

headers: {
"x-apikey": process.env.VIRUSTOTAL_API_KEY,
"Content-Type": "application/x-www-form-urlencoded"
},

body: `url=${encodeURIComponent(dados)}`

})

const result = await response.json()

if(result.data){

virusTotalMalicious = true
risco += 3

motivos.push("Detectado no banco de malware")

}

} catch(e){}

// classificação

let status = "Seguro"

if(risco >=4){

status = "Alto risco"

}else if(risco >=2){

status = "Suspeito"

}

res.json({

status,
risco,
motivos

})

}