const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let url, serviceKey;
env.split('\n').forEach(l => {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') url = m[2].trim().replace(/^["']|["']$/g, '');
    if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = m[2].trim().replace(/^["']|["']$/g, '');
  }
});

const adminSupabase = createClient(url, serviceKey);

const mockEmails = [
  'admin@campus.edu',
  'sharma@campus.edu',
  'patel@campus.edu',
  'student1@campus.edu',
  'student2@campus.edu',
  'student3@campus.edu',
  'student4@campus.edu',
  'student5@campus.edu',
  'overseer@campus.edu'
];

async function run() {
  console.log('Creating auth users for seeded emails...');
  for (const email of mockEmails) {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: 'password123'
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`Failed to create ${email}:`, error.message);
    } else {
      console.log(`Created (or already exists): ${email}`);
    }
  }
  
  // Verify profiles were created via trigger
  const { data: profiles } = await adminSupabase.from('profiles').select('college_email, role_primary, id');
  console.log('\nProfiles in database:', profiles);
}
run();
