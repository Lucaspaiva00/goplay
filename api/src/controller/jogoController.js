const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const { PrismaClient } = require("@prisma/client");
const { emitJogo } = require("../realtime");
const { notifyUsuario, notifyStaff } = require("../notifications");
const { isPlatformAdmin } = require("../auth");

const prisma = new PrismaClient();
const publicPlayerSelect = { id: true, nome: true, fotoUrl: true, posicaoCampo: true, goleiro: true, timeRelacionadoId: true };

const EVENTOS_INDIVIDUAIS = new Set([
  "GOL",
  "CARTAO_AMARELO",
  "CARTAO_VERMELHO",
  "CHUTE",
  "CHUTE_NO_GOL",
  "FALTA",
]);

const TIPOS_EVENTO_VALIDOS = [
  "GOL",
  "CARTAO_AMARELO",
  "CARTAO_VERMELHO",
  "CHUTE",
  "CHUTE_NO_GOL",
  "ESCANTEIO",
  "LATERAL",
  "FALTA",
  "SUBSTITUICAO",
  "OBSERVACAO",
];

const toNumberOrZero = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function cronometroAtual(jogo) {
  let segundos = Number(jogo?.cronometroSegundos || 0);
  if (jogo?.cronometroInicioEm && jogo?.statusOperacao === "AO_VIVO") {
    segundos += Math.max(0, Math.floor((Date.now() - new Date(jogo.cronometroInicioEm).getTime()) / 1000));
  }
  return segundos;
}

async function buscarJogoCompleto(client, jogoId) {
  const jogo = await client.jogo.findUnique({
    where: { id: jogoId },
    include: {
      campeonato: { include: {
        society: { select: { id: true, nome: true, usuarioId: true, imagem: true, cidade: true } },
        organizador: { select: { id: true, nome: true, email: true, tipo: true } }
      } },
      amistoso: { include: {
        society: { select: { id: true, nome: true, usuarioId: true, imagem: true, cidade: true } },
        criadoPor: { select: { id: true, nome: true, email: true, tipo: true, isSocioGoPlay: true } },
        presencas: { where: { convidadoAvulso: true, status: "VOU" }, select: { timeId:true, usuario: {select:publicPlayerSelect} } }
      } },
      timeA: { include: { jogadores: { select: publicPlayerSelect } } },
      timeB: { include: { jogadores: { select: publicPlayerSelect } } },
      estatisticasTimes: true,
      jogadoresAtuacao: { include: { jogador: { select: publicPlayerSelect } } },
      eventos: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          time: true,
          jogador: { select: publicPlayerSelect },
          jogadorSaindo: { select: publicPlayerSelect },
          jogadorEntrando: { select: publicPlayerSelect },
        },
      },
    },
  });
  if(jogo?.amistoso)for(const team of [jogo.timeA,jogo.timeB])team.jogadores=team.jogadores.filter(j=>{const g=jogo.amistoso.presencas.find(p=>p.usuario.id===j.id);return !g||g.timeId===team.id;});
  if(jogo?.amistoso)for(const p of jogo.amistoso.presencas||[]){const team=p.timeId===jogo.timeAId?jogo.timeA:jogo.timeB;if(!team.jogadores.some(j=>j.id===p.usuario.id))team.jogadores.push(p.usuario);}
  return jogo;
}
function eligiblePlayer(jogo,player,timeId){
  const guest=(jogo.amistoso?.presencas||[]).find(p=>p.usuario.id===player.id);
  return guest?guest.timeId===timeId:Number(player.timeRelacionadoId)===timeId;
}

function sanitizarJogoPublico(jogo) {
  if (!jogo) return jogo;
  const { mesaToken, ...seguro } = jogo;
  const campeonato = seguro.campeonato ? { ...seguro.campeonato } : null;
  if (campeonato?.society) {
    const { usuarioId, ...societyPublico } = campeonato.society;
    campeonato.society = societyPublico;
  }
  const amistoso = seguro.amistoso ? {
    id: seguro.amistoso.id, status: seguro.amistoso.status,
    dataHora: seguro.amistoso.dataHora, duracaoMinutos: seguro.amistoso.duracaoMinutos,
    society: seguro.amistoso.society,
  } : null;
  if (amistoso?.society) {
    const { usuarioId, ...societyPublico } = amistoso.society;
    amistoso.society = societyPublico;
  }
  return {
    ...seguro,
    campeonato,
    amistoso,
    cronometroAtualSegundos: cronometroAtual(jogo),
    cronometroRodando: !!(jogo.cronometroInicioEm && jogo.statusOperacao === "AO_VIVO" && !jogo.finalizado),
    mesaConfigurada: !!mesaToken,
  };
}

