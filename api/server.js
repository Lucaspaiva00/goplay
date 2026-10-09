require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// Middlewares
app.use("/stories", express.json({limit:"2mb"}));
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
const { startStoryCleanupJob } = require("./src/storyLifecycle");
const { syncPlatformAdmins } = require("./src/platformAdmins");

async function startServer() {
    try {
        await syncPlatformAdmins();
    } catch (error) {
        console.error("[GOPLAY SOCIOS] falha ao sincronizar perfis:", error?.message || error);
    }

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        startPresenceNotificationJob();
        startStoryCleanupJob();
    });
}

startServer();
