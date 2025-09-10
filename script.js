// script.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
const { jsPDF } = window.jspdf || { jsPDF: null };

// ---------------- CONFIG FIREBASE (já fornecida)
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

// ---------------- ESTADO
let estado = {
  atendimentosDiarios: 0,
  cancelamentosDiarios: 0,
  protocolosAnalisados: 0,
  casos: [],
  historico: [],
  temaAtual: localStorage.getItem("temaSelecionado") || "default",
};
const STORAGE_KEY = "estadoN2_v2";

// ---------------- UTIL
function salvarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}
function carregarEstado() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    estado = { ...estado, ...parsed };
  } catch (e) { console.error("Erro carregar estado", e); }
}
function mostrarToast(text, tipo = "info") {
  const c = document.getElementById("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = `toast ${tipo}`;
  t.textContent = text;
  c.appendChild(t);
  requestAnimationFrame(()=> t.classList.add("show"));
  setTimeout(()=> { t.classList.remove("show"); setTimeout(()=> c.removeChild(t),300); }, 3000);
}

// ---------------- RENDER UI
function renderizarCasos() {
  const container = document.getElementById("cases-list-container");
  if (!container) return;
  container.innerHTML = "";
  estado.casos.forEach((caso, idx) => {
    const div = document.createElement("div");
    div.className = "case-entry";
    const dateStr = new Date(caso.data).toLocaleString();
    div.innerHTML = `
      <div class="case-main-content">
        <div style="flex:1">
          <div style="display:flex;gap:8px;">
            <input type="text" value="${caso.protocolo || ""}" readonly />
            <button class="button copy-btn" data-copy='${caso.protocolo || ""}'>Copiar</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
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
          <button class="button copy-everything-btn">Copiar Tudo</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  // add events
  container.querySelectorAll(".copy-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{
      navigator.clipboard.writeText(btn.dataset.copy || "");
      mostrarToast("Copiado!", "success");
    });
  });
  container.querySelectorAll(".expand-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const details = btn.closest(".case-entry").querySelector(".case-details-content");
      details.classList.toggle("visible");
      btn.classList.toggle("expanded");
    });
  });
  container.querySelectorAll(".save-case-btn").forEach((btn, i)=>{
    btn.addEventListener("click", ()=>{
      const entry = btn.closest(".case-entry");
      const desc = entry.querySelector(".case-desc").value;
      const status = entry.querySelector(".case-status").value;
      estado.casos[i].descricao = desc;
      estado.casos[i].status = status;
      salvarEstado();
      renderizarCasos();
      mostrarToast("Caso salvo", "success");
    });
  });
  container.querySelectorAll(".delete-case-btn").forEach((btn,i)=>{
    btn.addEventListener("click", ()=>{
      estado.casos.splice(i,1);
      salvarEstado();
      renderizarCasos();
      mostrarToast("Caso excluído","info");
    });
  });
  container.querySelectorAll(".copy-everything-btn").forEach((btn,i)=>{
    btn.addEventListener("click", ()=>{
      const c = estado.casos[i];
      const txt = `Protocolo: ${c.protocolo}\nTelefone: ${c.telefone}\nDescrição: ${c.descricao}\nStatus: ${c.status}`;
      navigator.clipboard.writeText(txt);
      mostrarToast("Tudo copiado","success");
    });
  });
}

function renderDailyCasesList() {
  const container = document.getElementById("daily-summary-cases-list");
  if (!container) return;
  container.innerHTML = "";
  const hoje = (d)=> new Date(d).toDateString();
  estado.casos.filter(c => hoje(c.data) === hoje(new Date())).forEach((c, idx) => {
    const el = document.createElement("div");
    el.className = "case-entry";
    el.innerHTML = `<strong>${c.protocolo || "—"}</strong> — ${c.telefone || ""} <div style="font-size:12px;color:var(--text-secondary-color)">${new Date(c.data).toLocaleTimeString()}</div>`;
    container.appendChild(el);
  });
}

// ---------------- PROJEÇÃO E GRAFICOS
let trendChart, categoryChart;
function inicializarGraficos() {
  const trendCtx = document.getElementById("trendChart");
  if (trendCtx) {
    trendChart = new Chart(trendCtx, { type:"line", data:{ labels:[], datasets:[{label:"Cancelamentos", data:[], tension:0.3}]}, options:{responsive:true} });
  }
  const catCtx = document.getElementById("categoryPieChart");
  if (catCtx) {
    categoryChart = new Chart(catCtx, { type:"pie", data:{ labels:[], datasets:[{data:[]}] }, options:{responsive:true} });
  }
}
function atualizarGraficos() {
  // trend: usa historico (últimos 12 dias)
  if (trendChart) {
    const last = estado.historico.slice(-12);
    trendChart.data.labels = last.map(h=> new Date(h.date).toLocaleDateString());
    trendChart.data.datasets[0].data = last.map(h=> h.cancelamentos || 0);
    trendChart.update();
  }
  if (categoryChart) {
    const counts = {};
    estado.casos.forEach(c=> counts[c.categoria || c.status || "Outros"] = (counts[c.categoria || c.status || "Outros"]||0)+1);
    categoryChart.data.labels = Object.keys(counts);
    categoryChart.data.datasets[0].data = Object.values(counts);
    categoryChart.update();
  }
}

// projeção de cancelamentos (exemplo simples com destaque de faixas)
function calcularProjecao() {
  // usa historico media diária * dias do mes
  const now = new Date();
  const diasPassados = now.getDate();
  const soma = estado.historico.slice(-30).reduce((s,h)=> s + (h.cancelamentos||0), 0);
  const mediaDiaria = diasPassados ? Math.round((soma / Math.min(30, diasPassados))*100)/100 : 0;
  const projMes = Math.round(mediaDiaria * new Date(now.getFullYear(), now.getMonth()+1,0).getDate());
  // tiers (faixas)
  const tiers = [
    {name:"Baixo", desc:"Cancelamentos abaixo do esperado", min:0, max: Math.round(projMes*0.6)},
    {name:"Médio", desc:"Faixa aceitável", min: Math.round(projMes*0.6)+1, max: Math.round(projMes*0.9)},
    {name:"Alto", desc:"Atenção: alto número", min: Math.round(projMes*0.9)+1, max: Math.round(projMes*1.5)},
    {name:"Crítico", desc:"Intervenção necessária", min: Math.round(projMes*1.5)+1, max: Infinity}
  ];
  return { mediaDiaria, projMes, tiers };
}

function renderProjecaoUI() {
  const { mediaDiaria, projMes, tiers } = calcularProjecao();
  const pv = document.getElementById("projection-value");
  const formula = document.getElementById("projection-formula");
  const tierContainer = document.getElementById("tier-projection-container");
  if (pv) pv.textContent = projMes;
  if (formula) formula.textContent = `Média diária estimada: ${mediaDiaria} — projeção mensal aproximada: ${projMes}`;
  if (tierContainer) {
    tierContainer.innerHTML = "";
    tiers.forEach(t => {
      const item = document.createElement("div");
      item.className = "tier-item" + (projMes >= t.min && projMes <= t.max ? " highlight" : "");
      item.innerHTML = `<div><div class="tier-name">${t.name}</div><div class="tier-desc">${t.desc}</div></div><div><strong>${t.min===0?0:t.min} - ${t.max===Infinity?"∞":t.max}</strong></div>`;
      tierContainer.appendChild(item);
    });
  }
}

// ---------------- CASOS CRUD
function adicionarCaso(protocolo="", telefone="", descricao="", status="Pendente", categoria="") {
  const novo = { protocolo, telefone, descricao, status, categoria, data: new Date().toISOString() };
  estado.casos.push(novo);
  salvarEstado();
  renderizarCasos();
  renderDailyCasesList();
}
function limparCasosDoDia() {
  const hojeStr = new Date().toDateString();
  estado.casos = estado.casos.filter(c => new Date(c.data).toDateString() !== hojeStr);
  salvarEstado();
  renderizarCasos();
  renderDailyCasesList();
  mostrarToast("Casos do dia removidos", "info");
}

// ---------------- HISTÓRICO E DIÁRIO
function salvarResumoDiario() {
  const text = document.getElementById("daily-summary-textarea").value.trim();
  const entry = {
    date: new Date().toISOString(),
    note: text,
    cancelamentos: parseInt(document.getElementById("dailyCancellationsInput").value || "0"),
    protocolos: parseInt(document.getElementById("protocolosAnalisadosInput").value || "0"),
    categoria: document.getElementById("categorySelectTop").value || ""
  };
  estado.historico.push(entry);
  salvarEstado();
  mostrarToast("Resumo diário salvo", "success");
  atualizarGraficos();
  renderProjecaoUI();
  renderHistoryList();
}
function limparAnotacaoEDiario() {
  document.getElementById("daily-summary-textarea").value = "";
  // também limpar casos do dia
  limparCasosDoDia();
  mostrarToast("Anotação limpa e casos do dia removidos", "info");
}

// histórico render
function renderHistoryList() {
  const el = document.getElementById("history-list");
  if (!el) return;
  el.innerHTML = "";
  const list = estado.historico.slice().reverse();
  list.forEach(h=>{
    const li = document.createElement("li");
    li.innerHTML = `<strong>${new Date(h.date).toLocaleString()}</strong> — Cancelamentos: ${h.cancelamentos || 0} — Protocolos: ${h.protocolos || 0} — ${h.note || ""}`;
    el.appendChild(li);
  });
}

// ---------------- Relatórios
function getMonthStats(month, year) {
  // month: 1-12
  const start = new Date(year, month-1, 1);
  const end = new Date(year, month, 1);
  const entries = estado.historico.filter(h=>{
    const d = new Date(h.date);
    return d >= start && d < end;
  });
  const totalCancelamentos = entries.reduce((s,e)=> s + (e.cancelamentos||0), 0);
  const diasComRegistro = new Set(entries.map(e => new Date(e.date).toDateString())).size || 1;
  const mediaDiariaProtocolos = Math.round((entries.reduce((s,e)=> s + (e.protocolos||0), 0) / diasComRegistro) * 100)/100;
  // categoria mais frequente (da historico)
  const catCounts = {};
  entries.forEach(e => { if (e.categoria) catCounts[e.categoria] = (catCounts[e.categoria] || 0) + 1; });
  const topCategoria = Object.keys(catCounts).sort((a,b)=>catCounts[b]-catCounts[a])[0] || "N/A";
  return { totalCancelamentos, mediaDiariaProtocolos, topCategoria, entries };
}

function compareMonths(month, year) {
  const curr = getMonthStats(month, year);
  const prevDate = new Date(year, month-2, 1);
  const prev = getMonthStats(prevDate.getMonth()+1, prevDate.getFullYear());
  return { curr, prev };
}

function renderReportSummary(stats) {
  const out = document.getElementById("report-output");
  out.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="report-stat"><div>Total de cancelamentos</div><div><strong>${stats.totalCancelamentos}</strong></div></div>
    <div class="report-stat"><div>Média diária de protocolos</div><div><strong>${stats.mediaDiariaProtocolos}</strong></div></div>
    <div class="report-stat"><div>Categoria mais frequente</div><div><strong>${stats.topCategoria}</strong></div></div>
  `;
  out.appendChild(wrap);
}

// ATENÇÃO: Substitua a função exportReportPdf inteira por esta versão melhorada.
async function exportReportPdf(month, year) {
  if (!jsPDF) {
    mostrarToast("jsPDF não carregado", "danger");
    return;
  }
  if (!Chart) {
    mostrarToast("Chart.js não carregado", "danger");
    return;
  }

  mostrarToast("Gerando relatório, aguarde...", "info");

  const stats = getMonthStats(month, year);
  const doc = new jsPDF();

  // --- PASSO 1: Preparar Logo e Gráficos (convertidos para imagem) ---

  // Para o logo, o ideal é convertê-lo para Base64 e colar aqui para evitar problemas de carregamento.
  // Você pode usar um site como 'base64-image.de' para converter seu 'logo.png'.
  const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAA//8DAEkoYhggAAAABJRU5ErkJggg=='; // <-- COLOQUE O BASE64 DO SEU LOGO AQUI

  // Preparar dados para os gráficos
  const categoryCounts = {};
  stats.entries.forEach(e => {
    if (e.categoria) {
      categoryCounts[e.categoria] = (categoryCounts[e.categoria] || 0) + (e.cancelamentos || 0);
    }
  });

  const trendLabels = stats.entries.map(e => new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  const trendCancellations = stats.entries.map(e => e.cancelamentos || 0);
  const trendProtocols = stats.entries.map(e => e.protocolos || 0);

  // Criar canvases temporários e escondidos para renderizar os gráficos
  const chartContainer = document.createElement('div');
  chartContainer.style.position = 'absolute';
  chartContainer.style.left = '-9999px';
  chartContainer.innerHTML = `
    <canvas id="tempPieChart" width="400" height="400"></canvas>
    <canvas id="tempLineChart" width="800" height="400"></canvas>
  `;
  document.body.appendChild(chartContainer);

  // Renderizar Gráfico de Pizza
  const pieCtx = document.getElementById('tempPieChart').getContext('2d');
  const pieChart = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts) : ['Nenhuma Categoria'],
      datasets: [{
        data: Object.keys(categoryCounts).length > 0 ? Object.values(categoryCounts) : [1],
        backgroundColor: ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6'],
      }]
    },
    options: {
      responsive: false,
      animation: { duration: 0 },
       plugins: {
        legend: { position: 'right' }
      }
    }
  });

  // Renderizar Gráfico de Linha
  const lineCtx = document.getElementById('tempLineChart').getContext('2d');
  const lineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: trendLabels,
      datasets: [{
        label: 'Cancelamentos',
        data: trendCancellations,
        borderColor: 'rgba(231, 52, 68, 1)',
        backgroundColor: 'rgba(231, 52, 68, 0.2)',
        fill: true,
        tension: 0.3
      }, {
        label: 'Protocolos',
        data: trendProtocols,
        borderColor: 'rgba(41, 182, 246, 1)',
        backgroundColor: 'rgba(41, 182, 246, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: false,
      animation: { duration: 0 },
      scales: { y: { beginAtZero: true } }
    }
  });
  
  // Aguardar a renderização dos gráficos antes de capturar a imagem
  await new Promise(resolve => setTimeout(resolve, 500)); 

  const pieChartImg = document.getElementById('tempPieChart').toDataURL('image/png');
  const lineChartImg = document.getElementById('tempLineChart').toDataURL('image/png');

  // Limpar os elementos temporários
  document.body.removeChild(chartContainer);


  // --- PASSO 2: Construir o PDF ---
  
  const addHeader = () => {
    doc.addImage(logoBase64, 'PNG', 14, 8, 25, 25);
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Mensal de Desempenho", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Período de Referência: ${String(month).padStart(2,"0")}/${year}`, 105, 28, { align: 'center' });
    doc.setDrawColor(180, 180, 180);
    doc.line(14, 40, 196, 40);
  };
  
  const addFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
    }
  };

  // Página 1
  addHeader();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Geral do Mês", 14, 50);

  // Cards de resumo
  doc.autoTable({
      startY: 55,
      body: [
          [
              { content: `Total de Cancelamentos\n${stats.totalCancelamentos}`, styles: { halign: 'center', fontSize: 11, fontStyle: 'bold' } },
              { content: `Média Diária de Protocolos\n${stats.mediaDiariaProtocolos}`, styles: { halign: 'center', fontSize: 11, fontStyle: 'bold' } },
              { content: `Categoria Mais Frequente\n${stats.topCategoria}`, styles: { halign: 'center', fontSize: 11, fontStyle: 'bold' } },
          ],
      ],
      theme: 'grid',
      styles: { cellPadding: 8, }
  });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Gráficos de Desempenho", 14, 95);
  
  doc.addImage(pieChartImg, 'PNG', 14, 100, 80, 80);
  doc.addImage(lineChartImg, 'PNG', 100, 100, 96, 48);

  doc.addPage();
  addHeader();

  // Tabela de Entradas
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Registros Diários", 14, 50);

  const tableData = stats.entries.map(e => [
      new Date(e.date).toLocaleDateString('pt-BR'),
      e.cancelamentos || '0',
      e.protocolos || '0',
      e.categoria || '-',
      e.note || ''
  ]);

  doc.autoTable({
    startY: 55,
    head: [['Data', 'Cancel.', 'Prot.', 'Categoria', 'Anotação']],
    body: tableData,
    headStyles: { fillColor: [0, 77, 64] },
    columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' },
    }
  });

  addFooter();
  doc.save(`Relatorio_Suporte_N2_${year}_${String(month).padStart(2,"0")}.pdf`);
  mostrarToast("PDF gerado com sucesso!", "success");
}
// ---------------- FCM (notificações)
const VAPID_KEY = "BI0b8-7QbFHrkXEa5vGfivhd5fO4vo3BFqmnZAVxeFdcq8-kqdGMDGYGw6GxAS-6PB1piLRTYKFJcHflbdZCA1M";

