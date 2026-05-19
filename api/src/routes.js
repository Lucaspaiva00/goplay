const express = require("express");

const router = express.Router();

/* =====================================================
   CONTROLLERS
===================================================== */

const usuarioController =
   require("./controller/usuarioController");

const societyController =
   require("./controller/societyController");

const timeController =
   require("./controller/timeController");

const societyPlayerController =
   require("./controller/societyPlayerController");

const listagemController =
   require("./controller/listagemController");

const cardapioController =
   require("./controller/cardapioController");

const campoController =
   require("./controller/campoController");

const conviteController =
   require("./controller/conviteController");

const campeonatoController =
   require("./controller/campeonatoController");

const jogoController =
   require("./controller/jogoController");

const pagamentoController =
   require("./controller/pagamentoController");

const agendamentoController =
   require("./controller/agendamentoController");

const comandaController =
   require("./controller/comandaController");

/* =====================================================
   AUTH / USUÁRIOS
===================================================== */

router.post(
   "/login",
   usuarioController.login
);

router.post(
   "/forgot-password",
   usuarioController.forgotPassword
);

router.post(
   "/reset-password",
   usuarioController.resetPassword
);

router.post(
   "/usuarios",
   usuarioController.create
);

router.get(
   "/usuarios/:id",
   usuarioController.readOne
);

router.put(
   "/usuarios/:id",
   usuarioController.update
);

/* =====================================================
   DASHBOARD
===================================================== */

router.get(
   "/geral",
   listagemController.geral
);

/* =====================================================
   SOCIETY
===================================================== */

router.post(
   "/society",
   societyController.create
);

router.get(
   "/society",
   societyController.listAll
);

router.get(
   "/society/owner/:usuarioId",
   societyController.readByOwner
);

router.get(
   "/society/:id",
   societyController.readById
);

router.put(
   "/society/:id",
   societyController.update
);

/* =====================================================
   SOCIETY PLAYERS
===================================================== */

router.post(
   "/society/player",
   societyPlayerController.add
);

router.get(
   "/society/:societyId/players",
   societyPlayerController.listBySociety
);

router.get(
   "/society/:societyId/player/:usuarioId",
   societyPlayerController.readOne
);

router.delete(
   "/society/:societyId/player/:usuarioId",
   societyPlayerController.remove
);

/* =====================================================
   TIMES
===================================================== */

router.post(
   "/time",
   timeController.create
);

router.get(
   "/time",
   timeController.list
);

router.get(
   "/time/dono/:donoId",
   timeController.listByOwner
);

router.get(
   "/time/society/:societyId",
   timeController.listBySociety
);

router.get(
   "/time/details/by-player/:usuarioId",
   timeController.getTimeByPlayer
);

router.get(
   "/time/:timeId",
   timeController.details
);

router.put(
   "/time/:timeId",
   timeController.update
);

router.delete(
   "/time/:timeId",
   timeController.remove
);

router.post(
   "/time/entrar",
   timeController.join
);

router.post(
   "/time/sair",
   timeController.leave
);

router.put(
   "/time/:timeId/vinculo",
   timeController.updateVinculo
);

router.post(
   "/time/:timeId/aprovar",
   timeController.aprovar
);

router.post(
   "/time/:timeId/recusar",
   timeController.recusar
);

router.post(
   "/time/:timeId/inativar",
   timeController.inativar
);

/* =====================================================
   CARDÁPIO
===================================================== */

router.post(
   "/cardapio",
   cardapioController.create
);

router.get(
   "/cardapio/society/:societyId",
   cardapioController.list
);

router.get(
   "/cardapio/item/:id",
   cardapioController.readOne
);

router.put(
   "/cardapio/:id",
   cardapioController.update
);

router.delete(
   "/cardapio/:id",
   cardapioController.remove
);

/* =====================================================
   CAMPOS
===================================================== */

router.post(
   "/campos",
   campoController.create
);

router.get(
   "/campos/society/:societyId",
   campoController.listBySociety
);

router.get(
   "/campos/:id",
   campoController.readOne
);

