// script.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
const { jsPDF } = window.jspdf || { jsPDF: null };

// ---------------- CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCdQYNKJdTYEeOaejZy_ZxU9tVq7bF1x34",
  authDomain: "app-suporte-n2.firebaseapp.com",
  projectId: "app-suporte-n2",
  storageBucket: "app-suporte-n2.firebasestorage.app",
  messagingSenderId: "257470368604",
  appId: "1:257470368604:web:42fcc4973851eb02b78f99"
};
const firebaseApp = initializeApp(firebaseConfig);
let messaging;
try { messaging = getMessaging(firebaseApp); } catch (e) { console.warn("FCM init failed", e); }
const VAPID_KEY = "BI0b8-7QbFHrkXEa5vGfivhd5fO4vo3BFqmnZAVxeFdcq8-kqdGMDGYGw6GxAS-6PB1piLRTYKFJcHflbdZCA1M";

// ---------------- ESTADO DA APLICAÇÃO
const estadoPadrao = {
  casos: [],
  historico: [],
  temaAtual: "tech",
  baseSalary: 2500,
  metas: [
    { target: 15, reward: 0.25 },
    { target: 25, reward: 0.50 },
    { target: 35, reward: 1.0 }
  ],
  senhas: [
    { nome: "SIG", usuario: "flavio.cardozo@desktop.tec.br", senha: "SuporteN2" },
    { nome: "SalesForce", usuario: "flavio.cardozo@desktop.tec.br", senha: "@Flavero85" },
    { nome: "WebMail", usuario: "flavio.cardozo@desktop.tec.br", senha: "eWJBP[ar8V" }
  ],
  linksUteis: [
      { nome: "SIG", url: "http://172.30.0.141:8080" },
      { nome: "SalesForce", url: "https://desktopsa.my.salesforce.com" },
      { nome: "WebMail", url: "https://webmail.desktop.com.br" },
      { nome: "NetCore", url: "https://netcore.desktop.localdomain/weboss/reprovisiona_gpon" }
  ],
  missoesDiarias: [],
  textosEditaveis: {},
  categoriasCancelamento: ["Sem Sinal", "Massivo", "Lentidão", "Quedas de Conexão", "Financeiro", "Outros"],
  respostasRapidas: [
    { id: "resp1", resumo: "Visita cancelada por falha externa.", full: "Olá,&#10;&#10;Aqui é Flávio, da empresa Desktop. Tudo bem com você?&#10;&#10;Quero te explicar sobre o reparo que estava agendado (protocolo [ XXXX ]): identificamos que a falha não está na sua residência, mas sim em um equipamento externo que leva o sinal até aí.&#10;&#10;Por isso, a visita técnica não seria eficaz e precisou ser cancelada.&#10;&#10;Mas não se preocupe! Nossa equipe já está cuidando disso e em breve você terá seu serviço restabelecido." },
    { id: "resp2", resumo: "Oportunidade de melhoria na conexão.", full: "Olá, cliente Desktop!&#10;&#10;Meu nome é Flávio do Suporte Técnico N2 e estou entrando em contato com uma novidade incrível: identificamos uma oportunidade de melhorar ainda mais a qualidade da sua conexão com a Desktop — e o melhor, sem custo adicional!&#10;&#10;É só me informar a melhor data e horário, e cuidamos do resto!" }
  ]
};
let estado = {};
const STORAGE_KEY = "estadoN2_v5";
let trendChart, categoryPieChart;

// ---------------- UTILITÁRIOS
function salvarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function carregarEstado() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let estadoSalvo = {};
  if (raw) {
    try { estadoSalvo = JSON.parse(raw); } catch (e) { console.error("Erro ao carregar estado", e); }
  }
  estado = { ...estadoPadrao, ...estadoSalvo };
}

