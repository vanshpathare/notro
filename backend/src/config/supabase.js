// src/config/supabase.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail fast: Stop the backend immediately if configuration is broken
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase credentials missing in .env file!");
  process.exit(1);
}

// Initialize the administrative database interface
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false, // Node.js backend handles stateless execution
  },
});

console.log("⚡ Supabase Client Ready.");

module.exports = supabase;
