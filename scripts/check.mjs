import fs from 'node:fs/promises';import ts from 'typescript';
await fs.mkdir('frontend/.generated',{recursive:true});let source=await fs.readFile('frontend/src/app/globals.d.ts','utf8')+'\n';
for(const [,name] of (await fs.readFile('frontend/src/app/entry.ts','utf8')).matchAll(/import '\.\/(.*?)';/g))source+=await fs.readFile('frontend/src/app/'+name,'utf8')+'\n';
const name='frontend/.generated/suite.ts';await fs.writeFile(name,source);
const program=ts.createProgram([name],{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,strict:true,noEmit:true,skipLibCheck:true});
const errors=ts.getPreEmitDiagnostics(program);if(errors.length){console.error(ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:x=>x,getNewLine:()=>"\n"}));process.exitCode=1;}else console.log('TypeScript feature modules checked successfully.');
