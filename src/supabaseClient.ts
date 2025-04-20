import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mlydbxepjckkwlpexeya.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1seWRieGVwamNra3dscGV4ZXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MjE2NTMsImV4cCI6MjA2MDQ5NzY1M30.TLHyc1zG6Zv8UyybLsScUUFEz7A_rytLxRj1PxASSYc'

const supabase = createClient(supabaseUrl, supabaseKey)

// Test de connexion
supabase
  .from('customers')
  .select('*')
  .then(({ data, error }) => {
    if (error) {
      console.error('Erreur de connexion à Supabase:', error)
    } else {
      console.log('Connexion à Supabase réussie:', data)
    }
  })

export { supabase } 