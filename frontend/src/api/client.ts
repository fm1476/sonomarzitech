import type { JsonValue, MeResponse, RuntimeConfig } from './contracts';
export const TOKEN_KEY = 'sonomarzi.aws.id_token';
export const ACCESS_TOKEN_KEY = 'sonomarzi.aws.access_token';
export class ApiError extends Error { constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); this.name = 'ApiError'; } }
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers); const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(`${window.SonoMarziConfig?.apiBase ?? '/api'}${path}`, {...options, headers, signal});
  const text = await response.text(); let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { throw new ApiError('The server returned an invalid response.',response.status); }
  if (!response.ok) { const error = body as {error?: string; code?: string} | null; throw new ApiError(error?.error ?? `Request failed (${response.status}).`,response.status,error?.code); }
  return body as T;
}
export const post = <T>(path: string, body: unknown) => request<T>(path,{method:'POST',body:JSON.stringify(body)});
export async function configuration(): Promise<RuntimeConfig> {
  const response = await fetch('/api/config',{signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('The API configuration could not be loaded.');
  const config = await response.json() as RuntimeConfig;
  if (config.mode !== 'local' && config.mode !== 'aws') throw new Error('Invalid API mode.');
  if (config.apiBase !== '/api') throw new Error('Unexpected API endpoint.');
  return config;
}
interface Result<T> { data: T | null; error: Error | null; }
const result = async <T>(work: () => Promise<T>): Promise<Result<T>> => { try {return {data:await work(),error:null};} catch(e) {return {data:null,error:e instanceof Error ? e : new Error(String(e))};} };
// Adapter confines mature feature modules to the C# API; it never loads a database SDK.
export function createCompatibilityClient() {
  const scoped = (args: Record<string, JsonValue>) => ({
    p_tenant_id: sessionStorage.getItem('sonomarzi.workspace.tenant') ?? '',
    p_agency_id: sessionStorage.getItem('sonomarzi.workspace.agency') ?? '',
    ...args
  });
  return {
    rpc: (name: string, args: Record<string, JsonValue> = {}) => result(()=>post<JsonValue>(`/rpc/${encodeURIComponent(name)}`,scoped(args))),
    auth: {
      getUser: async () => {const response = await result(()=>request<MeResponse>('/me'));return {data:{user:response.data ? {...response.data.user,user_metadata:{}} : null},error:response.error};},
      getSession: async () => ({data:{session:sessionStorage.getItem(TOKEN_KEY) ? {access_token:sessionStorage.getItem(TOKEN_KEY)} : null},error:null}),
      onAuthStateChange: (_callback: (event: string)=>void) => ({data:{subscription:{unsubscribe(){}}}}),
      signOut: async (_options?: unknown) => {try {if(window.SonoMarziConfig.mode==='local') await post('/auth/logout',{});}finally{sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(ACCESS_TOKEN_KEY);}return {error:null};},
      updateUser: (body: unknown) => result(()=>post('/auth/profile',body)),
      resetPasswordForEmail: (email: string,_options?: unknown) => result(()=>post('/auth/reset-password',{email})),
      signInWithPassword: (body: unknown) => result(()=>post('/auth/login',body))
    },
    functions:{invoke:(name: string,options: {body:unknown})=>result(()=>post(`/services/${encodeURIComponent(name)}`,options.body))},
    storage:{from:(_bucket: string)=>({
      createSignedUrl:(key:string,_seconds:number,_options?:unknown)=>result(async()=>{const context=window.SonoMarziLegacy.context();const data=await post<{download_url:string}>('/attachments/download-url',{tenant_id:context.tenantId,agency_id:context.agencyId,key});return {signedUrl:data.download_url};})
    })}
  };
}
