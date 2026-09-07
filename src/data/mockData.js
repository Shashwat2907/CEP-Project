export const STAGES = ['CR', 'Class Teacher', 'HOD'];

export const CATEGORIES = [
  'Projector / AV',
  'Furniture / Seating',
  'Electrical / Fans / Lights',
  'Cleanliness',
  'Internet / Wi-Fi',
  'Safety Hazard',
  'Other'
];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const INITIAL_ISSUES = [
  {
    id: 1042,
    category: 'Projector / AV',
    title: 'Projector not turning on in Room 204',
    description: 'Bulb seems dead, tried two different HDMI cables. Blocking the whole first period.',
    priority: 'High',
    status: 'InProgress',
    stage: 1,
    daysElapsed: 1,
    date: '2026-07-24',
    reportedBy: 'Aditi Sharma',
    upvotes: 8
  },
  {
    id: 1041,
    category: 'Electrical / Fans / Lights',
    title: 'Ceiling fan sparking in Lab 3',
    description: 'Fan made a loud crackling noise and sparked briefly during the afternoon session. Nobody has used that switch since.',
    priority: 'Critical',
    status: 'InProgress',
    stage: 2,
    daysElapsed: 0,
    date: '2026-07-24',
    reportedBy: 'Rohan Mehta',
    upvotes: 14
  },
  {
    id: 1039,
    category: 'Furniture / Seating',
    title: 'Broken chair leg, Row 3 Seat 2',
    description: 'One of the chair legs is cracked and wobbles. Minor risk of tipping over.',
    priority: 'Low',
    status: 'Pending',
    stage: 0,
    daysElapsed: 1,
    date: '2026-07-23',
    reportedBy: 'Aditi Sharma',
    upvotes: 2
  },
  {
    id: 1037,
    category: 'Internet / Wi-Fi',
    title: 'Wi-Fi drops every 10 minutes in the CS wing',
    description: 'Affects the whole floor during lab hours, makes it hard to submit assignments on time.',
    priority: 'Medium',
    status: 'InProgress',
    stage: 1,
    daysElapsed: 2,
    date: '2026-07-22',
    reportedBy: 'Neha Kulkarni',
    upvotes: 11
  },
  {
    id: 1035,
    category: 'Cleanliness',
    title: 'Washroom near Block B not cleaned since Monday',
    description: 'No soap, overflowing bin. Reported to housekeeping once already with no response.',
    priority: 'Medium',
    status: 'Resolved',
    stage: 0,
    daysElapsed: 3,
    date: '2026-07-20',
    reportedBy: 'Aditi Sharma',
    upvotes: 5
  },
  {
    id: 1033,
    category: 'Safety Hazard',
    title: 'Exposed wiring near the stairwell exit',
    description: 'Cables running along the floor near the emergency exit, tripping hazard during a fire drill.',
    priority: 'Critical',
    status: 'Resolved',
    stage: 2,
    daysElapsed: 1,
    date: '2026-07-18',
    reportedBy: 'Rohan Mehta',
    upvotes: 19
  },
  {
    id: 1031,
    category: 'Furniture / Seating',
    title: 'Not enough chairs for elective batch',
    description: 'Six students standing through the entire lecture, elective batch size grew this semester.',
    priority: 'Medium',
    status: 'Pending',
    stage: 0,
    daysElapsed: 0,
    date: '2026-07-24',
    reportedBy: 'Aditi Sharma',
    upvotes: 7
  },
  {
    id: 1028,
    category: 'Projector / AV',
    title: 'Screen flickering during presentations',
    description: 'Happens intermittently, worse when the AC is running.',
    priority: 'Low',
    status: 'Resolved',
    stage: 0,
    daysElapsed: 2,
    date: '2026-07-15',
    reportedBy: 'Neha Kulkarni',
    upvotes: 3
  }
];

export const CURRENT_USER = {
  name: 'Aditi Sharma',
  initials: 'AS',
  dept: 'CSE',
  semester: 'Sem 5',
  email: 'aditi.sharma@campus.edu'
};
