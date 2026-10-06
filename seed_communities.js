const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
let url, serviceKey;
env.split('\n').forEach(l => {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) {
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') url = m[2].trim().replace(/^["']|["']$/g, '');
    if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = m[2].trim().replace(/^["']|["']$/g, '');
  }
});
const supabase = createClient(url, serviceKey);

const communities = [
  {
    id: '00000000-0000-0000-0100-000000000001',
    name: 'Hackathon 2026 Organizing Committee',
    description: 'Planning and execution team for the upcoming annual university hackathon.',
    kind: 'unofficial',
    private: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '00000000-0000-0000-0100-000000000002',
    name: 'Competitive Programming Club',
    description: 'Weekly contests, LeetCode discussions, and ICPC preparation.',
    kind: 'unofficial',
    private: false,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '00000000-0000-0000-0100-000000000003',
    name: 'Anime & Manga Enthusiasts',
    description: 'A chill space to discuss latest episodes and plan watch parties.',
    kind: 'unofficial',
    private: false,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  }
];

async function seed() {
  const { data, error } = await supabase.from('communities').insert(communities);
  console.log('Seed result:', data, error);
}
seed();
