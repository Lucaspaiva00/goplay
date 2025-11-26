const express = require('express');
const router = express.Router();


const usuariocontroller = require('./controller/usuarioController');
const societycontroller = require("./controller/societyController")
const timecontroller = require("./controller/timeController")
const societyplayerscontroller = require("./controller/societyPlayerController")
const pagamentoscontroller = require("./controller/pagamentoController")
const listagemcontroller = require("./controller/listagemController")
const cardapiocontroller = require("./controller/cardapioController");
const campocontroller = require("./controller/campoController");
const convitecontroller = require("./controller/conviteController");
const campeonatoController = require("./controller/campeonatoController")


router.post("/usuarios", usuariocontroller.create);
router.post("/login", usuariocontroller.login);
router.get("/usuarios/:id", usuariocontroller.readOne);
router.put("/usuarios/:id", usuariocontroller.update);

router.post('/society', societycontroller.create);
router.get('/society/owner/:usuarioId', societycontroller.readByOwner);
router.get('/society/:id', societycontroller.readById);

router.post('/time', timecontroller.create);            // criar time
router.get('/time', timecontroller.list);               // listar todos os times
router.get('/time/dono/:donoId', timecontroller.listByOwner); // listar times por dono
router.get('/time/:timeId', timecontroller.details);    // detalhes do time
router.post('/time/entrar', timecontroller.join);       // jogador entrar
router.post('/time/sair', timecontroller.leave);        // jogador sair


router.post('/society/player', societyplayerscontroller.add);

router.post('/pagamentos', pagamentoscontroller.create);
router.get('/pagamentos/society/:societyId', pagamentoscontroller.listBySociety);

router.get('/geral', listagemcontroller.geral);

router.post('/cardapio', cardapiocontroller.create);
router.get('/cardapio/:societyId', cardapiocontroller.list);

router.post('/campos', campocontroller.create);
router.get('/campos/:societyId', campocontroller.list);

router.post('/convite', convitecontroller.convidar);

router.post('/campeonato', campeonatoController.create);
router.get('/campeonato/society/:societyId', campeonatoController.listBySociety);
router.post('/campeonato/:id/add-time', campeonatoController.addTime);
router.post('/campeonato/:id/gerar-chaves', campeonatoController.generateBracket);
router.get('/campeonato/:id/jogos', campeonatoController.listGames);
router.post('/campeonato/jogo/:jogoId/finalizar', campeonatoController.finalizarJogo);

module.exports = router;
