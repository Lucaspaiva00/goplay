// VERIFICA SE O USUÁRIO ESTÁ LOGADO EM TODAS AS TELAS
function verificarSessao() {
    const usuario = localStorage.getItem("usuarioLogado");

    const paginaAtual = window.location.pathname;

    // Se estiver nas telas de login ou cadastro, não bloqueia
    if (paginaAtual.includes("login.html") || paginaAtual.includes("usuarios.html")) {
        return;
    }

    if (!usuario) {
        alert("Faça login para continuar.");
        window.location.href = "login.html";
    }
}

// executa
verificarSessao();
