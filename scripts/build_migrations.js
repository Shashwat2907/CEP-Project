const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const seedFile = path.join(__dirname, '..', 'supabase', 'seed.sql');
const outputFile = path.join(__dirname, '..', 'supabase', 'apply_all_migrations.sql');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let fullSql = '';
fullSql += '-- ============================================================================\n';
fullSql += '-- CAMPUS ECOSYSTEM PLATFORM — UNIFIED ALL-IN-ONE MIGRATION SCRIPT\n';
fullSql += '-- Generated for Supabase SQL Editor\n';
fullSql += '-- Safe to run multiple times (All objects and policies are idempotent)\n';
fullSql += '-- ============================================================================\n\n';

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  fullSql += `\n-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`;
  fullSql += `-- FILE: ${file}\n`;
  fullSql += `-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n`;

  // Process triggers: if not preceded by drop trigger, add it
  // Match: CREATE [OR REPLACE] TRIGGER name ... ON table_name
  content = content.replace(/(?:drop\s+trigger\s+if\s+exists\s+([a-zA-Z0-9_]+)\s+on\s+([a-zA-Z0-9_\.]+);\s*)?create\s+trigger\s+([a-zA-Z0-9_]+)\s+(before|after|instead\s+of)\s+([\s\S]*?)\s+on\s+([a-zA-Z0-9_\.]+)/gi, 
    (match, existingDropName, existingDropTable, triggerName, timing, event, tableName) => {
      return `drop trigger if exists ${triggerName} on ${tableName};\ncreate trigger ${triggerName} ${timing} ${event} on ${tableName}`;
    }
  );

  // Process policies: ensure DROP POLICY IF EXISTS is present right before CREATE POLICY
  // Match: [DROP POLICY IF EXISTS name ON table;] CREATE POLICY name ON table
  content = content.replace(/(?:drop\s+policy\s+if\s+exists\s+("?[^"\n\r;]+"|\S+)\s+on\s+([a-zA-Z0-9_\.]+);\s*)?create\s+policy\s+("?[^"\n\r;]+"|\S+)\s+on\s+([a-zA-Z0-9_\.]+)/gi,
    (match, existingDropPolicy, existingDropTable, policyName, tableName) => {
      // Normalize policy name quotes if string
      const cleanPol = policyName.trim();
      const cleanTable = tableName.trim();
      return `drop policy if exists ${cleanPol} on ${cleanTable};\ncreate policy ${cleanPol} on ${cleanTable}`;
    }
  );

  fullSql += content;
  fullSql += '\n';
}

if (fs.existsSync(seedFile)) {
  fullSql += `\n-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`;
  fullSql += `-- FILE: seed.sql\n`;
  fullSql += `-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n`;
  const seedContent = fs.readFileSync(seedFile, 'utf8');
  fullSql += seedContent;
  fullSql += '\n';
}

fs.writeFileSync(outputFile, fullSql, 'utf8');
console.log('Successfully written unified migration script to', outputFile);
console.log('File size:', fs.statSync(outputFile).size, 'bytes');
