const BASE_URL = "https://dashboard-pontualfc-default-rtdb.firebaseio.com/temporada_2026";

async function carregar() {
    try {
        const resp = await fetch(`${BASE_URL}.json`);
        const data = await resp.json();
        if (!data) return;

        const jogos = Object.values(data);
        let t = 0, v = 0, e = 0, d = 0, gp = 0, gc = 0;
        let art = {}, ast = {}, pre = {}, vot = {};

        const jogosFinalizados = jogos
            .filter(j => j.status === 'finished')
            .sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

        if (jogosFinalizados.length > 0) {
            const ultimo = jogosFinalizados[0];
            
            // Lógica para encontrar o MVP (quem tem mais votos no último jogo)
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

        document.getElementById('stat-total').innerText = t;
        document.getElementById('stat-vitorias').innerText = v;
        document.getElementById('stat-empates').innerText = e;
        document.getElementById('stat-derrotas').innerText = d;
        document.getElementById('stat-gp').innerText = gp;
        document.getElementById('stat-gc').innerText = gc;

        const sg = gp - gc;
        const elSgValue = document.getElementById('stat-sg');
        const cardSg = document.getElementById('card-sg');
        elSgValue.innerText = sg;
        if (sg > 0) { cardSg.style.borderColor = "var(--win)"; elSgValue.style.color = "var(--win)"; }
        else if (sg === 0) { cardSg.style.borderColor = "var(--draw)"; elSgValue.style.color = "var(--draw)"; }
        else { cardSg.style.borderColor = "var(--loss)"; elSgValue.style.color = "var(--loss)"; }

        const ptsGanhos = (v * 3) + (e * 1);
        const ptsPossiveis = t * 3;
        const perc = ptsPossiveis > 0 ? (ptsGanhos / ptsPossiveis) * 100 : 0;
        const elAprov = document.getElementById('stat-aprov');
        const cardAprov = document.getElementById('card-aprov');
        elAprov.innerText = perc.toFixed(1) + "%";
        if (perc < 45) { cardAprov.style.borderColor = "var(--loss)"; elAprov.style.color = "var(--loss)"; }
        else if (perc >= 45 && perc < 65) { cardAprov.style.borderColor = "var(--draw)"; elAprov.style.color = "var(--draw)"; }
        else { cardAprov.style.borderColor = "var(--win)"; elAprov.style.color = "var(--win)"; }

        const render = (id, obj) => {
            document.getElementById(id).innerHTML = Object.entries(obj)
                .sort((x, y) => y[1] - x[1])
                .map(i => `<tr><td>${i[0]}</td><td class="val">${i[1]}</td></tr>`)
                .join('');
        };
        
        render('lista-gols', art);
        render('lista-assist', ast);
        render('lista-votos', vot);
        render('lista-presencas', pre);

    } catch (err) { console.error("Erro ao carregar dados:", err); }
}
window.onload = carregar;