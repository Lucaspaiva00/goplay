// Sidebar fixa no desktop
const sidebar = document.getElementById("menuLateral");
const icon = document.querySelector(".menu-icon");

// Estado inicial: sidebar aberta
document.body.classList.add("with-sidebar");

// Função para abrir/fechar
icon.addEventListener("click", () => {

    // Se desktop (largura > 850px)
    if (window.innerWidth > 850) {
        if (sidebar.classList.contains("closed")) {
            sidebar.classList.remove("closed");
            document.body.classList.remove("no-sidebar");
            document.body.classList.add("with-sidebar");
        } else {
            sidebar.classList.add("closed");
            document.body.classList.remove("with-sidebar");
            document.body.classList.add("no-sidebar");
        }
    }
    else {
        // Mobile → menu retrátil
        sidebar.classList.toggle("open");
    }
});
