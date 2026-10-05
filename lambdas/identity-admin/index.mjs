import crypto from "node:crypto";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand,
  AdminResetUserPasswordCommand,
  AdminDisableUserCommand,
  DescribeUserPoolClientCommand,
  UpdateUserPoolClientCommand,
  SetUserPoolMfaConfigCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  GetUserCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  SetUserMFAPreferenceCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {
  ApiGatewayV2Client,
  GetApiCommand,
  UpdateApiCommand,
  GetRoutesCommand,
  CreateRouteCommand,
  UpdateRouteCommand
} from "@aws-sdk/client-apigatewayv2";
import { SESv2Client, SendEmailCommand, GetEmailIdentityCommand } from "@aws-sdk/client-sesv2";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

const API_REGION = process.env.API_REGION || "us-east-2";
const apiGateway = new ApiGatewayV2Client({ region: API_REGION });
const ses = new SESv2Client({ region: API_REGION });
const lambda = new LambdaClient({ region: API_REGION });

const USER_POOL_ID =
  process.env.COGNITO_USER_POOL_ID || "us-east-2_ZULbaLcue";

const COGNITO_APP_CLIENT_ID =
  process.env.COGNITO_APP_CLIENT_ID || "no3ovb8d8qda221qnh1qomf1e";

const API_ID =
  process.env.API_ID || "7debzkoq7k";
const IDENTITY_INTEGRATION_ID = process.env.IDENTITY_INTEGRATION_ID || "na9hn64";
const MAIN_LAMBDA_NAME = process.env.MAIN_LAMBDA_NAME || "sonomarzi-api-dev";
const SES_FALLBACK_SENDER = process.env.SES_FALLBACK_SENDER || "fred@sonomarzi.com";
const ACTIVATION_TTL_HOURS = Math.max(1, Math.min(72, Number(process.env.ACTIVATION_TTL_HOURS || 24)));

const APP_BASE_DOMAIN =
  String(process.env.APP_BASE_DOMAIN || "sonomarzi.com").toLowerCase();

const CLOUDFRONT_ORIGIN =
  process.env.CLOUDFRONT_ORIGIN || "https://d1b97r2bbw5qld.cloudfront.net";

const MAIN_API_BASE =
  (process.env.MAIN_API_BASE ||
    "https://7debzkoq7k.execute-api.us-east-2.amazonaws.com").replace(/\/$/, "");

const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "login", "auth", "api", "admin",
  "support", "static", "assets", "mail", "email"
]);

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  if (!event?.body) return {};
  if (typeof event.body === "object") return event.body;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return raw ? JSON.parse(raw) : {};
}

async function publicAuth(body) {
  const operation = String(body?.operation || "");
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

  if (operation === "InitiateAuth") {
    const authFlow = String(payload.AuthFlow || "");
    if (!["USER_PASSWORD_AUTH","REFRESH_TOKEN_AUTH","REFRESH_TOKEN"].includes(authFlow)) {
      const error = new Error("Unsupported authentication flow.");
      error.statusCode = 400;
      throw error;
    }
    return await cognito.send(new InitiateAuthCommand({
      ...payload,
      ClientId: COGNITO_APP_CLIENT_ID,
      AuthFlow: authFlow
    }));
  }

  if (operation === "RespondToAuthChallenge") {
    const challenge = String(payload.ChallengeName || "");
    if (!["NEW_PASSWORD_REQUIRED","SOFTWARE_TOKEN_MFA","MFA_SETUP"].includes(challenge)) {
      const error = new Error("Unsupported authentication challenge.");
      error.statusCode = 400;
      throw error;
    }
    return await cognito.send(new RespondToAuthChallengeCommand({
      ...payload,
      ClientId: COGNITO_APP_CLIENT_ID,
      ChallengeName: challenge
    }));
  }

  if (operation === "ForgotPassword") {
    return await cognito.send(new ForgotPasswordCommand({
      ...payload,
      ClientId: COGNITO_APP_CLIENT_ID
    }));
  }

  if (operation === "ConfirmForgotPassword") {
    return await cognito.send(new ConfirmForgotPasswordCommand({
      ...payload,
      ClientId: COGNITO_APP_CLIENT_ID
    }));
  }

  if (operation === "GlobalSignOut") {
    return await cognito.send(new GlobalSignOutCommand({
      AccessToken: String(payload.AccessToken || "")
    }));
  }

  if (operation === "GetUser") {
    return await cognito.send(new GetUserCommand({
      AccessToken: String(payload.AccessToken || "")
    }));
  }

  if (operation === "AssociateSoftwareToken") {
    return await cognito.send(new AssociateSoftwareTokenCommand({
      AccessToken: payload.AccessToken ? String(payload.AccessToken) : undefined,
      Session: payload.Session ? String(payload.Session) : undefined
    }));
  }

  if (operation === "VerifySoftwareToken") {
    return await cognito.send(new VerifySoftwareTokenCommand({
      AccessToken: payload.AccessToken ? String(payload.AccessToken) : undefined,
      Session: payload.Session ? String(payload.Session) : undefined,
      UserCode: String(payload.UserCode || ""),
      FriendlyDeviceName: payload.FriendlyDeviceName ? String(payload.FriendlyDeviceName) : undefined
    }));
  }

  if (operation === "SetUserMFAPreference") {
    return await cognito.send(new SetUserMFAPreferenceCommand({
      AccessToken: String(payload.AccessToken || ""),
      SMSMfaSettings: payload.SMSMfaSettings,
      SoftwareTokenMfaSettings: payload.SoftwareTokenMfaSettings
    }));
  }

  const error = new Error("Unsupported public identity operation.");
  error.statusCode = 400;
  throw error;
}

