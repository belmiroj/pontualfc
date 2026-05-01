# ⚽ Pontual FC - Sistema de Gestão Esportiva

[![Link do Projeto](https://img.shields.io/badge/Acesse_o_Site-Acesse_Aqui-0078d7?style=for-the-badge&logo=github&logoColor=white)](https://belmiroj.github.io/pontualfc/index.html)

O **Pontual FC** é uma solução web desenvolvida para a gestão completa de um time de futebol 7. Este sistema foi criado para substituir processos manuais e planilhas, oferecendo uma plataforma centralizada para o agendamento de partidas, acompanhamento de desempenho coletivo e controle estatístico detalhado dos atletas (artilharia, assistências e MVP).

Este projeto é um componente central do meu portfólio de transição de carreira, demonstrando competências em desenvolvimento front-end, integração com back-end (BaaS) e foco na experiência do usuário.

---

## 💻 Tecnologias e Ferramentas

| Categoria | Tecnologia | Aplicação no Projeto |
| :--- | :--- | :--- |
| **Front-end** | HTML5 | Estruturação semântica e acessível das interfaces. |
| **Estilização** | CSS3 | Layouts responsivos com **Flexbox/Grid**, variáveis CSS e design moderno. |
| **Lógica** | JavaScript (ES6+) | Manipulação dinâmica do DOM, lógica de filtros e tratamento de eventos. |
| **Back-end** | Firebase | Persistência de dados em tempo real e hospedagem via BaaS. |

---

## 📊 Funcionalidades em Destaque

* **Dashboard Analítico:** Visão consolidada da performance do time (vitórias, empates, derrotas, saldo de gols e aproveitamento).
* **Gestão de Confrontos:** Sistema de CRUD para agendamento e edição de partidas.
* **Scout Individual:** Controle preciso de estatísticas de jogo (gols, assistências e votos de "Craque do Jogo").
* **Filtros Inteligentes:** Navegação por histórico mensal para análise da temporada 2026.
* **Gestão de Elenco:** Cadastro dinâmico de jogadores extras durante o lançamento de dados.

---

## 📂 Arquitetura do Repositório

O projeto segue uma estrutura modular para facilitar a manutenção e legibilidade:

```text
├── /css             # Estilização global e componentes
├── /js              # Scripts de lógica (Dashboard, Jogos, Cadastro)
├── index.html       # Painel principal (Dashboard)
├── cadastro-partida.html  # Formulário de agendamento
├── jogos-2026.html  # Histórico da temporada
└── lancar-dados.html # Painel de lançamento de scout