import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptsPath = path.join(__dirname, 'src', 'scripts');
const outputPath = path.join(__dirname, 'dist');

fs.rmSync(outputPath, { recursive: true, force: true });
fs.mkdirSync(outputPath);

fs.readdir(scriptsPath, (err, files) => {
  if (err) {
    console.error('Failed to read scripts directory:', err);
    return;
  }

  files.filter(file => file.endsWith('.ts')).forEach(
    async file => {
      try {
        const outfile = path.join(outputPath, file.replace('.ts', '.js'));
        await esbuild.build({
          entryPoints: [path.join(scriptsPath, file)],
          outfile,
          bundle: true,
          platform: 'browser',
          format: 'iife',
          legalComments: 'inline',
        });
        fs.chmodSync(outfile, '444');
      } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
      }
    }
  );
});