function authHeader(event) {
  const h = event?.headers || {};
  const value = h.authorization || h.Authorization || "";
  if (!value.startsWith("Bearer ")) {
    const error = new Error("Bearer token required.");
    error.statusCode = 401;
    throw error;
  }
  return value;
}

async function mainApi(event, action, payload) {
  const res = await fetch(`${MAIN_API_BASE}/tenant-admin`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authHeader(event)
    },
    body: JSON.stringify({ action, ...payload })
  });

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok || data?.success === false) {
    const error = new Error(
      data?.error || `Main API request failed (${res.status}).`
    );
    error.statusCode = res.status || 502;
    throw error;
  }

  return data?.data;
}

function tempPassword() {
  return `Smz!${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}aA9`;
}

async function getUser(email) {
  try {
    return await cognito.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email
    }));
  } catch (error) {
    if (error?.name === "UserNotFoundException") return null;
    throw error;
  }
}

function subOf(user) {
  const attrs = user?.UserAttributes || user?.Attributes || [];
  return attrs.find(a => a.Name === "sub")?.Value || null;
}

function normalizeSubdomain(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateSubdomain(value) {
  const subdomain = normalizeSubdomain(value);
  const valid =
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain) &&
    !RESERVED_SUBDOMAINS.has(subdomain);
  if (!valid) {
    const error = new Error(
      "Choose a valid, non-reserved agency URL using lowercase letters, numbers, and hyphens."
    );
    error.statusCode = 400;
    throw error;
  }
  return subdomain;
}

