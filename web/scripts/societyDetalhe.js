const BASE_URL = "http://localhost:3000";

function getSocietyId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("societyId") || "").trim();
    const fromLS = (localStorage.getItem("societyId") || "").trim();
    return fromUrl || fromLS || null;
}

function goTo(page) {
    const societyId = getSocietyId();
    if (!societyId) {
        alert("Society não selecionado. Volte em Ver Societies e abra os detalhes do society.");
        return;
    }
    // mantém guardado
    localStorage.setItem("societyId", societyId);

    window.location.href = `${page}?societyId=${encodeURIComponent(societyId)}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const societyId = getSocietyId();

    if (!societyId) {
        document.getElementById("societyInfo").innerHTML =
            `<p style="color:#ef4444;font-weight:800;">Society inválido. Volte e selecione um society.</p>`;
        return;
    }

    // mantém guardado
    localStorage.setItem("societyId", societyId);

    fetch(`${BASE_URL}/society/${encodeURIComponent(societyId)}`)
        .then(async (res) => {
            const text = await res.text().catch(() => "");
            let data = {};
            try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

            if (!res.ok) {
                throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
            }
            return data;
        })
        .then((data) => {
            if (data?.error) {
                document.getElementById("societyInfo").innerHTML = `<p>${data.error}</p>`;
                return;
            }

            document.getElementById("societyInfo").innerHTML = `
        <h3>${data.nome || "-"}</h3>
        <p>${data.descricao || "Sem descrição"}</p>
        <p><b>Cidade:</b> ${data.cidade || "-"} / ${data.estado || "-"}</p>
        <p><b>Telefone:</b> ${data.telefone || "-"}</p>
        <p><b>Whats:</b> ${data.whatsapp || "-"}</p>
        <p><b>Email:</b> ${data.email || "-"}</p>
        <p><b>Website:</b> ${data.website || "-"}</p>
        <hr>
        <p><b>Campos cadastrados:</b> ${(data.campos || []).length}</p>
        <p><b>Itens no cardápio:</b> ${(data.cardapio || []).length}</p>
        <p><b>Jogadores:</b> ${(data.societyPlayers || []).length}</p>
      `;
        })
        .catch((err) => {
            console.error("ERRO societyDetalhe:", err);
            document.getElementById("societyInfo").innerHTML =
                `<p style="color:#ef4444;font-weight:800;">Erro ao carregar society.</p>
         <p style="color:#6b7280;">${err?.message || ""}</p>`;
        });
});

// Botões
function irCampos() { goTo("campos.html"); }
function irCardapio() { goTo("cardapio.html"); }
function irJogadores() { goTo("jogadores.html"); }
function irPagamentos() { goTo("pagamentos.html"); }
function irConvites() { goTo("convites.html"); }
