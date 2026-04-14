const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const overlay = document.getElementById("overlay");

const usuario = JSON.parse(localStorage.getItem("usuarioLogado") || "null");

if (!usuario) {
    window.location.href = "login.html";
}

if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
    });

    overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
    });
}