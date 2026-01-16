const BASE_URL = "http://localhost:3000";

function getParam(name) {
    return new URLSearchParams(location.search).get(name);
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { }

    if (!res.ok) {
        const msg = data?.error || data?.message || text || `Erro HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    const timeId = getParam("timeId");
    if (!timeId) {
        document.getElementById("info").innerHTML = `<p>timeId não informado na URL.</p>`;
        document.getElementById("listaJogadores").innerHTML = `<p>-</p>`;
        return;
    }

    // Botões (links do fluxo dono do time)
    document.getElementById("btnAgendar").onclick = () => {
        // essa tela já existe no teu projeto
        location.href = `time-agendamento.html?timeId=${timeId}`;


    };

    document.getElementById("btnPagamentos").onclick = () => {
        // se você tiver uma tela "meus-pagamentos" do time, troca aqui
        window.location.href = `pagamentos.html?timeId=${timeId}`;
    };

    await carregarTime(timeId);
}

async function carregarTime(timeId) {
    const infoEl = document.getElementById("info");
    const listEl = document.getElementById("listaJogadores");

    infoEl.innerHTML = "Carregando...";
    listEl.innerHTML = "Carregando jogadores...";

    try {
        // sua rota já existe: GET /time/:timeId -> timeController.details
        const time = await fetchJSON(`${BASE_URL}/time/${timeId}`);

        infoEl.innerHTML = `
      <div style="text-align:left;">
        <p><strong>Nome:</strong> ${escapeHtml(time.nome)}</p>
        <p><strong>Society:</strong> ${escapeHtml(time?.society?.nome || "-")}</p>
        <p><strong>Cidade:</strong> ${escapeHtml(time.cidade || "-")} / ${escapeHtml(time.estado || "-")}</p>
        <p><strong>Modalidade:</strong> ${escapeHtml(time.modalidade || "-")}</p>
      </div>
    `;

        const jogadores = time.jogadores || [];

        if (!jogadores.length) {
            listEl.innerHTML = `<p>Nenhum jogador no time ainda.</p>`;
            return;
        }

        listEl.innerHTML = `
      <div style="text-align:left;">
        ${jogadores.map(j => `
          <div style="padding:10px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(j.nome)}</strong><br/>
            <span style="color:#6b7280;font-size:13px;">
              ${escapeHtml(j.posicaoCampo || "—")} ${j.goleiro ? "• Goleiro" : ""}
            </span>
          </div>
        `).join("")}
      </div>
    `;
    } catch (err) {
        console.error(err);
        infoEl.innerHTML = `<p style="color:#b91c1c;"><strong>Erro:</strong> ${escapeHtml(err.message)}</p>`;
        listEl.innerHTML = `<p>-</p>`;
    }
}
