// ✅ src/routes.js  (ARQUIVO TODO)
const express = require("express");
const router = express.Router();

const usuarioController = require("./controller/usuarioController");
const societyController = require("./controller/societyController");
const timeController = require("./controller/timeController");
const societyPlayerController = require("./controller/societyPlayerController");
const listagemController = require("./controller/listagemController");
const cardapioController = require("./controller/cardapioController");
const campoController = require("./controller/campoController");
const conviteController = require("./controller/conviteController");
const campeonatoController = require("./controller/campeonatoController");
const jogoController = require("./controller/jogoController");

const pagamentoController = require("./controller/pagamentoController");
const agendamentoController = require("./controller/agendamentoController");

/* =========================
   USUÁRIO
========================= */
router.post("/usuarios", usuarioController.create);
router.post("/login", usuarioController.login);
router.get("/usuarios/:id", usuarioController.readOne);
router.put("/usuarios/:id", usuarioController.update);

/* =========================
   SOCIETY
========================= */
router.post("/society", societyController.create);
router.get("/society", societyController.listAll);
router.get("/society/owner/:usuarioId", societyController.readByOwner);
router.get("/society/:id", societyController.readById);

/* =========================
   TIME
========================= */
router.post("/time", timeController.create);
router.get("/time", timeController.list);
router.get("/time/dono/:donoId", timeController.listByOwner);
router.get("/time/society/:societyId", timeController.listBySociety);
router.get("/time/:timeId", timeController.details);
router.post("/time/entrar", timeController.join);
router.post("/time/sair", timeController.leave);
router.get("/time/details/by-player/:usuarioId", timeController.getTimeByPlayer);

/* =========================
   SOCIETY PLAYERS
========================= */
router.post("/society/player", societyPlayerController.add);

/* =========================
   GERAIS
========================= */
router.get("/geral", listagemController.geral);

/* =========================
   CARDÁPIO
========================= */
router.post("/cardapio", cardapioController.create);
router.get("/cardapio/:societyId", cardapioController.list);

/* =========================
   CAMPOS
========================= */
router.post("/campos", campoController.create);
router.get("/campos/:societyId", campoController.listBySociety);

/* =========================
   CONVITE
========================= */
router.post("/convite", conviteController.convidar);

/* =========================
   CAMPEONATO
========================= */
router.post("/campeonato", campeonatoController.create);
router.get("/campeonato/society/:societyId", campeonatoController.listBySociety);
router.get("/campeonato/:id", campeonatoController.readOne);
router.post("/campeonato/:id/add-time", campeonatoController.addTime);
router.post("/campeonato/:id/gerar-grupos", campeonatoController.generateGroups);
router.post("/campeonato/:id/gerar-jogos-grupos", campeonatoController.generateGroupMatches);
router.post("/campeonato/:id/gerar-mata-mata", campeonatoController.generateMataMata);
router.post("/campeonato/jogo/:id/finalizar", campeonatoController.finalizarJogo);
router.get("/campeonato/:id/bracket", campeonatoController.getBracket);
router.get("/campeonato/:id/ranking", campeonatoController.ranking);

/* =========================
   JOGO (DETALHES)
========================= */
router.get("/jogo/:id", jogoController.readOne);
router.put("/jogo/:id/stats", jogoController.updateStats);
router.post("/jogo/:id/escalacao", jogoController.addLineup);
router.post("/jogo/:id/evento", jogoController.addEvento);

/* =========================
   AGENDAMENTOS (Dono do Time agenda)
========================= */
router.get("/agendamentos/disponiveis", agendamentoController.horariosDisponiveis);
router.post("/agendamentos", agendamentoController.create);
router.get("/agendamentos/time/:timeId", agendamentoController.listByTime);
router.post("/agendamentos/:id/cancelar", agendamentoController.cancelar);

// ✅ api/src/routes.js  (TRECHO / PARTE DE PAGAMENTOS)
router.post("/pagamentos/:id/confirmar", pagamentoController.confirmarPagamento);
router.get("/pagamentos/:id", pagamentoController.readOne);
router.post("/pagamentos/agendamento", pagamentoController.createPagamentoAgendamento);
router.get("/pagamentos/society/:societyId", pagamentoController.listBySociety);
router.get("/pagamentos/time/:timeId", pagamentoController.listByTime);
router.get("/pagamentos/usuario/:usuarioId", pagamentoController.listarPorUsuario);
router.post("/pagamentos/mensalidade", pagamentoController.createMensalidade);


module.exports = router;
