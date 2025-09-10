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

// --- VARIÁVEIS GLOBAIS ---
let app, auth, db, userId = null;
let inactivityTimer;
let trendChart, categoryPieChart;

// --- ESTRUTURAS DE DADOS (Estado local) ---
let metas = [], allCases = [], history = [], categoryCounts = {}, unlockedAchievements = {}, dailyLogbook = {};
let baseSalary = 0;
let reminderSettings = { enabled: false, time: '18:00' };
let usedStatuses = new Set(), usedQuickResponses = new Set();
let previousDailyCancellations = 0, dailyCopyCount = 0;
let isEditMode = false;
let deferredInstallPrompt;

// --- CONSTANTES ---
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const DAILY_PROTOCOL_GOAL = 50;
const MONTHLY_PROTOCOL_GOAL = 1300;
const TOTAL_WORKING_DAYS = 26;
const MIN_SWIPE_DISTANCE = 50;
const THEMES = ['tech', 'dark', 'light', 'mint', 'sunset', 'graphite'];

// --- FUNÇÃO PRINCIPAL E PONTO DE ENTRADA ---
document.addEventListener('DOMContentLoaded', main);

function main() {
    // --- SELETORES DE ELEMENTOS ---
    const loadingOverlay = document.getElementById('loading-overlay');
    const dailyCancellationsInput = document.getElementById('dailyCancellationsInput');
    const atendimentosInput = document.getElementById('atendimentosInput');
    const protocolosAnalisadosInput = document.getElementById('protocolosAnalisadosInput');
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
    const pinLockScreen = document.getElementById('pin-lock-screen');
    const pinContainer = pinLockScreen.querySelector('.pin-container');
    const pinTitle = document.getElementById('pin-title');
    const pinSubtitle = document.getElementById('pin-subtitle');
    const pinInputs = pinLockScreen.querySelectorAll('.pin-digit');
    const pinError = document.getElementById('pin-error');
    const appContainer = document.getElementById('app-container');
    const pinResetButton = document.getElementById('pin-reset-button');
    const reportMonthSelect = document.getElementById('report-month-select');
    const exportPdfButton = document.getElementById('export-pdf-button');
    const currentMonthSummaryEl = document.getElementById('current-month-summary');
    const previousMonthComparisonEl = document.getElementById('previous-month-comparison');
    const currentMonthTitleEl = document.getElementById('current-month-title');
    const previousMonthTitleEl = document.getElementById('previous-month-title');

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

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                showLoading("Verificando segurança...");
                await checkPin();
            } else {
                showLoading("Conectando ao servidor...");
                await signInAnonymously(auth);
            }
        });
    } catch (error) {
        console.error("Falha CRÍTICA ao inicializar o Firebase.", error);
        alert("Erro grave na configuração do Firebase. O aplicativo não pode iniciar.");
    }
    
    // --- LÓGICA DE PIN E INATIVIDADE ---
    function lockApp() {
        pinLockScreen.style.visibility = 'visible';
        pinLockScreen.style.opacity = '1';
        appContainer.style.visibility = 'hidden';
        clearTimeout(inactivityTimer);
        clearPinInputs();
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(lockApp, INACTIVITY_TIMEOUT);
    }

    async function unlockApp() {
        pinLockScreen.style.opacity = '0';
        pinLockScreen.style.visibility = 'hidden';
        appContainer.style.visibility = 'visible';
        
        await loadDataFromFirebase();
        
        resetInactivityTimer();
        ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            window.addEventListener(event, resetInactivityTimer, { passive: true });
        });
    }
    
    async function handlePinInput() {
        let pinSetupStep = 1;
        let firstPin = "";
        const pin = Array.from(pinInputs).map(input => input.value).join('');
        if (pin.length !== 4) return;

        const storedPin = localStorage.getItem('appPin');

        if (!storedPin) {
             if (pinSetupStep === 1) {
                firstPin = pin;
                pinSetupStep = 2;
                pinTitle.textContent = "Confirme o seu PIN";
                pinSubtitle.textContent = "Introduza novamente o PIN de 4 dígitos.";
                clearPinInputs();
            } else {
                if (pin === firstPin) {
                    localStorage.setItem('appPin', pin);
                    showToast('PIN criado com sucesso!', 'success');
                    await unlockApp();
                } else {
                    pinError.textContent = "Os PINs não coincidem. Tente novamente.";
                    pinContainer.classList.add('shake');
                    setTimeout(() => pinContainer.classList.remove('shake'), 500);
                    clearPinInputs();
                    pinSetupStep = 1;
                    pinTitle.textContent = "Criar PIN de Acesso";
                    pinSubtitle.textContent = "Crie um PIN de 4 dígitos para proteger seus dados.";
                    firstPin = "";
                }
            }
        } else {
            if (pin === storedPin) {
                await unlockApp();
            } else {
                pinError.textContent = "PIN incorreto. Tente novamente.";
                pinContainer.classList.add('shake');
                setTimeout(() => pinContainer.classList.remove('shake'), 500);
                clearPinInputs();
            }
        }
    }

    function clearPinInputs() {
        pinInputs.forEach(input => input.value = '');
        pinInputs[0]?.focus();
        pinError.textContent = "";
    }
    
    async function checkPin() {
        const storedPin = localStorage.getItem('appPin');
        hideLoading();
        
        if (!storedPin) {
            lockApp();
            return;
        }

        pinTitle.textContent = "Introduza o seu PIN";
        pinSubtitle.textContent = "Introduza o seu PIN de 4 dígitos para aceder.";
        pinResetButton.style.display = 'block';

        const lastActive = parseInt(localStorage.getItem('lastActiveTimestamp')) || 0;
        if (Date.now() - lastActive > INACTIVITY_TIMEOUT) {
            lockApp();
        } else {
            await unlockApp();
        }
    }

    // --- SINCRONIZAÇÃO COM FIREBASE ---
    async function loadDataFromFirebase() {
        if (!userId) { showToast("Erro de autenticação.", "danger"); return; }
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
            console.error("Erro ao carregar dados do Firestore:", error);
            showToast(`Falha ao carregar dados: ${error.message}`, "danger");
        } finally {
            loadLocalData();
            updateAll();
            hideLoading();
        }
    }

    async function saveDataToFirebase() {
        if (!userId) { showToast("Erro de autenticação.", "danger"); return; }
        showLoading("Sincronizando...");
        saveDailyState();
        const dataToSave = {
            metas, allCases, baseSalary, history, categoryCounts,
            unlockedAchievements, reminderSettings, dailyLogbook,
            usedStatuses: Array.from(usedStatuses),
            usedQuickResponses: Array.from(usedQuickResponses),
            lastUpdated: serverTimestamp()
        };
        try {
            await setDoc(doc(db, "users", userId), dataToSave, { merge: true });
            showToast("Progresso sincronizado com a nuvem!", "success");
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            showToast("Falha ao sincronizar.", "danger");
        } finally {
            hideLoading();
        }
    }
    
    // --- LÓGICA DE DADOS LOCAIS (Progresso do dia) ---
    function loadLocalData() {
        const todayStr = getTodayDateString();
        const lastUsedDate = localStorage.getItem('lastUsedDate');
        let dailyCount = 0, dailyProtocols = 0;
        dailyCopyCount = 0;

        if (todayStr === lastUsedDate) {
            dailyCount = parseInt(localStorage.getItem('dailyCancellationsCount')) || 0;
            dailyProtocols = parseInt(localStorage.getItem('protocolosAnalisadosCount')) || 0;
            dailyCopyCount = parseInt(localStorage.getItem('dailyCopyCount')) || 0;
        }
        
        dailyCancellationsInput.value = dailyCount;
        protocolosAnalisadosInput.value = dailyProtocols;
        previousDailyCancellations = dailyCount;
        
        localStorage.setItem('lastUsedDate', todayStr);
        atendimentosInput.value = history.find(h => h.date === todayStr)?.atendimentos || history[history.length-1]?.atendimentos || 0;
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
        if (todayIndex > -1) { history[todayIndex] = newEntry; } 
        else { history.push(newEntry); }
        history.sort((a, b) => parseDate(a.date) - parseDate(b.date));
        
        localStorage.setItem('protocolosAnalisadosCount', newEntry.protocols);
        localStorage.setItem('dailyCancellationsCount', newEntry.dailyCancellations);
        localStorage.setItem('dailyCopyCount', dailyCopyCount);
        unlockAchievement('achieve-first-save', 'Primeiro progresso guardado!');
    }

    // O resto do seu código (funções de UI, relatórios, event listeners) continua aqui...
    // Esta parte é idêntica à versão anterior e não precisa de alterações.
}

