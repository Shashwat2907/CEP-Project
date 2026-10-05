const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL present:', !!supabaseUrl, supabaseUrl ? supabaseUrl.slice(0, 20) + '...' : 'none');
console.log('Anon key present:', !!supabaseAnonKey, supabaseAnonKey ? supabaseAnonKey.slice(0, 15) + '...' : 'none');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('demo-project')) {
  console.log('No valid Supabase credentials found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('\n--- Testing Database Access ---');
  // Check subjects table (public read)
  const { data: subjects, error: subErr } = await supabase.from('subjects').select('count', { count: 'exact', head: true });
  if (subErr) {
    console.error('Error querying subjects:', subErr.message, subErr.details || '');
  } else {
    console.log('Successfully reached Supabase! Subjects table count:', subjects);
  }

  // Check profiles table
  const { count: profCount, error: profErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  if (profErr) {
    console.error('Error querying profiles:', profErr.message);
  } else {
    console.log('Profiles table accessible, count:', profCount);
  }

  // Check presence_records table
  const { count: presCount, error: presErr } = await supabase.from('presence_records').select('*', { count: 'exact', head: true });
  if (presErr) {
    console.error('Error querying presence_records:', presErr.message);
  } else {
    console.log('Presence records table accessible, count:', presCount);
  }

  // Check storage buckets
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.error('Error listing storage buckets:', bErr.message);
  } else {
    console.log('Storage buckets:', buckets ? buckets.map(b => b.name) : []);
  }
}

test().catch(console.error);
