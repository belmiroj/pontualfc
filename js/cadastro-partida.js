const BASE_URL = "https://dashboard-pontualfc-default-rtdb.firebaseio.com/temporada_2026";
let editKey = null;
let jogosLocais = {};

async function listarJogos() {
    try {
        const response = await fetch(`${BASE_URL}.json`);
        jogosLocais = await response.json();
        const select = document.getElementById('select-jogos');
        select.innerHTML = '<option value="">-- NOVO CADASTRO --</option>';
        
        if (jogosLocais) {
            Object.keys(jogosLocais).sort((a,b) => {
                return new Date(jogosLocais[b].data.split('/').reverse().join('-')) - new Date(jogosLocais[a].data.split('/').reverse().join('-'));
            }).forEach(key => {
                const jogo = jogosLocais[key];
                select.innerHTML += `<option value="${key}">${jogo.data} vs ${jogo.visitante}</option>`;
            });
        }
    } catch (e) { console.error("Erro ao listar:", e); }
}

// FUNÇÃO PARA GERAR A RODADA AUTOMATICAMENTE
function gerarRodadaAutomatica() {
    // Se estiver editando, não sobrescreve automaticamente a menos que o campo esteja vazio
    if (editKey && document.getElementById('rodada').value !== "") return;

    const dataSelecionada = document.getElementById('data').value;
    if (!dataSelecionada) return;

    if (!jogosLocais || Object.keys(jogosLocais).length === 0) {
        document.getElementById('rodada').value = "1º Jogo da Temporada";
        return;
    }

    // Conta quantos jogos existem com data anterior à selecionada
    const dataTime = new Date(dataSelecionada).getTime();
    let contador = 1;

    Object.values(jogosLocais).forEach(jogo => {
        const dataJogo = new Date(jogo.data.split('/').reverse().join('-')).getTime();
        if (dataJogo < dataTime) {
            contador++;
        }
    });

    document.getElementById('rodada').value = `${contador}º Jogo da Temporada`;
}

function carregarDadosJogo(key) {
    if (!key) { resetForm(); return; }
    editKey = key;
    const jogo = jogosLocais[key];
    const partesData = jogo.data.split('/');
    document.getElementById('data').value = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
    document.getElementById('visitante').value = jogo.visitante;
    document.getElementById('rodada').value = jogo.rodada;
    document.getElementById('form-title').innerText = "Editar Partida";
    document.getElementById('btnSalvar').innerText = "Salvar Alterações";
    document.getElementById('btnExcluir').style.display = "block";
}

function resetForm() {
    editKey = null;
    document.getElementById('data').value = "";
    document.getElementById('visitante').value = "";
    document.getElementById('rodada').value = "";
    document.getElementById('select-jogos').value = "";
    document.getElementById('form-title').innerText = "Novo Agendamento";
    document.getElementById('btnSalvar').innerText = "Agendar e Salvar";
    document.getElementById('btnExcluir').style.display = "none";
}

function getDiaSemana(dataString) {
    const dias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
    const date = new Date(dataString + 'T00:00:00');
    return dias[date.getDay()];
}

async function salvarNoBanco() {
    const dataVal = document.getElementById('data').value;
    const visitanteVal = document.getElementById('visitante').value;
    const rodadaVal = document.getElementById('rodada').value;
    
    if(!dataVal || !visitanteVal) { alert("Preencha Data e Visitante!"); return; }

    const payload = {
        data: dataVal.split('-').reverse().join('/'),
        dia_semana: getDiaSemana(dataVal),
        visitante: visitanteVal.toUpperCase(),
        rodada: rodadaVal || "Amistoso",
        mandante: "PONTUAL FC",
        status: editKey ? jogosLocais[editKey].status : "upcoming",
        hora: "21:00",
        local: "Balduíno Soccer Indoor"
    };

    const url = editKey ? `${BASE_URL}/${editKey}.json` : `${BASE_URL}.json`;
    const metodo = editKey ? 'PATCH' : 'POST';

    try {
        document.getElementById('btnSalvar').disabled = true;
        const response = await fetch(url, {
            method: metodo,
            body: JSON.stringify(payload)
        });
        if(response.ok) {
            alert("Dados salvos com sucesso!");
            resetForm();
            await listarJogos(); // Atualiza a lista local para o próximo cálculo
        }
    } catch (e) { alert("Erro ao salvar."); }
    finally { document.getElementById('btnSalvar').disabled = false; }
}

async function excluirJogo() {
    if(!editKey) return;
    if(!confirm("Tem certeza que deseja EXCLUIR esta partida?")) return;
    try {
        const response = await fetch(`${BASE_URL}/${editKey}.json`, { method: 'DELETE' });
        if(response.ok) {
            alert("Partida removida!");
            resetForm();
            listarJogos();
        }
    } catch (e) { alert("Erro ao excluir."); }
}

window.onload = listarJogos;