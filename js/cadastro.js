function gerarRodadaAutomatica() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    
    document.getElementById('rodada').value = `${ano}_${mes}${dia}`;
    document.getElementById('data').value = `${ano}-${mes}-${dia}`;
}

async function salvarNoBanco() {
    const rodada = document.getElementById('rodada').value;
    const data = document.getElementById('data').value;
    const adversario = document.getElementById('adversario').value;

    if (!rodada || !data) return alert("Preencha os campos!");

    const payload = {
        data,
        adversario,
        hora: "21:00",
        local: "Balduíno Soccer Indoor",
        status: "agendado"
    };

    try {
        const response = await fetch(`${FIREBASE_URL}temporada_2026/jogos/${rodada}.json`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            alert("Partida agendada com sucesso!");
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

// Inicia automaticamente ao carregar
document.addEventListener('DOMContentLoaded', gerarRodadaAutomatica);