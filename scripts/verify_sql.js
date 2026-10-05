const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'supabase', 'apply_all_migrations.sql');
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// 1. Check policies without drop
let missingPolicyDrops = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (/^create\s+policy/i.test(line)) {
    const prevLine = i > 0 ? lines[i-1].trim() : '';
    if (!/^drop\s+policy/i.test(prevLine)) {
      missingPolicyDrops.push({ lineNum: i + 1, line, prevLine });
    }
  }
}
console.log('Missing policy drops:', missingPolicyDrops.length);
if (missingPolicyDrops.length > 0) {
  console.log('Examples:', missingPolicyDrops.slice(0, 5));
}

// 2. Check triggers without drop
let missingTriggerDrops = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (/^create\s+trigger/i.test(line)) {
    const prevLine = i > 0 ? lines[i-1].trim() : '';
    if (!/^drop\s+trigger/i.test(prevLine)) {
      missingTriggerDrops.push({ lineNum: i + 1, line, prevLine });
    }
  }
}
console.log('Missing trigger drops:', missingTriggerDrops.length);
if (missingTriggerDrops.length > 0) {
  console.log('Examples:', missingTriggerDrops);
}

// 3. Check for raw cron.schedule calls (outside string literals/dynamic SQL)
let rawCronMatches = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/cron\.schedule/i.test(line)) {
    rawCronMatches.push({ lineNum: i + 1, line: line.trim() });
  }
}
console.log('cron.schedule occurrences:', rawCronMatches.length);
console.log(rawCronMatches);

// 4. Check for CREATE TYPE IF NOT EXISTS
let createTypeIf = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/create\s+type\s+if\s+not\s+exists/i.test(line)) {
    createTypeIf.push({ lineNum: i + 1, line: line.trim() });
  }
}
console.log('create type if not exists:', createTypeIf.length);

// 5. Check for generated always as
let generatedAlways = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/generated\s+always\s+as/i.test(line)) {
    generatedAlways.push({ lineNum: i + 1, line: line.trim() });
  }
}
console.log('generated always as:', generatedAlways.length);