function mostrarToast(text, tipo = "info") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast ${tipo}`;
  t.textContent = text;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => c.removeChild(t), 300); }, 3000);
}

const getTodayDateString = () => new Date().toLocaleDateString('pt-BR');

// ---------------- RENDERIZAÇÃO GERAL
function renderizarTudo() {
    document.body.className = estado.temaAtual ? `theme-${estado.temaAtual}` : "";
    aplicarTextosEditaveis();
    renderizarCasos();
    renderizarContadores();
    renderizarLinksUteis();
    renderizarRespostasRapidas();
    renderizarCategoriasSelect();
    renderizarMetasProgresso();
    calcularErenderizarComissao();
    renderHistoryList();
    renderDailyCasesList();
    renderizarMissoesDiarias();
    atualizarGraficos();
    renderProjecaoUI();
}

function aplicarTextosEditaveis() {
    Object.keys(estado.textosEditaveis).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = estado.textosEditaveis[id];
    });
}

// ---------------- RENDERIZAÇÃO DE COMPONENTES
function renderizarCasos(filtro = 'Todos', termoBusca = '') {
    const container = document.getElementById("cases-list-container");
    if (!container) return;
    
    const termoNormalizado = termoBusca.toLowerCase().trim();
    const casosFiltrados = estado.casos.filter(caso => {
        const correspondeFiltro = filtro === 'Todos' || caso.status === filtro;
        const correspondeBusca = !termoNormalizado ||
            caso.protocolo?.toLowerCase().includes(termoNormalizado) ||
            caso.telefone?.toLowerCase().includes(termoNormalizado);
        return correspondeFiltro && correspondeBusca;
    });

    container.innerHTML = "";
    if (casosFiltrados.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary-color);">Nenhum caso encontrado.</p>`;
        return;
    }

    casosFiltrados.forEach(caso => {
        const div = document.createElement("div");
        div.className = "case-entry";
        div.dataset.caseId = caso.id;
        div.innerHTML = `
          <div class="case-main-content">
            <div class="case-fields">
              <div class="field-group">
                <input type="text" class="case-protocolo" value="${caso.protocolo || ""}" readonly />
                <button class="button copy-btn" data-copy='${caso.protocolo || ""}'>Copiar</button>
              </div>
              <div class="field-group" style="margin-top:8px;">
                <input type="text" class="case-telefone" value="${caso.telefone || ""}" readonly />
                <button class="button copy-btn" data-copy='${caso.telefone || ""}'>Copiar</button>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                <div class="status-indicator status-${caso.status || "Pendente"}" title="${caso.status || "Pendente"}"></div>
                <button class="expand-btn" aria-label="expandir">⯆</button>
            </div>
          </div>
          <div class="case-details-content">
            <textarea class="case-desc">${caso.descricao || ""}</textarea>
            <select class="case-status">
              <option ${caso.status==="Pendente" ? "selected":""}>Pendente</option>
              <option ${caso.status==="Em-Andamento" ? "selected":""}>Em-Andamento</option>
              <option ${caso.status==="Resolvido" ? "selected":""}>Resolvido</option>
            </select>
            <div class="details-actions">
              <button class="button save-case-btn">Salvar Alterações</button>
            </div>
          </div>
        `;
        container.appendChild(div);
      });
}

function renderizarLinksUteis() {
    const container = document.getElementById("links-uteis-container");
    if(!container) return;
    container.innerHTML = estado.linksUteis.map(link => 
        `<a href="${link.url}" class="link-util" target="_blank">${link.nome}</a>`
    ).join('');
}

function renderizarRespostasRapidas() {
    const container = document.getElementById("respostas-container");
    if (!container) return;
    container.innerHTML = estado.respostasRapidas.map(resp => `
        <div id="${resp.id}" class="resposta-copiavel" data-full="${resp.full}">
            ${resp.resumo}
        </div>
    `).join('');
}

function renderizarCategoriasSelect() {
    const select = document.getElementById("categorySelectTop");
    if (!select) return;
    select.innerHTML = estado.categoriasCancelamento.map(cat => `<option>${cat}</option>`).join('');
}

function renderizarContadores() {
    const hoje = getTodayDateString();
    const registroHoje = estado.historico.find(h => h.date === hoje);
    document.getElementById("protocolosAnalisadosInput").value = registroHoje?.protocolos || 0;
    document.getElementById("dailyCancellationsInput").value = registroHoje?.cancelamentosDiarios || 0;
    
    const mesAtual = new Date().getMonth();
    const totalCancelamentosMes = estado.historico
        .filter(h => new Date(h.date.split('/').reverse().join('-')).getMonth() === mesAtual)
        .reduce((acc, h) => acc + (h.cancelamentosDiarios || 0), 0);
    document.getElementById("atendimentosInput").value = totalCancelamentosMes;
}

// ... Demais funções de renderização (histórico, casos do dia, missões, etc.)

// ---------------- LÓGICA DE NEGÓCIO E CÁLCULOS
function adicionarCaso(protocolo = "", telefone = "") {
    const novo = { 
        id: Date.now(), 
        protocolo, 
        telefone, 
        descricao: "", 
        status: "Pendente", 
        data: new Date().toISOString() 
    };
    estado.casos.unshift(novo);
    salvarEstado();
    renderizarCasos();
    mostrarToast("Novo caso adicionado!", "success");
}

function salvarResumoDiario() {
    const hoje = getTodayDateString();
    let registroIndex = estado.historico.findIndex(h => h.date === hoje);

    const novoRegistro = {
        date: hoje,
        protocolos: parseInt(document.getElementById('protocolosAnalisadosInput').value) || 0,
        cancelamentosDiarios: parseInt(document.getElementById('dailyCancellationsInput').value) || 0,
        anotacao: document.getElementById('daily-summary-textarea').value || ""
    };

    if (registroIndex > -1) {
        estado.historico[registroIndex] = novoRegistro;
    } else {
        estado.historico.push(novoRegistro);
    }
    salvarEstado();
    mostrarToast("Resumo do dia salvo!", "success");
    renderizarTudo();
}

// ---------------- MODAIS
function abrirModal(modalId) { document.getElementById(modalId)?.style.display = "flex"; }
function fecharModal(modalId) { document.getElementById(modalId)?.style.display = "none"; }