async function solicitarPermissaoNotificacoes() {
  if (!messaging) { mostrarToast("FCM não disponível", "danger"); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      console.log("FCM token:", token);
      mostrarToast("Notificações ativadas", "success");
      // envie token para seu servidor aqui
    } else {
      mostrarToast("Permissão para notificações negada", "danger");
    }
  } catch (e) {
    console.error(e);
    mostrarToast("Erro ao ativar notificações", "danger");
  }
}
if (messaging) {
  onMessage(messaging, payload => {
    console.log("Mensagem foreground:", payload);
    mostrarToast(payload.notification?.title || "Nova mensagem", "info");
  });
}

// ---------------- SERVICE WORKER REGISTRATION (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register("/service-worker.js").then(reg=>{
    console.log("SW registrado:", reg.scope);
  }).catch(err=>{
    console.error("SW register falhou", err);
  });
}

// ---------------- RENDER INICIAL E EVENTOS
document.addEventListener("DOMContentLoaded", () => {
  carregarEstado();
  // preencher inputs com estado
  document.getElementById("protocolosAnalisadosInput").value = estado.protocolosAnalisados || 0;
  document.getElementById("dailyCancellationsInput").value = estado.cancelamentosDiarios || 0;
  document.getElementById("atendimentosInput").value = estado.atendimentosDiarios || 0;
  renderizarCasos();
  renderDailyCasesList();
  renderHistoryList();
  inicializarGraficos();
  atualizarGraficos();
  renderProjecaoUI();

  // botões
  document.getElementById("addCaseButton").addEventListener("click", ()=> adicionarCaso(prompt("Protocolo:"), prompt("Telefone:"), "", "Pendente", document.getElementById("categorySelectTop").value));
  document.getElementById("clearCasesButton").addEventListener("click", ()=> { estado.casos = []; salvarEstado(); renderizarCasos(); mostrarToast("Todos os casos removidos", "info"); });
  document.getElementById("saveCasesButton").addEventListener("click", ()=> { salvarEstado(); mostrarToast("Casos salvos", "success"); });

  document.getElementById("incrementProtocolosButton").addEventListener("click", ()=>{
    const el = document.getElementById("protocolosAnalisadosInput");
    el.value = (parseInt(el.value||"0") + 1);
    estado.protocolosAnalisados = parseInt(el.value||"0"); salvarEstado(); atualizarGraficos();
  });

  document.getElementById("dailySummarySaveButton").addEventListener("click", ()=> salvarResumoDiario());
  document.getElementById("dailySummaryClearButton").addEventListener("click", ()=> limparAnotacaoEDiario());

  document.getElementById("saveLogbookButton")?.addEventListener("click", ()=>{
    const val = document.getElementById("logbook-textarea").value;
    estado.historico.push({ date: new Date().toISOString(), note: val, cancelamentos:0, protocolos:0 });
    salvarEstado(); renderHistoryList(); mostrarToast("Anotação guardada", "success");
  });

  // filtros de casos
  document.getElementById("case-search-input").addEventListener("input", e=>{
    const q = e.target.value.toLowerCase();
    // filtra visualmente
    document.querySelectorAll("#cases-list-container .case-entry").forEach((el, i)=>{
      const protocolo = estado.casos[i].protocolo || "";
      const telefone = estado.casos[i].telefone || "";
      el.style.display = (protocolo.toLowerCase().includes(q) || telefone.toLowerCase().includes(q)) ? "" : "none";
    });
  });
  document.querySelectorAll(".filter-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      if (f === "Todos" || !f) { renderizarCasos(); return; }
      // filtrar por status
      document.querySelectorAll("#cases-list-container .case-entry").forEach((el, i)=>{
        el.style.display = (estado.casos[i].status === f) ? "" : "none";
      });
    });
  });

  // Reports
  document.getElementById("generateReportBtn").addEventListener("click", ()=>{
    const mEl = document.getElementById("report-month");
    const val = mEl.value || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
    const [y, m] = val.split("-");
    const stats = getMonthStats(parseInt(m,10), parseInt(y,10));
    renderReportSummary(stats);
  });
  document.getElementById("compareMonthsBtn").addEventListener("click", ()=>{
    const mEl = document.getElementById("report-month");
    const val = mEl.value || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
    const [y,m] = val.split("-");
    const comparison = compareMonths(parseInt(m,10), parseInt(y,10));
    const out = document.getElementById("report-output");
    out.innerHTML = `<h4>Comparação</h4>
      <div class="report-stat"><div>Atual</div><div><strong>${comparison.curr.totalCancelamentos}</strong></div></div>
      <div class="report-stat"><div>Anterior</div><div><strong>${comparison.prev.totalCancelamentos}</strong></div></div>`;
  });
  document.getElementById("exportPdfBtn").addEventListener("click", ()=>{
    const mEl = document.getElementById("report-month");
    const val = mEl.value || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
    const [y,m] = val.split("-");
    exportReportPdf(parseInt(m,10), parseInt(y,10));
  });

  // theme toggle
  document.getElementById("themeToggleButton").addEventListener("click", ()=>{
    const current = estado.temaAtual || "default";
    const list = ["default","tech","light","mint","sunset","graphite"];
    const next = list[(list.indexOf(current) + 1) % list.length];
    estado.temaAtual = next;
    document.body.className = next === "default" ? "" : `theme-${next}`;
    salvarEstado();
    mostrarToast("Tema alterado: " + next, "info");
  });

  // notify button
  document.getElementById("notifyButton").addEventListener("click", ()=> solicitarPermissaoNotificacoes());

  // reports month default
  document.getElementById("report-month").value = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;

  // swipe tabs (touch)
  setupSwipeTabs();

});

