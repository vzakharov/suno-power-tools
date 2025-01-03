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

  files.filter(file => file.endsWith('.ts')).forEach(
    async file => {
      try {
        const outputFilePath = path.join(outputPath, file.replace('.ts', '.js'));
        await esbuild.build({
          entryPoints: [path.join(scriptsPath, file)],
          outfile: outputFilePath,
          bundle: true,
          platform: 'browser',
          format: 'iife',
          legalComments: 'inline',
          banner: {
            js: `
window.suno = this instanceof Window ? (() => {
  throw new Error("This function should be called at a specific breakpoint in the code. Please refer to the repository\u2019s README for more information.");
})() : this;
            `,
          },
        });
        fs.chmodSync(outputFilePath, '444');
      } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
      }
    }
  );
});