function originFor(subdomain) {
  return `https://${subdomain}.${APP_BASE_DOMAIN}`;
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

async function registerSubdomain(event, body) {
  const tenantId = body?.tenantId;
  const agencyId = body?.agencyId;
  const subdomain = validateSubdomain(body?.subdomain);
  const previousSubdomain = body?.previousSubdomain
    ? normalizeSubdomain(body.previousSubdomain)
    : "";

  await mainApi(event, "authorize_identity_action", { tenantId });

  const origin = originFor(subdomain);
  const previousOrigin =
    previousSubdomain && previousSubdomain !== subdomain
      ? originFor(previousSubdomain)
      : null;

  // Cognito UpdateUserPoolClient resets omitted attributes to defaults.
  // Read the complete current client and send its mutable configuration back
  // with only callback/logout URLs changed.
  const described = await cognito.send(new DescribeUserPoolClientCommand({
    UserPoolId: USER_POOL_ID,
    ClientId: COGNITO_APP_CLIENT_ID
  }));

  const currentClient = described?.UserPoolClient;
  if (!currentClient) {
    const error = new Error("Cognito app client could not be loaded.");
    error.statusCode = 502;
    throw error;
  }

  let callbackURLs = unique(currentClient.CallbackURLs || []);
  let logoutURLs = unique(currentClient.LogoutURLs || []);

  if (previousOrigin) {
    callbackURLs = callbackURLs.filter(url => url !== previousOrigin);
    logoutURLs = logoutURLs.filter(url => url !== previousOrigin);
  }

  callbackURLs = unique([...callbackURLs, origin]);
  logoutURLs = unique([...logoutURLs, origin]);

  const {
    UserPoolId: _userPoolId,
    ClientId: _clientId,
    ClientSecret: _clientSecret,
    CreationDate: _creationDate,
    LastModifiedDate: _lastModifiedDate,
    ...mutableClient
  } = currentClient;

  await cognito.send(new UpdateUserPoolClientCommand({
    ...mutableClient,
    UserPoolId: USER_POOL_ID,
    ClientId: COGNITO_APP_CLIENT_ID,
    CallbackURLs: callbackURLs,
    LogoutURLs: logoutURLs
  }));

  const api = await apiGateway.send(new GetApiCommand({ ApiId: API_ID }));
  const existingCors = api?.CorsConfiguration || {};
  const registry = await mainApi(event, "list_subdomain_origins", {});
  const registeredOrigins = (registry?.subdomains || []).map(originFor);
  const allowOrigins = unique([
    CLOUDFRONT_ORIGIN,
    ...registeredOrigins,
    origin
  ]);

  await apiGateway.send(new UpdateApiCommand({
    ApiId: API_ID,
    CorsConfiguration: {
      AllowOrigins: allowOrigins,
      AllowHeaders: existingCors.AllowHeaders?.length
        ? existingCors.AllowHeaders
        : ["authorization", "content-type"],
      AllowMethods: existingCors.AllowMethods?.length
        ? existingCors.AllowMethods
        : ["GET", "OPTIONS", "POST"],
      ExposeHeaders: existingCors.ExposeHeaders || [],
      MaxAge: Number.isFinite(existingCors.MaxAge) ? existingCors.MaxAge : 3600,
      AllowCredentials: existingCors.AllowCredentials === true
    }
  }));

  return response(200, {
    success: true,
    data: {
      tenantId,
      agencyId,
      subdomain,
      origin,
      callbackRegistered: true,
      corsRegistered: true
    }
  });
}


function activationToken() {
  return crypto.randomBytes(32).toString('base64url');
}
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function tenantOrigin(subdomain) {
  const clean = normalizeSubdomain(subdomain);
  if (!clean) throw new Error('This agency does not have a valid SonoMarzi URL yet.');
  return `https://${clean}.${APP_BASE_DOMAIN}`;
}
async function mainLambdaInternal(action, payload={}) {
  const result = await lambda.send(new InvokeCommand({
    FunctionName: MAIN_LAMBDA_NAME,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({sonomarziInternal:true,action,...payload}))
  }));
  if (result.FunctionError) {
    const error = new Error('The secure activation store could not be reached.');
    error.statusCode = 502;
    throw error;
  }

  let outer = {};
  try { outer = JSON.parse(Buffer.from(result.Payload || []).toString('utf8') || '{}'); }
  catch {
    const error = new Error('The secure activation store returned an unreadable response.');
    error.statusCode = 502;
    throw error;
  }

  // The main API Lambda returns API Gateway proxy responses even when invoked
  // directly. Unwrap that envelope before interpreting the internal result.
  let body = outer;
  if (outer && typeof outer.body === 'string' && Number.isFinite(Number(outer.statusCode))) {
    try { body = JSON.parse(outer.body || '{}'); }
    catch {
      const error = new Error('The secure activation store returned an unreadable response body.');
      error.statusCode = 502;
      throw error;
    }
    if (Number(outer.statusCode) >= 400) {
      const error = new Error(body?.error || `Secure activation request failed (${outer.statusCode}).`);
      error.statusCode = Number(outer.statusCode);
      throw error;
    }
  }

  if (body?.success === false) {
    const error = new Error(body.error || 'Secure activation request failed.');
    error.statusCode = body.statusCode || 400;
    throw error;
  }
  return body?.data ?? body;
}
async function ensurePublicActivationRoute(event) {
  const routes = await apiGateway.send(new GetRoutesCommand({ApiId:API_ID,MaxResults:'100'}));
  const existing = (routes.Items || []).find(r => r.RouteKey === 'POST /activation');
  if (!existing) {
    await apiGateway.send(new CreateRouteCommand({
      ApiId:API_ID,
      RouteKey:'POST /activation',
      Target:`integrations/${IDENTITY_INTEGRATION_ID}`,
      AuthorizationType:'NONE'
    }));
  } else if (existing.AuthorizationType !== 'NONE' || existing.Target !== `integrations/${IDENTITY_INTEGRATION_ID}`) {
    await apiGateway.send(new UpdateRouteCommand({
      ApiId:API_ID,
      RouteId:existing.RouteId,
      Target:`integrations/${IDENTITY_INTEGRATION_ID}`,
      AuthorizationType:'NONE'
    }));
  }
}
async function senderAddress() {
  try {
    const status = await ses.send(new GetEmailIdentityCommand({IdentityName:APP_BASE_DOMAIN}));
    if (status?.VerifiedForSendingStatus === true || status?.VerificationStatus === 'SUCCESS') {
      return `SonoMarzi <no-reply@${APP_BASE_DOMAIN}>`;
    }
  } catch {}
  return `SonoMarzi <${SES_FALLBACK_SENDER}>`;
}
async function sendTransactionalEmail({to,subject,text,html}) {
  const from = await senderAddress();
  await ses.send(new SendEmailCommand({
    FromEmailAddress:from,
    ReplyToAddresses:[SES_FALLBACK_SENDER],
    Destination:{ToAddresses:[to]},
    Content:{Simple:{
      Subject:{Data:subject,Charset:'UTF-8'},
      Body:{Text:{Data:text,Charset:'UTF-8'},Html:{Data:html,Charset:'UTF-8'}}
    }}
  }));
  return from;
}
function forgotPasswordUrl(origin) {
  const params = new URLSearchParams({
    client_id:COGNITO_APP_CLIENT_ID,
    response_type:'code',
    scope:'openid email phone aws.cognito.signin.user.admin',
    redirect_uri:origin
  });
  return `https://${String(process.env.COGNITO_DOMAIN_HOST || 'us-east-2zulbalcue.auth.us-east-2.amazoncognito.com')}/forgotPassword?${params}`;
}
async function sendActivationEmail({email,name,tenantName,agencyName,subdomain,token}) {
  const origin = tenantOrigin(subdomain);
  const link = `${origin}/?activation=${encodeURIComponent(token)}`;
  const safeName=htmlEscape(name||email), safeAgency=htmlEscape(agencyName||tenantName||'your agency');
  return sendTransactionalEmail({
    to:email,
    subject:`Activate your SonoMarzi account for ${agencyName || tenantName || 'your agency'}`,
    text:`Hello ${name || email},\n\n${agencyName || tenantName || 'Your agency'} has invited you to SonoMarzi. No temporary password is sent by email or shown to an administrator. You will create your own permanent password.\n\nActivate your account: ${link}\n\nThis single-use link expires in ${ACTIVATION_TTL_HOURS} hours. After activation, sign in at ${origin}.\n\nIf you were not expecting this invitation, contact your agency administrator.`,
    html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><h2>Welcome to SonoMarzi</h2><p>Hello ${safeName},</p><p><strong>${safeAgency}</strong> has invited you to SonoMarzi.</p><p>No temporary password is included in this email or shown to an administrator. Use the secure button below to create your own permanent password.</p><p style="margin:28px 0"><a href="${htmlEscape(link)}" style="background:#134DD1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:7px;font-weight:700">Activate your account</a></p><p style="font-size:13px;color:#596579">This link is single-use and expires in ${ACTIVATION_TTL_HOURS} hours.</p><p style="font-size:13px;color:#596579">Your agency sign-in page is <a href="${htmlEscape(origin)}">${htmlEscape(origin)}</a>.</p></div>`
  });
}
async function sendExistingAccessEmail({email,name,tenantName,agencyName,subdomain}) {
  const origin=tenantOrigin(subdomain);
  return sendTransactionalEmail({
    to:email,
    subject:`SonoMarzi access added for ${agencyName || tenantName || 'your agency'}`,
    text:`Hello ${name || email},\n\nAccess to ${agencyName || tenantName || 'an agency'} has been added to your existing SonoMarzi account. Your existing password has not changed.\n\nSign in: ${origin}`,
    html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><h2>SonoMarzi access added</h2><p>Hello ${htmlEscape(name||email)},</p><p>Access to <strong>${htmlEscape(agencyName||tenantName||'your agency')}</strong> has been added to your existing account. Your password has not changed.</p><p style="margin:28px 0"><a href="${htmlEscape(origin)}" style="background:#134DD1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:7px;font-weight:700">Open SonoMarzi</a></p></div>`
  });
}
async function ensureMfaCapability(event) {
  await mainApi(event, 'list_subdomain_origins', {}); // Platform Admin authorization.
  await cognito.send(new SetUserPoolMfaConfigCommand({
    UserPoolId:USER_POOL_ID,
    MfaConfiguration:'OPTIONAL',
    SoftwareTokenMfaConfiguration:{Enabled:true}
  }));
  const current = await cognito.send(new DescribeUserPoolClientCommand({UserPoolId:USER_POOL_ID,ClientId:COGNITO_APP_CLIENT_ID}));
  const c=current.UserPoolClient||{};
  const scopes=[...new Set([...(c.AllowedOAuthScopes||[]),'openid','email','phone','aws.cognito.signin.user.admin'])];
  await cognito.send(new UpdateUserPoolClientCommand({
    UserPoolId:USER_POOL_ID, ClientId:COGNITO_APP_CLIENT_ID,
    ClientName:c.ClientName,
    RefreshTokenValidity:c.RefreshTokenValidity,
    AccessTokenValidity:c.AccessTokenValidity,
    IdTokenValidity:c.IdTokenValidity,
    TokenValidityUnits:c.TokenValidityUnits,
    ReadAttributes:c.ReadAttributes,
    WriteAttributes:c.WriteAttributes,
    ExplicitAuthFlows:c.ExplicitAuthFlows,
    SupportedIdentityProviders:c.SupportedIdentityProviders,
    CallbackURLs:c.CallbackURLs,
    LogoutURLs:c.LogoutURLs,
    DefaultRedirectURI:c.DefaultRedirectURI,
    AllowedOAuthFlows:c.AllowedOAuthFlows,
    AllowedOAuthScopes:scopes,
    AllowedOAuthFlowsUserPoolClient:c.AllowedOAuthFlowsUserPoolClient,
    PreventUserExistenceErrors:c.PreventUserExistenceErrors,
    EnableTokenRevocation:c.EnableTokenRevocation,
    EnablePropagateAdditionalUserContextData:c.EnablePropagateAdditionalUserContextData,
    AuthSessionValidity:c.AuthSessionValidity
  }));
  return response(200,{success:true,data:{mfaConfiguration:'OPTIONAL',method:'TOTP'}});
}