function getTokenMesa(req) {
  return String(
    req.headers["x-mesa-token"] || req.query?.token || req.body?.mesaToken || ""
  ).trim();
}

function tokenMesaValido(req, jogo) {
  const token = getTokenMesa(req);
  if (!token || !jogo?.mesaToken) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(String(jogo.mesaToken));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function donoPodeOperar(req, jogo) {
  const a=req.actor;
  if(isPlatformAdmin(a)) return true;
  const societyId=Number(jogo?.campeonato?.society?.id || jogo?.amistoso?.society?.id || 0);
  const societyOwnerId=Number(jogo?.campeonato?.society?.usuarioId || jogo?.amistoso?.society?.usuarioId || 0);
  if(a?.kind==="USER"&&a.tipo==="DONO_SOCIETY"&&societyOwnerId) return societyOwnerId===Number(a.id);
  if(a?.kind==="USER"&&["ORGANIZADOR_COMPETICAO","ORGAO_PUBLICO"].includes(a.tipo)) return Number(jogo?.campeonato?.organizadorId)===Number(a.id);
  if(a?.kind==="USER"&&jogo?.amistoso&&!societyId) return Number(jogo.amistoso.criadoPorId)===Number(a.id);
  if(a?.kind==="STAFF") return Number(a.societyId)===societyId&&["ADMIN","MESARIO"].includes(a.funcao);
  return false;
}

async function podeConfigurarMesa(req,jogo){
  const a=req.actor;
  if(isPlatformAdmin(a)) return true;
  const societyId=Number(jogo?.campeonato?.society?.id || jogo?.amistoso?.society?.id || 0);
  const societyOwnerId=Number(jogo?.campeonato?.society?.usuarioId || jogo?.amistoso?.society?.usuarioId || 0);
  if(a?.kind==="USER"&&a.tipo==="DONO_SOCIETY"&&societyOwnerId) return societyOwnerId===Number(a.id);
  if(a?.kind==="USER"&&["ORGANIZADOR_COMPETICAO","ORGAO_PUBLICO"].includes(a.tipo)) return Number(jogo?.campeonato?.organizadorId)===Number(a.id);
  if(a?.kind==="USER"&&jogo?.amistoso&&!societyId) return Number(jogo.amistoso.criadoPorId)===Number(a.id);
  if(a?.kind==="STAFF") return Number(a.societyId)===societyId&&a.funcao==="ADMIN";
  return false;
}

async function exigirOperador(req, res, jogo) {
  if (tokenMesaValido(req, jogo)) return true;
  if (await donoPodeOperar(req, jogo)) return true;
  res.status(403).json({ error: "Acesso restrito à Mesa, Mesário, Administrador ou dono da empresa." });
  return false;
}

async function recalcularDerivados(tx, jogoId) {
  const jogo = await tx.jogo.findUnique({ where: { id: jogoId } });
  if (!jogo) return;

  const eventos = await tx.jogoEvento.findMany({
    where: { jogoId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  let golsA = 0;
  let golsB = 0;
  const playerMap = new Map();
  const teamMap = new Map([
    [jogo.timeAId, { chutes: 0, chutesNoGol: 0, escanteios: 0, laterais: 0, faltas: 0 }],
    [jogo.timeBId, { chutes: 0, chutesNoGol: 0, escanteios: 0, laterais: 0, faltas: 0 }],
  ]);

  await tx.jogoJogador.updateMany({
    where: { jogoId },
    data: { entrouMinuto: null, saiuMinuto: null },
  });

  for (const e of eventos) {
    if (e.tipo === "GOL" && e.timeId === jogo.timeAId) golsA++;
    if (e.tipo === "GOL" && e.timeId === jogo.timeBId) golsB++;

    if (e.jogadorId && ["GOL", "CARTAO_AMARELO", "CARTAO_VERMELHO"].includes(e.tipo)) {
      const p = playerMap.get(e.jogadorId) || { jogadorId: e.jogadorId, gols: 0, amarelos: 0, vermelhos: 0 };
      if (e.tipo === "GOL") p.gols++;
      if (e.tipo === "CARTAO_AMARELO") p.amarelos++;
      if (e.tipo === "CARTAO_VERMELHO") p.vermelhos++;
      playerMap.set(e.jogadorId, p);
    }

    if (e.timeId && teamMap.has(e.timeId)) {
      const t = teamMap.get(e.timeId);
      if (e.tipo === "CHUTE") t.chutes++;
      if (e.tipo === "CHUTE_NO_GOL") { t.chutes++; t.chutesNoGol++; }
      if (e.tipo === "ESCANTEIO") t.escanteios++;
      if (e.tipo === "LATERAL") t.laterais++;
      if (e.tipo === "FALTA") t.faltas++;
    }

    if (e.tipo === "SUBSTITUICAO" && e.timeId) {
      if (e.jogadorSaindoId) {
        await tx.jogoJogador.updateMany({
          where: { jogoId, jogadorId: e.jogadorSaindoId },
          data: { saiuMinuto: e.minuto ?? null },
        });
      }
      if (e.jogadorEntrandoId) {
        await tx.jogoJogador.upsert({
          where: { jogoId_jogadorId: { jogoId, jogadorId: e.jogadorEntrandoId } },
          create: {
            jogoId,
            timeId: e.timeId,
            jogadorId: e.jogadorEntrandoId,
            titular: false,
            entrouMinuto: e.minuto ?? null,
          },
          update: { entrouMinuto: e.minuto ?? null, timeId: e.timeId },
        });
      }
    }
  }

  await tx.jogo.update({ where: { id: jogoId }, data: { golsA, golsB } });

  await tx.estatisticaJogo.deleteMany({ where: { jogoId } });
  if (playerMap.size) {
    await tx.estatisticaJogo.createMany({
      data: [...playerMap.values()].map((p) => ({ jogoId, ...p })),
    });
  }

  for (const [timeId, stats] of teamMap.entries()) {
    const atual = await tx.jogoEstatisticaTime.findUnique({
      where: { jogoId_timeId: { jogoId, timeId } },
    });
    await tx.jogoEstatisticaTime.upsert({
      where: { jogoId_timeId: { jogoId, timeId } },
      create: { jogoId, timeId, ...stats, posse: atual?.posse || 0 },
      update: { ...stats },
    });
  }
}

const readOne = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    if (!Number.isFinite(jogoId)) return res.status(400).json({ error: "ID inválido." });
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    return res.json({
      jogo: sanitizarJogoPublico(jogo),
      elencoA: jogo.timeA?.jogadores || [],
      elencoB: jogo.timeB?.jogadores || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar jogo." });
  }
};

const readMesa = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await exigirOperador(req, res, jogo))) return;
    return res.json({
      jogo: { ...sanitizarJogoPublico(jogo), mesarioNome: jogo.mesarioNome },
      elencoA: jogo.timeA?.jogadores || [],
      elencoB: jogo.timeB?.jogadores || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao abrir Mesa de Jogo." });
  }
};

const configurarMesa = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await podeConfigurarMesa(req, jogo))) return res.status(403).json({ error: "Somente o dono ou Administrador pode liberar a Mesa de Jogo." });

    const mesarioNome = String(req.body.mesarioNome || "Mesário").trim().slice(0, 120) || "Mesário";
    const mesaToken = crypto.randomBytes(32).toString("hex");
    const row = await prisma.jogo.update({
      where: { id: jogoId },
      data: { mesarioNome, mesaToken },
    });
    emitJogo(jogoId, { tipo: "mesa-configurada" });
    return res.json({ ok: true, mesarioNome: row.mesarioNome, mesaToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao configurar a Mesa de Jogo." });
  }
};

