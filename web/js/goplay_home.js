const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");
const usuario = JSON.parse(localStorage.getItem("usuarioCadastrado"));
// Abre e fecha ao clicar no sanduíche
menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
});

// Clicar fora fecha o menu
overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
});

if (usuario && usuario.nome) {
    document.getElementById("msgBemVindo").innerHTML = `👋 Bem-vindo, ${usuario.nome}!`;
}