async function ensureCustomAuthCapability(event, tenantId) {
  if (tenantId) await mainApi(event, "authorize_identity_action", { tenantId });
  const described = await cognito.send(new DescribeUserPoolClientCommand({UserPoolId:USER_POOL_ID,ClientId:COGNITO_APP_CLIENT_ID}));
  const c=described?.UserPoolClient;
  if(!c){const e=new Error("Cognito app client could not be loaded.");e.statusCode=502;throw e;}
  const {UserPoolId:_u,ClientId:_c,ClientSecret:_s,CreationDate:_cd,LastModifiedDate:_lm,...mutable}=c;
  const ExplicitAuthFlows=unique([...(c.ExplicitAuthFlows||[]),"ALLOW_USER_PASSWORD_AUTH","ALLOW_USER_SRP_AUTH","ALLOW_REFRESH_TOKEN_AUTH"]);
  const SupportedIdentityProviders=unique([...(c.SupportedIdentityProviders||[]),"COGNITO"]);
  await cognito.send(new UpdateUserPoolClientCommand({...mutable,UserPoolId:USER_POOL_ID,ClientId:COGNITO_APP_CLIENT_ID,ExplicitAuthFlows,SupportedIdentityProviders}));
  return {explicitAuthFlows:ExplicitAuthFlows,supportedIdentityProviders:SupportedIdentityProviders};
}

