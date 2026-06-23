import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

mkdirSync(dist, { recursive: true });

const css = readFileSync(join(root, 'src/style.css'), 'utf8');
let parseJs = readFileSync(join(root, 'src/parse.js'), 'utf8')
  .replace(/^export /gm, '');
let dataJs = readFileSync(join(root, 'src/data.js'), 'utf8')
  .replace(/^export /gm, '')
  .replace(/export \{[^}]+\};?\s*$/m, '');
let mainJs = readFileSync(join(root, 'src/main.js'), 'utf8')
  .replace(/^import\s+[\s\S]*?;\s*/gm, '');

const bundle = `${parseJs}\n${dataJs}\n${mainJs}`;

const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>TB Coffee Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${css.replace(/\/LOGOTB-circle\.png/g, './LOGOTB-circle.png')}</style>
</head>
<body>
  <div id="app"></div>
  <script>${bundle.replace(/\/LOGOTB-circle\.png/g, './LOGOTB-circle.png')}</script>
</body>
</html>`;

function copyIfExists(src, dest) {
  try {
    copyFileSync(src, dest);
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    console.warn(`⚠ skip missing asset: ${src}`);
  }
}

writeFileSync(join(dist, 'index.html'), html);
writeFileSync(join(dist, '.nojekyll'), '');
copyIfExists(join(root, 'public/LOGOTB-circle.png'), join(dist, 'LOGOTB-circle.png'));
copyIfExists(join(root, 'public/LOGOTB.png'), join(dist, 'LOGOTB.png'));

// ไฟล์ root สำหรับดับเบิลคลิกเปิดได้เลย (ไม่ต้องรันเซิร์ฟเวอร์)
writeFileSync(join(root, 'index.html'), html);
writeFileSync(join(root, '.nojekyll'), '');
copyIfExists(join(root, 'public/LOGOTB-circle.png'), join(root, 'LOGOTB-circle.png'));
copyIfExists(join(root, 'public/LOGOTB.png'), join(root, 'LOGOTB.png'));

console.log('✓ Production build → dist/ และ index.html (root)');