function renderizarModalConfiguracoes() {
    const modalBody = document.querySelector("#settings-modal .modal-body");
    modalBody.innerHTML = `
        <h3>Backup de Dados</h3>
        <div class="modal-actions">
            <button id="importButton" class="button">Importar Dados</button>
            <button id="exportButton" class="button">Exportar Dados</button>
        </div>
        <h3>Ações Perigosas</h3>
        <div class="modal-actions">
            <button id="resetButton" class="button reset-button">Resetar App</button>
        </div>
    `;
    // Adiciona eventos aos novos botões
    document.getElementById('importButton').onclick = importData;
    document.getElementById('exportButton').onclick = exportData;
    document.getElementById('resetButton').onclick = resetarApp;
}

function renderizarModalSenhas() {
    const modalBody = document.querySelector("#senhas-modal .modal-body");
    let senhasHtml = estado.senhas.map((s, i) => `
        <div class="senha-item" data-index="${i}">
            <h4>${s.nome}</h4>
            <p>Usuário: <span class="copyable-credential">${s.usuario}</span></p>
            <p>Senha: <span class="copyable-credential">${s.senha}</span></p>
            <button class="button reset-button delete-senha-btn">Excluir</button>
        </div>
    `).join('');

    modalBody.innerHTML = `
        <div id="senhas-lista">${senhasHtml}</div>
        <hr>
        <h3>Adicionar Nova Senha</h3>
        <div class="form-group">
            <input type="text" id="nova-senha-nome" placeholder="Nome do Sistema">
            <input type="text" id="nova-senha-usuario" placeholder="Usuário" style="margin-top: 8px;">
            <input type="text" id="nova-senha-senha" placeholder="Senha" style="margin-top: 8px;">
        </div>
        <div class="modal-actions">
            <button id="adicionar-senha-btn" class="button">Adicionar</button>
        </div>
    `;
}

// ... (Restante do código, incluindo a função de PDF melhorada, manipuladores de eventos, etc.)

// ---------------- INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    carregarEstado();
    renderizarTudo();
    adicionarEventListeners();
});

function adicionarEventListeners() {
    // Botões principais
    document.getElementById("settings-button").onclick = () => { renderizarModalConfiguracoes(); abrirModal('settings-modal'); };
    document.getElementById("senhas-button").onclick = () => { renderizarModalSenhas(); abrirModal('senhas-modal'); };
    document.getElementById("saveButton").onclick = salvarResumoDiario;
    document.getElementById("editButton").onclick = toggleModoEdicao;
    document.getElementById("themeToggleButton").onclick = mudarTema;
    document.getElementById("notifyButton").onclick = solicitarPermissaoNotificacoes;
    document.getElementById("addCaseButton").onclick = () => adicionarCaso(prompt("Protocolo:"), prompt("Telefone:"));
    document.getElementById("clearCasesButton").onclick = limparCasos;
    document.getElementById("dailySummarySaveButton").onclick = salvarResumoDiario;
    document.getElementById("dailySummaryClearButton").onclick = limparAnotacaoDiaria;

    // Filtros e busca de casos
    document.getElementById("case-search-input").oninput = (e) => {
        const filtroAtivo = document.querySelector('.filter-btn.active').dataset.filter;
        renderizarCasos(filtroAtivo, e.target.value);
    };
    document.querySelectorAll(".filter-btn").forEach(btn => btn.onclick = (e) => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderizarCasos(e.target.dataset.filter, document.getElementById('case-search-input').value);
    });

    // Abas
    document.querySelectorAll(".tab-button").forEach(btn => btn.onclick = () => setActiveTab(btn.dataset.tab));
    
    // Modais
    document.querySelectorAll('.close-button').forEach(btn => btn.onclick = () => fecharModal(btn.closest('.modal').id));
    window.onclick = (e) => { if (e.target.classList.contains('modal')) fecharModal(e.target.id); };

    // Event Delegation para elementos dinâmicos
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn')) {
            navigator.clipboard.writeText(e.target.dataset.copy);
            mostrarToast("Copiado!", "success");
        }
        if (e.target.closest('.expand-btn')) {
            const entry = e.target.closest('.case-entry');
            entry.querySelector('.case-details-content').classList.toggle('visible');
            e.target.closest('.expand-btn').classList.toggle('expanded');
        }
        if(e.target.classList.contains('resposta-copiavel')) {
             navigator.clipboard.writeText(e.target.dataset.full);
             mostrarToast("Resposta copiada!", "success");
        }
    });

     document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('save-case-btn')) {
            const entry = e.target.closest('.case-entry');
            const caseId = parseInt(entry.dataset.caseId);
            const casoIndex = estado.casos.findIndex(c => c.id === caseId);
            if(casoIndex > -1) {
                estado.casos[casoIndex].descricao = entry.querySelector(".case-desc").value;
                estado.casos[casoIndex].status = entry.querySelector(".case-status").value;
                salvarEstado();
                mostrarToast("Caso salvo!", "success");
            }
        }
    });
}