async function sendAccessEmail(event, body) {
  await ensureCustomAuthCapability(event, body?.tenantId);
  const target=await mainApi(event,"identity_target",{tenantId:body?.tenantId,agencyId:body?.agencyId,userId:body?.userId});
  let existing=await getUser(target.email);
  const needsActivation=!existing||existing.UserStatus!=="CONFIRMED";
  try{
    if(!existing){
      const created=await cognito.send(new AdminCreateUserCommand({UserPoolId:USER_POOL_ID,Username:target.email,TemporaryPassword:tempPassword(),MessageAction:"SUPPRESS",UserAttributes:[{Name:"email",Value:target.email},{Name:"email_verified",Value:"true"},{Name:"name",Value:target.name||target.email}]}));
      const cognitoSub=subOf(created.User); if(!cognitoSub) throw new Error("Cognito identity could not be resolved.");
      const listed=await mainApi(event,"list_users",{tenantId:body?.tenantId});
      const current=(listed?.users||[]).find(u=>u.user_id===body?.userId);
      const roleIds=Array.isArray(current?.role_ids)&&current.role_ids.length?current.role_ids:["role_officer"];
      const token=activationToken(), activationExpiresAt=new Date(Date.now()+ACTIVATION_TTL_HOURS*3600000).toISOString();
      const db=await mainApi(event,"finalize_invite",{tenantId:body?.tenantId,agencyId:target.agencyId,name:target.name||target.email,email:target.email,cognitoSub,roleIds,needsActivation:true,activationTokenHash:hashToken(token),activationExpiresAt});
      await sendActivationEmail({...db,email:target.email,name:target.name,token});
      return response(200,{success:true,data:{emailSent:true,email:target.email,needsActivation:true,activationExpiresAt,mode:"activation"}});
    }
    if(needsActivation){
      const token=activationToken(),activationExpiresAt=new Date(Date.now()+ACTIVATION_TTL_HOURS*3600000).toISOString();
      const ctx=await mainApi(event,"issue_activation_token",{tenantId:body?.tenantId,agencyId:target.agencyId,userId:body?.userId,activationTokenHash:hashToken(token),activationExpiresAt});
      await sendActivationEmail({...ctx,token});
      return response(200,{success:true,data:{emailSent:true,email:target.email,needsActivation:true,activationExpiresAt,mode:"activation"}});
    }
    const origin=tenantOrigin(target.subdomain);
    await sendTransactionalEmail({to:target.email,subject:`Your SonoMarzi access for ${target.agencyName||target.tenantName||"your agency"}`,text:`Hello ${target.name||target.email},\n\nYour SonoMarzi account is active for ${target.agencyName||target.tenantName||"your agency"}.\n\nSign in here:\n${origin}\n\nIf you do not remember your password, select Forgot password? on the SonoMarzi sign-in screen.`,html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><h2>Your SonoMarzi access</h2><p>Hello ${htmlEscape(target.name||target.email)},</p><p>Your account is active for <strong>${htmlEscape(target.agencyName||target.tenantName||"your agency")}</strong>.</p><p style="margin:28px 0"><a href="${htmlEscape(origin)}" style="background:#134DD1;color:#fff;text-decoration:none;padding:12px 18px;border-radius:7px;font-weight:700">Open SonoMarzi</a></p><p style="font-size:13px;color:#596579">If you don't remember your password, select <strong>Forgot password?</strong> on the SonoMarzi sign-in screen.</p></div>`});
    return response(200,{success:true,data:{emailSent:true,email:target.email,needsActivation:false,mode:"access"}});
  }catch(error){console.error("Send access email failed",error);return response(502,{success:false,error:error?.message||"Email delivery failed."});}
}

async function createUser(event, body) {
  const tenantId = body?.tenantId;
  const agencyId = body?.agencyId;
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const roleIds = Array.isArray(body?.roleIds) ? body.roleIds.map(String) : [];

  await mainApi(event, "authorize_identity_action", { tenantId });
  await ensureCustomAuthCapability(event, tenantId);
  await ensurePublicActivationRoute(event);

  const existing = await getUser(email);
  if (existing && existing.Enabled === false) {
    const error=new Error('This authentication account is disabled. Re-enable it before adding agency access.'); error.statusCode=409; throw error;
  }
  let cognitoSub = subOf(existing);
  const needsActivation = !existing || existing.UserStatus !== 'CONFIRMED';
  let token = null;

  if (!existing) {
    const created = await cognito.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      TemporaryPassword: tempPassword(),
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: name }
      ]
    }));
    cognitoSub = subOf(created.User);
  }

  if (!cognitoSub) return response(502,{success:false,error:'Cognito identity could not be resolved.'});

  const activationExpiresAt = needsActivation ? new Date(Date.now()+ACTIVATION_TTL_HOURS*3600000).toISOString() : null;
  if (needsActivation) token=activationToken();
  const db = await mainApi(event, "finalize_invite", {
    tenantId, agencyId, name, email, cognitoSub, roleIds,
    needsActivation,
    activationTokenHash: token ? hashToken(token) : null,
    activationExpiresAt
  });

  let emailSent=false, emailError=null;
  try {
    if (needsActivation) await sendActivationEmail({...db,email,name,token});
    else await sendExistingAccessEmail({...db,email,name});
    emailSent=true;
  } catch (error) {
    console.error('Invite email delivery failed',error);
    emailError=error?.message||'Email delivery failed.';
  }

  return response(200,{success:true,data:{...db,emailSent,emailError,existingAccount:Boolean(existing),needsActivation,activationExpiresAt}});
}

