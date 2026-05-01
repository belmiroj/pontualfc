const BASE_URL = "https://dashboard-pontualfc-default-rtdb.firebaseio.com/temporada_2026";
const listaPadrao = ["ANTONIO", "AUGUSTO", "BELMIRO", "CELSO", "CLESIO", "DEIVID", "DENIS", "DIEGO", "GUILHERME", "GUIMA", "ISMAEL", "JAIR", "LUIZ", "MARCIO", "RANIERI", "ROGERIO", "SAYMONN", "VAGNER"];

let listaJogadores = [...listaPadrao];
let jogosDB = {};

async function carregarJogos() {
    try {
        const r = await fetch(`${BASE_URL}.json`);
        jogosDB = await r.json();
        const select = document.getElementById('sel-jogo');
        select.innerHTML = '<option value="">-- Selecione um jogo --</option>';
        if (!jogosDB) return;

        Object.keys(jogosDB).forEach(key => {
            const j = jogosDB[key];
            select.innerHTML += `<option value="${key}">${j.data} - vs ${j.visitante}</option>`;
        });
    } catch (e) { console.error(e); }
}

function renderizarTabela() {
    const corpoTabela = document.getElementById('elenco');
    corpoTabela.innerHTML = listaJogadores.map(n => `
        <tr>
            <td><input type="checkbox" class="pre" data-n="${n}"></td>
            <td><strong>${n}</strong></td>
            <td><input type="number" class="gol input-mini" data-n="${n}" value="0"></td>
            <td><input type="number" class="ast input-mini" data-n="${n}" value="0"></td>
            <td><input type="number" class="voto input-mini" data-n="${n}" value="0"></td>
        </tr>
    `).join('');
}

function puxarDadosExistentes(key) {
    if (!key || !jogosDB[key]) { resetarCampos(); return; }
    
    const jogo = jogosDB[key];
    
    // Lógica para mesclar lista padrão com jogadores já cadastrados no jogo
    let nomesNoJogo = new Set([...listaPadrao]);
    
    if (jogo.presencas) jogo.presencas.forEach(n => nomesNoJogo.add(n));
    if (jogo.gols_detalhes) jogo.gols_detalhes.forEach(i => nomesNoJogo.add(i.nome));
    if (jogo.assist_detalhes) jogo.assist_detalhes.forEach(i => nomesNoJogo.add(i.nome));
    if (jogo.votos_melhor) jogo.votos_melhor.forEach(i => nomesNoJogo.add(i.nome));

    listaJogadores = Array.from(nomesNoJogo).sort();
    renderizarTabela();

    // Preencher placar e tipo
    document.getElementById('gp').value = jogo.placar_mandante || 0;
    document.getElementById('gc').value = jogo.placar_visitante || 0;
    document.getElementById('status-jogo').value = jogo.resultado_tipo || "vitoria";

    // Marcar presenças
    if (jogo.presencas) {
        jogo.presencas.forEach(nome => {
            const cb = document.querySelector(`.pre[data-n="${nome}"]`);
            if (cb) cb.checked = true;
        });
    }

    // Preencher números (Gols, Ast, Votos)
    const preencherValores = (lista, classe) => {
        if (lista) {
            lista.forEach(item => {
                const inp = document.querySelector(`.${classe}[data-n="${item.nome}"]`);
                if (inp) inp.value = item.qtd;
            });
        }
    };

    preencherValores(jogo.gols_detalhes, 'gol');
    preencherValores(jogo.assist_detalhes, 'ast');
    preencherValores(jogo.votos_melhor, 'voto');
}

function resetarCampos() {
    document.getElementById('gp').value = 0;
    document.getElementById('gc').value = 0;
    listaJogadores = [...listaPadrao];
    renderizarTabela();
}

function adicionarJogador() {
    const input = document.getElementById('novo-jogador-nome');
    const nome = input.value.trim().toUpperCase();
    if (nome && !listaJogadores.includes(nome)) {
        listaJogadores.push(nome);
        listaJogadores.sort();
        renderizarTabela();
        input.value = "";
    }
}

async function salvarResultado() {
    const gameKey = document.getElementById('sel-jogo').value;
    const btn = document.getElementById('btnSalvar');
    if (!gameKey) { alert("Selecione um jogo!"); return; }

    const pres = [], gols = [], asts = [], votos = [];

    listaJogadores.forEach(n => {
        if (document.querySelector(`.pre[data-n="${n}"]`).checked) pres.push(n);
        
        let g = parseInt(document.querySelector(`.gol[data-n="${n}"]`).value) || 0;
        let a = parseInt(document.querySelector(`.ast[data-n="${n}"]`).value) || 0;
        let v = parseInt(document.querySelector(`.voto[data-n="${n}"]`).value) || 0;
        
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

    try {
        btn.disabled = true;
        btn.innerText = "Salvando...";
        await fetch(`${BASE_URL}/${gameKey}.json`, {
            method: 'PATCH',
            body: JSON.stringify(dadosAtualizados)
        });
        alert("Resultado atualizado!");
        carregarJogos();
    } catch (e) { 
        alert("Erro ao salvar."); 
    } finally { 
        btn.disabled = false; 
        btn.innerText = "Salvar no Firebase"; 
    }
}

window.onload = () => { carregarJogos(); renderizarTabela(); };