const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { createToken } = require('../auth');

const FUNCOES=['ADMIN','MESARIO','CAIXA','BAR','RECEPCAO'];
const cleanAcesso=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,'.');
const publicStaff=f=>f?({id:f.id,societyId:f.societyId,nome:f.nome,acesso:f.acesso,funcao:f.funcao,ativo:f.ativo,ultimoAcessoEm:f.ultimoAcessoEm,createdAt:f.createdAt}):null;

async function login(req,res){
  try{
    const acesso=cleanAcesso(req.body.acesso), pin=String(req.body.pin||'').trim();
    if(!acesso||!pin) return res.status(400).json({error:'Informe usuário de acesso e PIN.'});
    const f=await prisma.funcionario.findUnique({where:{acesso},include:{society:{select:{id:true,nome:true,imagem:true}}}});
    if(!f || !f.ativo) return res.status(403).json({error:'Acesso não encontrado ou inativo.'});
    if(!(await bcrypt.compare(pin,f.pinHash))) return res.status(400).json({error:'PIN incorreto.'});
    await prisma.funcionario.update({where:{id:f.id},data:{ultimoAcessoEm:new Date()}});
    const authToken=createToken({kind:'STAFF',id:f.id,sv:f.sessionVersion});
    return res.json({authToken,funcionario:{...publicStaff(f),society:f.society},usuarioOperacional:{id:f.id,nome:f.nome,tipo:'FUNCIONARIO',funcao:f.funcao,societyId:f.societyId,funcionarioId:f.id}});
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao entrar como funcionário.'});}
}

async function list(req,res){
  const societyId=Number(req.params.societyId);
  const rows=await prisma.funcionario.findMany({where:{societyId},orderBy:[{ativo:'desc'},{nome:'asc'}]});
  res.json(rows.map(publicStaff));
}
async function create(req,res){
  try{
    const societyId=Number(req.params.societyId), nome=String(req.body.nome||'').trim(), acesso=cleanAcesso(req.body.acesso), pin=String(req.body.pin||'').trim(), funcao=String(req.body.funcao||'').toUpperCase();
    if(!nome||!acesso||pin.length<4||!FUNCOES.includes(funcao)) return res.status(400).json({error:'Informe nome, acesso, função e PIN com pelo menos 4 dígitos.'});
    if(await prisma.funcionario.findUnique({where:{acesso}})) return res.status(400).json({error:'Este usuário de acesso já existe.'});
    const pinHash=await bcrypt.hash(pin,10);
    const row=await prisma.funcionario.create({data:{societyId,nome,acesso,pinHash,funcao}});
    res.status(201).json(publicStaff(row));
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao cadastrar funcionário.'});}
}
async function update(req,res){
  try{
    const id=Number(req.params.id), societyId=Number(req.params.societyId), row=await prisma.funcionario.findUnique({where:{id}});
    if(!row || Number(row.societyId)!==societyId) return res.status(404).json({error:'Funcionário não encontrado nesta empresa.'});
    const data={};
    if(req.body.nome!==undefined) data.nome=String(req.body.nome||'').trim();
    if(req.body.funcao!==undefined){const f=String(req.body.funcao).toUpperCase();if(!FUNCOES.includes(f))return res.status(400).json({error:'Função inválida.'});data.funcao=f;}
    if(req.body.ativo!==undefined){data.ativo=!!req.body.ativo;data.sessionVersion={increment:1};}
    if(req.body.pin!==undefined){const pin=String(req.body.pin||'').trim();if(pin.length<4)return res.status(400).json({error:'PIN deve ter pelo menos 4 dígitos.'});data.pinHash=await bcrypt.hash(pin,10);data.sessionVersion={increment:1};}
    const updated=await prisma.funcionario.update({where:{id},data});
    res.json(publicStaff(updated));
  }catch(e){console.error(e);res.status(500).json({error:'Erro ao atualizar funcionário.'});}
}
async function revoke(req,res){
  try{const id=Number(req.params.id),societyId=Number(req.params.societyId);const row=await prisma.funcionario.findUnique({where:{id},select:{societyId:true}});if(!row||Number(row.societyId)!==societyId)return res.status(404).json({error:'Funcionário não encontrado nesta empresa.'});await prisma.funcionario.update({where:{id},data:{sessionVersion:{increment:1}}});res.json({ok:true});}
  catch(e){console.error(e);res.status(500).json({error:'Erro ao revogar sessões.'});}
}
module.exports={login,list,create,update,revoke};
