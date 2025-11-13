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
app.listen(PORT, () =>
    console.log(`Servidor rodando na porta ${PORT}`)
);
