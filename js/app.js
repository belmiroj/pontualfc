const FIREBASE_ROOT = "https://dashboard-pontualfc-default-rtdb.firebaseio.com";
let temporadaAtual = String(new Date().getFullYear()); // 2026 hoje; 2027 automaticamente na virada do ano

const listaPadrao = [
    "ANTONIO", "AUGUSTO", "BELMIRO", "CELSO", "CLESIO", "DEIVID", "DENIS",
    "DIEGO", "GUILHERME", "GUIMA", "ISMAEL", "JAIR", "LUIZ", "MARCIO",
    "RANIERI", "ROGERIO", "SAYMONN", "VAGNER"
];

let todosJogos = {};
let editKey = null;
let listaJogadores = [...listaPadrao];

// Variáveis globais para os rankings completos do Bottom Sheet
let artilhariaCompleta = [];
let assistenciasCompleta = [];
let votosCompleta = [];
let presencasCompleta = [];

// --- GERENCIAMENTO DE TEMPORADAS ---
function getSeasonUrl(ano = temporadaAtual) {
    return `${FIREBASE_ROOT}/temporada_${ano}`;
}

function inicializarSeletorTemporada() {
    const sel = document.getElementById('season-select');
    if (!sel) return;

    const anoCorrente = new Date().getFullYear();
    const anosDisponiveis = new Set(["2026", "2027", String(anoCorrente), String(anoCorrente + 1)]);

    sel.innerHTML = Array.from(anosDisponiveis)
        .sort()
        .map(ano => `<option value="${ano}" ${ano === temporadaAtual ? 'selected' : ''}>Temporada ${ano}</option>`)
        .join('');
}

async function trocarTemporada(novoAno) {
    temporadaAtual = String(novoAno);
    resetForm();
    voltarParaEdicaoTexto();
    await carregarTudo();
    mostrarToast(`Exibindo Temporada ${temporadaAtual}`);
}

// --- NAVEGAÇÃO ENTRE ABAS PRINCIPAIS ---
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (btn) btn.classList.add('active');
}

// --- TOAST FEEDBACK ---
function mostrarToast(msg) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

// --- CARREGAR DADOS GLOBAIS ---
async function carregarTudo() {
    try {
        const resp = await fetch(`${getSeasonUrl()}.json`);
        todosJogos = await resp.json() || {};

        renderDashboard();
        preencherFiltroAdversarios();
        renderListaJogos();
        preencherSelectsJogos();
        renderizarTabelaScout();
    } catch (err) {
        console.error("Erro ao carregar dados do Firebase:", err);
        mostrarToast("Erro ao carregar dados da temporada.");
    }
}

// --- DASHBOARD PRINCIPAL ---
function renderDashboard() {
    const jogos = Object.values(todosJogos);
    let t = 0, v = 0, e = 0, d = 0, gp = 0, gc = 0;
    let art = {}, ast = {}, pre = {}, vot = {}, mvpCount = {};

    const jogosFinalizados = jogos
        .filter(j => j.status === 'finished')
        .sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

    const ultimoContainer = document.getElementById('ultimo-jogo-container');
    if (jogosFinalizados.length > 0) {
        const ultimo = jogosFinalizados[0];
        let mvpNome = "N/A";
        if (ultimo.votos_melhor && ultimo.votos_melhor.length > 0) {
            const maxVotosUltimo = Math.max(...ultimo.votos_melhor.map(x => x.qtd));
            const vencedoresUltimo = ultimo.votos_melhor.filter(x => x.qtd === maxVotosUltimo).map(x => x.nome);
            mvpNome = vencedoresUltimo.join(' / ');
        }

        ultimoContainer.innerHTML = `
            <div class="last-game-card">
                <small>Último Resultado • ${ultimo.rodada || 'Confronto'}</small>
                <div class="last-game-info">
                    <div class="lg-team">${ultimo.mandante}</div>
                    <div class="lg-score">${ultimo.placar_mandante} - ${ultimo.placar_visitante}</div>
                    <div class="lg-team">${ultimo.visitante}</div>
                </div>
                <div class="mvp-badge">🏆 MVP: ${mvpNome}</div>
            </div>
        `;
    } else {
        ultimoContainer.innerHTML = `
            <div class="last-game-card">
                <small>Temporada ${temporadaAtual}</small>
                <div style="padding: 16px 0; color: var(--text-muted); font-size: 0.9rem;">
                    Nenhuma partida finalizada nesta temporada ainda.
                </div>
            </div>
        `;
    }

    // Sequência dos últimos 5 jogos finalizados
    const streakEl = document.getElementById('streak-container');
    if (streakEl) {
        if (jogosFinalizados.length > 0) {
            const ultimos5 = jogosFinalizados.slice(0, 5).reverse();
            const letras = { vitoria: 'V', empate: 'E', derrota: 'D' };
            streakEl.innerHTML = `
                <div class="streak-banner">
                    <span style="color:var(--text-muted); font-weight:700; font-size:0.75rem; text-transform:uppercase;">Últimos 5 jogos</span>
                    <div class="streak-dots">
                        ${ultimos5.map(j => `<span class="streak-dot ${j.resultado_tipo}">${letras[j.resultado_tipo] || '-'}</span>`).join('')}
                    </div>
                </div>
            `;
        } else {
            streakEl.innerHTML = '';
        }
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
            if (j.presencas) j.presencas.forEach(nome => pre[nome] = (pre[nome] || 0) + 1);

            if (j.votos_melhor && j.votos_melhor.length > 0) {
                j.votos_melhor.forEach(i => vot[i.nome] = (vot[i.nome] || 0) + i.qtd);

                const maxVotosJogo = Math.max(...j.votos_melhor.map(x => x.qtd));
                if (maxVotosJogo > 0) {
                    j.votos_melhor
                        .filter(x => x.qtd === maxVotosJogo)
                        .forEach(vencedor => {
                            mvpCount[vencedor.nome] = (mvpCount[vencedor.nome] || 0) + 1;
                        });
                }
            }
        }
    });

    document.getElementById('stat-total').innerText = t;
    document.getElementById('stat-vitorias').innerText = v;
    document.getElementById('stat-empates').innerText = e;
    document.getElementById('stat-derrotas').innerText = d;
    document.getElementById('stat-gp').innerText = gp;
    document.getElementById('stat-gc').innerText = gc;

    // Saldo de Gols com Cores Dinâmicas
    const sg = gp - gc;
    const cardSg = document.getElementById('card-sg');
    const elSg = document.getElementById('stat-sg');
    elSg.innerText = sg;
    cardSg.className = 'stat-card';
    if (sg > 0) cardSg.classList.add('win');
    else if (sg === 0) cardSg.classList.add('draw');
    else cardSg.classList.add('loss');

    // Aproveitamento com Cores Dinâmicas
    const ptsPossiveis = t * 3;
    const perc = ptsPossiveis > 0 ? (((v * 3) + e) / ptsPossiveis) * 100 : 0;
    const cardAprov = document.getElementById('card-aprov');
    const elAprov = document.getElementById('stat-aprov');
    elAprov.innerText = perc.toFixed(1) + "%";
    cardAprov.className = 'stat-card';
    if (perc >= 60) cardAprov.classList.add('win');
    else if (perc >= 40) cardAprov.classList.add('draw');
    else if (t > 0) cardAprov.classList.add('loss');

    // Monta listas enriquecidas
    artilhariaCompleta = Object.entries(art)
        .sort((x, y) => y[1] - x[1])
        .map(([nome, qtd]) => {
            const jogosJogador = pre[nome] || 0;
            const media = jogosJogador > 0 ? (qtd / jogosJogador).toFixed(2) : "0.00";
            return {
                nome,
                valor: qtd,
                subtexto: `${jogosJogador} ${jogosJogador === 1 ? 'jogo' : 'jogos'} • média ${media}/jogo`,
                badgeExtra: ""
            };
        });

    assistenciasCompleta = Object.entries(ast)
        .sort((x, y) => y[1] - x[1])
        .map(([nome, qtd]) => {
            const jogosJogador = pre[nome] || 0;
            const media = jogosJogador > 0 ? (qtd / jogosJogador).toFixed(2) : "0.00";
            return {
                nome,
                valor: qtd,
                subtexto: `${jogosJogador} ${jogosJogador === 1 ? 'jogo' : 'jogos'} • média ${media}/jogo`,
                badgeExtra: ""
            };
        });

    votosCompleta = Object.entries(vot)
        .sort((x, y) => (y[1] - x[1]) || ((mvpCount[y[0]] || 0) - (mvpCount[x[0]] || 0)))
        .map(([nome, qtd]) => {
            const jogosJogador = pre[nome] || 0;
            const mvps = mvpCount[nome] || 0;
            return {
                nome,
                valor: `${qtd}`,
                subtexto: `${jogosJogador} ${jogosJogador === 1 ? 'jogo' : 'jogos'} disputados`,
                badgeExtra: mvps > 0 ? `<span class="rank-mvp-pill">🏆 ${mvps}x MVP</span>` : ""
            };
        });

    presencasCompleta = Object.entries(pre)
        .sort((x, y) => y[1] - x[1])
        .map(([nome, qtd]) => {
            const assiduidade = t > 0 ? Math.round((qtd / t) * 100) : 0;
            return {
                nome,
                valor: qtd,
                subtexto: `${qtd} de ${t} partidas`,
                badgeExtra: `<span class="rank-perc-pill">${assiduidade}%</span>`
            };
        });

    const renderTop5 = (id, lista) => {
        const top5 = lista.slice(0, 5);
        if (top5.length === 0) {
            document.getElementById(id).innerHTML = `<tr><td style="color:var(--text-muted); font-size: 0.85rem;">Nenhum dado cadastrado</td></tr>`;
            return;
        }
        document.getElementById(id).innerHTML = top5
            .map((item, idx) => gerarLinhaRankingHTML(item, idx))
            .join('');
    };

    renderTop5('lista-gols', artilhariaCompleta);
    renderTop5('lista-votos', votosCompleta);
    renderTop5('lista-presencas', presencasCompleta);

    // Exibe o card de Assistências SOMENTE se houver pelo menos 1 assistência cadastrada na temporada
    const cardAssist = document.getElementById('card-ranking-assist');
    if (assistenciasCompleta.length > 0) {
        cardAssist.style.display = 'block';
        renderTop5('lista-assist', assistenciasCompleta);
    } else {
        cardAssist.style.display = 'none';
    }
}

