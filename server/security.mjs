import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createPublicKey,verify} from 'node:crypto';
import {promisify} from 'node:util';
import {hash} from './database.mjs';
const scrypt=promisify(scryptCallback);
export const random=()=>randomBytes(32).toString('base64url');
export function failure(message,status=400){return Object.assign(Error(message),{status});}
export async function passwordHash(password){if(typeof password!=='string'||password.length<14||password.length>256)throw failure('Password harus 14–256 karakter.');const salt=random();return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex');}
const dummy='bbi-dummy-salt:'+ '0'.repeat(128);
export async function passwordMatches(password,stored=dummy){if(typeof password!=='string'||password.length>256)return false;const [salt,key]=stored.split(':');const actual=Buffer.from(await scrypt(password,salt,64));return timingSafeEqual(actual,Buffer.from(key,'hex'));}
export function configuration(env=process.env){
 const production=env.NODE_ENV==='production';const origin=env.APP_ORIGIN??'http://127.0.0.1:5181';const parsed=new URL(origin);
 if(parsed.origin!==origin||parsed.username||parsed.password)throw Error('APP_ORIGIN harus berupa origin tanpa path.');
 const issuer=env.CF_ACCESS_ISSUER??'',audience=env.CF_ACCESS_AUD??'';
 if(issuer&&!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer))throw Error('CF_ACCESS_ISSUER tidak valid.');
 if(production&&(parsed.protocol!=='https:'||!issuer||!audience))throw Error('Production memerlukan HTTPS APP_ORIGIN, CF_ACCESS_ISSUER dan CF_ACCESS_AUD.');
 if(!production&&!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname))throw Error('Mode testing lokal hanya untuk localhost.');
 return {production,origin,issuer,audience,port:Number(env.PORT??5181),file:env.BBI_DATABASE??'./data/bbi.sqlite'};
}
// Keys are fetched only from the configured issuer, never from untrusted token URLs.
export function cloudflareValidator(config,fetcher=fetch){let keys=[],expires=0,lastRefresh=0;return async function(token){
 if(!config.issuer)return null;
 try{
  if(typeof token!=='string'||token.length>16000)throw Error();const parts=token.split('.');if(parts.length!==3)throw Error();
  const header=JSON.parse(Buffer.from(parts[0],'base64url'));const payload=JSON.parse(Buffer.from(parts[1],'base64url'));
  if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error();
  const now=Math.floor(Date.now()/1000);
  if(payload.iss!==config.issuer||!Array.isArray(payload.aud)||!payload.aud.includes(config.audience)||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+30||(payload.nbf!==undefined&&(!Number.isFinite(payload.nbf)||payload.nbf>now))||typeof payload.email!=='string')throw Error();
  if(Date.now()>expires||(!keys.some(k=>k.kid===header.kid)&&Date.now()-lastRefresh>60000)){
   lastRefresh=Date.now();const response=await fetcher(config.issuer+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(5000),redirect:'error'});if(!response.ok)throw Error();const jwks=await response.json();if(!Array.isArray(jwks.keys))throw Error();keys=jwks.keys;expires=Date.now()+300000;
  }
  const key=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!key||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error();
  return {email:payload.email.toLowerCase()};
 }catch{throw failure('Acces Cloudflare tidak valid atau kedaluwarsa.',401);}
 };}
export function sessionFor(db,cookie){const token=String(cookie??'').split(';').map(v=>v.trim()).find(v=>v.startsWith('bbi_session='))?.slice(12);if(!token)return null;return db.prepare('SELECT s.*,u.username,u.name,u.role,u.email,u.active,u.version FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1 AND s.user_version=u.version').get(hash(token),Date.now());}
export function publicUser(row){return {id:row.user_id??row.id,name:row.name,role:row.role,active:Boolean(row.active)};}
