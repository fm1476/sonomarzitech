import { ACCESS_TOKEN_KEY, TOKEN_KEY } from './client';
import type {RuntimeConfig} from './contracts';
const STATE_KEY = 'sonomarzi.aws.pkce.state'; const VERIFIER_KEY = 'sonomarzi.aws.pkce.verifier';
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export async function beginCognito(config: RuntimeConfig): Promise<void> {
  if(!config.clientId || !config.cognitoDomain || !config.redirectUri) throw new Error('Cognito login is not configured.');
  const verifier=random(),state=random();sessionStorage.setItem(STATE_KEY,state);sessionStorage.setItem(VERIFIER_KEY,verifier);
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const target=new URL('/oauth2/authorize',config.cognitoDomain);
  target.search=new URLSearchParams({response_type:'code',client_id:config.clientId,redirect_uri:config.redirectUri,scope:'openid email profile',code_challenge_method:'S256',code_challenge:challenge,state}).toString();
  location.assign(target);
}
export async function completeCognito(config: RuntimeConfig): Promise<boolean> {
  const query=new URLSearchParams(location.search);const code=query.get('code');if(!code)return false;
  const state=sessionStorage.getItem(STATE_KEY),verifier=sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);sessionStorage.removeItem(VERIFIER_KEY);
  history.replaceState(null,'',location.pathname+location.hash);
  if(!state||!verifier||query.get('state')!==state)throw new Error('The login response could not be verified. Try signing in again.');
  const response=await fetch(new URL('/oauth2/token',config.cognitoDomain),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,redirect_uri:config.redirectUri,code,code_verifier:verifier}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Cognito sign-in failed.');
  const tokens=await response.json() as {id_token?:string;access_token?:string};
  if(!tokens.id_token)throw new Error('Cognito did not return an identity token.');
  sessionStorage.setItem(TOKEN_KEY,tokens.id_token);if(tokens.access_token)sessionStorage.setItem(ACCESS_TOKEN_KEY,tokens.access_token);return true;
}
