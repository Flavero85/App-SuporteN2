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
let userId = null;

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PWA ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('ServiceWorker registado:', reg.scope))
                .catch(err => console.error('Falha no registo do ServiceWorker:', err));
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
    const themes = ['tech', 'dark', 'light', 'mint', 'sunset', 'graphite'];
    let dailyCopyCount = 0;

    // --- ESTRUTURAS DE DADOS ---
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
    const getTodayDateString = () => new Date().toLocaleDateString('pt-BR');
    
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
            console.log("Utilizador autenticado:", userId);
            appContainer.style.visibility = 'visible';
            await loadDataFromFirebase();
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Erro na autenticação anónima:", error);
                alert("Não foi possível conectar. Verifique a sua conexão e atualize a página.");
            }
        }
    });

    // --- SINCRONIZAÇÃO COM FIREBASE ---
    async function loadDataFromFirebase() {
        if (!userId) {
            showToast("Erro de autenticação.", "danger");
            return;
        }
        showLoading("A sincronizar dados...");
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
            showToast("Erro de autenticação. Não é possível guardar.", "danger");
            return;
        }
        showLoading("A sincronizar...");
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
            console.error("Erro ao guardar dados:", error);
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
        history.sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));
        
        localStorage.setItem('protocolosAnalisadosCount', protocolosAnalisadosInput.value);
        localStorage.setItem('dailyCancellationsCount', dailyCancellationsInput.value);
        localStorage.setItem('dailyCopyCount', dailyCopyCount);

        unlockAchievement('achieve-first-save', 'Primeiro progresso sincronizado!');
    }
    
    // --- Funções de atualização da UI e Lógica de Negócio ---
    function updateAll() {
        // Todas as suas funções de atualização e renderização vão aqui
        updateMetasUI();
        updateSummary();
        renderHistory();
        updateCategorySummary();
        updateCharts();
        updateAchievements();
        renderAllCases(allCases);
        // ...e as outras
    }
    
    function updateMetasUI() {
        // Implementação completa da sua função
    }

    function updateSummary() {
         // Implementação completa da sua função
    }
    
    function renderHistory() {
        // Implementação completa da sua função
    }

    function updateCategorySummary() {
         // Implementação completa da sua função
    }

    function updateCharts() {
         // Implementação completa da sua função
    }

    function updateAchievements() {
         // Implementação completa da sua função
    }
    
    function unlockAchievement(id, message) {
        if (!unlockedAchievements[id]) {
            unlockedAchievements[id] = true;
            showToast(`🏆 ${message}`, 'gold');
            updateAchievements();
        }
    }

    function renderAllCases(casesToRender) {
        // Implementação completa da sua função
    }

    // ... e todas as outras funções do seu script original

    // --- EVENT LISTENERS ---
    saveButton.addEventListener('click', saveDataToFirebase);
    
    settingsButton.addEventListener('click', () => { settingsModal.style.display = 'block'; });
    closeSettingsModal.addEventListener('click', () => { settingsModal.style.display = 'none'; });
    
    window.addEventListener('click', (e) => {
        if (e.target == settingsModal) settingsModal.style.display = 'none';
        if (e.target == senhasModal) senhasModal.style = 'none';
    });

    atendimentosInput.addEventListener('input', updateAll);
    dailyCancellationsInput.addEventListener('input', updateAll);
    protocolosAnalisadosInput.addEventListener('input', updateAll);
    
    incrementButton.addEventListener('click', () => {
        dailyCancellationsInput.value = parseInt(dailyCancellationsInput.value || 0) + 1;
        updateAll();
    });

    incrementProtocolosButton.addEventListener('click', () => {
        protocolosAnalisadosInput.value = parseInt(protocolosAnalisadosInput.value || 0) + 1;
        updateAll();
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        baseSalary = parseFloat(baseSalaryInput.value) || 0;
        
        const newMetas = [];
        const metaRows = settingsMetasContainer.querySelectorAll('.meta-row');
        metaRows.forEach((row, index) => {
            const target = row.querySelector('input[name="target"]').value;
            const reward = row.querySelector('input[name="reward"]').value;
            if(target && reward) {
                newMetas.push({
                    id: index + 1,
                    target: parseInt(target),
                    reward: parseFloat(reward) / 100
                });
            }
        });
        metas = newMetas;
        
        reminderSettings.enabled = reminderEnabledInput.checked;
        reminderSettings.time = reminderTimeInput.value;

        updateAll();
        saveDataToFirebase();
        settingsModal.style.display = 'none';
        showToast("Configurações guardadas!", "success");
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const tabName = e.currentTarget.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });

    // Adicione aqui TODOS os outros event listeners do seu ficheiro original
    // para garantir que tudo funcione.
});