async function resendInvitation(event, body) {
  await ensurePublicActivationRoute(event);
  const target = await mainApi(event, "identity_target", {
    tenantId: body?.tenantId,
    agencyId: body?.agencyId,
    userId: body?.userId
  });
  const existing = await getUser(target.email);
  if (!existing) { const error=new Error('Cognito account not found for this user.'); error.statusCode=404; throw error; }

  const needsActivation = existing.UserStatus !== 'CONFIRMED';
  let emailSent=false, emailError=null, activationExpiresAt=null;
  try {
    if (needsActivation) {
      const token=activationToken();
      activationExpiresAt=new Date(Date.now()+ACTIVATION_TTL_HOURS*3600000).toISOString();
      const ctx=await mainApi(event,'issue_activation_token',{
        tenantId:body?.tenantId,agencyId:target.agencyId,userId:body?.userId,
        activationTokenHash:hashToken(token),activationExpiresAt
      });
      await sendActivationEmail({...ctx,token});
    } else {
      await sendExistingAccessEmail(target);
    }
    emailSent=true;
  } catch(error) { emailError=error?.message||'Email delivery failed.'; }

  return response(200,{success:true,data:{invitationSent:emailSent,emailSent,emailError,email:target.email,needsActivation,activationExpiresAt}});
}