const revogarMesa = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await podeConfigurarMesa(req, jogo))) return res.status(403).json({ error: "Somente o dono ou Administrador pode revogar a Mesa de Jogo." });
    await prisma.jogo.update({ where: { id: jogoId }, data: { mesaToken: null, mesarioNome: null } });
    emitJogo(jogoId, { tipo: "mesa-revogada" });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao revogar a Mesa de Jogo." });
  }
};

const updateStats = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const timeId = Number(req.body.timeId);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await exigirOperador(req, res, jogo))) return;
    if (jogo.finalizado) return res.status(409).json({ error: "O jogo já foi encerrado." });
    if (![jogo.timeAId, jogo.timeBId].includes(timeId)) return res.status(400).json({ error: "timeId não pertence a este jogo." });

    const payload = {
      chutes: toNumberOrZero(req.body.chutes),
      chutesNoGol: toNumberOrZero(req.body.chutesNoGol),
      escanteios: toNumberOrZero(req.body.escanteios),
      laterais: toNumberOrZero(req.body.laterais),
      faltas: toNumberOrZero(req.body.faltas),
      posse: toNumberOrZero(req.body.posse),
    };
    if (payload.posse < 0 || payload.posse > 100) return res.status(400).json({ error: "Posse deve estar entre 0 e 100." });

    const row = await prisma.jogoEstatisticaTime.upsert({
      where: { jogoId_timeId: { jogoId, timeId } },
      create: { jogoId, timeId, ...payload },
      update: payload,
    });
    emitJogo(jogoId, { tipo: "estatisticas" });
    return res.json({ ok: true, row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar stats." });
  }
};