// ---------------- TABS + SWIPE
function setActiveTab(tabName) {
  document.querySelectorAll(".tab-button").forEach(b=> b.classList.toggle("active", b.dataset.tab === tabName));
  document.querySelectorAll(".tab-content").forEach(s=> s.classList.toggle("active", s.id === `tab-${tabName}` || (s.id === `tab-${tabName}`)));
  // fallback: show section by id: prefix 'tab-'
  document.querySelectorAll(".tab-content").forEach(sec=>{
    if (sec.id === `tab-${tabName}` || sec.id === `tab-${tabName}`) { sec.classList.add("active"); } else sec.classList.remove("active");
  });
}
document.querySelectorAll(".tab-button").forEach(btn=>{
  btn.addEventListener("click", ()=> {
    const name = btn.dataset.tab;
    setActiveTab(name);
  });
});

function setupSwipeTabs() {
  const wrapper = document.getElementById("tab-content-wrapper");
  if (!wrapper) return;
  let startX = 0, dist = 0, threshold = 50;
  wrapper.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; dist = 0; });
  wrapper.addEventListener("touchmove", (e) => { dist = e.touches[0].clientX - startX; });
  wrapper.addEventListener("touchend", () => {
    if (Math.abs(dist) < threshold) return;
    const buttons = Array.from(document.querySelectorAll(".tab-button"));
    const activeIndex = buttons.findIndex(b=> b.classList.contains("active"));
    if (dist < 0 && activeIndex < buttons.length - 1) { // swipe left -> next tab
      buttons[activeIndex+1].click();
    } else if (dist > 0 && activeIndex > 0) { // swipe right -> prev tab
      buttons[activeIndex-1].click();
    }
  });
}

// ---------------- REPORT INITIAL SETUP
// load state and render
carregarEstado();
document.body.className = (estado.temaAtual && estado.temaAtual!=="default") ? `theme-${estado.temaAtual}` : "";
inicializarGraficos();
renderizarCasos();
renderDailyCasesList();
renderHistoryList();
atualizarGraficos();
renderProjecaoUI();

export { adicionarCaso }; // útil se quiser usar via console
