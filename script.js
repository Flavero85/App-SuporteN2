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

// ---------------- ESTADO PADRÃO DA APLICAÇÃO
const estadoPadrao = {
  casos: [],
  historico: [],
  temaAtual: "tech",
  metas: {
    protocolos: 250,
    cancelamentos: 15,
  },
  senhas: [
    { nome: "SIG", usuario: "flavio.cardozo@desktop.tec.br", senha: "Suporte N2" },
    { nome: "SalesForce", usuario: "flavio.cardozo@desktop.tec.br", senha: "@Flavero85" }
  ],
  linksUteis: [
      { nome: "SIG", url: "http://172.30.0.141:8080" },
      { nome: "SalesForce", url: "https://desktopsa.my.salesforce.com" },
      { nome: "WebMail", url: "https://webmail.desktop.com.br" }
  ],
  missoesDiarias: [
      { texto: "Analisar 10 protocolos", completa: false },
      { texto: "Zerar a fila de pendências", completa: false },
  ],
  textosEditaveis: {},
  categoriasCancelamento: ["Sem Sinal", "Massivo", "Lentidão", "Quedas de Conexão", "Outros"],
  respostasRapidas: [
    { id: "resp1", resumo: "Visita cancelada por falha externa.", full: "Olá,&#10;&#10;Aqui é Flávio, da empresa Desktop. Tudo bem com você?&#10;&#10;Quero te explicar sobre o reparo que estava agendado (protocolo [ XXXX ]): identificamos que a falha não está na sua residência, mas sim em um equipamento externo que leva o sinal até aí.&#10;&#10;Por isso, a visita técnica não seria eficaz e precisou ser cancelada.&#10;&#10;Mas não se preocupe! Nossa equipe já está cuidando disso e em breve você terá seu serviço restabelecido.&#10;&#10;Conte sempre com a Desktop. Estamos juntos para garantir sua melhor experiência!" },
    { id: "resp2", resumo: "Oportunidade de melhoria na conexão.", full: "Olá, cliente Desktop!&#10;&#10;Meu nome é Flávio do Suporte Técnico N2 e estou entrando em contato com uma novidade incrível: identificamos uma oportunidade de melhorar ainda mais a qualidade da sua conexão com a Desktop — e o melhor, sem custo adicional!&#10;&#10;Nosso time técnico acompanha de perto o desempenho dos nossos clientes e notamos que uma atualização no seu equipamento pode proporcionar uma experiência ainda melhor.&#10;&#10;É só me informar a melhor data e horário, e cuidamos do resto!&#10;&#10;Fico no aguardo da sua resposta.&#10;&#10;Até mais!&#10;Flávio N2&#10;Equipe Desktop" }
  ]
};
let estado = {};
const STORAGE_KEY = "estadoN2_v4";

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
  // Unir estado padrão com o salvo para garantir que novas chaves sejam adicionadas
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

// ---------------- RENDERIZAÇÃO GERAL
function renderizarTudo() {
    document.body.className = estado.temaAtual ? `theme-${estado.temaAtual}` : "";
    aplicarTextosEditaveis();
    renderizarCasos();
    renderDailyCasesList();
    renderHistoryList();
    renderizarLinksUteis();
    renderizarMissoesDiarias();
    renderizarRespostasRapidas();
    renderizarCategoriasSelect();
    renderizarContadoresEMetas();
    atualizarGraficos(); // Deve vir depois de renderizar contadores
    renderProjecaoUI();
    calcularErenderizarComissao();
}

