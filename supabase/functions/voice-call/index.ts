import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type ServiceAccount = { client_email: string; private_key: string; project_id: string };
const jsonHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "cache-control": "no-store",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function b64url(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function firebaseAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(new Uint8Array(signature))}` }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error("FIREBASE_OAUTH_FAILED");
  return String(body.access_token);
}


function turnSettings() {
 const id = Deno.env.get("MEDITALY_CLOUDFLARE_TURN_KEY_ID")?.trim();
 const token = Deno.env.get("MEDITALY_CLOUDFLARE_TURN_API_TOKEN")?.trim();
 if (id || token) return { provider: "cloudflare", configured: !!id && !!token && /^[A-Za-z0-9_-]{1,128}$/.test(id), id, token, urls: [] as string[], secret: undefined as string | undefined };
 const urls = (Deno.env.get("MEDITALY_TURN_URLS") || "").split(",").map(x => x.trim()).filter(x => /^turns?:[^\s]+$/.test(x));
 const secret = Deno.env.get("MEDITALY_TURN_SECRET");
 return { provider: "coturn", configured: !!urls.length && !!secret, urls, secret, id: undefined as string | undefined, token: undefined as string | undefined };
}

async function turnCredentials(userId: string) {
 const settings = turnSettings();
 if (!settings.configured) throw new Error("CALLS_NOT_CONFIGURED");
 if (settings.provider === "cloudflare") {
  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(settings.id!)}/credentials/generate-ice-servers`, {
   method: "POST", headers: { "authorization": `Bearer ${settings.token}`, "content-type": "application/json" },
   body: JSON.stringify({ ttl: 3600 }), signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("TURN_SERVICE_UNAVAILABLE");
  const body = await response.json();
  if (!Array.isArray(body?.iceServers)) throw new Error("TURN_SERVICE_UNAVAILABLE");
  const servers: Array<{urls: string[]; username?: string; credential?: string}> = [];
  for (const server of body.iceServers) {
   if (!server || typeof server !== "object") continue;
   const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter((url: unknown) => typeof url === "string" && /^(?:stun|turn|turns):(?:stun|turn)\.cloudflare\.com:(?:3478|443|80|5349)(?:\?transport=(?:udp|tcp))?$/.test(url));
   if (!urls.length) continue;
   const relay = urls.some((url: string) => /^turns?:/.test(url));
   if (relay && (typeof server.username !== "string" || typeof server.credential !== "string" || !server.username || !server.credential)) continue;
   servers.push(relay ? {urls, username: server.username, credential: server.credential} : {urls});
  }
  if (!servers.some(server => server.urls.some(url => /^turns?:/.test(url)))) throw new Error("TURN_SERVICE_UNAVAILABLE");
  return { iceServers: servers, expires_in: 3600 };
 }
 const username = `${Math.floor(Date.now()/1000)+3600}:${userId}`;
 const hmac = await crypto.subtle.importKey("raw",new TextEncoder().encode(settings.secret!),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
 const signature = new Uint8Array(await crypto.subtle.sign("HMAC",hmac,new TextEncoder().encode(username)));
 return {iceServers:[{urls:settings.urls, username, credential:btoa(String.fromCharCode(...signature))}], expires_in:3600};
}

Deno.serve(async request => {
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:jsonHeaders});
 if(request.method==="GET"){const settings=turnSettings();return reply({calls_configured:settings.configured,provider:settings.provider});}
 if(request.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
 const jwt=request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!jwt)return reply({error:"NOT_AUTHORIZED"},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!key||!anon)return reply({error:"SERVER_CONFIGURATION_MISSING"},503);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await admin.auth.getUser(jwt);
 if(authError||!auth.user)return reply({error:"NOT_AUTHORIZED"},401);
 const {data:profile}=await admin.from("profiles").select("role,account_active").eq("id",auth.user.id).maybeSingle();
 if(!profile?.account_active||!["Patient","Clinician"].includes(profile.role))return reply({error:"NOT_AUTHORIZED"},403);
 const input=await request.json().catch(()=>({}));
 if(!input||typeof input!=="object"||Array.isArray(input))return reply({error:"INVALID_REQUEST"},400);
 if(input.action==="config"){
  if(!turnSettings().configured)return reply({error:"CALLS_NOT_CONFIGURED"},503);
  const scoped=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${jwt}`}},auth:{persistSession:false}});
  const {error:gateError}=await scoped.rpc("request_turn_credentials");
  if(gateError)return reply({error:gateError.message==="TURN_RATE_LIMIT"?"TURN_RATE_LIMIT":"NOT_AUTHORIZED"},gateError.message==="TURN_RATE_LIMIT"?429:403);
  try{return reply(await turnCredentials(auth.user.id));}
  catch(_){return reply({error:"TURN_SERVICE_UNAVAILABLE"},503);}
 }
 if(input.action!=="notify"||typeof input.call_id!=="string"||! /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.call_id))return reply({error:"INVALID_REQUEST"},400);
 const client=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${jwt}`}},auth:{persistSession:false}});
 const {data:call,error}=await client.from("voice_calls").select("id,clinician_id,patient_id,status,expires_at,media_mode").eq("id",input.call_id).maybeSingle();
 if(error||!call||call.clinician_id!==auth.user.id||profile.role!=="Clinician")return reply({error:"NOT_AUTHORIZED"},403);
 if(call.status!=="ringing"||Date.parse(call.expires_at)<=Date.now())return reply({error:"CALL_EXPIRED"},409);
 const {data:claimed,error:claimError}=await admin.from("voice_calls").update({push_claimed_at:new Date().toISOString()}).eq("id",call.id).eq("status","ringing").is("push_claimed_at",null).select("id");
 if(claimError)return reply({error:"CLAIM_FAILED"},500);
 if(!claimed?.length)return reply({ok:true,already_requested:true});
 try{
  const raw=Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if(!raw)throw new Error("FCM_NOT_CONFIGURED");
  const account=JSON.parse(raw) as ServiceAccount;
  const {data:tokens,error:tokenError}=await admin.from("device_push_tokens").select("id,token").eq("user_id",call.patient_id).eq("platform","android").eq("active",true);
  if(tokenError)throw new Error("TOKEN_LOOKUP_FAILED");
  if(!tokens?.length)return reply({ok:false,reason:"NO_ACTIVE_DEVICE_TOKENS"});
  const access=await firebaseAccessToken(account);let sent=0;
  for(const device of tokens){
   const ttl=Math.max(1,Math.min(70,Math.floor((Date.parse(call.expires_at)-Date.now())/1000)));
   if(Date.parse(call.expires_at)<=Date.now())break;
   const response=await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,{method:"POST",headers:{authorization:`Bearer ${access}`,"content-type":"application/json"},body:JSON.stringify({message:{token:device.token,data:{type:"voice_call",call_id:call.id,expires_at:call.expires_at,media_mode:call.media_mode},android:{priority:"high",ttl:`${ttl}s`,collapse_key:call.id}}})});
   if(response.ok)sent++;else{const failure=await response.text();if(response.status===404||failure.includes("UNREGISTERED"))await admin.from("device_push_tokens").update({active:false}).eq("id",device.id);}
  }
  return reply({ok:sent>0,devices_notified:sent});
 }catch(_){return reply({ok:false,reason:"CALL_PUSH_UNAVAILABLE"},503);}
});