router.put(
   "/campos/:id",
   campoController.update
);

router.delete(
   "/campos/:id",
   campoController.remove
);

/* =====================================================
   CONVITES
===================================================== */

router.post(
   "/convite",
   conviteController.convidar
);

/* =====================================================
   AGENDAMENTOS
===================================================== */

router.get(
   "/agendamentos/disponiveis",
   agendamentoController.horariosDisponiveis
);

router.post(
   "/agendamentos",
   agendamentoController.create
);

router.get(
   "/agendamentos/time/:timeId",
   agendamentoController.listByTime
);

router.get(
   "/agendamentos/society/:societyId",
   agendamentoController.listBySociety
);

router.post(
   "/agendamentos/:id/cancelar",
   agendamentoController.cancelar
);

/* =====================================================
   PAGAMENTOS
===================================================== */

router.post(
   "/pagamentos/agendamento",
   pagamentoController.createPagamentoAgendamento
);

router.post(
   "/pagamentos/mensalidade",
   pagamentoController.createMensalidade
);

router.post(
   "/pagamentos/:id/confirmar",
   pagamentoController.confirmarPagamento
);

router.get(
   "/pagamentos/society/:societyId",
   pagamentoController.listBySociety
);

router.get(
   "/pagamentos/time/:timeId",
   pagamentoController.listByTime
);

router.get(
   "/pagamentos/usuario/:usuarioId",
   pagamentoController.listarPorUsuario
);

router.get(
   "/pagamentos/:id",
   pagamentoController.readOne
);
/* ======================================================
   CAMPEONATO
====================================================== */

routes.post("/campeonato", campeonato.create);

routes.get("/campeonato", campeonato.listAll);

routes.get(
   "/campeonato/society/:societyId",
   campeonato.listBySociety
);

routes.get(
   "/campeonato/:id",
   campeonato.readOne
);

routes.post(
   "/campeonato/:id/add-time",
   campeonato.addTime
);

routes.post(
   "/campeonato/:id/generate-groups",
   campeonato.generateGroups
);

routes.post(
   "/campeonato/:id/generate-league",
   campeonato.generateLeague
);

routes.get(
   "/campeonato/:id/ranking",
   campeonato.ranking
);

routes.get(
   "/campeonato/:id/ranking-grupos",
   campeonato.rankingPorGrupos
);

routes.post(
   "/campeonato/jogo/:id/finalizar",
   campeonato.finalizarJogo
);

/* ======================================================
   JOGOS
====================================================== */

routes.get(
   "/jogo/:id",
   jogo.readOne
);

routes.put(
   "/jogo/:id/stats",
   jogo.updateStats
);

routes.post(
   "/jogo/:id/escalacao",
   jogo.addLineup
);

routes.post(
   "/jogo/:id/evento",
   jogo.addEvento
);
/* =====================================================
   JOGOS
===================================================== */

router.get(
   "/jogo/:id",
   jogoController.readOne
);

router.put(
   "/jogo/:id/stats",
   jogoController.updateStats
);

router.post(
   "/jogo/:id/escalacao",
   jogoController.addLineup
);

router.post(
   "/jogo/:id/evento",
   jogoController.addEvento
);

router.post(
   "/jogo/:id/finalizar",
   campeonatoController.finalizarJogo
);

/* =====================================================
   COMANDAS
===================================================== */

router.post(
   "/comanda",
   comandaController.abrir
);

router.post(
   "/comanda/:id/item",
   comandaController.adicionarItem
);

router.delete(
   "/comanda/item/:itemId",
   comandaController.removerItem
);

router.get(
   "/comanda/society/:societyId",
   comandaController.listBySociety
);

router.get(
   "/comanda/:id",
   comandaController.readOne
);

router.post(
   "/comanda/:id/fechar",
   comandaController.fechar
);

router.post(
   "/comanda/:id/gerar-pagamento",
   comandaController.gerarPagamento
);

router.post(
   "/comanda/:id/pagar",
   comandaController.pagar
);

module.exports = router;