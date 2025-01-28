import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// function resolvable() {
//   let resolve, reject
//   const promise = new Promise((res, rej) => {
//     resolve = res;
//     reject = rej;
//   });
//   return { promise, resolve, reject }
// }

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptsPath = path.join(__dirname, 'src', 'scripts');
const outputPath = path.join(__dirname, 'dist');
const templatesPath = path.join(__dirname, 'src', 'templates');

fs.rmSync(outputPath, { recursive: true, force: true });
fs.mkdirSync(outputPath);
// const prebuilt = resolvable();

fs.readdir(scriptsPath, (err, files) => {

  if (err) {
    console.error('Failed to read scripts directory:', err);
    return;
  }

  files.filter(file => 
    // file.endsWith('.ts')
    // If there's an argument, only build that script
    process.argv.length < 3 ? file.endsWith('.ts') : file === `${process.argv[2]}.ts`
  ).forEach(
    async file => {
      try {

        const scriptName = file.replace('.ts', '');
        const templatesPath = path.join(__dirname, 'src', 'templates', scriptName);
        const templates = {};
        if (fs.existsSync(templatesPath)) {
          for (const file of fs.readdirSync(templatesPath)) {
            if (file.endsWith('.html')) {
              const template = fs.readFileSync(path.join(templatesPath, file), 'utf8');
              templates[file.replace('.html', '')] = template;
            }
          }
        };

        for (const minify of [false, true]) {

          const outfile = path.join(
            outputPath,
            file.replace('.ts', minify ? '.min.js' : '.js')
          );

          await esbuild.build({
            entryPoints: [path.join(scriptsPath, file)],
            outfile,
            bundle: true,
            platform: 'browser',
            format: 'iife',
            legalComments: minify ? 'none' : 'inline',
            minify,
            banner: {
              js: "(vovas = { main() {"
            },
            footer: {
              js: "}}).main();"
            },
          })

          fs.chmodSync(outfile, '444');
        };

      } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
      }
    }
  );
});
