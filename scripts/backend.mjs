import {spawn} from 'node:child_process';
const executable=process.env.DOTNET_EXECUTABLE || 'dotnet';
const check=process.argv[2]==='test';
const args=check?['build','backend/SonoMarzi.Api']:['run','--project','backend/SonoMarzi.Api','--no-launch-profile','--','--urls',process.env.API_URL || 'http://127.0.0.1:5092'];
const child=spawn(executable,args,{stdio:'inherit',env:check?process.env:{...process.env,ASPNETCORE_ENVIRONMENT:'Development',Local__Enabled:'true'}});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
