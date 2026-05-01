const JOGADORES_PADRAO = ["ANTONIO", "AUGUSTO", "BELMIRO", "CELSO", "CLESIO", "DEIVID", "DENIS", "DIEGO", "GUILHERME", "GUIMA", "ISMAEL", "JAIR", "LUIZ", "MARCIO", "RANIERI", "ROGERIO", "SAYMONN", "VAGNER"];

async function carregarRodadas() {
    const res = await fetch(`${FIREBASE_URL}temporada_2026/jogos.json`);
    const jogos = await res.json();
    const select = document.getElementById('selectRodada');
    
    select.innerHTML = '<option value="">Selecione...</option>';
    for (let id in jogos) {
        if (jogos[id].status === "agendado") {
            select.innerHTML += `<option value="${id}">${id} vs ${jogos[id].adversario}</option>`;
        }
    }
}

async function carregarDadosDaRodada() {
    const rodada = document.getElementById('selectRodada').value;
    if (!rodada) return;

    const res = await fetch(`${FIREBASE_URL}temporada_2026/jogos/${rodada}.json`);
    const jogo = await res.json();
    
    const tbody = document.getElementById('tabelaScout');
    tbody.innerHTML = '';

    JOGADORES_PADRAO.forEach(nome => {
        const dados = (jogo.scout && jogo.scout[nome]) ? jogo.scout[nome] : { gols: 0, assistencias: 0, votos: 0, jogou: false };
        
        tbody.innerHTML += `
            <tr>
                <td><input type="checkbox" class="chk-jogou" data-nome="${nome}" ${dados.jogou ? 'checked' : ''}></td>
                <td>${nome}</td>
                <td><input type="number" class="input-mini gols" data-nome="${nome}" value="${dados.gols}"></td>
                <td><input type="number" class="input-mini ast" data-nome="${nome}" value="${dados.assistencias}"></td>
                <td><input type="number" class="input-mini votos" data-nome="${nome}" value="${dados.votos}"></td>
            </tr>
        `;
    });
}

async function finalizarPartida() {
    const rodada = document.getElementById('selectRodada').value;
    const scout = {};

    document.querySelectorAll('#tabelaScout tr').forEach(tr => {
        const nome = tr.querySelector('.chk-jogou').dataset.nome;
        scout[nome] = {
            jogou: tr.querySelector('.chk-jogou').checked,
            gols: parseInt(tr.querySelector('.gols').value) || 0,
            assistencias: parseInt(tr.querySelector('.ast').value) || 0,
            votos: parseInt(tr.querySelector('.votos').value) || 0
        };
    });

    const finalData = {
        gp: parseInt(document.getElementById('gp').value),
        ga: parseInt(document.getElementById('ga').value),
        status: "finalizado",
        scout: scout
    };

    await fetch(`${FIREBASE_URL}temporada_2026/jogos/${rodada}.json`, {
        method: 'PATCH',
        body: JSON.stringify(finalData)
    });

    alert("Rodada finalizada com sucesso!");
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', carregarRodadas);