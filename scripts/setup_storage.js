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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, serviceKey);

async function setup() {
  console.log('Checking storage buckets...');
  const { data: buckets, error } = await adminSupabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }
  console.log('Current buckets:', buckets.map(b => b.name));

  const requiredBuckets = [
    { name: 'resources', public: true },
    { name: 'complaints', public: false },
    { name: 'avatars', public: true },
    { name: 'lostfound', public: true },
  ];

  for (const b of requiredBuckets) {
    if (!buckets.some(existing => existing.name === b.name)) {
      console.log(`Creating bucket: ${b.name} (public: ${b.public})...`);
      const { data, error: createErr } = await adminSupabase.storage.createBucket(b.name, {
        public: b.public,
        fileSizeLimit: 52428800 // 50MB
      });
      if (createErr) {
        console.error(`Failed to create bucket ${b.name}:`, createErr.message);
      } else {
        console.log(`Bucket ${b.name} created successfully.`);
      }
    } else {
      console.log(`Bucket ${b.name} already exists.`);
    }
  }

  const { data: updatedBuckets } = await adminSupabase.storage.listBuckets();
  console.log('Final buckets list:', updatedBuckets.map(b => b.name));
}

setup().catch(console.error);
