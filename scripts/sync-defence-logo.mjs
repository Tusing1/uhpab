import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { default: sharp } = await import(process.argv[2] || 'sharp');
const source = 'public/uhpab-logo.svg';
const svg = await readFile(source);
const png = await sharp(svg).resize(192, 192).png().toBuffer();
await writeFile('src/data/defenceLogo.json', JSON.stringify({
  source, sourceSha256: createHash('sha256').update(svg).digest('hex'),
  width: 192, height: 192, dataUrl: `data:image/png;base64,${png.toString('base64')}`,
}, null, 2) + '\n');
console.log('Updated the PowerPoint logo from the existing site logo.');
