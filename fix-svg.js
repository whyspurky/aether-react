import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, 'src', 'assets', 'icons', 'lucide');

function fixSvgFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  

  content = content.replace(/width=""/g, '');
  content = content.replace(/height=""/g, '');
  

  if (!content.includes('width=')) {
    content = content.replace('<svg', '<svg width="24" height="24"');
  }
  

  content = content.replace(/\s+/g, ' ').trim();
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${path.basename(filePath)}`);
}

function fixAllSvgs() {
  const files = fs.readdirSync(iconsDir);
  const svgFiles = files.filter(f => f.endsWith('.svg'));
  
  svgFiles.forEach(fixSvgFile);
}

fixAllSvgs();