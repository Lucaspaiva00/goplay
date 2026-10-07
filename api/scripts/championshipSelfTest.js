const { PrismaClient } = require("@prisma/client");
const campeonatoController = require("../src/controller/campeonatoController");
const jogoController = require("../src/controller/jogoController");

const prisma = new PrismaClient();

function callController(fn, req) {
  return new Promise((resolve, reject) => {
    let statusCode = 200;
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { resolve({ status: statusCode, body }); return this; },
    };
    Promise.resolve(fn(req, res)).catch(reject);
  });
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function cleanup() {
  const users = await prisma.usuario.findMany({
    where: { email: { endsWith: "@selftest.goplay.local" } },
    select: { id: true },
  });
  if (!users.length) return;
  const ids = users.map(u => u.id);
  await prisma.usuario.updateMany({ where: { id: { in: ids } }, data: { timeRelacionadoId: null } });
  await prisma.society.deleteMany({ where: { usuarioId: { in: ids } } });
  await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
}

async function runChampionshipSelfTest() {
  if (!process.env.GOPLAY_CHAMP_SELFTEST) return { skipped: true };
  await cleanup();

  const suffix = String(Date.now());
  let owner;
  try {
    owner = await prisma.usuario.create({
      data: {
        nome: "Self Test GoPlay",
        email: `owner-${suffix}@selftest.goplay.local`,
        senha: "selftest",
        tipo: "DONO_SOCIETY",
      },
    });
    const society = await prisma.society.create({
      data: { usuarioId: owner.id, nome: `Self Test Society ${suffix}`, cidade: "Teste" },
    });

    const teams = [];
    const players = [];
    for (let i = 1; i <= 4; i++) {
      const team = await prisma.time.create({
        data: {
          nome: `Self Test Time ${i} ${suffix}`,
          societyId: society.id,
          donoId: owner.id,
          statusVinculo: "APROVADO",
        },
      });
      const player = await prisma.usuario.create({
        data: {
          nome: `Jogador Teste ${i}`,
          email: `player-${i}-${suffix}@selftest.goplay.local`,
          senha: "selftest",
          tipo: "PLAYER",
          timeRelacionadoId: team.id,
        },
      });
      teams.push(team);
      players.push(player);
    }

    const created = await callController(campeonatoController.create, {
      body: {
        societyId: society.id,
        nome: `Copa Self Test ${suffix}`,
        maxTimes: 4,
        maxJogadoresPorTime: 12,
        modalidade: "SOCIETY",
        categoria: "ADULTO",
      },
    });
    assert(created.status === 201, `Falha ao criar campeonato: ${JSON.stringify(created.body)}`);
    const campeonatoId = created.body.id;

    for (const team of teams) {
      const add = await callController(campeonatoController.addTime, {
        params: { id: campeonatoId },
        body: { timeId: team.id, imediato: true },
      });
      assert(add.status < 300, `Falha ao adicionar time ${team.id}: ${JSON.stringify(add.body)}`);
    }

    const generated = await callController(campeonatoController.generateLeague, {
      params: { id: campeonatoId },
      body: {},
    });
    assert(generated.status === 200, `Falha ao gerar liga: ${JSON.stringify(generated.body)}`);
    assert(generated.body.jogosClassificatorios === 12, `Esperava 12 jogos, recebeu ${generated.body.jogosClassificatorios}`);

    const jogos = await prisma.jogo.findMany({
      where: { campeonatoId, tipoJogo: { in: ["IDA", "VOLTA"] } },
      orderBy: [{ rodada: "asc" }, { id: "asc" }],
    });
    assert(jogos.length === 12, `Banco possui ${jogos.length} jogos classificatórios, esperado 12.`);

    const playerByTeam = new Map(teams.map((t, idx) => [t.id, players[idx]]));
    const expected = new Map(teams.map(t => [t.id, { p:0,v:0,e:0,d:0,gp:0,gc:0 }]));
    const patterns = [[1,0],[2,1],[1,1],[0,2]];

    for (let index = 0; index < jogos.length; index++) {
      const jogo = jogos[index];
      const [ga, gb] = patterns[index % patterns.length];
      const pa = playerByTeam.get(jogo.timeAId);
      const pb = playerByTeam.get(jogo.timeBId);

      for (let g = 0; g < ga; g++) {
        const ev = await callController(jogoController.addEvento, {
          params: { id: jogo.id },
          body: { tipo:"GOL", timeId:jogo.timeAId, jogadorId:pa.id },
          actor: { kind:"USER", id:owner.id, tipo:"DONO_SOCIETY" },
          headers: {},
          query: {},
        });
        assert(ev.status === 200, `Gol A rejeitado no jogo ${jogo.id}: ${JSON.stringify(ev.body)}`);
      }
      for (let g = 0; g < gb; g++) {
        const ev = await callController(jogoController.addEvento, {
          params: { id: jogo.id },
          body: { tipo:"GOL", timeId:jogo.timeBId, jogadorId:pb.id },
          actor: { kind:"USER", id:owner.id, tipo:"DONO_SOCIETY" },
          headers: {},
          query: {},
        });
        assert(ev.status === 200, `Gol B rejeitado no jogo ${jogo.id}: ${JSON.stringify(ev.body)}`);
      }

      for (const [timeId, player] of [[jogo.timeAId,pa],[jogo.timeBId,pb]]) {
        const falta = await callController(jogoController.addEvento, {
          params: { id: jogo.id },
          body: { tipo:"FALTA", timeId, jogadorId:player.id },
          actor: { kind:"USER", id:owner.id, tipo:"DONO_SOCIETY" },
          headers: {},
          query: {},
        });
        assert(falta.status === 200, `Falta rejeitada no jogo ${jogo.id}: ${JSON.stringify(falta.body)}`);
      }

      const refreshed = await prisma.jogo.findUnique({ where:{id:jogo.id} });
      assert(refreshed.golsA === ga && refreshed.golsB === gb, `Placar derivado incorreto no jogo ${jogo.id}`);

      const finish = await callController(campeonatoController.finalizarJogo, {
        params: { id: jogo.id },
        body: { golsA:ga, golsB:gb },
        actor: { kind:"USER", id:owner.id, tipo:"DONO_SOCIETY" },
        headers: {},
      });
      assert(finish.status === 200, `Finalização falhou no jogo ${jogo.id}: ${JSON.stringify(finish.body)}`);

      const a=expected.get(jogo.timeAId), b=expected.get(jogo.timeBId);
      a.gp+=ga;a.gc+=gb;b.gp+=gb;b.gc+=ga;
      if(ga>gb){a.p+=3;a.v++;b.d++;} else if(gb>ga){b.p+=3;b.v++;a.d++;} else {a.p++;b.p++;a.e++;b.e++;}

      const tabela = await prisma.tabelaCampeonato.findMany({ where:{campeonatoId} });
      const totalJogosTabela=tabela.reduce((sum,t)=>sum+t.vitorias+t.empates+t.derrotas,0);
      assert(totalJogosTabela === 2*(index+1), `Rodada/jogo ${index+1}: partidas contabilizadas ${totalJogosTabela}, esperado ${2*(index+1)}`);
      for (const row of tabela) {
        const ex=expected.get(row.timeId);
        assert(row.pontos===ex.p && row.vitorias===ex.v && row.empates===ex.e && row.derrotas===ex.d, `Classificação divergente no time ${row.timeId} após jogo ${index+1}`);
        assert(row.golsPro===ex.gp && row.golsContra===ex.gc && row.saldoGols===ex.gp-ex.gc, `Gols/saldo divergentes no time ${row.timeId} após jogo ${index+1}`);
      }

      const statA=await prisma.jogoEstatisticaTime.findUnique({where:{jogoId_timeId:{jogoId:jogo.id,timeId:jogo.timeAId}}});
      const statB=await prisma.jogoEstatisticaTime.findUnique({where:{jogoId_timeId:{jogoId:jogo.id,timeId:jogo.timeBId}}});
      assert(statA.faltas===1 && statB.faltas===1, `Estatística de faltas divergente no jogo ${jogo.id}`);

      console.log(`[SELFTEST CAMPEONATO] Jogo ${index+1}/12 OK • ${ga}x${gb} • classificação e estatísticas conferidas.`);
    }

    const ranking=await prisma.tabelaCampeonato.findMany({
      where:{campeonatoId},
      orderBy:[{pontos:"desc"},{saldoGols:"desc"},{golsPro:"desc"},{vitorias:"desc"},{timeId:"asc"}],
    });
    const final=await prisma.jogo.findFirst({where:{campeonatoId,tipoJogo:"MATA_MATA"}});
    assert(!!final, "A final não foi criada após os 12 jogos.");
    assert(
      new Set([final.timeAId,final.timeBId]).size===2 &&
      [ranking[0].timeId,ranking[1].timeId].every(id=>[final.timeAId,final.timeBId].includes(id)),
      "A final não contém os dois melhores da classificação."
    );

    console.log("[SELFTEST CAMPEONATO] 4 times, 12 jogos, classificação, gols, faltas e final: OK.");
    return {
      ok:true,
      campeonatoId,
      jogosTestados:12,
      ranking:ranking.map(r=>({timeId:r.timeId,pontos:r.pontos,sg:r.saldoGols,gp:r.golsPro})),
      final:[final.timeAId,final.timeBId],
    };
  } finally {
    await cleanup();
  }
}

module.exports = { runChampionshipSelfTest };
