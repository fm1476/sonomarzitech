import fs from 'node:fs/promises';import {build,transform} from 'esbuild';
await fs.mkdir('dist/assets',{recursive:true});
let combined='';for(const [,name] of (await fs.readFile('frontend/src/app/entry.ts','utf8')).matchAll(/import '\.\/(.*?)';/g))combined+=await fs.readFile('frontend/src/app/'+name,'utf8')+'\n';
const result=await transform(combined,{loader:'ts',target:'es2022',sourcemap:'external',sourcefile:'suite.ts'});await fs.writeFile('dist/assets/app.js',result.code);await fs.writeFile('dist/assets/app.js.map',result.map);
await build({entryPoints:['frontend/src/react/main.tsx'],bundle:true,outfile:'dist/assets/react.js',format:'esm',target:'es2022',jsx:'automatic',sourcemap:true,define:{'process.env.NODE_ENV':'"production"'}});
await build({stdin:{contents:"import Chart from 'chart.js/auto';import Papa from 'papaparse';window.Chart=Chart;window.Papa=Papa;",resolveDir:process.cwd()},bundle:true,outfile:'dist/assets/vendor.js',target:'es2022'});
await fs.appendFile('dist/assets/vendor.js','\n'+await fs.readFile('node_modules/qrcodejs/qrcode.js','utf8'));
await fs.copyFile('frontend/src/styles/suite.css','dist/assets/suite.css');for(const name of ['index.html','manifest.webmanifest','sw.js'])await fs.copyFile('frontend/'+name,'dist/'+name);

await fs.mkdir('dist/icons',{recursive:true});await fs.copyFile('frontend/icons/icon.svg','dist/icons/icon.svg');