const addLineup = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const timeId = Number(req.body.timeId);
    const jogadorId = Number(req.body.jogadorId);
    const titular = req.body.titular !== undefined ? !!req.body.titular : true;
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await exigirOperador(req, res, jogo))) return;
    if (jogo.finalizado) return res.status(409).json({ error: "O jogo já foi encerrado." });
    if (![jogo.timeAId, jogo.timeBId].includes(timeId)) return res.status(400).json({ error: "timeId não pertence a este jogo." });

    const jogador = await prisma.usuario.findUnique({ where: { id: jogadorId } });
    if (!jogador || !eligiblePlayer(jogo,jogador,timeId)) return res.status(400).json({ error: "Jogador não pertence ao time." });

    const row = await prisma.jogoJogador.upsert({
      where: { jogoId_jogadorId: { jogoId, jogadorId } },
      create: { jogoId, timeId, jogadorId, titular },
      update: { timeId, titular },
    });
    emitJogo(jogoId, { tipo: "escalacao" });
    return res.json({ ok: true, row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao escalar jogador." });
  }
};

const addEvento = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (jogo.finalizado) return res.status(400).json({ error: "O jogo já foi encerrado." });
    if (!(await exigirOperador(req, res, jogo))) return;

    const tipo = String(req.body.tipo || "").trim().toUpperCase();
    if (!TIPOS_EVENTO_VALIDOS.includes(tipo)) return res.status(400).json({ error: "Tipo de evento inválido." });

    const minuto = req.body.minuto === null || req.body.minuto === "" || req.body.minuto === undefined
      ? Math.floor(cronometroAtual(jogo) / 60)
      : Number(req.body.minuto);
    const timeId = req.body.timeId ? Number(req.body.timeId) : null;
    if (timeId && ![jogo.timeAId, jogo.timeBId].includes(timeId)) return res.status(400).json({ error: "timeId não pertence ao jogo." });

    const jogadorId = req.body.jogadorId ? Number(req.body.jogadorId) : null;
    const jogadorSaindoId = req.body.jogadorSaindoId ? Number(req.body.jogadorSaindoId) : null;
    const jogadorEntrandoId = req.body.jogadorEntrandoId ? Number(req.body.jogadorEntrandoId) : null;
    const detalhe = req.body.detalhe ? String(req.body.detalhe).trim().slice(0, 500) : null;

    if (["GOL", "CARTAO_AMARELO", "CARTAO_VERMELHO", "SUBSTITUICAO", "CHUTE", "CHUTE_NO_GOL", "ESCANTEIO", "LATERAL", "FALTA"].includes(tipo) && !timeId) {
      return res.status(400).json({ error: "Selecione o time do evento." });
    }
    if (EVENTOS_INDIVIDUAIS.has(tipo) && !jogadorId) {
      return res.status(400).json({ error: "Selecione o jogador responsável por este evento." });
    }
    if (tipo === "SUBSTITUICAO" && (!jogadorSaindoId || !jogadorEntrandoId)) {
      return res.status(400).json({ error: "Informe quem sai e quem entra." });
    }

    const jogadoresParaValidar = [jogadorId, jogadorSaindoId, jogadorEntrandoId].filter(Boolean);
    if (jogadoresParaValidar.length) {
      const jogadores = await prisma.usuario.findMany({ where: { id: { in: jogadoresParaValidar } } });
      if (jogadores.length !== new Set(jogadoresParaValidar).size) {
        return res.status(400).json({ error: "Jogador inválido no evento." });
      }
      if (timeId && jogadores.some(p => !eligiblePlayer(jogo,p,Number(timeId)))) {
        return res.status(400).json({ error: "O jogador selecionado não pertence ao time do evento." });
      }
    }

    const evento = await prisma.$transaction(async (tx) => {
      const row = await tx.jogoEvento.create({
        data: { jogoId, tipo, minuto, timeId, jogadorId, jogadorSaindoId, jogadorEntrandoId, detalhe },
      });
      await recalcularDerivados(tx, jogoId);
      return row;
    });

    emitJogo(jogoId, { tipo: "evento", eventoTipo: tipo });
    return res.json({ ok: true, evento });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erro ao adicionar evento." });
  }
};