async function updateProfile(event, body) {
  const target = await mainApi(event, "identity_target", {
    tenantId: body?.tenantId,
    userId: body?.userId
  });

  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();

  await cognito.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: target.email,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "email_verified", Value: "true" },
      { Name: "name", Value: name }
    ]
  }));

  await mainApi(event, "update_user_profile_db", {
    tenantId: body?.tenantId,
    userId: body?.userId,
    name,
    email
  });

  return response(200, {
    success: true,
    data: { userId: body?.userId }
  });
}

async function resetPassword(event, body) {
  const target = await mainApi(event, "identity_target", {
    tenantId: body?.tenantId,
    agencyId: body?.agencyId,
    userId: body?.userId
  });
  await cognito.send(new AdminResetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: target.email
  }));
  return response(200,{success:true,data:{emailSent:true,email:target.email}});
}

async function resetAll(event, body) {
  if (body?.confirm !== true) {
    return response(400, {
      success: false,
      error: "Bulk reset requires explicit confirmation."
    });
  }

  const exclude = new Set(
    (Array.isArray(body?.excludeEmails) ? body.excludeEmails : [])
      .map(v => String(v).trim().toLowerCase())
      .filter(Boolean)
  );

  const candidates = await mainApi(event, "bulk_reset_candidates", {
    tenantId: body?.tenantId
  });

  const resetIds = [];
  const skipped = [];
  const failed = [];

  for (const user of candidates.users || []) {
    if (exclude.has(String(user.email).toLowerCase())) {
      skipped.push(user.email);
      continue;
    }

    try {
      await cognito.send(new AdminResetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: user.email
      }));
      resetIds.push(user.user_id);
    } catch {
      failed.push(user.email);
    }
  }

  return response(200, {
    success: true,
    data: { resetCount: resetIds.length, skipped, failed }
  });
}

