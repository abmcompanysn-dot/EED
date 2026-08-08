import fs from 'node:fs';

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let totalChanges = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changes = 0;

  // Add loading="lazy" to every <img> tag that doesn't already declare a
  // loading attribute and isn't the header nav logo (class="logo"), which
  // should stay eager since it's above the fold on every page.
  content = content.replace(/<img\b((?:(?!\/?>).)*)>/g, (match, attrs) => {
    if (/\bloading=/.test(attrs)) return match;
    if (/class="logo"/.test(attrs)) return match;
    changes++;
    return `<img${attrs} loading="lazy">`;
  });

  if (changes > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`${file}: ${changes} <img> tag(s) made lazy`);
    totalChanges += changes;
  }
}
console.log(`\nTotal: ${totalChanges} lazy-loading attributes added`);