// ... (Restante das funções de renderização específicas)

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
        const dateStr = new Date(caso.data).toLocaleString('pt-BR');
        div.innerHTML = `
          <div class="case-main-content">
            <div style="flex:1">
              <div class="field-group">
                <input type="text" value="${caso.protocolo || ""}" readonly />
                <button class="button copy-btn" data-copy='${caso.protocolo || ""}'>Copiar</button>
              </div>
              <div class="field-group" style="margin-top:8px;">
                <input type="text" value="${caso.telefone || ""}" readonly />
                <button class="button copy-btn" data-copy='${caso.telefone || ""}'>Copiar</button>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
              <div class="status-indicator status-${caso.status || "Pendente"}" title="${caso.status || "Pendente"}"></div>
              <small style="color:var(--text-secondary-color)">${dateStr}</small>
              <button class="expand-btn" aria-label="expandir">⯈</button>
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
              <button class="button save-case-btn">Salvar</button>
              <button class="button reset-button delete-case-btn">Excluir</button>
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

function renderizarMissoesDiarias() {
    const list = document.getElementById("daily-mission-list");
    if (!list) return;
    list.innerHTML = estado.missoesDiarias.map((missao, index) => `
        <li class="${missao.completa ? 'completed' : ''}" data-index="${index}">
            ${missao.texto}
        </li>
    `).join('');

    list.querySelectorAll('li').forEach(item => {
        item.onclick = () => {
            const index = item.dataset.index;
            estado.missoesDiarias[index].completa = !estado.missoesDiarias[index].completa;
            salvarEstado();
            renderizarMissoesDiarias();
        };
    });
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

// ... (O resto das funções, como MODAIS, EVENTOS, CÁLCULOS, serão adicionadas aqui)
// Por motivos de brevidade, apenas as funções mais importantes e alteradas são mostradas.
// O código completo estará no arquivo final.


// ---------------- INICIALIZAÇÃO DA APLICAÇÃO ----------------
document.addEventListener("DOMContentLoaded", () => {
    carregarEstado();
    renderizarTudo();

    // --- EVENT LISTENERS PRINCIPAIS ---
    document.getElementById("settings-button").addEventListener("click", () => {
        renderizarModalConfiguracoes();
        abrirModal('settings-modal');
    });

    document.getElementById("senhas-button").addEventListener("click", () => {
        renderizarModalSenhas();
        abrirModal('senhas-modal');
    });
    
    document.querySelectorAll('.close-button').forEach(btn => {
        btn.onclick = () => fecharModal(btn.closest('.modal').id);
    });
    
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            fecharModal(event.target.id);
        }
    };

    document.getElementById("editButton").addEventListener("click", toggleModoEdicao);
    
    document.getElementById("saveButton").addEventListener("click", () => {
      salvarEstadoCompleto();
      mostrarToast("Progresso salvo com sucesso!", "success");
    });
    
    document.getElementById("themeToggleButton").addEventListener("click", ()=>{
        const list = ["default","tech","light","mint","sunset","graphite"];
        const currentIndex = list.indexOf(estado.temaAtual);
        const nextIndex = (currentIndex + 1) % list.length;
        estado.temaAtual = list[nextIndex];
        document.body.className = estado.temaAtual === "default" ? "" : `theme-${estado.temaAtual}`;
        salvarEstado();
        mostrarToast("Tema alterado: " + estado.temaAtual, "info");
    });
    
    document.getElementById("addCaseButton").addEventListener("click", () => {
        const protocolo = prompt("Protocolo:");
        if (protocolo) {
            const telefone = prompt("Telefone:");
            adicionarCaso(protocolo, telefone);
        }
    });

    document.getElementById('clearCasesButton').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar TODOS os casos?')) {
            estado.casos = [];
            salvarEstado();
            renderizarCasos();
            mostrarToast('Todos os casos foram removidos.', 'danger');
        }
    });
    
    document.getElementById('dailySummarySaveButton').addEventListener('click', () => {
        salvarResumoDiario();
    });

    document.getElementById('dailySummaryClearButton').addEventListener('click', () => {
        if (confirm('Limpar anotação de hoje?')) {
            document.getElementById('daily-summary-textarea').value = '';
            salvarResumoDiario(); // Salva o resumo vazio
        }
    });
});