async function deleteUser(event, body) {
  const result = await mainApi(event, "delete_user_db", {
    tenantId: body?.tenantId,
    agencyId: body?.agencyId,
    userId: body?.userId
  });

  if (result.disableAuth) {
    await cognito.send(new AdminDisableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: result.email
    }));
  }

  return response(200, {
    success: true,
    data: { authDeleted: result.disableAuth }
  });
}

async function activateAccount(body) {
  const token=String(body?.token||'').trim();
  const password=String(body?.password||'');
  if (!token || token.length < 32) return response(400,{success:false,error:'A valid activation token is required.'});
  if (password.length < 8) return response(400,{success:false,error:'Choose a password with at least 8 characters.'});
  if (!/[A-Z]/.test(password)) return response(400,{success:false,error:'Password must include at least one uppercase letter.'});
  if (!/[a-z]/.test(password)) return response(400,{success:false,error:'Password must include at least one lowercase letter.'});
  if (!/[0-9]/.test(password)) return response(400,{success:false,error:'Password must include at least one number.'});
  if (!/[^A-Za-z0-9]/.test(password)) return response(400,{success:false,error:'Password must include at least one special character.'});
  const tokenHash=hashToken(token);
  let claimed;
  try { claimed=await mainLambdaInternal('claim_activation_token',{tokenHash}); }
  catch(error){ return response(error.statusCode||410,{success:false,error:error.message}); }
  try {
    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId:USER_POOL_ID,
      Username:claimed.email,
      Password:password,
      Permanent:true
    }));
    await mainLambdaInternal('complete_activation',{tokenHash});
    return response(200,{success:true,data:{activated:true}});
  } catch(error) {
    try { await mainLambdaInternal('release_activation_token',{tokenHash}); } catch {}
    if (error?.name === 'InvalidPasswordException') return response(400,{success:false,error:error.message||'That password does not meet the SonoMarzi password policy.'});
    throw error;
  }
}

export const handler = async event => {
  try {
    const method =
      event?.requestContext?.http?.method ||
      event?.httpMethod ||
      "POST";

    if (method !== "POST") {
      return response(405, { success: false, error: "Method not allowed." });
    }

    const body = parseBody(event);
    const action = String(body?.action || "");
    const path = event?.rawPath || event?.path || "";

    if (path === "/activation") {
      if (body?.action === "public_auth") {
        const data = await publicAuth(body);
        return response(200,{success:true,data});
      }
      return await activateAccount(body);
    }
    if (action === "invite_user") return await createUser(event, body);
    if (action === "update_user_profile") return await updateProfile(event, body);
    if (action === "reset_password") return await resetPassword(event, body);
    if (action === "reset_all_passwords") return await resetAll(event, body);
    if (action === "delete_user") return await deleteUser(event, body);
    if (action === "register_subdomain") return await registerSubdomain(event, body);
    if (action === "ensure_mfa_capability") return await ensureMfaCapability(event);

    if (action === "resend_invitation") return await resendInvitation(event, body);
    if (action === "send_access_email") return await sendAccessEmail(event, body);
    if (action === "ensure_custom_auth") return response(200,{success:true,data:await ensureCustomAuthCapability(event, body?.tenantId)});

    return response(400, {
      success: false,
      error: "Unsupported identity administration action."
    });
  } catch (error) {
    console.error("Identity admin error", error);
    return response(error?.statusCode || 500, {
      success: false,
      error: error?.message || "Identity administration failed."
    });
  }
};