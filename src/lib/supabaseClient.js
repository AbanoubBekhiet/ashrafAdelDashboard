import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qxpzlrhrxyyfwqldssvk.supabase.co'
const supabaseAnonKey = 'sb_publishable_h5nrsRDizaIItn57DiQhUw_XT9C28jS'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
