const BASE_URL = "https://goplay-dzlr.onrender.com";

function escapeHtml(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

document.addEventListener("DOMContentLoaded", carregarSocieties);

async function carregarSocieties() {
    const div = document.getElementById("listaSocieties");
    try {
        const res = await fetch(`${BASE_URL}/society`);
        const societies = await res.json();
        if (!Array.isArray(societies) || !societies.length) {
            div.innerHTML = "<p>Nenhuma empresa encontrada.</p>";
            return;
        }
        const atual = Number(localStorage.getItem("societyId") || 0);
        div.innerHTML = societies.map(s => `
            <div class="card society-card" style="${Number(s.id)===atual?'border:2px solid #0dbf45':''}">
                <div class="society-card-top">
                    <div class="society-main" style="display:flex;gap:12px;align-items:center;">
                        ${s.imagem ? `<img src="${escapeHtml(s.imagem)}" alt="" style="width:48px;height:48px;border-radius:10px;object-fit:cover;">` : ""}
                        <div>
                            <strong>${escapeHtml(s.nome || "-")}</strong>
                            <small>${escapeHtml(s.cidade || "")}${s.estado ? " / " + escapeHtml(s.estado) : ""}</small>
                            ${Number(s.id)===atual?`<small style="display:block;color:#15803d;font-weight:800;margin-top:4px">✓ Empresa atual</small>`:""}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                        <button class="btn-details" onclick="selecionarEmpresa(${s.id}, '${String(s.nome||'Empresa').replace(/'/g,"\\'")}')">Usar esta empresa</button>
                        <button class="btn-details" onclick="verDetalhes(${s.id})">Ver detalhes</button>
                    </div>
                </div>
            </div>`).join("");
    } catch (error) {
        console.error("Erro ao carregar empresas:", error);
        div.innerHTML = "<p>Erro ao carregar empresas.</p>";
    }
}

function selecionarEmpresa(id,nome){
    localStorage.setItem("societyId",String(id));
    localStorage.setItem("societyContextName",nome||"Empresa");
    window.location.href=`society-detalhe.html?societyId=${encodeURIComponent(id)}`;
}
function verDetalhes(id){window.location.href=`society-detalhe.html?societyId=${encodeURIComponent(id)}`;}
window.selecionarEmpresa=selecionarEmpresa;window.verDetalhes=verDetalhes;
