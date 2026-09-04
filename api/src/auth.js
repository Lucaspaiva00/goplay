const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function secret() {
  return process.env.AUTH_SECRET || process.env.DATABASE_URL || 'goplay-dev-secret-change-me';
}
function b64(obj){ return Buffer.from(JSON.stringify(obj)).toString('base64url'); }
function signPart(part){ return crypto.createHmac('sha256', secret()).update(part).digest('base64url'); }
function timingSafeEq(a,b){ try{ const A=Buffer.from(String(a)); const B=Buffer.from(String(b)); return A.length===B.length && crypto.timingSafeEqual(A,B);}catch{return false;} }

function createToken(payload, ttlSeconds = 60*60*24*7){
  const body = b64({ ...payload, exp: Math.floor(Date.now()/1000)+ttlSeconds, iat: Math.floor(Date.now()/1000) });
  return `${body}.${signPart(body)}`;
}
function decodeToken(token){
  const [body,sig] = String(token||'').split('.');
  if(!body || !sig || !timingSafeEq(sig, signPart(body))) return null;
  try{
    const data = JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
    if(!data.exp || data.exp < Math.floor(Date.now()/1000)) return null;
    return data;
  }catch{return null;}
}
function bearer(req){
  const raw=String(req.headers.authorization||'');
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

async function resolveActor(token){
  const data=decodeToken(token);
  if(!data) return null;
  if(data.kind==='USER'){
    const user=await prisma.usuario.findUnique({where:{id:Number(data.id)},select:{id:true,nome:true,email:true,tipo:true}});
    return user?{kind:'USER',...user}:null;
  }
  if(data.kind==='STAFF'){
    const staff=await prisma.funcionario.findUnique({where:{id:Number(data.id)},include:{society:{select:{id:true,nome:true,usuarioId:true}}}});
    if(!staff||!staff.ativo||Number(staff.sessionVersion)!==Number(data.sv))return null;
    return {kind:'STAFF',id:staff.id,nome:staff.nome,funcao:staff.funcao,societyId:staff.societyId,society:staff.society};
  }
  return null;
}
async function authenticate(req,res,next){
  try{req.actor=await resolveActor(bearer(req));if(!req.actor)return res.status(401).json({error:'Sessão inválida ou expirada.'});return next();}
  catch(e){console.error('auth:',e);return res.status(500).json({error:'Erro ao validar sessão.'});}
}
async function authenticateOptional(req,res,next){
  try{const token=bearer(req);req.actor=token?await resolveActor(token):null;return next();}
  catch(e){console.error('auth optional:',e);req.actor=null;return next();}
}

function roleAllowed(actor, roles=[]){
  if(actor?.kind==='USER' && actor.tipo==='DONO_SOCIETY') return true;
  return actor?.kind==='STAFF' && roles.includes(actor.funcao);
}

async function ownsSociety(actor,societyId){
  societyId=Number(societyId);
  if(!societyId) return false;
  if(actor?.kind==='STAFF') return Number(actor.societyId)===societyId;
  if(actor?.kind==='USER' && actor.tipo==='DONO_SOCIETY'){
    const s=await prisma.society.findFirst({where:{id:societyId,usuarioId:Number(actor.id)},select:{id:true}});
    return !!s;
  }
  return false;
}

function requireSocietyRoles(roles=[], resolver=(req)=>req.params.societyId || req.params.id || req.body.societyId){
  return [authenticate, async (req,res,next)=>{
    try{
      const societyId=Number(await resolver(req));
      if(!societyId) return res.status(400).json({error:'Empresa inválida.'});
      if(!roleAllowed(req.actor,roles)) return res.status(403).json({error:'Seu perfil não possui permissão para esta ação.'});
      if(!(await ownsSociety(req.actor,societyId))) return res.status(403).json({error:'Você não possui acesso a esta empresa.'});
      req.authorizedSocietyId=societyId;
      next();
    }catch(e){console.error(e);res.status(500).json({error:'Erro ao validar permissão.'});}
  }];
}


function requireEntitySocietyRoles(roles=[], modelName, paramName='id'){
  return [authenticate, async (req,res,next)=>{
    try{
      const id=Number(req.params[paramName]);
      if(!id) return res.status(400).json({error:'Registro inválido.'});
      const row=await prisma[modelName].findUnique({where:{id},select:{societyId:true}});
      if(!row) return res.status(404).json({error:'Registro não encontrado.'});
      if(!roleAllowed(req.actor,roles)) return res.status(403).json({error:'Seu perfil não possui permissão para esta ação.'});
      if(!(await ownsSociety(req.actor,row.societyId))) return res.status(403).json({error:'Você não possui acesso a esta empresa.'});
      req.authorizedSocietyId=row.societyId;next();
    }catch(e){console.error(e);res.status(500).json({error:'Erro ao validar permissão.'});}
  }];
}
module.exports={createToken,decodeToken,authenticate,authenticateOptional,roleAllowed,ownsSociety,requireSocietyRoles,requireEntitySocietyRoles};
