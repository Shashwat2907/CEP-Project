const fs = require('fs');
const path = require('path');
const glob = require('glob');

const dirs = [
  path.join(__dirname, '../src/app/(main)/complaints'),
  path.join(__dirname, '../src/app/(main)/meet'),
];

let modifiedFiles = 0;

for (const dir of dirs) {
  const pages = glob.sync('**/*/page.tsx', { cwd: dir, absolute: true });
  pages.push(path.join(dir, 'page.tsx'));

  for (const page of pages) {
    if (!fs.existsSync(page)) continue;
    let content = fs.readFileSync(page, 'utf8');

    if (!content.includes('AppShell')) continue;

    content = content.replace(/import\s+{\s*AppShell\s*}\s+from\s+['"]@\/shared\/ui\/app-shell['"];?\n?/, '');
    content = content.replace(/import\s+AppShell\s+from\s+['"]@\/shared\/ui\/app-shell['"];?\n?/, '');

    const match = content.match(/<AppShell[^>]*>([\s\S]*?)<\/AppShell>/);
    if (match) {
      let children = match[1];

      const lines = children.split('\n');
      let minIndent = Infinity;
      for (const line of lines) {
        if (line.trim().length === 0) continue;
        const match = line.match(/^(\s*)/);
        if (match) {
          minIndent = Math.min(minIndent, match[1].length);
        }
      }
      if (minIndent > 0 && minIndent !== Infinity) {
        children = lines.map(line => line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line).join('\n');
      }

      content = content.replace(/<AppShell[^>]*>[\s\S]*?<\/AppShell>/, `<>\n${children}</>`);
      fs.writeFileSync(page, content);
      console.log('Modified', page);
      modifiedFiles++;
    }
  }
}

console.log(`Modified ${modifiedFiles} files.`);
