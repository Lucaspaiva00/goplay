const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", async () => {
    await carregarSocietiesNoSelect();
    await carregarTimes();
});

function getUsuario() {
    return JSON.parse(localStorage.getItem("usuarioLogado") || "null");
}

async function carregarSocietiesNoSelect() {
    const usuario = getUsuario();
    const select = document.getElementById("societyId");

    if (!usuario?.id) {
        if (select) select.innerHTML = `<option value="">Faça login novamente</option>`;
        return;
    }

    const societyIdSalvo = localStorage.getItem("societyId");

    let lista = [];
    try {
        // ✅ DONO_SOCIETY -> lista as societies dele
        if (usuario.tipo === "DONO_SOCIETY") {
            const res = await fetch(`${BASE_URL}/society/owner/${usuario.id}`);
            lista = await res.json();
        } else {
            // ✅ DONO_TIME / PLAYER -> lista TODAS as societies
            const res = await fetch(`${BASE_URL}/society`);
            lista = await res.json();
        }
    } catch (e) {
        console.error(e);
    }

    if (!select) return;

    if (!Array.isArray(lista) || lista.length === 0) {
        select.innerHTML = `<option value="">Nenhuma society encontrada</option>`;
        return;
    }

    select.innerHTML = `<option value="">Selecione</option>`;
    lista.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.nome}${s.cidade || s.estado ? ` (${s.cidade || ""}${s.estado ? "/" + s.estado : ""})` : ""}`;
        select.appendChild(opt);
    });

    if (societyIdSalvo) select.value = societyIdSalvo;

    select.onchange = () => {
        const v = select.value;
        if (v) localStorage.setItem("societyId", v);
    };
}


async function carregarTimes() {
    const usuario = getUsuario();
    const div = document.getElementById("listaTimes");

    if (!usuario?.id) {
        div.innerHTML = "<p>Erro: usuário não encontrado.</p>";
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/time/dono/${usuario.id}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            div.innerHTML = "<p>Nenhum time cadastrado ainda.</p>";
            return;
        }

        div.innerHTML = data
            .map(
                (t) => `
        <div class="card" style="margin-bottom:15px;">
          <strong>${t.nome}</strong><br>
          ${t?.society?.nome ? `<small>Society: ${t.society.nome}</small><br>` : ""}
          ${t.cidade || ""} - ${t.estado || ""}<br><br>

          <button class="btn" onclick="verDetalhes(${t.id})">
            Ver detalhes
          </button>
        </div>
      `
            )
            .join("");
    } catch (e) {
        console.error(e);
        div.innerHTML = "<p>Erro ao carregar times.</p>";
    }
}

async function salvarTime() {
    const usuario = getUsuario();

    if (!usuario?.id) {
        alert("Sessão expirada. Faça login de novo.");
        return;
    }

    const societyId = document.getElementById("societyId")?.value;

    if (!societyId) {
        alert("Nenhuma society selecionada/identificada. Selecione uma society.");
        return;
    }

    const data = {
        donoId: usuario.id,
        societyId: Number(societyId),
        nome: document.getElementById("nome").value,
        // campos extras podem existir na sua tela, mas seu backend ainda NÃO salva eles
        brasao: document.getElementById("brasao").value,
        descricao: document.getElementById("descricao").value,
        estado: document.getElementById("estado").value,
        cidade: document.getElementById("cidade").value,
        modalidade: document.getElementById("modalidade").value,
    };

    if (!data.nome) {
        alert("O nome do time é obrigatório.");
        return;
    }

    // ⚠️ seu timeController.create atualmente só salva: nome, societyId, donoId
    // então vamos mandar só isso pra não confundir
    const payload = {
        nome: String(data.nome),
        societyId: Number(data.societyId),
        donoId: Number(data.donoId),
    };

    try {
        const res = await fetch(`${BASE_URL}/time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok || json?.error) {
            alert(json?.error || "Erro ao criar time");
            return;
        }

        alert("Time cadastrado com sucesso!");
        await carregarTimes();

        // limpa nome
        document.getElementById("nome").value = "";
    } catch (e) {
        console.error(e);
        alert("Erro ao criar time.");
    }
}

function verDetalhes(id) {
    // DONO DO TIME -> detalhes do time (gestão)
    window.location.href = `time-detalhe.html?timeId=${id}`;
}


// deixa funções globais pro onclick do HTML
window.salvarTime = salvarTime;
window.verDetalhes = verDetalhes;
