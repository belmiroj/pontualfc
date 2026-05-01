async function carregarDashboard() {
    const data = await fetchData(); // Função vinda de api.js
    if (!data) return;

    const jogos = Object.values(data);
    let t = 0, v = 0, e = 0, d = 0, gp = 0, gc = 0;
    let art = {}, ast = {}, pre = {}, vot = {};

    const jogosFinalizados = jogos
        .filter(j => j.status === 'finished')
        .sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

    // Renderiza o Último Jogo
    if (jogosFinalizados.length > 0) {
        renderLastGame(jogosFinalizados[0]);
    }

    // Processa Estatísticas Gerais
    jogos.forEach(j => {
        if (j.status === 'finished') {
            t++;
            if (j.resultado_tipo === 'vitoria') v++;
            else if (j.resultado_tipo === 'empate') e++;
            else if (j.resultado_tipo === 'derrota') d++;
            
            gp += (j.placar_mandante || 0);
            gc += (j.placar_visitante || 0);
            
            if (j.gols_detalhes) j.gols_detalhes.forEach(i => art[i.nome] = (art[i.nome] || 0) + i.qtd);
            if (j.assist_detalhes) j.assist_detalhes.forEach(i => ast[i.nome] = (ast[i.nome] || 0) + i.qtd);
            if (j.votos_melhor) j.votos_melhor.forEach(i => vot[i.nome] = (vot[i.nome] || 0) + i.qtd);
            if (j.presencas) j.presencas.forEach(nome => pre[nome] = (pre[nome] || 0) + 1);
        }
    });

    updateCounters(t, v, e, d, gp, gc);
    
    renderTable('lista-gols', art);
    renderTable('lista-assist', ast);
    renderTable('lista-votos', vot);
    renderTable('lista-presencas', pre);
}

function renderLastGame(ultimo) {
    let mvpNome = "N/A";
    if (ultimo.votos_melhor && ultimo.votos_melhor.length > 0) {
        const ordenadoVotos = [...ultimo.votos_melhor].sort((a, b) => b.qtd - a.qtd);
        mvpNome = ordenadoVotos[0].nome;
    }

    document.getElementById('ultimo-jogo-container').innerHTML = `
        <div class="last-game-card">
            <small>Último Resultado • ${ultimo.rodada || 'Confronto'}</small>
            <div class="last-game-info">
                <div class="lg-team" style="text-align:right">${ultimo.mandante}</div>
                <div class="lg-score">${ultimo.placar_mandante} - ${ultimo.placar_visitante}</div>
                <div class="lg-team" style="text-align:left">${ultimo.visitante}</div>
            </div>
            <div class="mvp-badge">🏆 MVP: ${mvpNome}</div>
            <div style="font-size: 0.7rem; margin-top: 12px; opacity: 0.6;">${ultimo.data}</div>
        </div>
    `;
}

function updateCounters(t, v, e, d, gp, gc) {
    document.getElementById('stat-total').innerText = t;
    document.getElementById('stat-vitorias').innerText = v;
    document.getElementById('stat-empates').innerText = e;
    document.getElementById('stat-derrotas').innerText = d;
    document.getElementById('stat-gp').innerText = gp;
    document.getElementById('stat-gc').innerText = gc;

    // Saldo e Aproveitamento (Lógica de cores e cálculos)
    const sg = gp - gc;
    const elSgValue = document.getElementById('stat-sg');
    elSgValue.innerText = sg;
    
    const ptsGanhos = (v * 3) + (e * 1);
    const perc = t > 0 ? (ptsGanhos / (t * 3)) * 100 : 0;
    document.getElementById('stat-aprov').innerText = perc.toFixed(1) + "%";
}

function renderTable(id, obj) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = Object.entries(obj)
        .sort((x, y) => y[1] - x[1])
        .map(i => `<tr><td>${i[0]}</td><td class="val">${i[1]}</td></tr>`)
        .join('');
}

window.onload = carregarDashboard;