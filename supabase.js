import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL)         throw new Error('SUPABASE_URL não definido')
if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY não definido')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default supabase
