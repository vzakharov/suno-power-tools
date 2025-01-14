import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

function resolvable() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptsPath = path.join(__dirname, 'src', 'scripts');
const outputPath = path.join(__dirname, 'dist');
const templatesPath = path.join(__dirname, 'src', 'templates');

fs.rmSync(outputPath, { recursive: true, force: true });
fs.mkdirSync(outputPath);
const prebuilt = resolvable();

fs.readdir(templatesPath, (err, files) => {
  if (err) {
    console.error('Failed to read templates directory:', err);
    return;
  }

  Promise.all(files.filter(file => fs.statSync(path.join(templatesPath, file)).isDirectory()).map(
    async folder => {
      try {

        const tsFile = path.join(templatesPath, folder, `standalone.ts`);
        console.log('Pre-building template', folder, 'from', tsFile);
        if (!fs.existsSync(tsFile)) {
          console.warn(`No script found for template ${folder}, skipping...`);
          return;
        };

        const outfile = path.join(templatesPath, folder, 'standalone_compiled.js');
        // Delete the file if it exists
        if (fs.existsSync(outfile)) {
          fs.rmSync(outfile);
        };

        await esbuild.build({
          entryPoints: [tsFile],
          outfile,
          bundle: true,
          platform: 'browser',
          format: 'iife',
          legalComments: 'none',
          banner: {
            // js: 'export const render_compiled = () => '
            js: 'export function render_compiled() {\nwindow.render_compiled = arguments.callee;\n'
          },
          footer: {
            js: '}\n'
          }
        });

        fs.chmodSync(outfile, '444');

        const cssFile = path.join(templatesPath, folder, 'style.css');
        const css = fs.readFileSync(cssFile, 'utf8').replace(/\n\s*/g, '');
        fs.writeFileSync(
          path.join(templatesPath, folder, 'css.js'),
          `export const ${folder}Css = ${JSON.stringify(css)};`
        );

      } catch (err) {
        console.error('Pre-build failed:', err);
        process.exit(1);
      }
    }
  )).then(prebuilt.resolve);
});
await prebuilt.promise;
fs.readdir(scriptsPath, (err, files) => {

  if (err) {
    console.error('Failed to read scripts directory:', err);
    return;
  }

  files.filter(file => file.endsWith('.ts')).forEach(
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
            // banner: Object.keys(templates).length === 0 ? undefined : {
            //   js: `window.templates = ${JSON.stringify(templates)};`
            // }
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
