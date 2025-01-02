import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptsPath = path.join(__dirname, 'src', 'scripts');
const outputPath = path.join(__dirname, 'dist', 'scripts');

fs.rmdirSync(outputPath, { recursive: true });
fs.mkdirSync(outputPath);

fs.readdir(scriptsPath, (err, files) => {
  if (err) {
    console.error('Failed to read scripts directory:', err);
    return;
  }

  files.filter(file => file.endsWith('.ts')).forEach(file => {
    esbuild.build({
      entryPoints: [path.join(scriptsPath, file)],
      outfile: path.join(outputPath, file.replace('.ts', '.js')),
      bundle: true,
      platform: 'browser',
      format: 'iife',
      legalComments: 'inline'
    }).catch(err => {
      console.error('Build failed:', err);
      process.exit(1);
    });
  });
});
