import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const R = path.resolve('r');

// 1) Fake-SVGs that actually embed a base64 raster image inside an <image> tag.
//    Extract the raster payload and re-encode it as an optimized static webp.
const fakeSvgs = ['h.svg', 'f.svg', 'b.svg', 'LOGO.svg', 'I1.svg', 'rs.svg', 'ca.svg'];

async function extractAndConvert(file, { maxWidth, quality }) {
  const full = path.join(R, file);
  const data = fs.readFileSync(full, 'latin1');
  const m = data.match(/data:image\/(\w+);base64,([A-Za-z0-9+/=]+)/);
  if (!m) {
    console.log(`${file}: no embedded raster found, skipping`);
    return null;
  }
  const buf = Buffer.from(m[2], 'base64');
  const outName = file.replace(/\.svg$/, '-photo.webp');
  const outPath = path.join(R, outName);
  await sharp(buf)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toFile(outPath);
  const before = fs.statSync(full).size;
  const after = fs.statSync(outPath).size;
  console.log(`${file} (${(before / 1e6).toFixed(2)} MB) -> ${outName} (${(after / 1e6).toFixed(2)} MB)`);
  return outName;
}

// 2) Real animated gifs (department icons). Keep the animation but shrink
//    dimensions and re-encode as animated webp (webp animation compresses far
//    better than gif for photographic content).
const gifs = ['h.gif', 'f.gif', '2.gif', '1.gif'];

async function convertGif(file, { maxWidth, quality }) {
  const full = path.join(R, file);
  const outName = file.replace(/\.gif$/, '-anim.webp');
  const outPath = path.join(R, outName);
  await sharp(full, { animated: true })
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toFile(outPath);
  const before = fs.statSync(full).size;
  const after = fs.statSync(outPath).size;
  console.log(`${file} (${(before / 1e6).toFixed(2)} MB) -> ${outName} (${(after / 1e6).toFixed(2)} MB)`);
  return outName;
}

const results = {};

for (const f of fakeSvgs) {
  const maxWidth = f === 'LOGO.svg' ? 500 : 1200;
  const quality = f === 'LOGO.svg' ? 90 : 78;
  results[f] = await extractAndConvert(f, { maxWidth, quality });
}

for (const f of gifs) {
  results[f] = await convertGif(f, { maxWidth: 480, quality: 60 });
}

fs.writeFileSync(path.join(path.resolve('.'), 'scripts', 'asset-map.json'), JSON.stringify(results, null, 2));
console.log('\nDone. Mapping written to scripts/asset-map.json');
