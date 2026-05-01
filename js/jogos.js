let todosJogos = [];

async function carregarPaginaJogos() {
    const data = await fetchData(); // Função global do api.js
    if (!data) return;

    // Converte objeto em array e ordena pela data mais recente
    todosJogos = Object.keys(data).map(key => ({ id: key, ...data[key] }))
        .sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

    renderizarJogos(todosJogos);
    configurarFiltro();
}

function renderizarJogos(lista) {
    const container = document.getElementById('lista-jogos');
    container.innerHTML = '';

    if (lista.length === 0) {
        container.innerHTML = '<p style="text-align:center; margin-top:20px;">Nenhum jogo encontrado para este período.</p>';
        return;
    }

    lista.forEach(j => {
        const isFinished = j.status === 'finished';
        const classeStatus = isFinished ? (j.resultado_tipo || '') : 'upcoming';
        
        // Processamento de detalhes
        const listaGols = j.gols_detalhes ? j.gols_detalhes.map(g => `<li>${g.nome} (${g.qtd})</li>`).join('') : '<li>-</li>';
        const listaAst = j.assist_detalhes ? j.assist_detalhes.map(a => `<li>${a.nome} (${a.qtd})</li>`).join('') : '<li>-</li>';
        
        let mvpNome = "N/A";
        if (isFinished && j.votos_melhor && j.votos_melhor.length > 0) {
            const ordenado = [...j.votos_melhor].sort((a, b) => b.qtd - a.qtd);
            mvpNome = ordenado[0].nome;
        }

        const cardHtml = `
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
                <div class="game-details" id="detalhe-${j.id}" style="display:none;">
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
        container.innerHTML += cardHtml;
    });
}

function toggleDetails(id) {
    const div = document.getElementById(`detalhe-${id}`);
    if (div) {
        div.style.display = div.style.display === 'none' ? 'block' : 'none';
    }
}

function configurarFiltro() {
    const selector = document.getElementById('month-filter');
    selector.addEventListener('change', () => {
        const mesSelecionado = selector.value;
        if (mesSelecionado === 'todos') {
            renderizarJogos(todosJogos);
        } else {
            const filtrados = todosJogos.filter(j => j.data.split('/')[1] === mesSelecionado);
            renderizarJogos(filtrados);
        }
    });
}

// Inicia a carga quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', carregarPaginaJogos);