require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Rotas centralizadas
const routes = require("./src/routes");
app.use(routes);

// Teste inicial
app.get("/", (req, res) => {
    res.status(200).json({ msg: "API GoPlay rodando 🚀" });
});

// Porta
const PORT = process.env.PORT || 3000;
const { startPresenceNotificationJob } = require("./src/presenceNotifications");
const { runChampionshipSelfTest } = require("./scripts/championshipSelfTest");

async function boot() {
    if (process.env.GOPLAY_CHAMP_SELFTEST) {
        const result = await runChampionshipSelfTest();
        console.log("[SELFTEST CAMPEONATO] Resultado:", JSON.stringify(result));
    }
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        startPresenceNotificationJob();
    });
}
boot().catch(err => {
    console.error("[BOOT] Falha:", err);
    process.exit(1);
});