function gerarLinhaRankingHTML(item, idx) {
    const nomeEscapado = item.nome.replace(/'/g, "\\'");
    return `
        <tr class="clickable-player" onclick="abrirFichaJogador('${nomeEscapado}')">
            <td class="rank-pos">${idx + 1}º</td>
            <td>
                <div class="rank-player-main">
                    <strong>${item.nome}</strong>
                    ${item.badgeExtra || ''}
                </div>
                <small class="rank-player-sub">${item.subtexto}</small>
            </td>
            <td class="val">${item.valor} <i class="fa-solid fa-chevron-right" style="font-size:0.65rem; color:var(--text-muted); margin-left:4px;"></i></td>
        </tr>
    `;
}

// --- MODAL BOTTOM SHEET (VER RANKING COMPLETO) ---
function abrirModalRanking(titulo, lista) {
    document.getElementById('modal-ranking-titulo').innerText = titulo;
    const corpo = document.getElementById('modal-ranking-corpo');

    if (!lista || lista.length === 0) {
        corpo.innerHTML = `<tr><td style="text-align:center; color:var(--text-muted); padding:20px;">Sem registros nesta categoria.</td></tr>`;
    } else {
        corpo.innerHTML = lista.map((item, idx) => gerarLinhaRankingHTML(item, idx)).join('');
    }

    document.getElementById('modal-bottom-sheet').classList.add('active');
}

function fecharModalRanking(event, forcar = false) {
    if (forcar || (event && event.target.id === 'modal-bottom-sheet')) {
        document.getElementById('modal-bottom-sheet').classList.remove('active');
    }
}

// --- HISTÓRICO DE JOGOS & CONFRONTOS DIRETOS (H2H) ---
function normalizarNomeRival(nome) {
    return (nome || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function preencherFiltroAdversarios() {
    const sel = document.getElementById('adversario-filter');
    if (!sel) return;

    const valorAtual = sel.value || 'todos';
    const rivaisMap = new Map(); // chave normalizada -> nome exibição

    Object.values(todosJogos).forEach(j => {
        if (!j.visitante) return;
        const norm = normalizarNomeRival(j.visitante);
        if (!rivaisMap.has(norm)) {
            rivaisMap.set(norm, j.visitante.trim().toUpperCase());
        }
    });

    const rivaisOrdenados = Array.from(rivaisMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

    sel.innerHTML = `<option value="todos">Todos os Adversários (${rivaisOrdenados.length})</option>` +
        rivaisOrdenados.map(([norm, label]) => `<option value="${norm}">${label}</option>`).join('');

    if (rivaisMap.has(valorAtual)) {
        sel.value = valorAtual;
    } else {
        sel.value = 'todos';
    }
}

function selecionarAdversarioH2H(event, nomeVisitante) {
    if (event) event.stopPropagation();
    const sel = document.getElementById('adversario-filter');
    if (!sel) return;

    const norm = normalizarNomeRival(nomeVisitante);
    sel.value = (sel.value === norm) ? 'todos' : norm;
    filtrarJogos();
}

function limparFiltroH2H() {
    const selAdv = document.getElementById('adversario-filter');
    const selMes = document.getElementById('month-filter');
    if (selAdv) selAdv.value = 'todos';
    if (selMes) selMes.value = 'todos';
    filtrarJogos();
}

function renderizarCardH2H(rivalNorm, jogosFiltrados) {
    const container = document.getElementById('h2h-summary-container');
    if (!container) return;

    if (!rivalNorm || rivalNorm === 'todos') {
        container.innerHTML = '';
        return;
    }

    const finalizados = jogosFiltrados.filter(j => j.status === 'finished');
    const nomeExibicao = jogosFiltrados[0]?.visitante || rivalNorm;

    let v = 0, e = 0, d = 0, gp = 0, gc = 0;
    const artilhariaRival = {};

    finalizados.forEach(j => {
        if (j.resultado_tipo === 'vitoria') v++;
        else if (j.resultado_tipo === 'empate') e++;
        else if (j.resultado_tipo === 'derrota') d++;

        gp += (j.placar_mandante || 0);
        gc += (j.placar_visitante || 0);

        if (j.gols_detalhes) {
            j.gols_detalhes.forEach(g => {
                artilhariaRival[g.nome] = (artilhariaRival[g.nome] || 0) + g.qtd;
            });
        }
    });

    const total = finalizados.length;
    const aprov = total > 0 ? (((v * 3) + e) / (total * 3) * 100).toFixed(0) : 0;
    const sg = gp - gc;

    const topArtilheiro = Object.entries(artilhariaRival).sort((a, b) => b[1] - a[1])[0];
    const carrascoTxt = topArtilheiro
        ? `⚽ Carrasco: <strong>${topArtilheiro[0]} (${topArtilheiro[1]})</strong>`
        : `<span>Sem gols registrados</span>`;

    container.innerHTML = `
        <div class="h2h-card">
            <div class="h2h-header">
                <div class="h2h-title">
                    <small>Confronto Direto • ${total} ${total === 1 ? 'jogo' : 'jogos'}</small>
                    <strong>PONTUAL FC x ${nomeExibicao}</strong>
                </div>
                <button type="button" class="btn-clear-h2h" onclick="limparFiltroH2H()">Limpar</button>
            </div>

            <div class="h2h-record-row">
                <div class="h2h-pill">
                    <small>Vitórias</small>
                    <span style="color:var(--win);">${v}</span>
                </div>
                <div class="h2h-pill">
                    <small>Empates</small>
                    <span style="color:var(--draw);">${e}</span>
                </div>
                <div class="h2h-pill">
                    <small>Derrotas</small>
                    <span style="color:var(--loss);">${d}</span>
                </div>
                <div class="h2h-pill">
                    <small>Aprov.</small>
                    <span style="color:var(--accent);">${aprov}%</span>
                </div>
            </div>

            <div class="h2h-goals-footer">
                <span>Gols: <strong>${gp} GP</strong> • <strong>${gc} GC</strong> (Saldo ${sg >= 0 ? '+' + sg : sg})</span>
                <span>${carrascoTxt}</span>
            </div>
        </div>
    `;
}

function renderListaJogos(filtroMes = 'todos', filtroAdversario = 'todos') {
    const container = document.getElementById('lista-jogos-cards');
    container.innerHTML = '';

    const jogosArray = Object.keys(todosJogos)
        .map(key => ({ id: key, ...todosJogos[key] }))
        .sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

    const jogosFiltrados = jogosArray.filter(j => {
        const passaMes = filtroMes === 'todos' || j.data.split('/')[1] === filtroMes;
        const passaRival = filtroAdversario === 'todos' || normalizarNomeRival(j.visitante) === filtroAdversario;
        return passaMes && passaRival;
    });

    renderizarCardH2H(filtroAdversario, jogosFiltrados);

    if (jogosFiltrados.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>Nenhum jogo encontrado com os filtros selecionados.</p></div>`;
        return;
    }

    jogosFiltrados.forEach(j => {
        const isFinished = j.status === 'finished';
        const classeStatus = isFinished ? (j.resultado_tipo || '') : 'upcoming';

        const golsOrdenados = (j.gols_detalhes && j.gols_detalhes.length > 0)
            ? [...j.gols_detalhes].sort((a, b) => b.qtd - a.qtd)
            : [];

        const listGols = golsOrdenados.length > 0
            ? golsOrdenados.map(g => `<li><span>${g.nome}</span><strong>${g.qtd} ${g.qtd > 1 ? 'gols' : 'gol'}</strong></li>`).join('')
            : `<li class="empty-item">Nenhum gol registrado</li>`;

        const assistOrdenadas = (j.assist_detalhes && j.assist_detalhes.length > 0)
            ? [...j.assist_detalhes].sort((a, b) => b.qtd - a.qtd)
            : [];

        const temAssistencias = assistOrdenadas.length > 0;
        const listAst = temAssistencias
            ? assistOrdenadas.map(a => `<li><span>${a.nome}</span><strong>${a.qtd} ${a.qtd > 1 ? 'asts' : 'ast'}</strong></li>`).join('')
            : `<li class="empty-item">Nenhuma assistência</li>`;

        let mvpNome = "Não computado";
        if (isFinished && j.votos_melhor && j.votos_melhor.length > 0) {
            const maxV = Math.max(...j.votos_melhor.map(x => x.qtd));
            const vencedores = j.votos_melhor.filter(x => x.qtd === maxV).map(x => x.nome).join(' / ');
            mvpNome = `${vencedores} (${maxV} votos)`;
        }

        const listPresencas = (j.presencas && j.presencas.length > 0)
            ? [...j.presencas].sort().map(p => `<span class="player-tag clickable-player" onclick="abrirFichaJogador('${p.replace(/'/g, "\\'")}')">${p}</span>`).join('')
            : `<span class="empty-item">Sem lista de presença</span>`;

        const rivalEscapado = (j.visitante || '').replace(/'/g, "\\'");

        container.innerHTML += `
            <div class="game-card-match ${classeStatus}">
                <div class="match-card-header" onclick="toggleDetails('${j.id}')">
                    <div class="match-meta">
                        <span class="round-badge">${j.rodada || 'Amistoso'}</span>
                        <span class="date-badge"><i class="fa-regular fa-calendar"></i> ${j.data} ${j.dia_semana ? '• ' + j.dia_semana : ''}</span>
                    </div>

                    <div class="scoreboard-row">
                        <div class="team-name home">${j.mandante}</div>
                        <div class="score-display ${isFinished ? 'finished' : 'upcoming'}">
                            ${isFinished ? `<span>${j.placar_mandante}</span><small>x</small><span>${j.placar_visitante}</span>` : 'VS'}
                        </div>
                        <div class="team-name away clickable-rival" title="Filtrar confrontos contra ${j.visitante}" onclick="selecionarAdversarioH2H(event, '${rivalEscapado}')">${j.visitante}</div>
                    </div>

                    <div class="expand-indicator">
                        <i class="fa-solid fa-chevron-down" id="arrow-${j.id}"></i>
                    </div>
                </div>

                <div class="match-details-panel" id="detalhe-${j.id}">
                    <div class="detail-tabs">
                        <button class="pill-btn active" onclick="switchMatchSubtab(event, '${j.id}', 'gols')">⚽ Gols</button>
                        ${temAssistencias ? `<button class="pill-btn" onclick="switchMatchSubtab(event, '${j.id}', 'ast')">👟 Ast</button>` : ''}
                        <button class="pill-btn" onclick="switchMatchSubtab(event, '${j.id}', 'mvp')">🏆 MVP</button>
                        <button class="pill-btn" onclick="switchMatchSubtab(event, '${j.id}', 'pres')">📋 Presenças</button>
                    </div>

                    <div class="subtab-content active" id="subtab-${j.id}-gols">
                        <ul class="scout-list">${listGols}</ul>
                    </div>

                    ${temAssistencias ? `
                    <div class="subtab-content" id="subtab-${j.id}-ast">
                        <ul class="scout-list">${listAst}</ul>
                    </div>` : ''}

                    <div class="subtab-content" id="subtab-${j.id}-mvp">
                        <div class="mvp-highlight">
                            <i class="fa-solid fa-trophy"></i>
                            <div>
                                <small>Melhor em Campo</small>
                                <strong>${mvpNome}</strong>
                            </div>
                        </div>
                    </div>

                    <div class="subtab-content" id="subtab-${j.id}-pres">
                        <div class="presence-chips-container">${listPresencas}</div>
                    </div>

                    ${isFinished ? `
                    <button type="button" class="btn-share-match" onclick="compartilharResumoJogo(event, '${j.id}')">
                        <i class="fa-brands fa-whatsapp"></i> Copiar Resumo Pós-Jogo
                    </button>` : ''}
                </div>
            </div>
        `;
    });
}

function toggleDetails(id) {
    const panel = document.getElementById(`detalhe-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    const isOpened = panel.classList.contains('opened');

    if (isOpened) {
        panel.classList.remove('opened');
        arrow.style.transform = 'rotate(0deg)';
    } else {
        panel.classList.add('opened');
        arrow.style.transform = 'rotate(180deg)';
    }
}

function switchMatchSubtab(event, gameId, tabType) {
    event.stopPropagation();
    const parentPanel = document.getElementById(`detalhe-${gameId}`);

    parentPanel.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    parentPanel.querySelectorAll('.subtab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`subtab-${gameId}-${tabType}`).classList.add('active');
}

function filtrarJogos() {
    const mes = document.getElementById('month-filter')?.value || 'todos';
    const adv = document.getElementById('adversario-filter')?.value || 'todos';
    renderListaJogos(mes, adv);
}

async function compartilharResumoJogo(event, gameId) {
    event.stopPropagation();
    const j = todosJogos[gameId];
    if (!j) return;

    const golsTxt = (j.gols_detalhes && j.gols_detalhes.length > 0)
        ? [...j.gols_detalhes].sort((a, b) => b.qtd - a.qtd).map(g => `⚽ ${g.nome} (${g.qtd})`).join('\n')
        : 'Nenhum gol registrado';

    let mvpTxt = 'Não computado';
    if (j.votos_melhor && j.votos_melhor.length > 0) {
        const maxV = Math.max(...j.votos_melhor.map(x => x.qtd));
        const vencedores = j.votos_melhor.filter(x => x.qtd === maxV).map(x => x.nome).join(' / ');
        mvpTxt = `${vencedores} (${maxV} votos)`;
    }

    const texto = [
        `📊 *RESUMO - ${(j.rodada || 'JOGO').toUpperCase()}* (${j.data})`,
        `⚽ *${j.mandante} ${j.placar_mandante} x ${j.placar_visitante} ${j.visitante}*`,
        ``,
        `*Gols:*`,
        golsTxt,
        ``,
        `🏆 *MVP:* ${mvpTxt}`
    ].join('\n');

    try {
        await navigator.clipboard.writeText(texto);
        mostrarToast("Resumo copiado! Cole no WhatsApp.");
    } catch (e) {
        alert(texto);
    }
}

// --- AGENDAMENTO ---
function preencherSelectsJogos() {
    const selectAgendar = document.getElementById('select-jogos');
    const selectScout = document.getElementById('sel-jogo');

    selectAgendar.innerHTML = '<option value="">-- NOVO CADASTRO --</option>';
    selectScout.innerHTML = '<option value="">-- Selecione um jogo --</option>';

    Object.keys(todosJogos)
        .sort((a, b) => new Date(todosJogos[b].data.split('/').reverse().join('-')) - new Date(todosJogos[a].data.split('/').reverse().join('-')))
        .forEach(key => {
            const j = todosJogos[key];
            const opt = `<option value="${key}">${j.data} vs ${j.visitante}</option>`;
            selectAgendar.innerHTML += opt;
            selectScout.innerHTML += opt;
        });
}

function gerarRodadaAutomatica() {
    if (editKey && document.getElementById('rodada').value !== "") return;
    const dataVal = document.getElementById('data').value;
    if (!dataVal) return;

    const anoData = dataVal.split('-')[0];
    if (anoData !== temporadaAtual) {
        document.getElementById('rodada').value = `1º Jogo da Temporada`;
        return;
    }

    const dataTime = new Date(dataVal).getTime();
    let c = 1;
    Object.values(todosJogos).forEach(j => {
        if (new Date(j.data.split('/').reverse().join('-')).getTime() < dataTime) c++;
    });
    document.getElementById('rodada').value = `${c}º Jogo da Temporada`;
}

function carregarDadosJogo(key) {
    if (!key) { resetForm(); return; }
    editKey = key;
    const j = todosJogos[key];
    const partes = j.data.split('/');
    document.getElementById('data').value = `${partes[2]}-${partes[1]}-${partes[0]}`;
    document.getElementById('visitante').value = j.visitante;
    document.getElementById('rodada').value = j.rodada;
    document.getElementById('btnExcluir').style.display = "block";
}

function resetForm() {
    editKey = null;
    document.getElementById('data').value = "";
    document.getElementById('visitante').value = "";
    document.getElementById('rodada').value = "";
    document.getElementById('select-jogos').value = "";
    document.getElementById('btnExcluir').style.display = "none";
}

async function salvarNoBanco() {
    const dataVal = document.getElementById('data').value;
    const visitanteVal = document.getElementById('visitante').value;
    if (!dataVal || !visitanteVal) { mostrarToast("Preencha Data e Visitante!"); return; }

    const anoDestino = dataVal.split('-')[0];
    const payload = {
        data: dataVal.split('-').reverse().join('/'),
        visitante: visitanteVal.toUpperCase(),
        rodada: document.getElementById('rodada').value || "Amistoso",
        mandante: "PONTUAL FC",
        status: editKey ? todosJogos[editKey].status : "upcoming",
        hora: "21:00",
        local: "Balduíno Soccer Indoor"
    };

    const url = editKey ? `${getSeasonUrl(anoDestino)}/${editKey}.json` : `${getSeasonUrl(anoDestino)}.json`;
    await fetch(url, { method: editKey ? 'PATCH' : 'POST', body: JSON.stringify(payload) });

    if (anoDestino !== temporadaAtual) {
        temporadaAtual = anoDestino;
        inicializarSeletorTemporada();
    }

    mostrarToast(`Salvo na Temporada ${anoDestino}!`);
    resetForm();
    carregarTudo();
}

async function excluirJogo() {
    if (!editKey || !confirm("Excluir esta partida?")) return;
    await fetch(`${getSeasonUrl()}/${editKey}.json`, { method: 'DELETE' });
    mostrarToast("Partida removida!");
    resetForm();
    carregarTudo();
}

// --- SCOUT & LANÇAMENTO MANUAL ---
function renderizarTabelaScout() {
    document.getElementById('elenco').innerHTML = listaJogadores.map(n => `
        <tr>
            <td><input type="checkbox" class="pre" data-n="${n}"></td>
            <td style="text-align:left;"><strong>${n}</strong></td>
            <td><input type="number" class="gol" data-n="${n}" value="0"></td>
            <td><input type="number" class="ast" data-n="${n}" value="0"></td>
            <td><input type="number" class="voto" data-n="${n}" value="0"></td>
        </tr>
    `).join('');
}

function puxarDadosExistentes(key) {
    if (!key || !todosJogos[key]) return;
    const j = todosJogos[key];

    document.getElementById('gp').value = j.placar_mandante || 0;
    document.getElementById('gc').value = j.placar_visitante || 0;
    document.getElementById('status-jogo').value = j.resultado_tipo || "vitoria";

    document.querySelectorAll('.pre').forEach(cb => cb.checked = false);
    document.querySelectorAll('.gol, .ast, .voto').forEach(inp => inp.value = 0);

    if (j.presencas) j.presencas.forEach(n => {
        const cb = document.querySelector(`.pre[data-n="${n}"]`);
        if (cb) cb.checked = true;
    });

    const preencher = (lista, classe) => {
        if (lista) lista.forEach(i => {
            const inp = document.querySelector(`.${classe}[data-n="${i.nome}"]`);
            if (inp) inp.value = i.qtd;
        });
    };

    preencher(j.gols_detalhes, 'gol');
    preencher(j.assist_detalhes, 'ast');
    preencher(j.votos_melhor, 'voto');
}

function adicionarJogador() {
    const input = document.getElementById('novo-jogador-nome');
    const nome = input.value.trim().toUpperCase();
    if (nome && !listaJogadores.includes(nome)) {
        listaJogadores.push(nome);
        listaJogadores.sort();
        renderizarTabelaScout();
        input.value = "";
    }
}

async function salvarResultado() {
    const gameKey = document.getElementById('sel-jogo').value;
    if (!gameKey) { mostrarToast("Selecione um jogo!"); return; }

    const pres = [], gols = [], asts = [], votos = [];

    listaJogadores.forEach(n => {
        if (document.querySelector(`.pre[data-n="${n}"]`)?.checked) pres.push(n);
        let g = parseInt(document.querySelector(`.gol[data-n="${n}"]`)?.value) || 0;
        let a = parseInt(document.querySelector(`.ast[data-n="${n}"]`)?.value) || 0;
        let v = parseInt(document.querySelector(`.voto[data-n="${n}"]`)?.value) || 0;

        if (g > 0) gols.push({ nome: n, qtd: g });
        if (a > 0) asts.push({ nome: n, qtd: a });
        if (v > 0) votos.push({ nome: n, qtd: v });
    });

    const dadosAtualizados = {
        placar_mandante: parseInt(document.getElementById('gp').value) || 0,
        placar_visitante: parseInt(document.getElementById('gc').value) || 0,
        status: "finished",
        resultado_tipo: document.getElementById('status-jogo').value,
        presencas: pres,
        gols_detalhes: gols,
        assist_detalhes: asts,
        votos_melhor: votos
    };

    await fetch(`${getSeasonUrl()}/${gameKey}.json`, { method: 'PATCH', body: JSON.stringify(dadosAtualizados) });
    mostrarToast("Resultado e Scout salvos!");
    carregarTudo();
}

// ============================================================================
// FICHA INDIVIDUAL DO JOGADOR
// ============================================================================
function abrirFichaJogador(nomeJogador) {
    // Fecha o modal de ranking completo caso esteja aberto por baixo
    fecharModalRanking(null, true);

    const jogosFinalizados = Object.values(todosJogos)
        .filter(j => j.status === 'finished')
        .sort((a, b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

    const totalJogosTime = jogosFinalizados.length;
    let jogosPresente = 0;
    let vitoriasComEle = 0;
    let empatesComEle = 0;
    let derrotasComEle = 0;
    let golsTotal = 0;
    let astTotal = 0;
    let votosTotal = 0;
    let mvpsTotal = 0;
    const ultimosJogosJogador = [];

    jogosFinalizados.forEach(j => {
        const presente = Array.isArray(j.presencas) && j.presencas.includes(nomeJogador);

        const golObj = (j.gols_detalhes || []).find(g => g.nome === nomeJogador);
        const golsJogo = golObj ? golObj.qtd : 0;
        golsTotal += golsJogo;

        const astObj = (j.assist_detalhes || []).find(a => a.nome === nomeJogador);
        const astJogo = astObj ? astObj.qtd : 0;
        astTotal += astJogo;

        let votosJogo = 0;
        let foiMvpJogo = false;
        if (j.votos_melhor && j.votos_melhor.length > 0) {
            const votoObj = j.votos_melhor.find(v => v.nome === nomeJogador);
            votosJogo = votoObj ? votoObj.qtd : 0;
            votosTotal += votosJogo;

            const maxVotos = Math.max(...j.votos_melhor.map(x => x.qtd));
            if (maxVotos > 0 && votosJogo === maxVotos) {
                foiMvpJogo = true;
                mvpsTotal++;
            }
        }

        if (presente) {
            jogosPresente++;
            if (j.resultado_tipo === 'vitoria') vitoriasComEle++;
            else if (j.resultado_tipo === 'empate') empatesComEle++;
            else if (j.resultado_tipo === 'derrota') derrotasComEle++;

            if (ultimosJogosJogador.length < 5) {
                ultimosJogosJogador.push({
                    data: j.data.slice(0, 5),
                    visitante: j.visitante,
                    placar: `${j.placar_mandante}x${j.placar_visitante}`,
                    resultado: j.resultado_tipo,
                    gols: golsJogo,
                    mvp: foiMvpJogo
                });
            }
        }
    });

    // Cálculos proporcionais
    const assiduidade = totalJogosTime > 0 ? Math.round((jogosPresente / totalJogosTime) * 100) : 0;
    const mediaGols = jogosPresente > 0 ? (golsTotal / jogosPresente).toFixed(2) : "0.00";
    const mediaAst = jogosPresente > 0 ? (astTotal / jogosPresente).toFixed(2) : "0.00";
    const mediaVotos = jogosPresente > 0 ? (votosTotal / jogosPresente).toFixed(1) : "0.0";

    const ptsDisputados = jogosPresente * 3;
    const ptsConquistados = (vitoriasComEle * 3) + empatesComEle;
    const aproveitamento = ptsDisputados > 0 ? ((ptsConquistados / ptsDisputados) * 100).toFixed(1) : "0.0";

    const pWin = jogosPresente > 0 ? (vitoriasComEle / jogosPresente) * 100 : 0;
    const pDraw = jogosPresente > 0 ? (empatesComEle / jogosPresente) * 100 : 0;
    const pLoss = jogosPresente > 0 ? (derrotasComEle / jogosPresente) * 100 : 0;

    // Cabeçalho da ficha
    const iniciais = nomeJogador.split(' ').map(p => p[0]).join('').slice(0, 2);
    document.getElementById('player-sheet-avatar').innerText = iniciais;
    document.getElementById('player-sheet-nome').innerText = nomeJogador;
    document.getElementById('player-sheet-sub').innerText = `Temporada ${temporadaAtual} • ${jogosPresente} de ${totalJogosTime} jogos (${assiduidade}%)`;

    // Corpo da ficha
    const temAssistNaTemporada = assistenciasCompleta.length > 0 || astTotal > 0;

    const htmlRecentes = ultimosJogosJogador.length > 0
        ? ultimosJogosJogador.map(u => `
            <li>
                <div>
                    <span class="pr-result-tag ${u.resultado}">${u.placar}</span>
                    <strong style="margin-left:6px; color:var(--text-main);">vs ${u.visitante}</strong>
                    <small style="color:var(--text-muted); margin-left:4px;">(${u.data})</small>
                </div>
                <div>
                    ${u.gols > 0 ? `<span style="color:var(--accent); font-weight:700; margin-right:6px;">⚽ ${u.gols}</span>` : ''}
                    ${u.mvp ? `<span title="MVP da Partida">🏆</span>` : ''}
                </div>
            </li>
        `).join('')
        : `<li style="color:var(--text-muted); justify-content:center;">Nenhuma partida disputada nesta temporada.</li>`;

    document.getElementById('player-sheet-body').innerHTML = `
        <div class="player-stats-grid">
            <div class="p-stat-box">
                <small>⚽ Gols Marcados</small>
                <strong>${golsTotal}</strong>
                <span>Média ${mediaGols} / jogo</span>
            </div>
            <div class="p-stat-box">
                <small>🏆 Votos / Prêmios</small>
                <strong>${votosTotal}</strong>
                <span>${mvpsTotal > 0 ? `${mvpsTotal}x MVP • ` : ''}${mediaVotos} votos/jogo</span>
            </div>
            <div class="p-stat-box">
                <small>📋 Assiduidade</small>
                <strong>${assiduidade}%</strong>
                <span>${jogosPresente} de ${totalJogosTime} partidas</span>
            </div>
            ${temAssistNaTemporada ? `
            <div class="p-stat-box">
                <small>👟 Assistências</small>
                <strong>${astTotal}</strong>
                <span>Média ${mediaAst} / jogo</span>
            </div>` : `
            <div class="p-stat-box">
                <small>🔥 Participação</small>
                <strong>${jogosPresente > 0 ? Math.round((golsTotal / (jogosPresente || 1)) * 100) / 100 : 0}</strong>
                <span>Gols por presença</span>
            </div>`}
        </div>

        <div class="player-winrate-card">
            <div class="pw-header">
                <small>Aproveitamento do Time com ${nomeJogador}</small>
                <strong>${aproveitamento}%</strong>
            </div>
            <div class="pw-bar">
                <div class="pw-seg-win" style="width:${pWin}%"></div>
                <div class="pw-seg-draw" style="width:${pDraw}%"></div>
                <div class="pw-seg-loss" style="width:${pLoss}%"></div>
            </div>
            <div class="pw-legend">
                <span style="color:var(--win);">${vitoriasComEle} Vitórias</span>
                <span style="color:var(--draw);">${empatesComEle} Empates</span>
                <span style="color:var(--loss);">${derrotasComEle} Derrotas</span>
            </div>
        </div>

        <div class="section-title" style="margin-top: 8px;">Últimas Partidas em Campo</div>
        <ul class="player-recent-list">
            ${htmlRecentes}
        </ul>
    `;

    document.getElementById('modal-player-sheet').classList.add('active');
}

function fecharFichaJogador(event, forcar = false) {
    if (forcar || (event && event.target.id === 'modal-player-sheet')) {
        document.getElementById('modal-player-sheet').classList.remove('active');
    }
}

// ============================================================================
// MÓDULO DE IMPORTAÇÃO WHATSAPP + VALIDAÇÃO
// ============================================================================

let validacaoState = {
    votosPontual: 0,
    jogadores: []
};

const ALIAS_JOGADORES = {
    "DENIS": "DENIS",
    "DENNIS": "DENIS",
    "BRAUN": "DENIS",
    "ANTONIO": "ANTONIO",
    "ROGERIO": "ROGERIO",
    "ROGERIO BARON": "ROGERIO",
    "RANIERI": "RANIERI",
    "RANI": "RANIERI",
    "GUILHERME": "GUILHERME",
    "GUI": "GUILHERME",
    "RAFA": "RAFA GOLEIRO",
    "RAFAEL": "RAFA GOLEIRO",
    "RAFA GOLEIRO": "RAFA GOLEIRO",
    "MATHEUS GUSTAVO": "M. GUSTAVO",
    "M GUSTAVO": "M. GUSTAVO",
    "M. GUSTAVO": "M. GUSTAVO",
    "SAYMON": "SAYMONN",
    "SAYMONN": "SAYMONN",
    "DEIVID": "DEIVID",
    "DAVID": "DEIVID",
    "ISMAEL": "ISMAEL",
    "MAEL": "ISMAEL",
    "DIEGO": "DIEGO",
    "DIEGOL": "DIEGO",
    "JAIR": "JAIR",
    "LUIZ": "LUIZ",
    "LUIS": "LUIZ",
    "VAGNER": "VAGNER",
    "WAGNER": "VAGNER",
    "AUGUSTO": "AUGUSTO",
    "AUGUSTO VIEIRA": "AUGUSTO",
    "BELMIRO": "BELMIRO",
    "CELSO": "CELSO",
    "CLESIO": "CLESIO",
    "GUIMA": "GUIMA",
    "MARCIO": "MARCIO",
    "IPE": "IPE",
    "IURI": "IURI",
    "YURI": "IURI",
    "LEO": "LEO",
    "MICHEL": "MICHEL",
    "RAMONES": "RAMONES",
    "VINI": "VINI",
    "VINICIUS": "VINI",
    "PILHINHA": "PILHINHA",
    "GUSTAVO": "GUSTAVO"
};

async function colarClipboard(targetId) {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            document.getElementById(targetId).value = text;
            mostrarToast("Texto colado da área de transferência!");
        } else {
            mostrarToast("Área de transferência vazia.");
        }
    } catch (e) {
        mostrarToast("Segure o dedo no campo e toque em Colar.");
    }
}

function normalizarTextoBase(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, "")
        .trim()
        .toUpperCase();
}

function resolverNomeJogador(rawName) {
    let limpo = normalizarTextoBase(rawName)
        .replace(/^[\d]+\s*[\-.\)\/]+\s*/, "") // remove "1-", "8 - ", "12- "
        .replace(/\(.*?\)/g, "")               // remove observações entre parênteses
        .replace(/[^A-Z0-9.\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!limpo) return null;
    if (ALIAS_JOGADORES[limpo]) return ALIAS_JOGADORES[limpo];

    const primeiroNome = limpo.split(" ")[0];
    if (ALIAS_JOGADORES[primeiroNome]) return ALIAS_JOGADORES[primeiroNome];

    return limpo;
}

function processarMensagensWhatsApp() {
    const txtPresenca = document.getElementById('wpp-presenca').value.trim();
    const txtScout = document.getElementById('wpp-scout').value.trim();

    if (!txtPresenca && !txtScout) {
        mostrarToast("Cole pelo menos uma das mensagens do WhatsApp!");
        return;
    }

    const textoCompleto = `${txtPresenca}\n${txtScout}`;

    // 1. Extrair Data (DD/MM/YYYY ou DD/MM)
    let dataISO = new Date().toISOString().split('T')[0];
    const matchData = textoCompleto.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (matchData) {
        const dia = matchData[1].padStart(2, '0');
        const mes = matchData[2].padStart(2, '0');
        let ano = matchData[3] || temporadaAtual;
        if (ano.length === 2) ano = "20" + ano;
        dataISO = `${ano}-${mes}-${dia}`;
    }

    // 2. Extrair número da rodada se vier no título ("CONFIRMAÇÕES 40ª PARTIDA")
    let rodadaTexto = "";
    const matchRodada = normalizarTextoBase(textoCompleto).match(/(\d+)[ªº]?\s*PARTIDA/);
    if (matchRodada) {
        rodadaTexto = `${parseInt(matchRodada[1], 10)}º Jogo da Temporada`;
    }

    // 3. Extrair Placar e Adversário ("Pontual 9 X 3 Barcelona" ou "Pontual X Barcelona")
    let gp = 0, gc = 0, visitante = "";
    const linhasTodas = textoCompleto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (const linha of linhasTodas) {
        const lNorm = normalizarTextoBase(linha);
        const mPlacar1 = lNorm.match(/PONTUAL(?:\s+FC)?\s*(\d+)\s*[X×]\s*(\d+)\s*(.+)/);
        const mPlacar2 = lNorm.match(/(.+?)\s*(\d+)\s*[X×]\s*(\d+)\s*PONTUAL(?:\s+FC)?/);
        const mConfronto = lNorm.match(/PONTUAL(?:\s+FC)?\s*[X×]\s*(.+)/);

        if (mPlacar1) {
            gp = parseInt(mPlacar1[1], 10);
            gc = parseInt(mPlacar1[2], 10);
            visitante = mPlacar1[3].replace(/[^A-Z0-9\s]/g, "").trim();
            break;
        } else if (mPlacar2) {
            visitante = mPlacar2[1].replace(/[^A-Z0-9\s]/g, "").trim();
            gc = parseInt(mPlacar2[2], 10);
            gp = parseInt(mPlacar2[3], 10);
            break;
        } else if (mConfronto && !visitante) {
            visitante = mConfronto[1].replace(/[^A-Z0-9\s]/g, "").trim();
        }
    }

    // 4. Extrair Presentes da Lista de Confirmação (Goleiros + Linha + Treinador, parando em Ausentes)
    const presentesSet = new Set();
    let lendoPresentes = false;

    txtPresenca.split(/\r?\n/).forEach(linha => {
        const lNorm = normalizarTextoBase(linha);
        if (!lNorm) return;

        // Seções válidas de presença
        if (/^(CONFIRMADOS|GOLEIROS?|LINHA|TREINADOR(ES)?)\b/.test(lNorm)) {
            lendoPresentes = true;
            return;
        }

        // Encerra leitura ao chegar em Ausentes / Espera / Fora
        if (/^(AUSENTES?|ESPERA|FORA|SUPLENTES?|DESIST)\b/.test(lNorm)) {
            lendoPresentes = false;
            return;
        }

        if (!lendoPresentes) return;

        // Ignora linhas numeradas vazias como "12- " ou "12 -"
        if (/^\d+\s*[\-.\)\/]?\s*$/.test(lNorm)) return;

        const nomeResolvido = resolverNomeJogador(linha);
        if (nomeResolvido && nomeResolvido.length >= 2 && nomeResolvido !== "PONTUAL") {
            presentesSet.add(nomeResolvido);
        }
    });

    // 5. Extrair Votos e Gols da Lista 2
    // Padrão: Placar no topo -> Votos (um por linha) -> Seção "Gols:" -> Gols com variações (2X), (2x), 2X, 2 ou repetido
    const golsMap = {};
    const votosMap = {};
    let votosPontual = 0;
    let modoAtual = "votos"; // Após o placar, assume votos até encontrar "Gols:"

    txtScout.split(/\r?\n/).forEach(linha => {
        const lNorm = normalizarTextoBase(linha);
        if (!lNorm) return;

        // Ignora a linha do placar ("PONTUAL 9 X 3 BARCELONA")
        if (/PONTUAL(?:\s+FC)?\s*\d+\s*[X×]\s*\d+/.test(lNorm)) return;

        // Detecta cabeçalho de Gols ou Votos/MVP
        if (/^(GOLS?|ARTILHARIA)\b/.test(lNorm)) {
            modoAtual = "gols";
            return;
        }
        if (/^(VOTOS?|MVP|MELHOR|CRAQUE)\b/.test(lNorm)) {
            modoAtual = "votos";
            return;
        }

        // Captura variações: "DIEGO (2X)", "JAIR 3X", "DIEGO 2", "BRAUN"
        const matchQtd = lNorm.match(/^(.+?)(?:[\s\-:]+|\s*\()(\d+)\s*X?\)?$/i);
        let nomeBruto = matchQtd ? matchQtd[1] : lNorm;
        let qtd = matchQtd ? parseInt(matchQtd[2], 10) : 1;

        nomeBruto = nomeBruto.replace(/^[\d]+\s*[\-.\)\/]+\s*/, "").trim();
        if (!nomeBruto) return;

        if (modoAtual === "gols") {
            if (/(CONTRA|GC)/.test(nomeBruto)) return;
            const jogador = resolverNomeJogador(nomeBruto);
            if (jogador && jogador !== "PONTUAL") {
                golsMap[jogador] = (golsMap[jogador] || 0) + qtd;
                presentesSet.add(jogador);
            }
        } else {
            if (/(BRANCO|NULO|NINGUEM)/.test(nomeBruto)) return;
            if (/^PONTUAL(\s+FC)?$/.test(nomeBruto)) {
                votosPontual += qtd;
                return;
            }
            const jogador = resolverNomeJogador(nomeBruto);
            if (jogador) {
                votosMap[jogador] = (votosMap[jogador] || 0) + qtd;
            }
        }
    });

    // 6. Consolidar Jogadores e distribuir +1 por voto "Pontual" aos presentes
    const todosNomes = new Set([...listaPadrao, ...presentesSet, ...Object.keys(golsMap), ...Object.keys(votosMap)]);
    const jogadoresOrdenados = Array.from(todosNomes).sort();

    validacaoState.votosPontual = votosPontual;
    validacaoState.jogadores = jogadoresOrdenados.map(nome => {
        const isPresente = presentesSet.has(nome);
        const votosIndividuais = votosMap[nome] || 0;
        const votosTotais = isPresente ? (votosIndividuais + votosPontual) : votosIndividuais;

        return {
            nome,
            presente: isPresente,
            gols: golsMap[nome] || 0,
            ast: 0,
            votos: votosTotais,
            extra: !listaPadrao.includes(nome)
        };
    });

    // 7. Preencher Tela de Validação
    document.getElementById('val-data').value = dataISO;
    document.getElementById('val-visitante').value = visitante;
    document.getElementById('val-gp').value = gp;
    document.getElementById('val-gc').value = gc;

    const diasSemana = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
    const dtObj = new Date(`${dataISO}T12:00:00`);
    document.getElementById('val-dia').value = diasSemana[dtObj.getDay()] || "QUI";

    if (rodadaTexto) {
        document.getElementById('val-rodada').value = rodadaTexto;
    } else {
        atualizarRodadaValidacao();
    }

    atualizarResultadoValidacao();
    verificarPartidaExistenteNaData(dataISO.split('-').reverse().join('/'));
    renderizarTelaValidacao();

    document.getElementById('wpp-step-input').style.display = 'none';
    document.getElementById('wpp-step-validate').style.display = 'block';
    document.querySelector('.app-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function atualizarRodadaValidacao() {
    const dataVal = document.getElementById('val-data').value;
    if (!dataVal) return;

    const anoData = dataVal.split('-')[0];
    if (anoData !== temporadaAtual) {
        document.getElementById('val-rodada').value = `1º Jogo da Temporada`;
        return;
    }

    const dataTime = new Date(dataVal).getTime();
    let c = 1;
    Object.values(todosJogos).forEach(j => {
        if (new Date(j.data.split('/').reverse().join('-')).getTime() < dataTime) c++;
    });
    document.getElementById('val-rodada').value = `${c}º Jogo da Temporada`;
}

function atualizarResultadoValidacao() {
    const gp = parseInt(document.getElementById('val-gp').value, 10) || 0;
    const gc = parseInt(document.getElementById('val-gc').value, 10) || 0;
    const sel = document.getElementById('val-resultado');

    if (gp > gc) sel.value = "vitoria";
    else if (gp === gc) sel.value = "empate";
    else sel.value = "derrota";

    atualizarAlertasValidacao();
}

function verificarPartidaExistenteNaData(dataBR) {
    const box = document.getElementById('wpp-existing-match-box');
    const sel = document.getElementById('wpp-target-key');
    sel.innerHTML = '<option value="">+ Criar como Nova Partida</option>';

    let encontrou = false;
    Object.entries(todosJogos).forEach(([key, j]) => {
        const isMesmaData = j.data === dataBR;
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `Atualizar: ${j.data} vs ${j.visitante} (${j.status === 'finished' ? 'Finalizado' : 'Agendado'})`;
        if (isMesmaData) {
            opt.selected = true;
            encontrou = true;
        }
        sel.appendChild(opt);
    });

    box.style.display = Object.keys(todosJogos).length > 0 ? 'block' : 'none';
    if (encontrou) {
        mostrarToast("Partida agendada encontrada para esta data!");
    }
}

function atualizarAlertasValidacao() {
    const container = document.getElementById('wpp-alerts-container');
    const alerts = [];

    const gp = parseInt(document.getElementById('val-gp').value, 10) || 0;
    const somaGols = validacaoState.jogadores.reduce((acc, j) => acc + j.gols, 0);

    if (somaGols !== gp) {
        alerts.push(`
            <div class="wpp-alert warning">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Placar do Pontual está <strong>${gp}</strong>, mas a soma dos gols dos jogadores está <strong>${somaGols}</strong>. Verifique antes de salvar.</span>
            </div>
        `);
    }

    const extrasPresentes = validacaoState.jogadores.filter(j => j.extra && j.presente).map(j => j.nome);
    if (extrasPresentes.length > 0) {
        alerts.push(`
            <div class="wpp-alert info">
                <i class="fa-solid fa-user-plus"></i>
                <span>Jogadores convidados/extras detectados: <strong>${extrasPresentes.join(', ')}</strong>. Desmarque caso algum seja erro de digitação.</span>
            </div>
        `);
    }

    container.innerHTML = alerts.join('');
}

function renderizarTelaValidacao() {
    const presentesCount = validacaoState.jogadores.filter(j => j.presente).length;
    document.getElementById('val-count-presentes').innerText = presentesCount;

    const badgePontual = document.getElementById('val-pontual-badge');
    if (validacaoState.votosPontual > 0) {
        badgePontual.style.display = 'inline-block';
        badgePontual.innerText = `+${validacaoState.votosPontual} Pontual incluído`;
    } else {
        badgePontual.style.display = 'none';
    }

    const listaExibicao = validacaoState.jogadores
        .map((j, idx) => ({ ...j, idx }))
        .sort((a, b) => (b.presente - a.presente) || a.nome.localeCompare(b.nome));

    document.getElementById('val-players-list').innerHTML = listaExibicao.map(j => `
        <div class="val-player-card ${j.presente ? 'present' : 'absent'}">
            <div class="val-player-top">
                <label class="val-player-check">
                    <input type="checkbox" ${j.presente ? 'checked' : ''} onchange="togglePresencaValidacao(${j.idx}, this.checked)">
                    <span class="val-player-name">${j.nome}</span>
                </label>
                ${j.extra ? '<span class="tag-extra">EXTRA</span>' : ''}
            </div>
            <div class="val-player-stats">
                <div class="stepper-box">
                    <small>Gols</small>
                    <div class="stepper-controls">
                        <button type="button" onclick="alterarStatValidacao(${j.idx}, 'gols', -1)">-</button>
                        <span>${j.gols}</span>
                        <button type="button" onclick="alterarStatValidacao(${j.idx}, 'gols', 1)">+</button>
                    </div>
                </div>
                <div class="stepper-box">
                    <small>Ast</small>
                    <div class="stepper-controls">
                        <button type="button" onclick="alterarStatValidacao(${j.idx}, 'ast', -1)">-</button>
                        <span>${j.ast}</span>
                        <button type="button" onclick="alterarStatValidacao(${j.idx}, 'ast', 1)">+</button>
                    </div>
                </div>
                <div class="stepper-box">
                    <small>Votos</small>
                    <div class="stepper-controls">
                        <button type="button" onclick="alterarStatValidacao(${j.idx}, 'votos', -1)">-</button>
                        <span>${j.votos}</span>
                        <button type="button" onclick="alterarStatValidacao(${j.idx}, 'votos', 1)">+</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    atualizarAlertasValidacao();
}

function togglePresencaValidacao(idx, marcado) {
    const jogador = validacaoState.jogadores[idx];
    jogador.presente = marcado;

    if (validacaoState.votosPontual > 0) {
        if (marcado) {
            jogador.votos += validacaoState.votosPontual;
        } else {
            jogador.votos = Math.max(0, jogador.votos - validacaoState.votosPontual);
        }
    }
    renderizarTelaValidacao();
}

function alterarStatValidacao(idx, campo, delta) {
    const jogador = validacaoState.jogadores[idx];
    jogador[campo] = Math.max(0, (jogador[campo] || 0) + delta);
    if (delta > 0 && !jogador.presente) {
        jogador.presente = true;
        if (validacaoState.votosPontual > 0 && campo !== 'votos') {
            jogador.votos += validacaoState.votosPontual;
        }
    }
    renderizarTelaValidacao();
}

function adicionarJogadorValidacao() {
    const input = document.getElementById('val-novo-jogador');
    const nome = resolverNomeJogador(input.value);
    if (!nome) return;

    const existente = validacaoState.jogadores.find(j => j.nome === nome);
    if (existente) {
        existente.presente = true;
        mostrarToast(`${nome} já está na lista (marcado como presente).`);
    } else {
        validacaoState.jogadores.push({
            nome,
            presente: true,
            gols: 0,
            ast: 0,
            votos: validacaoState.votosPontual,
            extra: !listaPadrao.includes(nome)
        });
        mostrarToast(`${nome} adicionado!`);
    }
    input.value = "";
    renderizarTelaValidacao();
}

function voltarParaEdicaoTexto() {
    const stepValidate = document.getElementById('wpp-step-validate');
    const stepInput = document.getElementById('wpp-step-input');
    if (stepValidate) stepValidate.style.display = 'none';
    if (stepInput) stepInput.style.display = 'block';
}

function limparImportacao() {
    document.getElementById('wpp-presenca').value = "";
    document.getElementById('wpp-scout').value = "";
}

async function confirmarEnvioImportacao() {
    const dataVal = document.getElementById('val-data').value;
    const visitanteVal = document.getElementById('val-visitante').value.trim();

    if (!dataVal || !visitanteVal) {
        mostrarToast("Preencha a Data e o Adversário!");
        return;
    }

    const btn = document.getElementById('btnConfirmarImportacao');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const presencas = [];
    const golsDetalhes = [];
    const assistDetalhes = [];
    const votosMelhor = [];

    validacaoState.jogadores.forEach(j => {
        if (j.presente) presencas.push(j.nome);
        if (j.gols > 0) golsDetalhes.push({ nome: j.nome, qtd: j.gols });
        if (j.ast > 0) assistDetalhes.push({ nome: j.nome, qtd: j.ast });
        if (j.votos > 0) votosMelhor.push({ nome: j.nome, qtd: j.votos });
    });

    const anoDestino = dataVal.split('-')[0];
    const payload = {
        data: dataVal.split('-').reverse().join('/'),
        dia_semana: (document.getElementById('val-dia').value || "QUI").toUpperCase(),
        hora: "21:00",
        local: "Balduíno Soccer Indoor",
        mandante: "PONTUAL FC",
        visitante: visitanteVal.toUpperCase(),
        rodada: document.getElementById('val-rodada').value || "Amistoso",
        placar_mandante: parseInt(document.getElementById('val-gp').value, 10) || 0,
        placar_visitante: parseInt(document.getElementById('val-gc').value, 10) || 0,
        resultado_tipo: document.getElementById('val-resultado').value,
        status: "finished",
        presencas,
        gols_detalhes: golsDetalhes,
        assist_detalhes: assistDetalhes,
        votos_melhor: votosMelhor
    };

    try {
        const targetKey = document.getElementById('wpp-target-key').value;
        const url = targetKey
            ? `${getSeasonUrl(anoDestino)}/${targetKey}.json`
            : `${getSeasonUrl(anoDestino)}.json`;
        const method = targetKey ? 'PATCH' : 'POST';

        await fetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (anoDestino !== temporadaAtual) {
            temporadaAtual = anoDestino;
            inicializarSeletorTemporada();
        }

        mostrarToast(`Partida salva na Temporada ${anoDestino}!`);
        limparImportacao();
        voltarParaEdicaoTexto();
        await carregarTudo();

        const navInicio = document.querySelector('.bottom-nav .nav-btn');
        switchTab('tab-dashboard', navInicio);
    } catch (err) {
        console.error("Erro ao salvar importação:", err);
        mostrarToast("Erro de conexão ao salvar no Firebase.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Confirmar e Salvar no Firebase';
    }
}

window.onload = () => {
    inicializarSeletorTemporada();
    carregarTudo();
};