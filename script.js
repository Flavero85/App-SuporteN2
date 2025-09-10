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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let userId = null;

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
    const addMetaButton = document.getElementById('add-meta-button');
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
    const tabButtons = document.querySelectorAll('.tab-button');
    const reportMonthSelect = document.getElementById('report-month-select');
    const exportPdfButton = document.getElementById('export-pdf-button');
    const currentMonthSummaryEl = document.getElementById('current-month-summary');
    const previousMonthComparisonEl = document.getElementById('previous-month-comparison');
    const currentMonthTitleEl = document.getElementById('current-month-title');
    const previousMonthTitleEl = document.getElementById('previous-month-title');

    // --- VARIÁVEIS DE ESTADO ---
    let trendChart, categoryPieChart, deferredInstallPrompt;
    let isEditMode = false;
    let previousDailyCancellations = 0;
    const themes = ['tech', 'dark', 'light', 'mint', 'sunset', 'graphite'];
    let dailyCopyCount = 0;

    // --- CONSTANTES ---
    const DAILY_PROTOCOL_GOAL = 50;
    const MONTHLY_PROTOCOL_GOAL = 1300;
    const TOTAL_WORKING_DAYS = 26;

    // --- ESTRUTURAS DE DADOS ---
    let metas = [], allCases = [], history = [], categoryCounts = {}, unlockedAchievements = {};
    let baseSalary = 0;
    let reminderSettings = { enabled: false, time: '18:00' };
    
    // --- FUNÇÕES DE UTILIDADE ---
    const vibrate = () => { if ('vibrate' in navigator) navigator.vibrate(50); };
    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 3000);
        }, 3000);
    };
    const parseDate = (str) => {
        try {
            const [day, month, year] = str.split('/').map(Number);
            return new Date(year, month - 1, day);
        } catch (e) { return new Date(); }
    };
    const getTodayDateString = () => new Date().toLocaleDateString('pt-BR');

    // --- AUTENTICAÇÃO E CARREGAMENTO DE DADOS ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log("Usuário autenticado:", userId);
            await loadDataFromFirebase();
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Erro na autenticação anônima:", error);
                alert("Não foi possível conectar. Verifique sua conexão e atualize a página.");
            }
        }
    });

    async function loadDataFromFirebase() {
        if (!userId) return;
        showLoading("Carregando dados...");
        const docRef = doc(db, "users", userId);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                metas = data.metas || [{ id: 1, target: 10, reward: 0.0024 }, { id: 2, target: 20, reward: 0.0048 }];
                allCases = data.allCases || [];
                baseSalary = data.baseSalary || 0;
                history = data.history || [];
                categoryCounts = data.categoryCounts || {};
                unlockedAchievements = data.unlockedAchievements || {};
                reminderSettings = data.reminderSettings || { enabled: false, time: '18:00' };
            } else {
                 metas = [{ id: 1, target: 10, reward: 0.0024 }, { id: 2, target: 20, reward: 0.0048 }];
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            showToast("Falha ao carregar dados da nuvem.", "danger");
        } finally {
            loadLocalData();
            updateAllUI();
            appContainer.style.visibility = 'visible';
            hideLoading();
        }
    }

    async function saveDataToFirebase() {
        if (!userId) return;
        showLoading("Sincronizando...");
        saveDailyState(); // Garante que os dados do dia estão no histórico antes de salvar
        const dataToSave = {
            metas, allCases, baseSalary, history, categoryCounts,
            unlockedAchievements, reminderSettings,
        };
        try {
            await setDoc(doc(db, "users", userId), dataToSave, { merge: true });
            showToast("Progresso sincronizado com a nuvem!", "success");
            unlockAchievement('achieve-first-save', 'Primeiro progresso sincronizado!');
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            showToast("Falha ao sincronizar.", "danger");
        } finally {
            hideLoading();
        }
    }

    function loadLocalData() {
        const todayStr = getTodayDateString();
        const lastUsedDate = localStorage.getItem('lastUsedDate');
        if (todayStr === lastUsedDate) {
            dailyCancellationsInput.value = localStorage.getItem('dailyCancellationsCount') || 0;
            protocolosAnalisadosInput.value = localStorage.getItem('protocolosAnalisadosCount') || 0;
            dailyCopyCount = parseInt(localStorage.getItem('dailyCopyCount')) || 0;
        } else {
             localStorage.setItem('dailyCancellationsCount', '0');
             localStorage.setItem('protocolosAnalisadosCount', '0');
             localStorage.setItem('dailyCopyCount', '0');
        }
        previousDailyCancellations = parseInt(dailyCancellationsInput.value) || 0;
        localStorage.setItem('lastUsedDate', todayStr);
        const latestHistory = history.length > 0 ? history[history.length - 1] : null;
        atendimentosInput.value = latestHistory ? latestHistory.atendimentos : 0;
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
        
        localStorage.setItem('dailyCancellationsCount', dailyCancellationsInput.value);
        localStorage.setItem('protocolosAnalisadosCount', protocolosAnalisadosInput.value);
        localStorage.setItem('dailyCopyCount', dailyCopyCount);
    }
    
    // --- ATUALIZAÇÃO DA UI ---
    function updateAllUI() {
        renderMetas();
        updateProtocolProgress();
        updateSummaryAndBonus();
        updateDailyMission();
        renderCases();
        updateProjection();
        renderCategorySummary();
        renderTrendChart();
        renderCategoryPieChart();
        populateMonthSelector();
        renderAchievements();
    }
    
    function renderMetas() {
        metasContainer.innerHTML = '';
        const currentValue = parseInt(atendimentosInput.value) || 0;
        metas.sort((a,b) => a.target - b.target).forEach(meta => {
            const progress = Math.min(100, (currentValue / meta.target) * 100);
            const metaEl = document.createElement('div');
            metaEl.className = 'meta-item';
            metaEl.innerHTML = `
                <div class="meta-header">
                    <span>Faixa ${meta.id}: ${meta.target} (${(meta.reward * 100).toFixed(2)}%)</span>
                    <span>${Math.floor(progress)}%</span>
                </div>
                <div class="progress-bar-background">
                    <div class="progress-bar-fill ${progress >= 100 ? 'completed' : ''}" style="width: ${progress}%;"></div>
                </div>`;
            metasContainer.appendChild(metaEl);
        });
    }

    function updateProtocolProgress() {
        const dailyProtocols = parseInt(protocolosAnalisadosInput.value) || 0;
        const monthlyProtocols = history.reduce((sum, h) => sum + (h.protocols || 0), 0);
        const dailyPercent = Math.min(100, (dailyProtocols / DAILY_PROTOCOL_GOAL) * 100);
        const monthlyPercent = Math.min(100, (monthlyProtocols / MONTHLY_PROTOCOL_GOAL) * 100);
        protocolGoalsContainer.innerHTML = `
            <div class="meta-item">
                <span>Meta Diária Protocolos (${dailyProtocols}/${DAILY_PROTOCOL_GOAL})</span>
                <div class="progress-bar-background"><div class="progress-bar-fill ${dailyPercent>=100 ? 'completed':''}" style="width:${dailyPercent}%"></div></div>
            </div>
            <div class="meta-item">
                <span>Meta Mensal Protocolos (${monthlyProtocols}/${MONTHLY_PROTOCOL_GOAL})</span>
                <div class="progress-bar-background"><div class="progress-bar-fill ${monthlyPercent>=100 ? 'completed':''}" style="width:${monthlyPercent}%"></div></div>
            </div>`;
    }

    function updateSummaryAndBonus() {
        const currentValue = parseInt(atendimentosInput.value) || 0;
        let achievedMeta = null;
        for (let i = metas.length - 1; i >= 0; i--) {
            if (currentValue >= metas[i].target) {
                achievedMeta = metas[i];
                break;
            }
        }
        if (achievedMeta) {
            const bonus = baseSalary * achievedMeta.reward;
            bonusValueEl.textContent = `R$ ${bonus.toFixed(2)}`;
            bonusFormulaEl.textContent = `Atingido: ${(achievedMeta.reward * 100).toFixed(2)}% de R$${baseSalary}`;
            const nextMeta = metas.find(m => m.target > achievedMeta.target);
            if (nextMeta) {
                summaryText.innerHTML = `Atingido: <strong>Faixa ${achievedMeta.id}</strong>. Faltam <strong>${nextMeta.target - currentValue}</strong> para a próxima.`;
                summaryText.className = 'summary-box completed';
            } else {
                summaryText.innerHTML = `🏆 <strong>Meta máxima atingida!</strong>`;
                summaryText.className = 'summary-box completed';
            }
        } else {
            bonusValueEl.textContent = 'R$ 0,00';
            bonusFormulaEl.textContent = 'Nenhuma meta atingida';
            const nextMeta = metas[0];
            if (nextMeta) {
                summaryText.innerHTML = `Faltam <strong>${nextMeta.target - currentValue}</strong> para a Faixa 1.`;
                summaryText.className = 'summary-box';
            }
        }
    }
    
    function updateDailyMission() {
        const protocols = parseInt(protocolosAnalisadosInput.value) || 0;
        const dailyCancellations = parseInt(dailyCancellationsInput.value) || 0;
        const missions = [
            { id: 'mission-protocols', text: `Analisar ${DAILY_PROTOCOL_GOAL} protocolos (${protocols}/${DAILY_PROTOCOL_GOAL})`, completed: protocols >= DAILY_PROTOCOL_GOAL },
            { id: 'mission-daily-cancellations', text: `Registrar 6 cancelamentos hoje (${dailyCancellations}/6)`, completed: dailyCancellations >= 6 },
            { id: 'mission-copy-responses', text: `Copiar 20 respostas (${dailyCopyCount}/20)`, completed: dailyCopyCount >= 20 },
            { id: 'mission-new-cases', text: `Adicionar 3 novos casos`, completed: allCases.filter(c => c.date === getTodayDateString()).length >= 3 },
            { id: 'mission-save', text: 'Sincronizar o progresso de hoje', completed: history.some(h => h.date === getTodayDateString()) }
        ];
        dailyMissionList.innerHTML = missions.map(m => `<li class="${m.completed ? 'completed' : ''}">${m.text}</li>`).join('');
    }

    function renderCases(filter = 'all', searchTerm = '') {
        casesListContainer.innerHTML = '';
        const filteredCases = allCases.filter(c => 
            (filter === 'all' || c.status === filter) &&
            (c.protocol.includes(searchTerm) || c.phone.includes(searchTerm))
        );
        filteredCases.forEach(caseItem => {
            const caseEl = document.createElement('div');
            caseEl.className = 'case-entry';
            caseEl.dataset.id = caseItem.id;
            caseEl.innerHTML = `
                <div class="case-main-content">
                    <button class="expand-btn"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
                    <div class="case-fields">
                        <input type="text" class="protocol-input" value="${caseItem.protocol}" placeholder="Protocolo">
                        <input type="text" class="phone-input" value="${caseItem.phone}" placeholder="Telefone">
                    </div>
                    <div class="status-indicator status-${caseItem.status.replace(' ','-')}"></div>
                </div>
                <div class="case-details-content">
                    <textarea class="description-input" placeholder="Descrição...">${caseItem.description}</textarea>
                    <select class="status-select">
                        <option value="Pendente" ${caseItem.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Em Andamento" ${caseItem.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="Resolvido" ${caseItem.status === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
                    </select>
                    <div class="details-actions">
                        <button class="button reset-button remove-case-btn">Excluir</button>
                    </div>
                </div>`;
            casesListContainer.appendChild(caseEl);
        });
    }
    
    function renderSenhas() {
        const senhas = [
            { servico: "SIG", user: "flavio.cardozo@desktop.tec.br", pass: "Suporte N2" },
            { servico: "SalesForce", user: "flavio.cardozo@desktop.tec.br", pass: "@Flavero85" },
            { servico: "Matrix Chat", user: "flavio.cardozo@desktop.tec.br", pass: "Fb5!ji" },
            { servico: "SIS", user: "flavio.cardozo", pass: "@PSLk869" },
            { servico: "ADM", user: "flavio.cardozo@desktop.tec.br", pass: "Flavero1609" },
            { servico: "LG", user: "34792557879", pass: "@Flavero85" },
            { servico: "WebMail", user: "flavio.cardozo@desktop.tec.br", pass: "eWJBP[ar8V" },
            { servico: "NetCore", user: "flavio.cardozo@desktop.tec.br", pass: "Flavero1609" },
            { servico: "URA", user: "agent/11271 9323 RAMAL 2589", pass: "mvjYsE1" },
        ];
        senhasContainer.innerHTML = senhas.map(s => `
            <div class="senha-item">
                <h4>${s.servico}</h4>
                <p><strong>Usuário:</strong> <span class="copyable-credential">${s.user}</span></p>
                <p><strong>Senha:</strong> <span class="copyable-credential">${s.pass}</span></p>
            </div>`).join('');
    }

    // --- EVENT LISTENERS ---
    incrementButton.addEventListener('click', () => {
        dailyCancellationsInput.value = (parseInt(dailyCancellationsInput.value) || 0) + 1;
        atendimentosInput.value = (parseInt(atendimentosInput.value) || 0) + 1;
        categoryCounts[categorySelect.value] = (categoryCounts[categorySelect.value] || 0) + 1;
        saveDailyState();
        updateAllUI();
        vibrate();
    });
    
    // ... (restante dos event listeners completos)

    // --- INICIALIZAÇÃO ---
    loadDataFromFirebase();
});
// --- (Funções de Gráficos e Relatórios completas) ---

