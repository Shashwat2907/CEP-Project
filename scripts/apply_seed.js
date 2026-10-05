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

async function seed() {
  console.log('Seeding roster_import...');
  const rosterData = [
    { college_email: 'admin@campus.edu', college_id: 'ADM001', full_name: 'Campus Administrator', branch: 'Administration', year: null, division: null, batch: null, role: 'admin', status: 'invited' },
    { college_email: 'sharma@campus.edu', college_id: 'TCH101', full_name: 'Prof. Rajesh Sharma', branch: 'Computer Science', year: null, division: null, batch: null, role: 'teacher', status: 'invited' },
    { college_email: 'patel@campus.edu', college_id: 'TCH102', full_name: 'Dr. Priya Patel', branch: 'Electronics & Comm', year: null, division: null, batch: null, role: 'teacher', status: 'invited' },
    { college_email: 'student1@campus.edu', college_id: '23BCE1001', full_name: 'Aarav Mehta', branch: 'Computer Science', year: 2, division: 'A', batch: 'A1', role: 'student', status: 'invited' },
    { college_email: 'student2@campus.edu', college_id: '23BCE1002', full_name: 'Diya Sen', branch: 'Computer Science', year: 2, division: 'A', batch: 'A1', role: 'student', status: 'invited' },
    { college_email: 'student3@campus.edu', college_id: '23BCE1003', full_name: 'Rohan Gupta', branch: 'Computer Science', year: 2, division: 'B', batch: 'B2', role: 'student', status: 'invited' },
    { college_email: 'student4@campus.edu', college_id: '24BIT2001', full_name: 'Ananya Verma', branch: 'Information Tech', year: 1, division: 'A', batch: 'A1', role: 'student', status: 'invited' },
    { college_email: 'student5@campus.edu', college_id: '22BCE0099', full_name: 'Vikram Rao', branch: 'Computer Science', year: 3, division: 'C', batch: 'C1', role: 'student', status: 'inactive' },
  ];
  const { error: rErr } = await adminSupabase.from('roster_import').upsert(rosterData, { onConflict: 'college_email' });
  if (rErr) console.error('roster_import error:', rErr);
  else console.log('roster_import seeded successfully.');

  console.log('Seeding subjects...');
  const subjectsData = [
    { id: '00000000-0000-0000-0001-000000000001', name: 'Engineering Mathematics I', code: 'MATH101', year: 1, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0001-000000000002', name: 'Engineering Physics', code: 'PHY101', year: 1, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0001-000000000003', name: 'Programming Fundamentals (C)', code: 'CS101', year: 1, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0001-000000000004', name: 'Engineering Drawing', code: 'ME101', year: 1, branch: 'Computer Science' },

    { id: '00000000-0000-0000-0002-000000000001', name: 'Data Structures and Algorithms', code: 'CS201', year: 2, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0002-000000000002', name: 'Database Management Systems', code: 'CS202', year: 2, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0002-000000000003', name: 'Object Oriented Programming (Java)', code: 'CS203', year: 2, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0002-000000000004', name: 'Engineering Mathematics II', code: 'MATH201', year: 2, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0002-000000000005', name: 'Digital Electronics', code: 'EC201', year: 2, branch: 'Computer Science' },

    { id: '00000000-0000-0000-0003-000000000001', name: 'Operating Systems', code: 'CS301', year: 3, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0003-000000000002', name: 'Computer Networks', code: 'CS302', year: 3, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0003-000000000003', name: 'Software Engineering', code: 'CS303', year: 3, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0003-000000000004', name: 'Theory of Computation', code: 'CS304', year: 3, branch: 'Computer Science' },

    { id: '00000000-0000-0000-0004-000000000001', name: 'Artificial Intelligence', code: 'CS401', year: 4, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0004-000000000002', name: 'Machine Learning', code: 'CS402', year: 4, branch: 'Computer Science' },
    { id: '00000000-0000-0000-0004-000000000003', name: 'Cloud Computing', code: 'CS403', year: 4, branch: 'Computer Science' },

    { id: '00000000-0000-0000-0011-000000000001', name: 'Engineering Mathematics I', code: 'MATH101', year: 1, branch: 'Information Tech' },
    { id: '00000000-0000-0000-0011-000000000002', name: 'Programming in Python', code: 'IT101', year: 1, branch: 'Information Tech' },

    { id: '00000000-0000-0000-0012-000000000001', name: 'Web Technologies', code: 'IT201', year: 2, branch: 'Information Tech' },
    { id: '00000000-0000-0000-0012-000000000002', name: 'Data Structures', code: 'IT202', year: 2, branch: 'Information Tech' }
  ];
  const { error: sErr } = await adminSupabase.from('subjects').upsert(subjectsData, { onConflict: 'code,branch' });
  if (sErr) console.error('subjects error:', sErr);
  else console.log('subjects seeded successfully.');

  console.log('Seeding complaint_domains...');
  const domainData = [
    { id: '10000000-0000-0000-0000-000000000001', name: 'Academic – Subject', description: 'Syllabus doubt, teaching-related issue', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000002', name: 'Academic – Class', description: 'Timetable clash, class-level scheduling', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000003', name: 'Academic – Department', description: 'Department-level academic issue', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000004', name: 'Lab / Practical', description: 'Equipment issue, computer or instrument not working', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000005', name: 'Hostel – Cleanliness & Maintenance', description: 'Room cleanliness, broken furniture, water or electrical issue', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000006', name: 'Hostel – Rules & Conduct', description: 'Hostel rules violation, student conduct or dispute', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000007', name: 'Mess / Food', description: 'Food quality, hygiene, service or catering issue', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000008', name: 'Infrastructure', description: 'Classroom furniture, electrical, campus facility', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000009', name: 'Administrative – Scholarship & Fees', description: 'Scholarship application, fee status, finance desk', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000010', name: 'Administrative – ID Card & Docs', description: 'New ID card, loss, replacement, bonafide certificate', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000011', name: 'Club / Student Activity', description: 'Club membership, event scheduling, club resources', parent_id: null, sensitive: false, routing_mode: 'chain', visibility: 'public' },
    { id: '10000000-0000-0000-0000-000000000012', name: 'Harassment & Ragging', description: 'Anti-Ragging and campus safety (Strictly private and anonymous)', parent_id: null, sensitive: true, routing_mode: 'direct', visibility: 'private' }
  ];
  const { error: dErr } = await adminSupabase.from('complaint_domains').upsert(domainData, { onConflict: 'id' });
  if (dErr) console.error('complaint_domains error:', dErr);
  else console.log('complaint_domains seeded successfully.');

  console.log('Seeding domain_assignees...');
  const assigneeData = [
    { domain_id: '10000000-0000-0000-0000-000000000001', level: 1, role_name: 'Subject Teacher', sla_hours: 24, escalation_condition: 'on_sla_breach' },
    { domain_id: '10000000-0000-0000-0000-000000000001', level: 2, role_name: 'Class Coordinator', sla_hours: 48, escalation_condition: 'on_sla_breach' },
    { domain_id: '10000000-0000-0000-0000-000000000001', level: 3, role_name: 'HOD', sla_hours: 72, escalation_condition: 'on_sla_breach' },

    { domain_id: '10000000-0000-0000-0000-000000000005', level: 1, role_name: 'Cleaning Staff / Hostel Caretaker', sla_hours: 24, escalation_condition: 'on_sla_breach' },
    { domain_id: '10000000-0000-0000-0000-000000000005', level: 2, role_name: 'Hostel Warden', sla_hours: 48, escalation_condition: 'on_sla_breach' },
    { domain_id: '10000000-0000-0000-0000-000000000005', level: 3, role_name: 'Management Team', sla_hours: 72, escalation_condition: 'on_sla_breach' },

    { domain_id: '10000000-0000-0000-0000-000000000007', level: 1, role_name: 'Mess In-charge', sla_hours: 24, escalation_condition: 'on_sla_breach' },
    { domain_id: '10000000-0000-0000-0000-000000000007', level: 2, role_name: 'Hostel Warden', sla_hours: 48, escalation_condition: 'on_sla_breach' },
    { domain_id: '10000000-0000-0000-0000-000000000007', level: 3, role_name: 'Management Team', sla_hours: 72, escalation_condition: 'on_sla_breach' },

    { domain_id: '10000000-0000-0000-0000-000000000012', level: 1, role_name: 'Anti-Ragging Committee', sla_hours: 24, escalation_condition: 'on_sla_breach' },
    { domain_id: '10000000-0000-0000-0000-000000000012', level: 2, role_name: 'Principal / Director', sla_hours: 48, escalation_condition: 'on_sla_breach' }
  ];
  const { error: aErr } = await adminSupabase.from('domain_assignees').upsert(assigneeData, { onConflict: 'domain_id,level' });
  if (aErr) console.error('domain_assignees error:', aErr);
  else console.log('domain_assignees seeded successfully.');

  console.log('All essential seed data applied!');
}

seed().catch(console.error);
