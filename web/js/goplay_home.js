const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");

// Usuário correto
const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

if (!usuario) {
    window.location.href = "login.html";
}

// Abre/fecha o menu
menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
});

// Clicar fora fecha o menu
overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
});
