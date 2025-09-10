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
                .then(reg => console.log('ServiceWorker registado:', reg.scope))
                .catch(err => console.error('Falha no registo do ServiceWorker:', err));
        });
    }

    // --- SELETORES DE ELEMENTOS ---
    const loadingOverlay = document.getElementById('loading-overlay');
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
    let pinSetupStep = 1;
    let firstPin = "";
    let inactivityTimer;

    // --- CONSTANTES ---
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
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
            console.log("Utilizador autenticado:", userId);
            await checkPin();
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error("Erro na autenticação anónima:", error);
                alert("Não foi possível conectar. Verifique a sua conexão e atualize a página.");
            }
        }
    });

    // --- LÓGICA DE PIN E INATIVIDADE ---
    function lockApp() {
        pinLockScreen.style.visibility = 'visible';
        pinLockScreen.style.opacity = '1';
        appContainer.style.visibility = 'hidden';
        clearTimeout(inactivityTimer);
        clearPinInputs();
        if(pinInputs.length > 0) pinInputs[0].focus();
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(lockApp, INACTIVITY_TIMEOUT);
        localStorage.setItem('lastActiveTimestamp', Date.now());
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
                    pinSubtitle.textContent = "Crie um PIN de 4 dígitos para proteger os seus dados.";
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
        if(pinInputs.length > 0) pinInputs[0].focus();
        pinError.textContent = "";
    }
    
    async function checkPin() {
        showLoading("A verificar segurança...");
        const storedPin = localStorage.getItem('appPin');
        hideLoading();
        
        if (!storedPin) {
            pinTitle.textContent = "Criar PIN de Acesso";
            pinSubtitle.textContent = "Crie um PIN de 4 dígitos para proteger os seus dados.";
            pinResetButton.style.display = 'none';
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

    // --- MÓDULO DE RELATÓRIOS ---
    function populateMonthSelector() {
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const availableMonths = new Set();
        history.forEach(h => {
            const date = parseDate(h.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            availableMonths.add(monthKey);
        });

        if (availableMonths.size === 0) {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
            availableMonths.add(monthKey);
        }

        const sortedMonths = Array.from(availableMonths).sort().reverse();
        reportMonthSelect.innerHTML = sortedMonths.map(key => {
            const [year, month] = key.split('-');
            const monthName = monthNames[parseInt(month)];
            return `<option value="${key}">${monthName} de ${year}</option>`;
        }).join('');
        generateReport();
    }
    
    function generateReport() {
        const selectedKey = reportMonthSelect.value;
        if (!selectedKey) {
            currentMonthSummaryEl.innerHTML = "<p>Nenhum dado para o período selecionado.</p>";
            previousMonthComparisonEl.innerHTML = "";
            return;
        }
    
        const [year, month] = selectedKey.split('-').map(Number);
    
        const currentMonthData = getMonthData(year, month);
        const previousMonthData = getMonthData(year, month - 1);
    
        currentMonthTitleEl.textContent = `Resumo de ${reportMonthSelect.options[reportMonthSelect.selectedIndex].text}`;
        previousMonthTitleEl.textContent = `Comparativo com ${getMonthName(month - 1, year)}`;
    
        renderReportSection(currentMonthSummaryEl, currentMonthData);
        renderComparisonSection(previousMonthComparisonEl, currentMonthData, previousMonthData);
    }
    
    function getMonthData(year, month) {
        let prevYear = year;
        let prevMonth = month;
        if (month === 0) {
            prevMonth = 11;
            prevYear -= 1;
        } else {
            prevMonth -= 1;
        }

        const monthHistory = history.filter(h => {
            const date = parseDate(h.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });
    
        if (monthHistory.length === 0) return { totalCancellations: 0, totalProtocols: 0, avgProtocols: 0, mostFrequentCategory: "N/A", daysWorked: 0 };
    
        const lastDayOfMonth = monthHistory[monthHistory.length - 1];
        
        const historyOfPreviousMonth = history.filter(h => {
            const date = parseDate(h.date);
            return date.getFullYear() === prevYear && date.getMonth() === prevMonth;
        });

        const lastDayOfPreviousMonth = historyOfPreviousMonth.length > 0 ? historyOfPreviousMonth[historyOfPreviousMonth.length-1] : {atendimentos: 0};
        
        const totalCancellations = lastDayOfMonth.atendimentos - (lastDayOfPreviousMonth.atendimentos || 0);
        const totalProtocols = monthHistory.reduce((sum, h) => sum + h.protocols, 0);
        const daysWorked = monthHistory.length;
        const avgProtocols = daysWorked > 0 ? (totalProtocols / daysWorked).toFixed(1) : 0;
    
        const monthCategories = { ...categoryCounts };
        const mostFrequentCategory = Object.keys(monthCategories).length > 0
            ? Object.entries(monthCategories).sort((a, b) => b[1] - a[1])[0][0]
            : "N/A";
    
        return { totalCancellations, totalProtocols, avgProtocols, mostFrequentCategory, daysWorked };
    }
    
    function renderReportSection(element, data) {
        element.innerHTML = `
            ${createSummaryItem("Cancelamentos no Mês", data.totalCancellations)}
            ${createSummaryItem("Protocolos no Mês", data.totalProtocols)}
            ${createSummaryItem("Média Diária de Protocolos", data.avgProtocols)}
            ${createSummaryItem("Dias Trabalhados", data.daysWorked)}
            ${createSummaryItem("Categoria Frequente", data.mostFrequentCategory, false)}
        `;
    }

    function renderComparisonSection(element, current, previous) {
         if (previous.daysWorked === 0) {
            element.innerHTML = "<p>Sem dados do mês anterior para comparar.</p>";
            return;
        }
        element.innerHTML = `
            ${createSummaryItem("Cancelamentos", getComparison(current.totalCancellations, previous.totalCancellations), true)}
            ${createSummaryItem("Protocolos", getComparison(current.totalProtocols, previous.totalProtocols), true)}
            ${createSummaryItem("Média de Protocolos", getComparison(current.avgProtocols, previous.avgProtocols), true)}
            ${createSummaryItem("Dias Trabalhados", getComparison(current.daysWorked, previous.daysWorked), true)}
        `;
    }

    function createSummaryItem(label, value, isComparison = false) {
        if(isComparison){
            return `
                <div class="summary-item">
                    <div class="label">${label}</div>
                    <div class="value ${value.class}">${value.text}</div>
                    <div class="comparison neutral">(vs ${value.previous})</div>
                </div>
            `;
        }
        return `
            <div class="summary-item">
                <div class="label">${label}</div>
                <div class="value">${value}</div>
            </div>
        `;
    }

    function getComparison(current, previous) {
        const currentNum = parseFloat(current);
        const previousNum = parseFloat(previous);
        const diff = currentNum - previousNum;
        let percentage = 0;
        if (previousNum !== 0) {
            percentage = (diff / previousNum) * 100;
        } else if (currentNum > 0) {
            percentage = 100;
        }

        let text, cssClass;
        if (diff > 0) {
            text = `+${diff.toFixed(1)} (${percentage.toFixed(0)}%)`;
            cssClass = "positive";
        } else if (diff < 0) {
            text = `${diff.toFixed(1)} (${percentage.toFixed(0)}%)`;
            cssClass = "negative";
        } else {
            text = "0 (0%)";
            cssClass = "neutral";
        }
        return { text: text, class: cssClass, previous: previousNum.toFixed(1) };
    }

    function getMonthName(monthIndex, year) {
        const date = new Date(year, monthIndex, 1);
        return date.toLocaleString('pt-BR', { month: 'long' });
    }

    async function exportReportAsPDF() {
        showLoading("A gerar PDF...");
        const reportContent = document.getElementById('report-content');
        const canvas = await html2canvas(reportContent, {
            scale: 2,
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--main-bg').trim()
        });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`relatorio_${reportMonthSelect.value}.pdf`);
        hideLoading();
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
    }
    
    function updateMetasUI() {}
    function updateSummary() {}
    function updateCategorySummary() {}
    function updateCharts() {}
    function updateAchievements() {}
    function unlockAchievement(id, message) {}
    function renderAllCases(casesToRender) {}
    function updateProtocolGoals() {}
    function updateDailyMission() {}
    
    // --- EVENT LISTENERS ---
    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
            handlePinInput();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    pinResetButton.addEventListener('click', () => {
        if (confirm("Tem a certeza que quer redefinir o seu PIN? Esta ação irá apagar TODOS os dados locais da aplicação (NÃO afeta os dados na nuvem).")) {
            localStorage.clear();
            window.location.reload();
        }
    });
    
    saveButton.addEventListener('click', saveDataToFirebase);
    reportMonthSelect.addEventListener('change', generateReport);
    exportPdfButton.addEventListener('click', exportReportAsPDF);

    settingsButton.addEventListener('click', () => { settingsModal.style.display = 'block'; });
    closeSettingsModal.addEventListener('click', () => { settingsModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target == settingsModal) settingsModal.style.display = 'none';
        if (e.target == senhasModal) senhasModal.style.display = 'none';
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
        saveDataToFirebase();
        settingsModal.style.display = 'none';
        showToast("Configurações guardadas!", "success");
    });
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const tabName = e.currentTarget.dataset.tab;
            const allTabs = document.querySelectorAll('.tab-content');
            allTabs.forEach(tab => {
                if(tab.id === `tab-${tabName}`) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        });
    });
});

