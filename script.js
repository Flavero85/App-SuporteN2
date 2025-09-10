// Importação dos módulos do Firebase 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- INICIALIZAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCdQYNKJdTYEeOaejZy_ZxU9tVq7bF1x34",
  authDomain: "app-suporte-n2.firebaseapp.com",
  projectId: "app-suporte-n2",
  storageBucket: "app-suporte-n2.appspot.com",
  messagingSenderId: "257470368604",
  appId: "1:257470368604:web:42fcc4973851eb02b78f99"
};

// Inicializa o Firebase e seus serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let userId = null; // Será preenchido após a autenticação

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PWA ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('ServiceWorker registrado:', reg.scope))
                .catch(err => console.error('Falha no registro do ServiceWorker:', err));
        });
    }

    // --- SELETORES DE ELEMENTOS ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.getElementById('app-container');
    const dailyCancellationsInput = document.getElementById('dailyCancellationsInput');
    const atendimentosInput = document.getElementById('atendimentosInput');
    const protocolosAnalisadosInput = document.getElementById('protocolosAnalisadosInput');
    const protocolGoalsContainer = document.getElementById('protocol-goals-container');
    const incrementProtocolosButton = document.getElementById('incrementProtocolosButton');
    const metasContainer = document.getElementById('metas-container');
    const summaryText = document.getElementById('summary-text');
    const incrementButton = document.getElementById('incrementButton');
    const categorySelect = document.getElementById('categorySelect');
    const categorySummaryList = document.getElementById('category-summary-list');
    const achievementList = document.getElementById('achievement-list');
    const saveButton = document.getElementById('saveButton');
    const resetButton = document.getElementById('resetButton');
    const exportButton = document.getElementById('exportButton');
    const importButton = document.getElementById('importButton');
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModal = document.getElementById('close-settings-modal');
    const settingsForm = document.getElementById('settings-form');
    const baseSalaryInput = document.getElementById('baseSalaryInput');
    const settingsMetasContainer = document.getElementById('settings-metas-container');
    const bonusValueEl = document.getElementById('bonus-value');
    const bonusFormulaEl = document.getElementById('bonus-formula');
    const historyListEl = document.getElementById('history-list');
    const projectionValueEl = document.getElementById('projection-value');
    const projectionFormulaEl = document.getElementById('projection-formula');
    const tierProjectionContainer = document.getElementById('tier-projection-container');
    const trendChartCanvas = document.getElementById('trendChart');
    const categoryPieChartCanvas = document.getElementById('categoryPieChart');
    const installAppButton = document.getElementById('installAppButton');
    const toastContainer = document.getElementById('toast-container');
    const editButton = document.getElementById('editButton');
    const respostasContainer = document.getElementById('respostas-container');
    const reminderEnabledInput = document.getElementById('reminderEnabled');
    const reminderTimeInput = document.getElementById('reminderTime');
    const casesListContainer = document.getElementById('cases-list-container');
    const addCaseButton = document.getElementById('addCaseButton');
    const clearCasesButton = document.getElementById('clearCasesButton');
    const caseSearchInput = document.getElementById('case-search-input');
    const caseFilterButtons = document.querySelectorAll('.filter-btn');
    const themeToggleButton = document.getElementById('themeToggleButton');
    const senhasButton = document.getElementById('senhas-button');
    const senhasModal = document.getElementById('senhas-modal');
    const closeSenhasModal = document.getElementById('close-senhas-modal');
    const senhasContainer = document.getElementById('senhas-container');
    const clearCacheButton = document.getElementById('clearCacheButton');
    const dailyMissionList = document.getElementById('daily-mission-list');
    const logbookTextarea = document.getElementById('logbook-textarea');
    const saveLogbookButton = document.getElementById('saveLogbookButton');
    const tabContentWrapper = document.getElementById('tab-content-wrapper');
    const tabsContainer = document.querySelector('.tabs-container');
    const tabButtons = document.querySelectorAll('.tab-button');
    const reportMonthSelect = document.getElementById('report-month-select');
    const exportPdfButton = document.getElementById('export-pdf-button');
    const currentMonthSummaryEl = document.getElementById('current-month-summary');
    const previousMonthComparisonEl = document.getElementById('previous-month-comparison');
    const currentMonthTitleEl = document.getElementById('current-month-title');
    const previousMonthTitleEl = document.getElementById('previous-month-title');

    // --- VARIÁVEIS DE ESTADO ---
    let trendChart;
    let categoryPieChart;
    let deferredInstallPrompt;
    let isEditMode = false;
    let notificationTimeout;
    let previousDailyCancellations = 0;
    const themes = ['tech', 'dark', 'light', 'mint', 'sunset', 'graphite'];
    let dailyCopyCount = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    // --- CONSTANTES ---
    const DAILY_PROTOCOL_GOAL = 50;
    const MONTHLY_PROTOCOL_GOAL = 1300;
    const TOTAL_WORKING_DAYS = 26;
    const MIN_SWIPE_DISTANCE = 50;

    // --- ESTRUTURAS DE DADOS (Estado local) ---
    let metas = [];
    let allCases = [];
    let baseSalary = 0;
    let history = [];
    let categoryCounts = {};
    let unlockedAchievements = {};
    let reminderSettings = { enabled: false, time: '18:00' };
    let usedStatuses = new Set();
    let usedQuickResponses = new Set();
    let dailyLogbook = {};
    
    // --- FUNÇÕES DE UTILIDADE ---
    const vibrate = () => { if ('vibrate' in navigator) navigator.vibrate(50); };
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 3000);
        }, 3000);
    }
    const parseDate = (str) => {
        try {
            const [day, month, year] = str.split('/').map(Number);
            return new Date(year, month - 1, day);
        } catch (e) {
            return new Date();
        }
    };
    const getTodayDateString = () => new Date().toLocaleDateString('pt-BR');

    // --- LÓGICA DE CARREGAMENTO E AUTENTICAÇÃO ---
    function showLoading(message) {
        loadingOverlay.querySelector('p').textContent = message;
        loadingOverlay.style.display = 'flex';
    }
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log("Usuário autenticado:", userId);
            await loadDataFromFirebase();
            appContainer.style.visibility = 'visible'; // Mostra o app após carregar dados
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Erro na autenticação anônima:", error);
                alert("Não foi possível conectar. Verifique sua conexão e atualize a página.");
            }
        }
    });

    // --- SINCRONIZAÇÃO COM FIREBASE ---
    async function loadDataFromFirebase() {
        if (!userId) {
            showToast("Erro de autenticação.", "danger");
            return;
        }
        showLoading("Sincronizando dados...");
        const docRef = doc(db, "users", userId);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                metas = data.metas || [{ id: 1, target: 10, reward: 0.24 }];
                allCases = data.allCases || [];
                baseSalary = data.baseSalary || 0;
                history = data.history || [];
                categoryCounts = data.categoryCounts || {};
                unlockedAchievements = data.unlockedAchievements || {};
                reminderSettings = data.reminderSettings || { enabled: false, time: '18:00' };
                usedStatuses = new Set(data.usedStatuses || []);
                usedQuickResponses = new Set(data.usedQuickResponses || []);
                dailyLogbook = data.dailyLogbook || {};
            } else {
                metas = [{ id: 1, target: 10, reward: 0.24 }];
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            showToast("Falha ao carregar dados da nuvem.", "danger");
        } finally {
            loadLocalData();
            updateAll();
            hideLoading();
        }
    }

    async function saveDataToFirebase() {
        if (!userId) {
            showToast("Erro de autenticação. Não é possível salvar.", "danger");
            return;
        }
        showLoading("Sincronizando...");
        saveDailyState();
        const docRef = doc(db, "users", userId);
        const dataToSave = {
            metas, allCases, baseSalary, history, categoryCounts,
            unlockedAchievements, reminderSettings, dailyLogbook,
            usedStatuses: Array.from(usedStatuses),
            usedQuickResponses: Array.from(usedQuickResponses),
            lastUpdated: serverTimestamp()
        };
        try {
            await setDoc(docRef, dataToSave, { merge: true });
            showToast("Progresso sincronizado com a nuvem!", "success");
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            showToast("Falha ao sincronizar.", "danger");
        } finally {
            hideLoading();
        }
    }
    
    // --- DADOS LOCAIS (PROGRESSO DO DIA) ---
    function loadLocalData() {
        const todayStr = getTodayDateString();
        const lastUsedDate = localStorage.getItem('lastUsedDate');
        
        let dailyCount = 0;
        let dailyProtocols = 0;
        dailyCopyCount = 0;

        if (todayStr === lastUsedDate) {
            dailyCount = parseInt(localStorage.getItem('dailyCancellationsCount')) || 0;
            dailyProtocols = parseInt(localStorage.getItem('protocolosAnalisadosCount')) || 0;
            dailyCopyCount = parseInt(localStorage.getItem('dailyCopyCount')) || 0;
        } else {
            localStorage.removeItem('dailyCancellationsCount');
            localStorage.removeItem('protocolosAnalisadosCount');
            localStorage.removeItem('dailyCopyCount');
        }
        
        dailyCancellationsInput.value = dailyCount;
        protocolosAnalisadosInput.value = dailyProtocols;
        previousDailyCancellations = dailyCount;
        
        localStorage.setItem('lastUsedDate', todayStr);

        atendimentosInput.value = history.length > 0 ? history[history.length - 1].atendimentos : 0;
        baseSalaryInput.value = baseSalary > 0 ? baseSalary : '';
        reminderEnabledInput.checked = reminderSettings.enabled;
        reminderTimeInput.value = reminderSettings.time;

        logbookTextarea.value = dailyLogbook[todayStr] || '';
    }
    
    function saveDailyState() {
        const date = getTodayDateString();
        const newEntry = { 
            date, 
            atendimentos: parseInt(atendimentosInput.value) || 0,
            dailyCancellations: parseInt(dailyCancellationsInput.value) || 0,
            protocols: parseInt(protocolosAnalisadosInput.value) || 0
        };
        
        const todayIndex = history.findIndex(entry => entry.date === date);
        if (todayIndex > -1) { 
            history[todayIndex] = newEntry;
        } else { 
            history.push(newEntry); 
        }
        history.sort((a, b) => parseDate(a.date) - parseDate(b.date));
        
        localStorage.setItem('protocolosAnalisadosCount', protocolosAnalisadosInput.value);
        localStorage.setItem('dailyCancellationsCount', dailyCancellationsInput.value);
        localStorage.setItem('dailyCopyCount', dailyCopyCount);

        unlockAchievement('achieve-first-save', 'Primeiro progresso sincronizado!');
    }
    
    // --- FUNÇÕES DE ATUALIZAÇÃO E RENDERIZAÇÃO ---
    function updateAll() {
        updateMetasUI();
        updateSummary();
        updateCategorySummary();
        updateCharts();
        updateAchievements();
        renderAllCases(allCases);
        updateProtocolGoals();
        updateDailyMission();
        populateMonthSelector();
        updateHistoryList();
    }

    function updateMetasUI() {
        metasContainer.innerHTML = '';
        metas.forEach(meta => {
            const atingido = (parseInt(atendimentosInput.value) || 0) >= meta.target;
            const progresso = Math.min(((parseInt(atendimentosInput.value) || 0) / meta.target) * 100, 100);

            const metaEl = document.createElement('div');
            metaEl.className = 'meta-item';
            metaEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold;">Meta: ${meta.target} cancelamentos</span>
                    <span style="color: ${atingido ? 'var(--success-color)' : 'var(--text-secondary-color)'}; font-size: 12px;">Prêmio: ${meta.reward}%</span>
                </div>
                <div class="progress-bar-background">
                    <div class="progress-bar-fill ${atingido ? 'completed' : ''}" style="width: ${progresso}%;"></div>
                </div>
            `;
            metasContainer.appendChild(metaEl);
        });
    }

    function updateSummary() {
        const totalAtendimentos = parseInt(atendimentosInput.value) || 0;
        let bonusPercent = 0;
        let nextMetaTarget = Infinity;
        let nextMetaPercent = 0;

        metas.sort((a,b) => a.target - b.target).forEach(meta => {
            if (totalAtendimentos >= meta.target) {
                bonusPercent = Math.max(bonusPercent, meta.reward);
            } else if (meta.target < nextMetaTarget) {
                nextMetaTarget = meta.target;
                nextMetaPercent = meta.reward;
            }
        });

        const bonusCalculado = (baseSalary * (bonusPercent / 100));
        bonusValueEl.textContent = `R$ ${bonusCalculado.toFixed(2)}`;
        bonusFormulaEl.textContent = `(${bonusPercent}% de R$ ${baseSalary.toFixed(2)})`;

        if (nextMetaTarget !== Infinity) {
            const faltam = nextMetaTarget - totalAtendimentos;
            summaryText.innerHTML = `Você ganhou <strong>R$ ${bonusCalculado.toFixed(2)}</strong>. Faltam <strong>${faltam}</strong> para o próximo prêmio de <strong>${nextMetaPercent}%</strong>.`;
            summaryText.className = 'summary-box';
        } else {
            summaryText.innerHTML = `Parabéns! Você atingiu a meta máxima e ganhou <strong>R$ ${bonusCalculado.toFixed(2)}</strong>!`;
            summaryText.className = 'summary-box completed';
        }
        
        if (totalAtendimentos >= 100) unlockAchievement('achieve-100-cancellations', 'Veterano: 100 cancelamentos no mês!');
        if (totalAtendimentos >= 200) unlockAchievement('achieve-200-cancellations', 'Expert: 200 cancelamentos no mês!');
        if (bonusPercent > 0) unlockAchievement('achieve-bonus1', 'Comissão desbloqueada!');
        if (bonusPercent === Math.max(...metas.map(m => m.reward))) unlockAchievement('achieve-max-bonus', 'Meta máxima atingida!');
    }
    
    function updateCategorySummary() {
        categorySummaryList.innerHTML = '';
        const sortedCategories = Object.entries(categoryCounts).sort((a,b) => b[1] - a[1]);
        
        if(sortedCategories.length === 0){
            categorySummaryList.innerHTML = '<li>Nenhuma categoria registrada ainda.</li>';
            return;
        }

        sortedCategories.forEach(([category, count]) => {
            const li = document.createElement('li');
            li.textContent = `${category}: ${count}`;
            categorySummaryList.appendChild(li);
        });
        
        if(Object.keys(categoryCounts).length >= 5) unlockAchievement('achieve-all-categories', 'Analista: Usou 5 categorias diferentes!');
    }

    function updateCharts() {
        const labels = history.map(h => h.date);
        const dailyData = history.map(h => h.dailyCancellations);
        const protocolData = history.map(h => h.protocols);

        if (trendChart) trendChart.destroy();
        trendChart = new Chart(trendChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cancelamentos por Dia',
                    data: dailyData,
                    borderColor: 'var(--primary-color)',
                    tension: 0.2
                }, {
                    label: 'Protocolos por Dia',
                    data: protocolData,
                    borderColor: 'var(--info-color)',
                    tension: 0.2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const categoryLabels = Object.keys(categoryCounts);
        const categoryData = Object.values(categoryCounts);
        if (categoryPieChart) categoryPieChart.destroy();
        categoryPieChart = new Chart(categoryPieChartCanvas, {
            type: 'pie',
            data: {
                labels: categoryLabels,
                datasets: [{
                    data: categoryData,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function updateProtocolGoals() {
        const dailyCount = parseInt(protocolosAnalisadosInput.value) || 0;
        const monthlyTotal = history.reduce((acc, curr) => acc + (curr.protocols || 0), 0);
        
        const dailyProgress = Math.min((dailyCount / DAILY_PROTOCOL_GOAL) * 100, 100);
        const monthlyProgress = Math.min((monthlyTotal / MONTHLY_PROTOCOL_GOAL) * 100, 100);

        protocolGoalsContainer.innerHTML = `
            <div class="meta-item">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span>Meta Diária: ${dailyCount}/${DAILY_PROTOCOL_GOAL}</span>
                </div>
                <div class="progress-bar-background">
                    <div class="progress-bar-fill ${dailyCount >= DAILY_PROTOCOL_GOAL ? 'completed': ''}" style="width: ${dailyProgress}%;"></div>
                </div>
            </div>
            <div class="meta-item">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span>Meta Mensal: ${monthlyTotal}/${MONTHLY_PROTOCOL_GOAL}</span>
                </div>
                <div class="progress-bar-background">
                    <div class="progress-bar-fill ${monthlyTotal >= MONTHLY_PROTOCOL_GOAL ? 'completed': ''}" style="width: ${monthlyProgress}%;"></div>
                </div>
            </div>
        `;
        if (dailyCount >= 50) unlockAchievement('achieve-50-protocols', 'Focado: 50 protocolos em um dia!');
        if (monthlyTotal >= MONTHLY_PROTOCOL_GOAL) unlockAchievement('achieve-monthly-protocol-goal', 'Maratonista: Meta mensal de protocolos atingida!');
    }
    
    function updateDailyMission() {
        const dailyProtocols = parseInt(protocolosAnalisadosInput.value) || 0;
        const missions = [
            { text: `Analisar ${DAILY_PROTOCOL_GOAL} protocolos.`, completed: dailyProtocols >= DAILY_PROTOCOL_GOAL },
            { text: 'Registrar pelo menos 1 caso.', completed: allCases.length > 0 },
            { text: 'Salvar o progresso na nuvem.', completed: unlockedAchievements['achieve-first-save'] }
        ];

        dailyMissionList.innerHTML = missions.map(mission => 
            `<li class="${mission.completed ? 'completed' : ''}">${mission.text}</li>`
        ).join('');
    }
    
    function updateHistoryList() {
        historyListEl.innerHTML = [...history].reverse().map(h => 
            `<li><strong>${h.date}:</strong> ${h.dailyCancellations} canc. / ${h.protocols} protoc.</li>`
        ).join('');
    }

    // --- LÓGICA DE CONQUISTAS ---
    function unlockAchievement(id, message) {
        if (!unlockedAchievements[id]) {
            unlockedAchievements[id] = true;
            const achievementEl = document.getElementById(id);
            if(achievementEl) achievementEl.classList.add('unlocked');
            showToast(`🏆 ${message}`, 'gold');
            vibrate();
        }
    }

    function updateAchievements() {
        for (const id in unlockedAchievements) {
            const el = document.getElementById(id);
            if (el) el.classList.add('unlocked');
        }
    }
    
    // --- LÓGICA DE CASOS ---
    function renderAllCases(casesToRender) {
        casesListContainer.innerHTML = '';
        if (casesToRender.length === 0) {
            casesListContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary-color);">Nenhum caso registrado.</p>';
            return;
        }
        casesToRender.forEach(caseData => {
            const caseEl = createCaseElement(caseData);
            casesListContainer.appendChild(caseEl);
        });
    }

    function createCaseElement(caseData) {
        const div = document.createElement('div');
        div.className = 'case-entry';
        div.dataset.id = caseData.id;
        div.innerHTML = `
            <div class="case-main-content">
                <button class="expand-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div class="case-fields">
                    <div class="field-group">
                        <span class="status-indicator status-${caseData.status}"></span>
                        <input type="text" value="${caseData.protocol}" placeholder="Protocolo" class="case-protocol-input" readonly>
                        <button class="button copy-btn">Copiar</button>
                    </div>
                </div>
            </div>
            <div class="case-details-content">
                <select class="case-status-select">
                    <option value="Pendente" ${caseData.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Em-Andamento" ${caseData.status === 'Em-Andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="Resolvido" ${caseData.status === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
                </select>
                <textarea class="case-details-textarea" placeholder="Detalhes...">${caseData.details}</textarea>
                <div class="details-actions">
                    <button class="button save-case-btn">Salvar</button>
                    <button class="button reset-button delete-case-btn">Excluir</button>
                </div>
            </div>
        `;
        // Adicionar event listeners para os elementos do caso
        return div;
    }
    
    // --- EVENT LISTENERS ---
    
    // Listeners de input para atualização em tempo real
    [dailyCancellationsInput, atendimentosInput, protocolosAnalisadosInput].forEach(input => {
        input.addEventListener('input', () => {
            saveDailyState();
            updateAll();
        });
    });

    incrementButton.addEventListener('click', () => {
        const currentValue = parseInt(dailyCancellationsInput.value) || 0;
        dailyCancellationsInput.value = currentValue + 1;
        const category = categorySelect.value;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        saveDailyState();
        updateAll();
        vibrate();
    });

    incrementProtocolosButton.addEventListener('click', () => {
        const currentValue = parseInt(protocolosAnalisadosInput.value) || 0;
        protocolosAnalisadosInput.value = currentValue + 1;
        saveDailyState();
        updateAll();
        vibrate();
    });

    // Modal de Configurações
    settingsButton.addEventListener('click', () => settingsModal.style.display = 'block');
    closeSettingsModal.addEventListener('click', () => settingsModal.style.display = 'none');
    
    // Modal de Senhas
    senhasButton.addEventListener('click', () => senhasModal.style.display = 'block');
    closeSenhasModal.addEventListener('click', () => senhasModal.style.display = 'none');

    window.addEventListener('click', (e) => {
        if (e.target == settingsModal) settingsModal.style.display = 'none';
        if (e.target == senhasModal) senhasModal.style.display = 'none';
    });

    // Abas
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    saveButton.addEventListener('click', saveDataToFirebase);
    reportMonthSelect.addEventListener('change', generateReport);
    exportPdfButton.addEventListener('click', exportReportAsPDF);
});

