import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'node:fs';

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

// Order matters: favicon/apple-touch-icon special cases must run before the
// generic LOGO.svg -> LOGO-photo.webp catch-all.
const rules = [
  [/<link rel="icon" href="r\/LOGO\.svg" type="image\/svg\+xml">/g,
   '<link rel="icon" href="r/favicon.png" type="image/png">'],
  [/<link rel="apple-touch-icon" href="r\/LOGO\.svg">/g,
   '<link rel="apple-touch-icon" href="r/apple-touch-icon.png">'],
  [/r\/LOGO\.svg/g, 'r/LOGO-photo.webp'],
  [/r\/I1\.svg/g, 'r/I1-photo.webp'],
  [/r\/b\.svg/g, 'r/b-photo.webp'],
  [/r\/rs\.svg/g, 'r/rs-photo.webp'],
  [/r\/ca\.svg/g, 'r/ca-photo.webp'],
  [/r\/f\.svg/g, 'r/f-photo.webp'],
  [/r\/h\.svg/g, 'r/h-photo.webp'],
  [/r\/f\.gif/g, 'r/f-anim.webp'],
];

let totalChanges = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changes = 0;
  for (const [pattern, replacement] of rules) {
    const matches = content.match(pattern);
    if (matches) changes += matches.length;
    content = content.replace(pattern, replacement);
  }
  if (changes > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`${file}: ${changes} replacement(s)`);
    totalChanges += changes;
  }
}
console.log(`\nTotal: ${totalChanges} replacements across ${files.length} html files`);
