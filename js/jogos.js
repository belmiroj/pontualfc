const BASE_URL = "https://dashboard-pontualfc-default-rtdb.firebaseio.com/temporada_2026";
let todosJogos = [];

async function carregar() {
    try {
        const resp = await fetch(`${BASE_URL}.json`);
        const data = await resp.json();
        if (!data) return;
        todosJogos = Object.keys(data).map(key => ({ id: key, ...data[key] }))
            .sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));
        renderizar(todosJogos);
    } catch (error) { console.error("Erro:", error); }
}

function renderizar(listaParaExibir) {
    const container = document.getElementById('lista');
    container.innerHTML = '';

    listaParaExibir.forEach(j => {
        const isFinished = j.status === 'finished';
        const classeStatus = isFinished ? (j.resultado_tipo || '') : 'upcoming';
        
        const listaGols = j.gols_detalhes ? j.gols_detalhes.map(g => `<li>${g.nome} (${g.qtd})</li>`).join('') : '<li>-</li>';
        const listaAst = j.assist_detalhes ? j.assist_detalhes.map(a => `<li>${a.nome} (${a.qtd})</li>`).join('') : '<li>-</li>';

        // Lógica para capturar o MVP daquela partida específica
        let mvpNome = "N/A";
        if (isFinished && j.votos_melhor && j.votos_melhor.length > 0) {
            const ordenado = [...j.votos_melhor].sort((a, b) => b.qtd - a.qtd);
            mvpNome = ordenado[0].nome;
        }

        container.innerHTML += `
            <div class="game-card ${classeStatus}" onclick="toggleDetails('${j.id}')">
                <div class="round-header">
                    <span class="round-tag">${j.rodada || 'Amistoso'}</span>
                </div>
                <div class="game-header">
                    <div class="date">${j.data}<br>${j.dia_semana || ''}</div>
                    <div class="team mandante">${j.mandante}</div>
                    <div class="score-box">
                        <div class="score">${isFinished ? j.placar_mandante + ' - ' + j.placar_visitante : 'VS'}</div>
                    </div>
                    <div class="team visitante">${j.visitante}</div>
                </div>
                <div class="game-details" id="detalhe-${j.id}">
                    <div class="details-grid">
                        <div>
                            <div class="detail-title">⚽ Gols</div>
                            <ul class="player-list">${listaGols}</ul>
                        </div>
                        <div>
                            <div class="detail-title">👟 Assistências</div>
                            <ul class="player-list">${listaAst}</ul>
                        </div>
                        <div>
                            <div class="detail-title">🏆 MVP</div>
                            <p class="mvp-text">🏆 ${mvpNome}</p>
                        </div>
                        <div>
                            <div class="detail-title">📋 Presenças</div>
                            <p style="font-size:0.75rem; color:#666; margin:0">${j.presencas ? j.presencas.join(', ') : 'Não registrada'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function toggleDetails(id) {
    const div = document.getElementById(`detalhe-${id}`);
    div.style.display = div.style.display === 'block' ? 'none' : 'block';
}

function filtrarJogos() {
    const mes = document.getElementById('month-filter').value;
    renderizar(mes === 'todos' ? todosJogos : todosJogos.filter(j => j.data.split('/')[1] === mes));
}

window.onload = carregar;