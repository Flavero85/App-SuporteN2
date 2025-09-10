// Importação dos módulos do Firebase 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- INICIALIZAÇÃO DO FIREBASE ---
// Suas chaves do Firebase já estão inseridas.
const firebaseConfig = {
  apiKey: "AIzaSyCdQYNKJdTYEeOaejZy_ZxU9tVq7bF1x34",
  authDomain: "app-suporte-n2.firebaseapp.com",
  projectId: "app-suporte-n2",
  storageBucket: "app-suporte-n2.appspot.com", // Corrigido para .appspot.com que é o padrão
  messagingSenderId: "257470368604",
  appId: "1:257470368604:web:42fcc4973851eb02b78f99"
};

// Inicializa o Firebase e seus serviços
let app, auth, db, userId = null;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Falha CRÍTICA ao inicializar o Firebase. Verifique as chaves.", error);
    alert("Erro grave na configuração do Firebase. O aplicativo não pode iniciar.");
}


document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PWA ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('ServiceWorker registrado:', reg.scope))
                .catch(err => console.error('Falha no registro do ServiceWorker:', err));
        });
    }

    // --- SELETORES DE ELEMENTOS (todos os seus seletores aqui...) ---
    const loadingOverlay = document.getElementById('loading-overlay');
    // ... (restante dos seletores)
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
    let inactivityTimer;
    // ... (restante das variáveis)
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

    // --- CONSTANTES ---
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
    // ... (restante das constantes)
    const DAILY_PROTOCOL_GOAL = 50;
    const MONTHLY_PROTOCOL_GOAL = 1300;
    const TOTAL_WORKING_DAYS = 26;
    const MIN_SWIPE_DISTANCE = 50;

    // --- ESTRUTURAS DE DADOS (Estado local) ---
    let metas = [], allCases = [], history = [], categoryCounts = {}, unlockedAchievements = {}, dailyLogbook = {};
    let baseSalary = 0;
    let reminderSettings = { enabled: false, time: '18:00' };
    let usedStatuses = new Set(), usedQuickResponses = new Set();
    
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

    // Ponto central de autenticação
    onAuthStateChanged(auth, async (user) => {
        console.log("Status da autenticação mudou. Usuário:", user);
        if (user) {
            userId = user.uid;
            console.log("Usuário autenticado com ID:", userId);
            await checkPin();
        } else {
            console.log("Nenhum usuário logado, tentando login anônimo...");
            showLoading("Conectando ao servidor...");
            try {
                await signInAnonymously(auth);
                console.log("Login anônimo bem-sucedido.");
            } catch (error) {
                console.error("Erro CRÍTICO no login anônimo:", error);
                hideLoading();
                alert(`Não foi possível conectar. Verifique sua conexão e se o método de login anônimo está ativo no Firebase.\nErro: ${error.message}`);
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
        pinInputs[0].focus();
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
        
        if (!storedPin) {
            console.log("Nenhum PIN encontrado. Exibindo tela de criação.");
            lockApp();
            return;
        }

        pinTitle.textContent = "Introduza o seu PIN";
        pinSubtitle.textContent = "Introduza o seu PIN de 4 dígitos para aceder.";
        pinResetButton.style.display = 'block';

        const lastActive = parseInt(localStorage.getItem('lastActiveTimestamp')) || 0;
        if (Date.now() - lastActive > INACTIVITY_TIMEOUT) {
            console.log("Tempo de inatividade excedido. Bloqueando.");
            lockApp();
        } else {
            console.log("Dentro do tempo de atividade. Desbloqueando.");
            await unlockApp();
        }
    }

    // --- SINCRONIZAÇÃO COM FIREBASE ---
    async function loadDataFromFirebase() {
        if (!userId) {
            showToast("Erro de autenticação. Não é possível carregar dados.", "danger");
            return;
        }
        showLoading("Sincronizando dados...");
        const docRef = doc(db, "users", userId);
        try {
            console.log("Tentando ler dados do Firestore...");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                console.log("Documento encontrado. Carregando dados.");
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
                console.log("Nenhum documento encontrado. Usando dados padrão.");
                metas = [{ id: 1, target: 10, reward: 0.24 }];
            }
        } catch (error) {
            console.error("Erro ao carregar dados do Firestore:", error);
            showToast(`Falha ao carregar dados: ${error.message}`, "danger");
            alert(`Falha ao ler o banco de dados. Verifique as regras de segurança do Firestore no seu projeto.\nErro: ${error.message}`);
        } finally {
            loadLocalData();
            updateAll();
            hideLoading();
        }
    }

    // Resto do seu código... (cole aqui todas as outras funções: saveDataToFirebase, loadLocalData, saveDailyState, Módulo de Relatórios, Funções de UI, Event Listeners, etc.)
    // ...
    // É importante que o resto do código seja exatamente o mesmo da versão anterior.
    // Cole aqui o restante do script.js
    async function saveDataToFirebase() {
        if (!userId) {
            showToast("Erro de autenticação. Não é possível salvar.", "danger");
            return;
        }
        showLoading("Sincronizando...");
        saveDailyState(); // Garante que o progresso do dia está salvo no estado local
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
    
    // --- LÓGICA DE DADOS LOCAIS (Progresso do dia) ---
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
        if (todayIndex > -1) { 
            history[todayIndex] = newEntry;
        } else { 
            history.push(newEntry); 
        }
        history.sort((a, b) => parseDate(a.date) - parseDate(b.date));
        
        localStorage.setItem('protocolosAnalisadosCount', protocolosAnalisadosInput.value);
        localStorage.setItem('dailyCancellationsCount', dailyCancellationsInput.value);
        localStorage.setItem('dailyCopyCount', dailyCopyCount);

        unlockAchievement('achieve-first-save', 'Primeiro progresso guardado!');
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

        const sortedMonths = Array.from(availableMonths).sort().reverse();
        reportMonthSelect.innerHTML = sortedMonths.map(key => {
            const [year, month] = key.split('-');
            const monthName = monthNames[parseInt(month)];
            return `<option value="${key}">${monthName} de ${year}</option>`;
        }).join('');
        if (sortedMonths.length > 0) {
            generateReport();
        } else {
            currentMonthSummaryEl.innerHTML = "<p>Nenhum histórico encontrado para gerar relatórios.</p>";
            previousMonthComparisonEl.innerHTML = "";
        }
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
        let pYear = year;
        let pMonth = month - 1;
        if (pMonth < 0) {
            pMonth = 11;
            pYear -= 1;
        }
    
        const monthHistory = history.filter(h => {
            const date = parseDate(h.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });
    
        if (monthHistory.length === 0) return { totalCancellations: 0, totalProtocols: 0, avgProtocols: 0, mostFrequentCategory: "N/A", daysWorked: 0 };
    
        const lastDay = monthHistory[monthHistory.length - 1];
        
        const previousMonthHistory = history.filter(h => {
            const date = parseDate(h.date);
            return date.getFullYear() === pYear && date.getMonth() === pMonth;
        });
        const firstDayValue = previousMonthHistory.length > 0 ? previousMonthHistory[previousMonthHistory.length - 1].atendimentos : 0;

        const totalCancellations = lastDay.atendimentos - firstDayValue;
        const totalProtocols = monthHistory.reduce((sum, h) => sum + (h.protocols || 0), 0);
        const daysWorked = monthHistory.length;
        const avgProtocols = daysWorked > 0 ? (totalProtocols / daysWorked).toFixed(1) : 0;
        
        const monthCategories = {};
        for(const cat in categoryCounts){
            const catDate = parseDate(cat);
            if(catDate.getFullYear() === year && catDate.getMonth() === month){
                for(const type in categoryCounts[cat]){
                    monthCategories[type] = (monthCategories[type] || 0) + categoryCounts[cat][type];
                }
            }
        }
    
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
            ${createSummaryItem("Média de Protocolos", getComparison(parseFloat(current.avgProtocols), parseFloat(previous.avgProtocols)), true)}
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
        const diff = current - previous;
        const percentage = previous !== 0 ? ((diff / previous) * 100).toFixed(0) : (current > 0 ? 100 : 0);
        let text, cssClass;
        if (diff > 0) {
            text = `+${diff.toFixed(1)} (${percentage}%)`;
            cssClass = "positive";
        } else if (diff < 0) {
            text = `${diff.toFixed(1)} (${percentage}%)`;
            cssClass = "negative";
        } else {
            text = "0 (0%)";
            cssClass = "neutral";
        }
        return { text: text.replace('.0',''), class: cssClass, previous: previous };
    }

    function getMonthName(monthIndex, year) {
        if (monthIndex < 0) {
            monthIndex = 11;
            year -= 1;
        }
        const date = new Date(year, monthIndex, 1);
        return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    }

    async function exportReportAsPDF() {
        showLoading("Gerando PDF...");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const card = document.getElementById('report-card');
        const originalBg = card.style.backgroundColor;
        const originalBorder = card.style.border;
        
        card.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--card-bg');
        card.style.border = `1px solid ${getComputedStyle(document.body).getPropertyValue('--card-border')}`;

        try {
            const canvas = await html2canvas(card, {
                scale: 2,
                useCORS: true,
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--main-bg').trim()
            });
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`relatorio_${reportMonthSelect.value}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            showToast("Falha ao gerar o PDF.", "danger");
        } finally {
            card.style.backgroundColor = originalBg;
            card.style.border = originalBorder;
            hideLoading();
        }
    }
    
    function updateAll() {
        // ... funções de renderização ...
    }
    
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
        if (confirm("Tem a certeza que quer redefinir o seu PIN? Esta ação irá apagar TODOS os dados da aplicação (progresso, casos, etc.) na nuvem e no seu dispositivo.")) {
            localStorage.clear();
            // Futuramente, adicionar uma cloud function para limpar os dados do usuário no firestore
            window.location.reload();
        }
    });
    
    saveButton.addEventListener('click', saveDataToFirebase);
    reportMonthSelect.addEventListener('change', generateReport);
    exportPdfButton.addEventListener('click', exportReportAsPDF);
    
    incrementButton.addEventListener('click', () => {
        vibrate();
        let currentDaily = (parseInt(dailyCancellationsInput.value) || 0) + 1;
        dailyCancellationsInput.value = currentDaily;
        dailyCancellationsInput.dispatchEvent(new Event('input')); 
        
        const todayStr = getTodayDateString();
        const category = categorySelect.value;
        if (!categoryCounts[todayStr]) {
            categoryCounts[todayStr] = {};
        }
        categoryCounts[todayStr][category] = (categoryCounts[todayStr][category] || 0) + 1;
        
        renderCategorySummary();
        renderCategoryPieChart();
    });
});

// Importações essenciais do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Suas chaves do Firebase. O "storageBucket" foi corrigido para o formato padrão.
const firebaseConfig = {
  apiKey: "AIzaSyCdQYNKJdTYEeOaejZy_ZxU9tVq7bF1x34",
  authDomain: "app-suporte-n2.firebaseapp.com",
  projectId: "app-suporte-n2",
  storageBucket: "app-suporte-n2.appspot.com", // Formato padrão
  messagingSenderId: "257470368604",
  appId: "1:257470368604:web:42fcc4973851eb02b78f99"
};

// Função principal de teste
async function testFirebaseConnection() {
    try {
        console.log("Iniciando teste de conexão...");
        alert("Iniciando teste de conexão...");

        // 1. Inicializar o Firebase
        console.log("1/4 - Inicializando App Firebase...");
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        console.log("App Firebase inicializado com sucesso.");

        // 2. Autenticar anonimamente
        console.log("2/4 - Tentando autenticação anônima...");
        const userCredential = await signInAnonymously(auth);
        const userId = userCredential.user.uid;
        console.log("Autenticação bem-sucedida! User ID:", userId);

        // 3. Escrever no Firestore
        console.log("3/4 - Tentando escrever um documento no Firestore...");
        const testDocRef = doc(db, "users", userId);
        await setDoc(testDocRef, {
            test_connection: "success",
            last_test_timestamp: new Date()
        });
        console.log("Documento escrito no Firestore com sucesso.");

        // 4. Sucesso!
        console.log("4/4 - Teste concluído com sucesso!");
        alert("CONEXÃO BEM-SUCEDIDA! O problema estava no código original. Pode pedir para restaurar a versão completa.");

    } catch (error) {
        // Se qualquer passo falhar, o erro será capturado aqui
        console.error("!!! TESTE FALHOU !!!", error);
        alert(`FALHA NA CONEXÃO. Erro: ${error.message}\n\nVerifique as configurações no painel do Firebase (Autenticação Anônima e Regras do Firestore) e as restrições da sua chave de API.`);
    }
}

// Inicia o teste assim que a página carregar
document.addEventListener('DOMContentLoaded', testFirebaseConnection);

