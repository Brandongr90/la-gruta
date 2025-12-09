const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const SUPABASE_URL = 'https://zqoikytqgpiscjevjvpm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxb2lreXRxZ3Bpc2NqZXZqdnBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjE1MTgsImV4cCI6MjA4MDc5NzUxOH0.mcHXDA9NB0NEbusVSZM6PyeVZa4R3pjd1z1RJ-F_9gU';

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = { supabase };
