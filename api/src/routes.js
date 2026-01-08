const express = require('express');
const router = express.Router();

const usuariocontroller = require('./controller/usuarioController');
const societycontroller = require("./controller/societyController");
const timecontroller = require("./controller/timeController");
const societyplayerscontroller = require("./controller/societyPlayerController");
const pagamentoscontroller = require("./controller/pagamentoController");
const listagemcontroller = require("./controller/listagemController");
const cardapiocontroller = require("./controller/cardapioController");
const campocontroller = require("./controller/campoController");
const convitecontroller = require("./controller/conviteController");
const campeonatoController = require("./controller/campeonatoController");
const jogoController = require("./controller/jogoController");

// Usuário
router.post("/usuarios", usuariocontroller.create);
router.post("/login", usuariocontroller.login);
router.get("/usuarios/:id", usuariocontroller.readOne);
router.put("/usuarios/:id", usuariocontroller.update);

// Society
router.post('/society', societycontroller.create);
router.get('/society/owner/:usuarioId', societycontroller.readByOwner);
router.get('/society/:id', societycontroller.readById);

// Time
router.post('/time', timecontroller.create);
router.get('/time', timecontroller.list);
router.get('/time/dono/:donoId', timecontroller.listByOwner);
router.get('/time/society/:societyId', timecontroller.listBySociety);
router.get('/time/:timeId', timecontroller.details);
router.post('/time/entrar', timecontroller.join);
router.post('/time/sair', timecontroller.leave);
router.get("/time/details/by-player/:usuarioId", timecontroller.getTimeByPlayer);

// Society Players
router.post('/society/player', societyplayerscontroller.add);

// Pagamentos
router.post('/pagamentos', pagamentoscontroller.create);
router.get('/pagamentos/society/:societyId', pagamentoscontroller.listBySociety);

// Gerais
router.get('/geral', listagemcontroller.geral);

// Cardápio
router.post('/cardapio', cardapiocontroller.create);
router.get('/cardapio/:societyId', cardapiocontroller.list);

// Campo
router.post('/campos', campocontroller.create);
router.get('/campos/:societyId', campocontroller.list);

// Convite
router.post('/convite', convitecontroller.convidar);

// CAMPEONATO
router.post("/campeonato", campeonatoController.create);
router.get("/campeonato/society/:societyId", campeonatoController.listBySociety);
router.get("/campeonato/:id", campeonatoController.readOne);
router.post("/campeonato/:id/add-time", campeonatoController.addTime);
router.post("/campeonato/:id/gerar-grupos", campeonatoController.generateGroups);
router.post("/campeonato/:id/gerar-jogos-grupos", campeonatoController.generateGroupMatches);
router.post("/campeonato/:id/gerar-mata-mata", campeonatoController.generateMataMata);
router.post("/campeonato/jogo/:id/finalizar", campeonatoController.finalizarJogo);
router.get("/campeonato/:id/bracket", campeonatoController.getBracket);


// JOGO (DETALHES)
router.get("/jogo/:id", jogoController.readOne);
router.put("/jogo/:id/stats", jogoController.updateStats);
router.post("/jogo/:id/escalacao", jogoController.addLineup);
router.post("/jogo/:id/evento", jogoController.addEvento);


module.exports = router;