const desfazerUltimoEvento = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await exigirOperador(req, res, jogo))) return;
    if (jogo.finalizado) return res.status(409).json({ error: "O jogo já foi encerrado." });

    const ultimo = await prisma.jogoEvento.findFirst({
      where: { jogoId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (!ultimo) return res.status(400).json({ error: "Não há evento para desfazer." });

    await prisma.$transaction(async (tx) => {
      await tx.jogoEvento.delete({ where: { id: ultimo.id } });
      await recalcularDerivados(tx, jogoId);
    });
    emitJogo(jogoId, { tipo: "evento-desfeito" });
    return res.json({ ok: true, removido: ultimo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao desfazer evento." });
  }
};

const controlarCronometro = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (jogo.finalizado) return res.status(400).json({ error: "O jogo já foi encerrado." });
    if (!(await exigirOperador(req, res, jogo))) return;

    const acao = String(req.body.acao || "").toUpperCase();
    const agora = new Date();
    const atual = cronometroAtual(jogo);
    let data = {};

    if (acao === "INICIAR") {
      data = { statusOperacao: "AO_VIVO", cronometroInicioEm: agora, iniciadoEm: jogo.iniciadoEm || agora, periodo: jogo.periodo || 1 };
    } else if (acao === "PAUSAR") {
      data = { statusOperacao: "PAUSADA", cronometroSegundos: atual, cronometroInicioEm: null };
    } else if (acao === "RETOMAR") {
      data = { statusOperacao: "AO_VIVO", cronometroInicioEm: agora };
    } else if (acao === "INTERVALO") {
      data = { statusOperacao: "INTERVALO", cronometroSegundos: atual, cronometroInicioEm: null };
    } else if (acao === "SEGUNDO_TEMPO") {
      data = { statusOperacao: "AO_VIVO", periodo: 2, cronometroSegundos: 0, cronometroInicioEm: agora };
    } else if (acao === "ZERAR") {
      data = { cronometroSegundos: 0, cronometroInicioEm: null, statusOperacao: "AGENDADO", periodo: 1, iniciadoEm: null };
    } else {
      return res.status(400).json({ error: "Ação de cronômetro inválida." });
    }

    const row = await prisma.jogo.update({ where: { id: jogoId }, data });
    emitJogo(jogoId, { tipo: "cronometro", acao });
    return res.json({ ok: true, jogo: sanitizarJogoPublico(row) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao controlar cronômetro." });
  }
};


function formatDateTimeBR(value) {
  if (!value) return "Data pendente";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString();
  }
}

const agendar = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await podeConfigurarMesa(req, jogo))) {
      return res.status(403).json({ error: "Somente o responsável autorizado pode definir a data da partida." });
    }
    if (jogo.amistosoId) {
      return res.status(400).json({ error: "A data do amistoso é administrada pelo módulo de Amistosos." });
    }
    if (jogo.finalizado) return res.status(400).json({ error: "Partida encerrada não pode ser reagendada." });

    const dataHora = new Date(req.body.dataHora);
    if (Number.isNaN(dataHora.getTime())) {
      return res.status(400).json({ error: "Informe uma data e horário válidos." });
    }

    if (jogo.campeonato?.dataInicio) {
      const inicio = new Date(jogo.campeonato.dataInicio);
      inicio.setUTCHours(0,0,0,0);
      if (dataHora < inicio) return res.status(400).json({ error: "A partida não pode ser anterior ao início do campeonato." });
    }
    if (jogo.campeonato?.dataFim) {
      const fim = new Date(jogo.campeonato.dataFim);
      fim.setUTCHours(23,59,59,999);
      if (dataHora > fim) return res.status(400).json({ error: "A partida não pode ser posterior ao fim do campeonato." });
    }

    const atualizado = await prisma.jogo.update({
      where: { id: jogoId },
      data: { dataHora },
    });

    const destinoIds = new Set([jogo.timeA?.donoId, jogo.timeB?.donoId].filter(Boolean).map(Number));
    const jogadores = await prisma.conviteCampeonatoJogador.findMany({
      where: {
        status: "ACEITO",
        conviteTime: {
          campeonatoId: jogo.campeonatoId,
          timeId: { in: [jogo.timeAId, jogo.timeBId] },
        },
      },
      select: { usuarioId: true },
    });
    jogadores.forEach(j => destinoIds.add(Number(j.usuarioId)));

    const titulo = "Partida agendada";
    const mensagem = `${jogo.timeA.nome} × ${jogo.timeB.nome} — ${formatDateTimeBR(dataHora)}.`;
    for (const usuarioId of destinoIds) {
      await notifyUsuario(prisma, usuarioId, titulo, mensagem, `jogo-detalhe.html?jogoId=${jogoId}`);
    }
    const staffSocietyId = jogo.campeonato?.society?.id || jogo.amistoso?.society?.id;
    if (staffSocietyId) {
      await notifyStaff(
        prisma,
        staffSocietyId,
        titulo,
        mensagem,
        ["ADMIN","MESARIO"],
        `jogo-detalhe.html?jogoId=${jogoId}`
      );
    }

    emitJogo(jogoId, { tipo: "agendamento", dataHora: atualizado.dataHora });
    return res.json({ ok: true, jogo: sanitizarJogoPublico(atualizado) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erro ao agendar a partida." });
  }
};

