const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { imageSize } = require('image-size');

const CONFIG_FILE = '/Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool/config/shoebox-config/generate-heights-config.json';
const DEFAULT_OUTPUT = 'image-heights.json';
const OUTPUT_DIR = '/Users/jaysonCheng/pentagon/queen-of-bounty/assets-automation-tool/config/shoebox-config';

async function loadConfig() {
  const cfgPath = CONFIG_FILE;
  const raw = await fsp.readFile(cfgPath, 'utf8');
  const cfg = JSON.parse(raw);

  if (!Array.isArray(cfg.files) || cfg.files.length === 0) {
    throw new Error('config.files is empty or not an array');
  }

  return {
    folder: path.resolve(cfg.folder),
    files: cfg.files,
    output: cfg.output || DEFAULT_OUTPUT
  };
}

async function processImageFile(folder, filename) {
  const filePath = path.join(folder, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buffer = await fsp.readFile(filePath);
  const { height } = imageSize(buffer);
  
  return { file: filename, height };
}

async function processImages(folder, files) {
  const heights = [];
  const errors = [];

  for (const filename of files) {
    try {
      const result = await processImageFile(folder, filename);
      heights.push(result);
    } catch (error) {
      errors.push(`❌ [ERROR] ${filename}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    errors.forEach(msg => console.error(msg));
    throw new Error('Encountered errors while processing files');
  }

  return heights;
}

async function saveResults(folder, heights, outputFilename) {
  const result = {
    folder,
    generatedAt: new Date().toISOString(),
    heights
  };

  const outDir = OUTPUT_DIR;
  await fsp.mkdir(outDir, { recursive: true });
  
  const outPath = path.join(outDir, outputFilename);
  await fsp.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
  
  console.log(`✅ Saved: ${outPath}`);
}

async function main() {
  try {
    const config = await loadConfig();
    const heights = await processImages(config.folder, config.files);
    await saveResults(config.folder, heights, config.output);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
