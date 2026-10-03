import {createServer} from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {request as proxyRequest} from 'node:http';
await import('./build.mjs');const port=Number(process.env.PORT??3002),target=new URL(process.env.API_PROXY_TARGET??'http://127.0.0.1:5092');
const root=path.resolve('dist');const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.map':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url??'/',`http://localhost:${port}`);
  if(url.pathname.startsWith('/api/')){const proxy=proxyRequest({hostname:target.hostname,port:target.port,path:url.pathname+url.search,method:req.method,headers:{...req.headers,host:req.headers.host??`localhost:${port}`}},upstream=>{res.writeHead(upstream.statusCode??502,upstream.headers);upstream.pipe(res);});proxy.on('error',()=>{res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The C# API is not running.'}));});req.pipe(proxy);return;}
  let filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!filename.startsWith(root+path.sep)&&filename!==root){res.writeHead(403);res.end();return;}
  if(url.pathname==='/')filename=path.join(root,'index.html');
  const content=await fs.readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)]??'application/octet-stream','Cache-Control':'no-store'});res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
});server.listen(port,'127.0.0.1',()=>console.log(`UI: http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