function pdfText(doc, label, value) {
  doc.font("Helvetica-Bold").text(label, { continued: true });
  doc.font("Helvetica").text(value || "-");
}

const sumulaPdf = async (req, res) => {
  try {
    const jogoId = Number(req.params.id);
    const jogo = await buscarJogoCompleto(prisma, jogoId);
    if (!jogo) return res.status(404).json({ error: "Jogo não encontrado." });
    if (!(await exigirOperador(req, res, jogo))) return;

    const statsJogadores = await prisma.estatisticaJogo.findMany({
      where: { jogoId },
      include: { jogador: { select: { id: true, nome: true } } },
      orderBy: [{ gols: "desc" }, { jogador: { nome: "asc" } }],
    });

    const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: `Súmula jogo ${jogoId} - GoPlay` } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="sumula-jogo-${jogoId}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("SÚMULA OFICIAL — GOPLAY", { align: "center" });
    doc.moveDown(0.35);
    doc.fontSize(10).font("Helvetica").fillColor("#555").text(
      `${jogo.campeonato?.nome || "Amistoso"} • ${jogo.campeonato?.society?.nome || jogo.amistoso?.society?.nome || "GoPlay"}`,
      { align: "center" }
    );
    doc.fillColor("#000").moveDown();

    pdfText(doc, "Partida: ", `${jogo.timeA.nome} x ${jogo.timeB.nome}`);
    pdfText(doc, "Rodada: ", String(jogo.rodada || "-"));
    pdfText(doc, "Data/hora: ", formatDateTimeBR(jogo.dataHora));
    pdfText(doc, "Mesário: ", jogo.mesarioNome || "-");
    pdfText(doc, "Status: ", jogo.finalizado ? "ENCERRADA" : jogo.statusOperacao);
    pdfText(doc, "Início real: ", jogo.iniciadoEm ? formatDateTimeBR(jogo.iniciadoEm) : "-");
    pdfText(doc, "Encerramento: ", jogo.encerradoEm ? formatDateTimeBR(jogo.encerradoEm) : "-");

    doc.moveDown().fontSize(16).font("Helvetica-Bold").text(
      `${jogo.timeA.nome}  ${jogo.golsA ?? 0} x ${jogo.golsB ?? 0}  ${jogo.timeB.nome}`,
      { align: "center" }
    );
    if (jogo.penaltisA != null && jogo.penaltisB != null) {
      doc.fontSize(10).font("Helvetica").text(`Pênaltis: ${jogo.penaltisA} x ${jogo.penaltisB}`, { align: "center" });
    }

    const lineups = jogo.jogadoresAtuacao || [];
    const renderElenco = (titulo, timeId) => {
      doc.moveDown().fontSize(12).font("Helvetica-Bold").text(titulo);
      const rows = lineups.filter(x => Number(x.timeId) === Number(timeId));
      if (!rows.length) {
        doc.fontSize(9).font("Helvetica").text("Escalação não registrada.");
        return;
      }
      rows.forEach(x => {
        const partes = [x.titular ? "Titular" : "Reserva"];
        if (x.entrouMinuto != null) partes.push(`entrou ${x.entrouMinuto}'`);
        if (x.saiuMinuto != null) partes.push(`saiu ${x.saiuMinuto}'`);
        doc.fontSize(9).font("Helvetica").text(`• ${x.jogador?.nome || "Jogador"} — ${partes.join(" • ")}`);
      });
    };
    renderElenco(`ELENCO — ${jogo.timeA.nome}`, jogo.timeAId);
    renderElenco(`ELENCO — ${jogo.timeB.nome}`, jogo.timeBId);

    doc.addPage();
    doc.fontSize(13).font("Helvetica-Bold").text("EVENTOS DA PARTIDA");
    const eventos = [...(jogo.eventos || [])].sort((a,b) => (a.minuto ?? 0) - (b.minuto ?? 0) || a.id - b.id);
    if (!eventos.length) {
      doc.fontSize(9).font("Helvetica").text("Nenhum evento registrado.");
    } else {
      eventos.forEach(e => {
        let detalhe = [e.time?.nome, e.jogador?.nome, e.detalhe].filter(Boolean).join(" • ");
        if (e.tipo === "SUBSTITUICAO") detalhe = `${e.time?.nome || ""} • ${e.jogadorSaindo?.nome || "-"} saiu / ${e.jogadorEntrando?.nome || "-"} entrou`;
        doc.fontSize(9).font("Helvetica-Bold").text(`${e.minuto ?? 0}' — ${String(e.tipo).replaceAll("_"," ")}`, { continued: !!detalhe });
        if (detalhe) doc.font("Helvetica").text(` — ${detalhe}`);
      });
    }

    doc.moveDown().fontSize(13).font("Helvetica-Bold").text("ESTATÍSTICAS POR JOGADOR");
    if (!statsJogadores.length) {
      doc.fontSize(9).font("Helvetica").text("Sem gols ou cartões individuais registrados.");
    } else {
      statsJogadores.forEach(s => {
        doc.fontSize(9).font("Helvetica").text(
          `• ${s.jogador.nome}: ${s.gols} gol(s), ${s.amarelos} amarelo(s), ${s.vermelhos} vermelho(s)`
        );
      });
    }

    doc.moveDown().fontSize(13).font("Helvetica-Bold").text("ESTATÍSTICAS DOS TIMES");
    for (const t of jogo.estatisticasTimes || []) {
      const nome = Number(t.timeId) === Number(jogo.timeAId) ? jogo.timeA.nome : jogo.timeB.nome;
      doc.fontSize(9).font("Helvetica").text(
        `• ${nome}: chutes ${t.chutes}, no gol ${t.chutesNoGol}, escanteios ${t.escanteios}, laterais ${t.laterais}, faltas ${t.faltas}, posse ${t.posse}%`
      );
    }

    const observacoes = eventos.filter(e => e.tipo === "OBSERVACAO").map(e => e.detalhe).filter(Boolean);
    if (jogo.observacao) observacoes.push(jogo.observacao);
    doc.moveDown().fontSize(13).font("Helvetica-Bold").text("OCORRÊNCIAS / OBSERVAÇÕES");
    doc.fontSize(9).font("Helvetica").text(observacoes.length ? observacoes.map(x => `• ${x}`).join("\n") : "Nenhuma ocorrência registrada.");

    doc.moveDown(2);
    doc.fontSize(9).text("____________________________________", 70, doc.y, { continued: true });
    doc.text("        ____________________________________", { align: "right" });
    doc.text("Mesário", 70, doc.y + 2, { continued: true });
    doc.text("Responsável da organização", { align: "right" });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return res.status(500).json({ error: err.message || "Erro ao gerar súmula." });
    try { res.end(); } catch {}
  }
};

module.exports = {
  readOne,
  readMesa,
  configurarMesa,
  revogarMesa,
  updateStats,
  addLineup,
  addEvento,
  desfazerUltimoEvento,
  controlarCronometro,
  agendar,
  sumulaPdf,
  cronometroAtual,
  tokenMesaValido,
};
