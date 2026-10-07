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
const { clearDatabaseOnce } = require("./scripts/clearDatabase");

async function startServer() {
    const reset = await clearDatabaseOnce();
    if (reset?.cleared) {
        console.log(`Reset único GoPlay executado: ${reset.tables} tabela(s) limpas.`);
    } else if (process.env.GOPLAY_RESET_TOKEN) {
        console.log(`Reset GoPlay ignorado: ${reset?.reason || "já executado"}.`);
    }

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        startPresenceNotificationJob();
    });
}

startServer().catch(error => {
    console.error("Falha ao iniciar a API GoPlay:", error);
    process.exit(1);
});
