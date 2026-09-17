const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DIAS = [0,1,2,3,4,5,6];
const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizarHorarios(lista) {
    if (!Array.isArray(lista)) return null;
    const map = new Map();
    for (const item of lista) {
        const diaSemana = Number(item?.diaSemana);
        if (!DIAS.includes(diaSemana)) continue;
        const ativo = item?.ativo !== false;
        const horaInicio = ativo ? String(item?.horaInicio || "").trim() : null;
        const horaFim = ativo ? String(item?.horaFim || "").trim() : null;
        if (ativo && (!hhmm.test(horaInicio) || !hhmm.test(horaFim))) {
            const e = new Error(`Horário inválido no dia ${diaSemana}.`); e.status = 400; throw e;
        }
        if (ativo) {
            const [ih,im] = horaInicio.split(':').map(Number);
            const [fh,fm] = horaFim.split(':').map(Number);
            const ini = ih*60+im;
            let fim = fh*60+fm;
            if (fim === 0) fim = 1440;
            if (fim <= ini) { const e = new Error(`O horário final deve ser maior que o inicial no dia ${diaSemana}.`); e.status=400; throw e; }
        }
        map.set(diaSemana, { diaSemana, ativo, horaInicio, horaFim });
    }
    return DIAS.map(d => map.get(d) || { diaSemana:d, ativo:false, horaInicio:null, horaFim:null });
}

const includeSociety = {
    cardapio: true,
    campos: true,
    times: { select: { id: true, nome: true, statusVinculo: true, tipoVinculo: true } },
    societyPlayers: { include: { usuario: true } },
    horariosFuncionamento: { orderBy: { diaSemana: "asc" } }
};

const create = async (req, res) => {
    try {
        const { usuarioId,nome,descricao,telefone,whatsapp,email,website,instagram,facebook,youtube,pixChave,pixTitular,cep,endereco,estado,cidade,imagem } = req.body;
        if (!usuarioId || !nome) return res.status(400).json({ error: "Informe o usuário e o nome." });
        const horarios = normalizarHorarios(req.body.horariosFuncionamento);
        const society = await prisma.society.create({
            data: {
                usuarioId:Number(usuarioId), nome:nome.trim(), descricao, telefone, whatsapp, email, website, instagram, facebook, youtube,
                pixChave:pixChave?String(pixChave).trim():null, pixTitular:pixTitular?String(pixTitular).trim():null,
                cep,endereco,estado,cidade,imagem:imagem||null,
                ...(horarios ? { horariosFuncionamento:{ create: horarios } } : {})
            }, include: includeSociety
        });
        return res.status(201).json(society);
    } catch (error) {
        console.log("ERRO AO CADASTRAR SOCIETY:", error);
        return res.status(error.status || 500).json({ error: error.message || "Erro ao cadastrar society." });
    }
};

const readByOwner = async (req,res) => {
    try {
        const societies = await prisma.society.findMany({ where:{usuarioId:Number(req.params.usuarioId)}, include:includeSociety });
        return res.status(200).json(societies);
    } catch(error){ console.log(error); return res.status(500).json({error:"Erro ao buscar societies."}); }
};

const readById = async (req,res) => {
    try {
        const society = await prisma.society.findUnique({ where:{id:Number(req.params.id)}, include:includeSociety });
        if(!society) return res.status(404).json({error:"Society não encontrado."});
        return res.status(200).json(society);
    } catch(error){ console.log(error); return res.status(500).json({error:"Erro ao buscar society."}); }
};

const update = async (req,res) => {
    try {
        const id=Number(req.params.id);
        const existente=await prisma.society.findUnique({where:{id}});
        if(!existente) return res.status(404).json({error:"Society não encontrado."});
        const {nome,descricao,telefone,whatsapp,email,website,instagram,facebook,youtube,pixChave,pixTitular,cep,endereco,estado,cidade,imagem}=req.body;
        if(!nome || !String(nome).trim()) return res.status(400).json({error:"Nome é obrigatório."});
        const horarios = req.body.horariosFuncionamento !== undefined ? normalizarHorarios(req.body.horariosFuncionamento) : null;

        const societyAtualizado = await prisma.$transaction(async tx => {
            await tx.society.update({ where:{id}, data:{
                nome:String(nome).trim(), descricao:descricao||null, telefone:telefone||null, whatsapp:whatsapp||null,
                email:email||null, website:website||null, instagram:instagram||null, facebook:facebook||null, youtube:youtube||null,
                pixChave:pixChave!==undefined?(String(pixChave||"").trim()||null):undefined,
                pixTitular:pixTitular!==undefined?(String(pixTitular||"").trim()||null):undefined,
                cep:cep||null,endereco:endereco||null,estado:estado||null,cidade:cidade||null,
                imagem:imagem!==undefined?(imagem||null):undefined
            }});
            if (horarios) {
                for (const h of horarios) {
                    await tx.societyHorarioFuncionamento.upsert({
                        where:{ societyId_diaSemana:{ societyId:id, diaSemana:h.diaSemana } },
                        create:{ societyId:id, ...h }, update:{ ativo:h.ativo, horaInicio:h.horaInicio, horaFim:h.horaFim }
                    });
                }
            }
            return tx.society.findUnique({where:{id},include:includeSociety});
        });
        return res.status(200).json(societyAtualizado);
    } catch(error){ console.log("ERRO AO ATUALIZAR SOCIETY:",error); return res.status(error.status||500).json({error:error.message||"Erro ao atualizar society."}); }
};

const listAll = async (req,res) => {
    try { const societies=await prisma.society.findMany({select:{id:true,nome:true,cidade:true,estado:true,imagem:true},orderBy:{id:"desc"}}); return res.status(200).json(societies); }
    catch(error){console.log(error);return res.status(500).json({error:"Erro ao listar societies."});}
};

module.exports={create,readByOwner,readById,update,listAll};
