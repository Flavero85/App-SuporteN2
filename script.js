// A implementação do Firebase está comentada. Para ativar, você precisará:
// 1. Criar um projeto no site do Firebase (firebase.google.com).
// 2. Obter as suas credenciais de configuração.
// 3. Substituir o placeholder no código e descomentar as seções relevantes.

/*
// Importação dos módulos do Firebase 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
*/

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
    const saveCasesButton = document.getElementById('saveCasesButton');
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
    const dailySummaryLog = document.getElementById('daily-summary-log');
    const dailySummaryCasesList = document.getElementById('daily-summary-cases-list');
    const dailySummarySaveButton = document.getElementById('dailySummarySaveButton');
    const dailySummaryClearButton = document.getElementById('dailySummaryClearButton');
    const tabContentWrapper = document.getElementById('tab-content-wrapper');
    const tabsContainer = document.querySelector('.tabs-container');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');


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
    
    // --- ESTRUTURAS DE DADOS (usando localStorage por enquanto) ---
    let metas = JSON.parse(localStorage.getItem('customMetas')) || [
        { id: 1, target: 10, reward: 0.24 }, { id: 2, target: 20, reward: 0.48 }, { id: 3, target: 30, reward: 0.70 }
    ];
    let allCases = JSON.parse(localStorage.getItem('casesList')) || [];
    let baseSalary = parseFloat(localStorage.getItem('baseSalary')) || 0;
    let history = JSON.parse(localStorage.getItem('performanceHistory')) || [];
    let categoryCounts = JSON.parse(localStorage.getItem('categoryCounts')) || {};
    let unlockedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements')) || {};
    let reminderSettings = JSON.parse(localStorage.getItem('reminderSettings')) || { enabled: false, time: '18:00' };
    let usedStatuses = new Set(JSON.parse(localStorage.getItem('usedStatuses')) || []);
    let usedQuickResponses = new Set(JSON.parse(localStorage.getItem('usedQuickResponses')) || []);
    let dailyLogbook = JSON.parse(localStorage.getItem('dailyLogbook')) || {};
    
    // --- FUNÇÕES AUXILIARES ---
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

    // --- FUNÇÃO DE CÓPIA UNIVERSAL ---
    function copyToClipboard(text, successMessage) {
        if (!text) {
            showToast('Nada para copiar.', 'info');
            return;
        }
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(successMessage, 'success');
                vibrate();
            }).catch(err => {
                console.error('Erro ao copiar com a API moderna:', err);
                legacyCopy(text, successMessage);
            });
        } else {
            legacyCopy(text, successMessage);
        }
    }

    function legacyCopy(text, successMessage) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(successMessage, 'success');
            vibrate();
        } catch (err) {
            console.error('Falha ao copiar com o método antigo:', err);
            showToast('Falha ao copiar', 'danger');
        }
        document.body.removeChild(textArea);
    }

    // --- LÓGICA DE EDIÇÃO DE TEXTO ---
    const loadCustomTexts = function() {
        const customTexts = JSON.parse(localStorage.getItem('appCustomTexts'));
        if (customTexts) {
            document.querySelectorAll('[data-editable="true"]').forEach(el => {
                 if (customTexts[el.id]) {
                    if (el.classList.contains('resposta-copiavel') && typeof customTexts[el.id] === 'object') {
                        el.innerHTML = customTexts[el.id].summary;
                        el.dataset.fullText = customTexts[el.id].fullText;
                    } else {
                        el.innerHTML = customTexts[el.id];
                        if (el.tagName === 'OPTION') el.value = customTexts[el.id];
                    }
                }
            });
        }
    };
    const saveCustomTexts = function() {
        const customTexts = {};
        document.querySelectorAll('[data-editable="true"]').forEach(el => {
             if (el.classList.contains('resposta-copiavel')) {
                customTexts[el.id] = {
                    summary: el.innerHTML,
                    fullText: el.dataset.fullText
                };
            } else {
                customTexts[el.id] = el.innerHTML;
            }
        });
        localStorage.setItem('appCustomTexts', JSON.stringify(customTexts));
    };
    const toggleEditMode = function() {
        isEditMode = !isEditMode;
        const editables = document.querySelectorAll('[data-editable="true"]');
        if (isEditMode) {
            editables.forEach(el => { 
                if (el.tagName !== 'OPTION' && !el.classList.contains('resposta-copiavel')) {
                    el.setAttribute('contenteditable', 'true'); 
                }
            });
            editButton.innerHTML = "✅ Guardar Textos";
            editButton.classList.add('save-button');
            showToast("Modo de edição ativado!", 'info');
        } else {
            editables.forEach(el => el.setAttribute('contenteditable', 'false'));
            editButton.innerHTML = "✏️ Editar Textos";
            editButton.classList.remove('save-button');
            saveCustomTexts();
            unlockAchievement('achieve-customize', 'Interface personalizada!');
            showToast("Textos personalizados guardados!", 'success');
        }
    };
    
    // --- LÓGICA DE CATEGORIAS, CONQUISTAS, NOTIFICAÇÕES ---
    const renderCategorySummary = () => {
        const categoriesWithCounts = Object.keys(categoryCounts).filter(cat => categoryCounts[cat] > 0);
        if (categoriesWithCounts.length === 0) {
            categorySummaryList.innerHTML = '<li>Nenhuma categoria registada.</li>';
            return;
        }
        categorySummaryList.innerHTML = categoriesWithCounts
            .sort((a, b) => categoryCounts[b] - categoryCounts[a])
            .map(cat => `<li><strong>${cat}:</strong> ${categoryCounts[cat]}</li>`)
            .join('');
    };
    const unlockAchievement = (id, text) => {
        if (unlockedAchievements[id]) return;
        unlockedAchievements[id] = true;
        localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
        const el = document.getElementById(id);
        if (el) el.classList.add('unlocked');
        showToast(`Conquista: ${text}`, 'gold');
        vibrate();
    };
    const renderAchievements = () => Object.keys(unlockedAchievements).forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('unlocked'); });
    const checkAchievements = () => {
        const currentValue = parseInt(atendimentosInput.value) || 0;
        const currentProtocols = parseInt(protocolosAnalisadosInput.value) || 0;
        const totalQuickResponses = document.querySelectorAll('#respostas-container .resposta-copiavel').length;

        if (metas.length > 0 && currentValue >= metas[0].target) unlockAchievement('achieve-bonus1', 'Primeira faixa de comissão!');
        if (metas.length > 0 && currentValue >= metas[metas.length - 1].target) unlockAchievement('achieve-max-bonus', 'Meta máxima atingida!');
        
        if (history.length >= 5) {
            const last5Dates = history.slice(-5).map(h => parseDate(h.date));
            let isStreak = true;
            for (let i = 1; i < last5Dates.length; i++) { if ((last5Dates[i] - last5Dates[i-1]) / 86400000 !== 1) { isStreak = false; break; } }
            if (isStreak) unlockAchievement('achieve-5day-streak', 'Guardou por 5 dias seguidos!');
        }
        if (history.length >= 10) {
            const last10Dates = history.slice(-10).map(h => parseDate(h.date));
            let isStreak = true;
            for (let i = 1; i < last10Dates.length; i++) { if ((last10Dates[i] - last10Dates[i-1]) / 86400000 !== 1) { isStreak = false; break; } }
            if (isStreak) unlockAchievement('achieve-10-day-streak', 'Guardou por 10 dias seguidos!');
        }

        if (Object.keys(categoryCounts).length >= 5) unlockAchievement('achieve-all-categories', 'Usou 5 categorias diferentes!');
        if (history.length >= 30) unlockAchievement('achieve-30-days', 'Guardou por 30 dias diferentes!');
        if (currentValue >= 100) unlockAchievement('achieve-100-cancellations', 'Atingiu 100 cancelamentos!');
        if (currentValue >= 200) unlockAchievement('achieve-200-cancellations', 'Atingiu 200 cancelamentos!');
        if (allCases.length >= 10) unlockAchievement('achieve-10-cases', 'Registou 10 casos!');
        if (allCases.length >= 25) unlockAchievement('achieve-25-cases', 'Registou 25 casos!');
        if (usedStatuses.size >= 3) unlockAchievement('achieve-all-status', 'Usou todos os status de caso!');
        if (currentProtocols >= 50) unlockAchievement('achieve-50-protocols', 'Analisou 50 protocolos hoje!');
        
        const monthlyProtocols = history.filter(h => parseDate(h.date).getMonth() === new Date().getMonth()).reduce((sum, h) => sum + (h.protocols || 0), 0);
        if (monthlyProtocols >= MONTHLY_PROTOCOL_GOAL) unlockAchievement('achieve-monthly-protocol-goal', 'Meta mensal de protocolos batida!');
        
        if (usedQuickResponses.size >= totalQuickResponses) unlockAchievement('achieve-use-all-quick-responses', 'Mestre das respostas rápidas!');
    };
    const scheduleReminder = () => {
        clearTimeout(notificationTimeout);
        if (!reminderSettings.enabled || !('Notification' in window)) return;
        const [hour, minute] = reminderSettings.time.split(':');
        const now = new Date();
        let reminderDate = new Date();
        reminderDate.setHours(hour, minute, 0, 0);
        if (now > reminderDate) reminderDate.setDate(reminderDate.getDate() + 1);
        const timeToReminder = reminderDate.getTime() - now.getTime();
        notificationTimeout = setTimeout(() => {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') navigator.serviceWorker.ready.then(reg => reg.showNotification('Lembrete de Metas', { body: 'Não se esqueça de guardar o seu progresso de hoje!', icon: 'icon-192.png', tag: 'metas-reminder' }));
            });
            scheduleReminder();
        }, timeToReminder);
    };

    // --- LÓGICA PARA HISTÓRICO DE CASOS ---
    const saveCases = () => {
        localStorage.setItem('casesList', JSON.stringify(allCases));
    };
    const renderCases = (filter = 'all', searchTerm = '') => {
        casesListContainer.innerHTML = '';
        
        const normalizedSearch = searchTerm.toLowerCase().trim();
        const filteredCases = allCases.filter(caseItem => {
            const statusMatch = filter === 'all' || caseItem.status === filter;
            const searchMatch = !normalizedSearch ||
                caseItem.protocol?.toLowerCase().includes(normalizedSearch) ||
                caseItem.phone?.toLowerCase().includes(normalizedSearch) ||
                caseItem.description?.toLowerCase().includes(normalizedSearch);
            return statusMatch && searchMatch;
        });

        if (filteredCases.length === 0) {
            casesListContainer.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary-color); text-align: center;">Nenhum caso encontrado.</p>';
            return;
        }

        filteredCases.forEach((caseItem) => {
            const statusClass = caseItem.status?.replace(' ', '-') || 'Pendente';
            const entryDiv = document.createElement('div');
            entryDiv.className = 'case-entry';
            entryDiv.setAttribute('data-id', caseItem.id);

            entryDiv.innerHTML = `
                <div class="case-main-content">
                    <button class="expand-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="case-fields">
                        <div class="field-group">
                            <input type="text" class="protocol-input" value="${caseItem.protocol || ''}" placeholder="Protocolo">
                            <button class="button secondary-button copy-btn copy-protocol-btn">Copiar</button>
                        </div>
                        <div class="field-group">
                            <input type="text" class="phone-input" value="${caseItem.phone || ''}" placeholder="Telefone">
                            <button class="button secondary-button copy-btn copy-phone-btn">Copiar</button>
                        </div>
                    </div>
                    <div class="status-indicator status-${statusClass}" title="${caseItem.status || 'Pendente'}"></div>
                </div>
                <div class="case-details-content">
                    <textarea class="description-input" placeholder="Descrição do caso...">${caseItem.description || ''}</textarea>
                    <select class="status-select">
                        <option value="Pendente" ${caseItem.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Em Andamento" ${caseItem.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="Resolvido" ${caseItem.status === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
                    </select>
                     <div style="font-size: 11px; color: var(--text-secondary-color); text-align: right; margin-top: 5px;">Criado em: ${caseItem.date}</div>
                    <div class="details-actions">
                        <button class="button secondary-button copy-case-all-btn">Copiar Tudo</button>
                        <button class="button reset-button remove-case-btn">Excluir Caso</button>
                    </div>
                </div>
            `;
            casesListContainer.appendChild(entryDiv);
        });
    };
    
    // --- LÓGICA DO DIÁRIO DE BORDO E RESUMO DIÁRIO ---
    const saveLogbook = () => {
        const today = getTodayDateString();
        dailyLogbook[today] = logbookTextarea.value;
        localStorage.setItem('dailyLogbook', JSON.stringify(dailyLogbook));
        renderDailySummary();
    };

    const renderDailySummary = () => {
        const today = getTodayDateString();
        // Atualiza anotações
        dailySummaryLog.textContent = dailyLogbook[today] || 'Nenhuma anotação para hoje.';

        // Atualiza casos do dia
        const todayCases = allCases.filter(c => c.date === today);
        if (todayCases.length > 0) {
            dailySummaryCasesList.innerHTML = todayCases.map(c => 
                `<li><strong>${c.protocol || 'Sem Protocolo'}</strong> - ${c.status}</li>`
            ).join('');
        } else {
            dailySummaryCasesList.innerHTML = '<li>Nenhum caso registado hoje.</li>';
        }
    };
    
    const clearDailySummary = () => {
        vibrate();
        if (confirm('Tem a certeza que quer limpar a anotação do diário de bordo de hoje? Esta ação não pode ser desfeita.')) {
            const today = getTodayDateString();
            
            // Limpa apenas o logbook do dia
            logbookTextarea.value = '';
            delete dailyLogbook[today];
            localStorage.setItem('dailyLogbook', JSON.stringify(dailyLogbook));
            
            updateAll(); // Atualiza a UI, incluindo o card de resumo
            showToast('Anotação do dia limpa!', 'danger');
        }
    };

    // --- FUNÇÕES PRINCIPAIS DE RENDERIZAÇÃO E CÁLCULO ---
    const updateDailyMission = () => {
        const protocols = parseInt(protocolosAnalisadosInput.value) || 0;
        const savedToday = history.some(h => h.date === getTodayDateString());
        const dailyCancellations = parseInt(dailyCancellationsInput.value) || 0;
        const casesAddedToday = allCases.filter(c => c.date === getTodayDateString()).length;

        const missions = [
            { id: 'mission-protocols', text: `Analisar ${DAILY_PROTOCOL_GOAL} protocolos (${protocols}/${DAILY_PROTOCOL_GOAL})`, completed: protocols >= DAILY_PROTOCOL_GOAL },
            { id: 'mission-daily-cancellations', text: `Registar 6 cancelamentos hoje (${dailyCancellations}/6)`, completed: dailyCancellations >= 6 },
            { id: 'mission-copy-responses', text: `Copiar 20 respostas (${dailyCopyCount}/20)`, completed: dailyCopyCount >= 20 },
            { id: 'mission-new-cases', text: `Adicionar 3 novos casos (${casesAddedToday}/3)`, completed: casesAddedToday >= 3 },
            { id: 'mission-save', text: 'Guardar o progresso de hoje', completed: savedToday }
        ];

        dailyMissionList.innerHTML = missions.map(mission => 
            `<li id="${mission.id}" class="${mission.completed ? 'completed' : ''}">${mission.text}</li>`
        ).join('');
    };
    const renderAtendimentoMetas = () => {
        metasContainer.innerHTML = '';
        metas.sort((a, b) => a.target - b.target).forEach(meta => {
            const metaElement = document.createElement('div');
            metaElement.className = 'meta-item';
            metaElement.innerHTML = `<div class="meta-header"><span class="meta-label">Faixa ${meta.id}: ${meta.target} (${(meta.reward || 0) * 100}%)</span><span class="meta-percentage" id="meta${meta.id}-percent">0%</span></div><div class="progress-bar-background"><div class="progress-bar-fill" id="meta${meta.id}-fill"></div></div>`;
            metasContainer.appendChild(metaElement);
        });
    };
    const updateProtocolProgress = () => {
        const dailyProtocols = parseInt(protocolosAnalisadosInput.value) || 0;
        const currentMonth = new Date().getMonth();
        const monthlyProtocols = history
            .filter(h => parseDate(h.date).getMonth() === currentMonth)
            .reduce((sum, h) => sum + (h.protocols || 0), 0);

        const dailyPercent = DAILY_PROTOCOL_GOAL > 0 ? Math.min(100, (dailyProtocols / DAILY_PROTOCOL_GOAL) * 100) : 0;
        const monthlyPercent = MONTHLY_PROTOCOL_GOAL > 0 ? Math.min(100, (monthlyProtocols / MONTHLY_PROTOCOL_GOAL) * 100) : 0;

        protocolGoalsContainer.innerHTML = `
            <div class="meta-item">
                <div class="meta-header">
                    <span class="meta-label">Meta Diária de Protocolos (${dailyProtocols}/${DAILY_PROTOCOL_GOAL})</span>
                    <span class="meta-percentage">${Math.floor(dailyPercent)}%</span>
                </div>
                <div class="progress-bar-background">
                    <div class="progress-bar-fill ${dailyPercent >= 100 ? 'completed' : ''}" style="width: ${dailyPercent}%;"></div>
                </div>
            </div>
            <div class="meta-item">
                <div class="meta-header">
                    <span class="meta-label">Meta Mensal de Protocolos (${monthlyProtocols}/${MONTHLY_PROTOCOL_GOAL})</span>
                    <span class="meta-percentage">${Math.floor(monthlyPercent)}%</span>
                </div>
                <div class="progress-bar-background">
                    <div class="progress-bar-fill ${monthlyPercent >= 100 ? 'completed' : ''}" style="width: ${monthlyPercent}%;"></div>
                </div>
            </div>
        `;
    };
    const updateAtendimentoProgress = () => {
        const currentValue = parseInt(atendimentosInput.value) || 0;
        let highestAchieved = null;
        metas.forEach(meta => {
            const percent = meta.target > 0 ? Math.min(100, (currentValue / meta.target) * 100) : 0;
            const fill = document.getElementById(`meta${meta.id}-fill`);
            const percentText = document.getElementById(`meta${meta.id}-percent`);
            if (fill && percentText) {
                fill.style.width = `${percent}%`;
                percentText.textContent = `${Math.floor(percent)}%`;
                fill.classList.toggle('completed', percent >= 100);
                if (percent >= 100) highestAchieved = meta;
            }
        });
        if (!highestAchieved) {
            const faltam = metas.length > 0 ? metas[0].target - currentValue : 0;
            summaryText.innerHTML = `Faltam <strong>${faltam > 0 ? faltam : 0}</strong> para a Faixa 1 (${((metas[0] || {}).reward || 0) * 100}%).`;
            summaryText.className = 'summary-box';
        } else {
            const nextMetaIndex = metas.findIndex(m => m.id === highestAchieved.id) + 1;
            summaryText.innerHTML = nextMetaIndex < metas.length ? `Atingido: <strong>Faixa ${highestAchieved.id} (${highestAchieved.reward * 100}%)</strong>. Faltam <strong>${metas[nextMetaIndex].target - currentValue}</strong> para a próxima!` : `🏆 Meta máxima de <strong>${highestAchieved.reward * 100}%</strong> atingida!`;
            summaryText.className = 'summary-box completed';
        }
        calculateBonus();
        checkAchievements();
    };
    const calculateBonus = () => {
        if (baseSalary <= 0) {
            bonusValueEl.textContent = 'R$ 0,00';
            bonusFormulaEl.innerHTML = 'Defina o seu <strong style="color: var(--warning-color); cursor: pointer;" onclick="document.getElementById(\'settings-button\').click()">salário base</strong> nas configurações.';
            return;
        }
        const cancelamentos = parseInt(atendimentosInput.value) || 0;
        let achievedMeta = null;
        for (let i = metas.length - 1; i >= 0; i--) { if (cancelamentos >= metas[i].target) { achievedMeta = metas[i]; break; } }
        
        if (achievedMeta) {
            const bonus = baseSalary * achievedMeta.reward;
            bonusValueEl.textContent = `R$ ${bonus.toFixed(2).replace('.', ',')}`;
            bonusFormulaEl.innerHTML = `Atingido: ${achievedMeta.reward * 100}% de R$${baseSalary.toFixed(2).replace('.',',')}`;
        } else if (metas.length > 0) {
            const firstTierBonus = baseSalary * metas[0].reward;
            bonusValueEl.textContent = `R$ ${firstTierBonus.toFixed(2).replace('.', ',')}`;
            bonusFormulaEl.innerHTML = `Meta para Faixa 1 (${metas[0].target} cancelamentos)`;
        } else {
            bonusValueEl.textContent = 'R$ 0,00';
            bonusFormulaEl.innerHTML = 'Nenhuma meta definida.';
        }
    };
    const updateProjection = () => {
        const currentMonth = new Date().getMonth();
        const monthHistory = history.map(e => ({...e, dateObj: parseDate(e.date)}))
                                  .filter(e => e.dateObj.getMonth() === currentMonth)
                                  .sort((a, b) => a.dateObj - b.dateObj);
        
        const daysWithEntries = new Set(monthHistory.map(h => h.date)).size;

        if (monthHistory.length < 2) {
            projectionValueEl.textContent = "N/A";
            projectionFormulaEl.textContent = "Guarde por pelo menos 2 dias neste mês.";
            tierProjectionContainer.innerHTML = '';
            return;
        }
        const firstEntry = monthHistory[0];
        const lastEntry = monthHistory[monthHistory.length - 1];
        const cancellationsInPeriod = lastEntry.atendimentos - firstEntry.atendimentos;

        if (daysWithEntries <= 1 || cancellationsInPeriod < 0) {
            projectionFormulaEl.textContent = "Dados insuficientes.";
            projectionValueEl.textContent = "N/A";
        } else {
            const dailyAvg = cancellationsInPeriod / (daysWithEntries - 1);
            const projectedTotal = firstEntry.atendimentos + (dailyAvg * (TOTAL_WORKING_DAYS - 1));
            projectionValueEl.textContent = Math.round(projectedTotal);
            projectionFormulaEl.textContent = `Média de ${dailyAvg.toFixed(1)}/dia. Projeção para ${TOTAL_WORKING_DAYS} dias úteis.`;
        }
        
        const currentValue = parseInt(atendimentosInput.value) || 0;
        const remainingWorkingDays = TOTAL_WORKING_DAYS - daysWithEntries;

        if (remainingWorkingDays <= 0) {
            tierProjectionContainer.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary-color);">Mês de trabalho concluído.</p>';
        } else {
            let tierHtml = `<p>Média diária necessária:</p><ul>`;
            metas.forEach(meta => {
                const remainingCancellations = meta.target - currentValue;
                if (remainingCancellations <= 0) {
                    tierHtml += `<li style="color: var(--success-color);">✅ <strong>Faixa ${meta.id} (${meta.target}):</strong> Atingida!</li>`;
                } else {
                    const requiredAvg = remainingCancellations / remainingWorkingDays;
                    tierHtml += `<li>🎯 <strong>Faixa ${meta.id} (${meta.target}):</strong> Faltam ${remainingCancellations}. Média de <strong>${requiredAvg.toFixed(1)}/dia</strong>.</li>`;
                }
            });
            tierHtml += '</ul>';
            tierProjectionContainer.innerHTML = tierHtml;
        }
    };
    const renderHistory = () => {
        historyListEl.innerHTML = '';
        if (history.length === 0) { historyListEl.innerHTML = '<li>Nenhum registo guardado.</li>'; return; }
        [...history].sort((a, b) => parseDate(b.date) - parseDate(a.date)).forEach(entry => {
            const li = document.createElement('li');
            const dailyCancellations = entry.dailyCancellations !== undefined ? entry.dailyCancellations : 'N/A';
            const protocols = entry.protocols !== undefined ? entry.protocols : 'N/A';
            li.innerHTML = `<strong>${entry.date}:</strong> ${dailyCancellations} canc. | ${protocols} protoc.`;
            historyListEl.appendChild(li);
        });
    };
    const renderTrendChart = () => {
        if (trendChart) trendChart.destroy();
        if(!document.getElementById('tab-cancelamentos').classList.contains('active')) return;
        const labels = history.map(e => e.date);
        const data = history.map(e => e.atendimentos);
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary-color');
        const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary-color').trim();
        try {
            trendChart = new Chart(trendChartCanvas, {
                type: 'line', data: { labels, datasets: [{ label: 'Cancelamentos (Total)', data, fill: true, backgroundColor: `${primaryColor}33`, borderColor: primaryColor, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: primaryColor }] },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        y: { 
                            ticks: { color: textColor, stepSize: 1 },
                            beginAtZero: true
                        }, 
                        x: { 
                            ticks: { color: textColor } 
                        } 
                    }, 
                    plugins: { 
                        legend: { display: false } 
                    } 
                }
            });
        } catch (e) { console.error("Falha ao renderizar o gráfico de tendência:", e); }
    };
    const renderCategoryPieChart = () => {
        if (categoryPieChart) categoryPieChart.destroy();
        if(!document.getElementById('tab-cancelamentos').classList.contains('active')) return;
        
        const labels = Object.keys(categoryCounts).filter(cat => categoryCounts[cat] > 0);
        const data = Object.values(categoryCounts).filter(count => count > 0);
        
        if (labels.length === 0) return;

        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');

        try {
            categoryPieChart = new Chart(categoryPieChartCanvas, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Cancelamentos por Categoria',
                        data: data,
                        backgroundColor: ['#e73444', '#ffa726', '#1FF2FF', '#66bb6a', '#a78bfa', '#facc15'],
                        borderColor: getComputedStyle(document.body).getPropertyValue('--card-bg'),
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: textColor,
                                boxWidth: 12,
                                padding: 15
                            }
                        }
                    }
                }
            });
        } catch (e) {
            console.error("Falha ao renderizar o gráfico de pizza:", e);
        }
    };
    
    function updateAll() {
        renderHistory();
        renderAtendimentoMetas();
        updateProtocolProgress();
        updateAtendimentoProgress();
        renderCategorySummary();
        renderAchievements();
        checkAchievements();
        updateProjection();
        updateDailyMission();
        renderTrendChart();
        renderCategoryPieChart();
        renderCases(document.querySelector('.filter-btn.active')?.dataset.filter || 'all', caseSearchInput.value);
        renderDailySummary();
    }
    function saveData() {
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
        
        localStorage.setItem('performanceHistory', JSON.stringify(history));
        localStorage.setItem('atendimentosCount', atendimentosInput.value);
        localStorage.setItem('protocolosAnalisadosCount', protocolosAnalisadosInput.value);
        localStorage.setItem('categoryCounts', JSON.stringify(categoryCounts));
        localStorage.setItem('dailyCancellationsCount', dailyCancellationsInput.value);
        localStorage.setItem('dailyCopyCount', dailyCopyCount);
        
        unlockAchievement('achieve-first-save', 'Primeiro progresso guardado!');
        updateAll();
        showToast('Progresso guardado com sucesso!', 'success');
    }
    function loadData() {
        const todayStr = getTodayDateString();
        const lastUsedDate = localStorage.getItem('lastUsedDate');
        
        let dailyCount = 0;
        let dailyProtocols = 0;
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

        atendimentosInput.value = localStorage.getItem('atendimentosCount') || '';
        baseSalaryInput.value = baseSalary > 0 ? baseSalary : '';
        reminderEnabledInput.checked = reminderSettings.enabled;
        reminderTimeInput.value = reminderSettings.time;

        logbookTextarea.value = dailyLogbook[todayStr] || '';
        
        updateAll();
        scheduleReminder();
        loadCustomTexts();
    }
    function resetData() {
        vibrate();
        if (confirm('Tem a certeza que deseja repor TODOS os dados? Esta ação é irreversível.')) {
            localStorage.clear();
            showToast('Dados repostos!', 'danger');
            setTimeout(() => window.location.reload(), 1000);
        }
    }
    function exportData() {
        unlockAchievement('achieve-export', 'Primeiro backup realizado!');
        vibrate();

        const currentMonth = new Date().getMonth();
        const monthlyProtocols = history
            .filter(h => parseDate(h.date).getMonth() === currentMonth)
            .reduce((sum, h) => sum + (h.protocols || 0), 0);

        const dataToExport = {
            savedProgress: { 
                atendimentos: localStorage.getItem('atendimentosCount'),
                protocolosAnalisados: localStorage.getItem('protocolosAnalisadosCount')
            },
            casesList: allCases,
            baseSalary: baseSalary,
            customMetas: metas,
            history: history,
            customTexts: JSON.parse(localStorage.getItem('appCustomTexts')),
            categoryCounts: categoryCounts,
            unlockedAchievements: unlockedAchievements,
            reminderSettings: reminderSettings,
            usedQuickResponses: Array.from(usedQuickResponses),
            dailyLogbook: dailyLogbook
        };
        const dateStr = new Date().toISOString().split('T')[0];
        
        const blobJson = new Blob([JSON.stringify(dataToExport, null, 2)], {type: 'application/json'});
        const urlJson = URL.createObjectURL(blobJson);
        const aJson = document.createElement('a');
        aJson.href = urlJson;
        aJson.download = `backup_completo_metas_${dateStr}.json`;
        aJson.click();
        URL.revokeObjectURL(urlJson);

        let txtContent = `Relatório de Metas - ${new Date().toLocaleString('pt-BR')}\n\n`;
        txtContent += `--- DADOS GERAIS ---\n`;
        txtContent += `Total de Cancelamentos (Mês): ${atendimentosInput.value || 0}\n`;
        txtContent += `Cancelamentos do Dia: ${dailyCancellationsInput.value || 0}\n`;
        txtContent += `Protocolos Analisados (Dia): ${protocolosAnalisadosInput.value || 0}\n`;
        txtContent += `Total de Protocolos (Mês): ${monthlyProtocols}\n\n`;
        txtContent += `--- DIÁRIO DE BORDO ---\n`;
        txtContent += `${logbookTextarea.value || 'Nenhuma nota hoje.'}\n\n`;
        txtContent += `--- HISTÓRICO DE CASOS (${allCases.length}) ---\n`;
        if(allCases.length > 0) {
            allCases.forEach((c, i) => {
                txtContent += `${i+1}. [${c.date}] Protocolo: ${c.protocol || 'N/A'} | Telefone: ${c.phone || 'N/A'} | Status: ${c.status}\n`;
                txtContent += `   Descrição: ${c.description || 'Nenhuma'}\n`;
            });
        } else {
            txtContent += "Nenhum caso registado.\n";
        }
        txtContent += `\n--- RESUMO POR CATEGORIA ---\n`;
        if(Object.keys(categoryCounts).length > 0) {
            for(const [cat, count] of Object.entries(categoryCounts)) {
                txtContent += `- ${cat}: ${count}\n`;
            }
        } else {
            txtContent += "Nenhuma categoria registada.\n";
        }

        const blobTxt = new Blob([txtContent], {type: 'text/plain;charset=utf-8'});
        const urlTxt = URL.createObjectURL(blobTxt);
        const aTxt = document.createElement('a');
        aTxt.href = urlTxt;
        aTxt.download = `relatorio_metas_${dateStr}.txt`;
        aTxt.click();
        URL.revokeObjectURL(urlTxt);

        showToast('Backup .json e .txt exportados!', 'info');
    }
    function importData() {
        vibrate();
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = readerEvent => {
                try {
                    const importedData = JSON.parse(readerEvent.target.result);
                    if (confirm('Isto irá sobrescrever os seus dados atuais. Deseja continuar?')) {
                        localStorage.setItem('atendimentosCount', importedData.savedProgress?.atendimentos || '');
                        localStorage.setItem('protocolosAnalisadosCount', importedData.savedProgress?.protocolosAnalisados || '');
                        if(importedData.casesList) localStorage.setItem('casesList', JSON.stringify(importedData.casesList));
                        if (importedData.baseSalary) localStorage.setItem('baseSalary', importedData.baseSalary);
                        if (importedData.customMetas) localStorage.setItem('customMetas', JSON.stringify(importedData.customMetas));
                        if (importedData.history) localStorage.setItem('performanceHistory', JSON.stringify(importedData.history));
                        if (importedData.customTexts) localStorage.setItem('appCustomTexts', JSON.stringify(importedData.customTexts));
                        if (importedData.categoryCounts) localStorage.setItem('categoryCounts', JSON.stringify(importedData.categoryCounts));
                        if (importedData.unlockedAchievements) localStorage.setItem('unlockedAchievements', JSON.stringify(importedData.unlockedAchievements));
                        if (importedData.reminderSettings) localStorage.setItem('reminderSettings', JSON.stringify(importedData.reminderSettings));
                        if (importedData.usedQuickResponses) localStorage.setItem('usedQuickResponses', JSON.stringify(Array.from(usedQuickResponses)));
                        if (importedData.dailyLogbook) localStorage.setItem('dailyLogbook', JSON.stringify(importedData.dailyLogbook));
                        showToast('Dados importados com sucesso!', 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    }
                } catch (err) { showToast('Erro ao ler o ficheiro. Verifique o formato.', 'danger'); console.error(err); }
            }
            reader.readAsText(file, 'UTF-8');
        }
        input.click();
    }
    
    function openSettingsModal() {
        try {
            baseSalaryInput.value = baseSalary > 0 ? baseSalary : '';
            settingsMetasContainer.innerHTML = '';
            metas.forEach(meta => {
                const group = document.createElement('div');
                group.className = 'form-group';
                group.innerHTML = `<label>Faixa ${meta.id}</label><div class="indicators-grid"><input type="number" placeholder="Qtd." value="${meta.target}" data-id="${meta.id}" data-type="target"><input type="number" placeholder="Comissão %" value="${(meta.reward || 0) * 100}" data-id="${meta.id}" data-type="reward"></div>`;
                settingsMetasContainer.appendChild(group);
            });
            settingsModal.style.display = 'block';
        } catch (error) {
            console.error("Erro ao abrir as configurações:", error);
            showToast("Ocorreu um erro ao abrir as configurações.", "danger");
        }
    }

    function applyTheme(theme) {
        document.body.className = ''; // Limpa todas as classes do body
        document.body.classList.add(`theme-${theme}`);
        
        // Corrige o bug do chart.js ao mudar de tema
        setTimeout(() => {
            renderTrendChart();
            renderCategoryPieChart();
        }, 50); // Um pequeno delay para garantir que as variáveis CSS foram aplicadas
    }

    // --- EVENT LISTENERS ---
    atendimentosInput.addEventListener('input', () => { 
        localStorage.setItem('atendimentosCount', atendimentosInput.value); 
        updateAtendimentoProgress();
        updateProjection(); 
        updateDailyMission();
    });
    protocolosAnalisadosInput.addEventListener('input', () => { 
        localStorage.setItem('protocolosAnalisadosCount', protocolosAnalisadosInput.value);
        checkAchievements();
        updateProtocolProgress();
        updateDailyMission();
    });
    dailyCancellationsInput.addEventListener('input', () => {
        const newDailyValue = parseInt(dailyCancellationsInput.value) || 0;
        const currentTotal = parseInt(atendimentosInput.value) || 0;
        const difference = newDailyValue - previousDailyCancellations;

        atendimentosInput.value = currentTotal + difference;
        previousDailyCancellations = newDailyValue;
        localStorage.setItem('dailyCancellationsCount', newDailyValue);
        atendimentosInput.dispatchEvent(new Event('input'));
    });
    incrementButton.addEventListener('click', () => {
        vibrate();
        let currentDaily = (parseInt(dailyCancellationsInput.value) || 0) + 1;
        dailyCancellationsInput.value = currentDaily;
        dailyCancellationsInput.dispatchEvent(new Event('input')); 
        const category = categorySelect.value;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        renderCategorySummary();
        renderCategoryPieChart();
    });
    saveLogbookButton.addEventListener('click', () => {
        vibrate();
        saveLogbook();
        showToast('Anotação salva com sucesso!', 'success');
    });

    incrementProtocolosButton.addEventListener('click', () => {
        vibrate();
        const newValue = (parseInt(protocolosAnalisadosInput.value) || 0) + 1;
        protocolosAnalisadosInput.value = newValue;
        protocolosAnalisadosInput.dispatchEvent(new Event('input'));
    });
    
    casesListContainer.addEventListener('click', (e) => {
        const target = e.target;
        const caseEntry = target.closest('.case-entry');
        if (!caseEntry) return;

        const caseId = caseEntry.dataset.id;
        const caseItem = allCases.find(c => c.id === caseId);

        if (!caseItem) return;

        const expandButton = target.closest('.expand-btn');
        if (expandButton) {
            const details = caseEntry.querySelector('.case-details-content');
            details.classList.toggle('visible');
            expandButton.classList.toggle('expanded');
            return; 
        }

        if (target.closest('.copy-protocol-btn')) copyToClipboard(caseEntry.querySelector('.protocol-input').value, 'Protocolo copiado!');
        if (target.closest('.copy-phone-btn')) copyToClipboard(caseEntry.querySelector('.phone-input').value, 'Telefone copiado!');
        if (target.closest('.copy-case-all-btn')) copyToClipboard(`Status: ${caseItem.status}\nProtocolo: ${caseItem.protocol || 'N/A'}\nTelefone: ${caseItem.phone || 'N/A'}\nDescrição: ${caseItem.description || 'N/A'}`, 'Dados do caso copiados!');
        if (target.closest('.remove-case-btn')) { 
            if (confirm('Tem a certeza de que quer excluir este caso?')) {
                allCases = allCases.filter(c => c.id !== caseId);
                renderCases(document.querySelector('.filter-btn.active').dataset.filter, caseSearchInput.value);
                renderDailySummary();
                updateDailyMission();
                vibrate();
            }
        }
    });

    casesListContainer.addEventListener('input', (e) => {
        const target = e.target;
        const caseEntry = target.closest('.case-entry');
        if (!caseEntry) return;
        const caseId = caseEntry.dataset.id;
        const caseIndex = allCases.findIndex(c => c.id === caseId);

        if (caseIndex === -1) return;

        if (target.classList.contains('protocol-input')) allCases[caseIndex].protocol = target.value;
        if (target.classList.contains('phone-input')) allCases[caseIndex].phone = target.value;
        if (target.classList.contains('description-input')) allCases[caseIndex].description = target.value;
        if (target.classList.contains('status-select')) {
             allCases[caseIndex].status = target.value;
             usedStatuses.add(target.value);
             localStorage.setItem('usedStatuses', JSON.stringify(Array.from(usedStatuses)));
             renderCases(document.querySelector('.filter-btn.active').dataset.filter, caseSearchInput.value);
        }
        renderDailySummary();
        updateDailyMission();
    });
    
    addCaseButton.addEventListener('click', () => {
        const newCase = { 
            id: `case_${new Date().getTime()}`,
            protocol: '', 
            phone: '', 
            description: '', 
            status: 'Pendente',
            date: getTodayDateString()
        };
        allCases.unshift(newCase);
        unlockAchievement('achieve-first-case', 'Primeiro caso adicionado!');
        renderCases();
        updateDailyMission();
        renderDailySummary();
        vibrate();
    });

    clearCasesButton.addEventListener('click', () => {
        vibrate();
        if (confirm('Tem certeza de que quer excluir TODOS os casos? Esta ação é irreversível.')) {
            allCases = [];
            renderCases();
            renderDailySummary();
            updateDailyMission();
            showToast('Todos os casos foram excluídos!', 'danger');
        }
    });

    saveCasesButton.addEventListener('click', () => {
        vibrate();
        saveCases();
        updateAll();
        showToast('Lista de casos salva com sucesso!', 'success');
    });

    caseSearchInput.addEventListener('input', () => {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        renderCases(activeFilter, caseSearchInput.value);
    });

    caseFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            caseFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderCases(button.dataset.filter, caseSearchInput.value);
        });
    });

    saveButton.addEventListener('click', () => { vibrate(); saveData(); });
    dailySummarySaveButton.addEventListener('click', () => { vibrate(); saveData(); });
    dailySummaryClearButton.addEventListener('click', clearDailySummary);
    resetButton.addEventListener('click', resetData);
    exportButton.addEventListener('click', exportData);
    importButton.addEventListener('click', importData);
    editButton.addEventListener('click', toggleEditMode);
    
    categorySelect.addEventListener('click', (e) => {
        if (isEditMode) {
            e.preventDefault();
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];
            if (!selectedOption) return;
            const newText = prompt(`Editar categoria "${selectedOption.textContent}":`, selectedOption.textContent);
            if (newText && newText.trim() && newText.trim() !== selectedOption.textContent) {
                const trimmedText = newText.trim();
                const originalValue = selectedOption.value;
                selectedOption.textContent = trimmedText;
                selectedOption.value = trimmedText;
                if (categoryCounts[originalValue]) {
                    categoryCounts[trimmedText] = categoryCounts[originalValue];
                    delete categoryCounts[originalValue];
                }
                showToast('Categoria atualizada. Clique em "Guardar Textos" para persistir.', 'info');
                renderCategorySummary();
                renderCategoryPieChart();
            }
        }
    });

    respostasContainer.addEventListener('click', e => {
        const target = e.target.closest('.resposta-copiavel');
        if (!target) return;

        if (isEditMode) {
            e.preventDefault();
            const currentSummary = target.innerText;
            const currentFullText = target.dataset.fullText;
            
            const newSummary = prompt("Edite o resumo visível (máx. 2 linhas):", currentSummary);
            if (newSummary === null) return; 

            const newFullText = prompt("Edite o texto completo a ser copiado:", currentFullText);
            if (newFullText === null) return; 

            target.innerText = newSummary;
            target.dataset.fullText = newFullText;
            showToast('Resposta rápida atualizada. Não se esqueça de guardar!', 'info');

        } else {
            const fullText = target.dataset.fullText || target.innerText;
            copyToClipboard(fullText, 'Resposta copiada!');
            dailyCopyCount++;
            localStorage.setItem('dailyCopyCount', dailyCopyCount);
            updateDailyMission();
            unlockAchievement('achieve-copy-response', 'Resposta rápida copiada!');
            usedQuickResponses.add(target.id);
            localStorage.setItem('usedQuickResponses', JSON.stringify(Array.from(usedQuickResponses)));
            checkAchievements();
        }
    });
    
    settingsButton.addEventListener('click', openSettingsModal);
    closeSettingsModal.addEventListener('click', () => settingsModal.style.display = 'none');
    
    senhasButton.addEventListener('click', () => senhasModal.style.display = 'block');
    closeSenhasModal.addEventListener('click', () => senhasModal.style.display = 'none');
    senhasContainer.addEventListener('click', e => {
        if (e.target.classList.contains('copyable-credential')) {
            copyToClipboard(e.target.innerText, 'Credencial copiada!');
        }
    });
    
    window.addEventListener('click', e => { 
        if (e.target == settingsModal) settingsModal.style.display = 'none'; 
        if (e.target == senhasModal) senhasModal.style.display = 'none'; 
    });
    
    settingsForm.addEventListener('submit', e => {
        e.preventDefault();
        baseSalary = parseFloat(baseSalaryInput.value) || 0;
        localStorage.setItem('baseSalary', baseSalary);
        const newMetas = [];
        settingsMetasContainer.querySelectorAll('.form-group').forEach(group => {
            const id = parseInt(group.querySelector('label').textContent.replace('Faixa ', ''));
            const target = parseInt(group.querySelector('input[data-type="target"]').value);
            const reward = parseFloat(group.querySelector('input[data-type="reward"]').value) / 100;
            if (!isNaN(id) && !isNaN(target) && !isNaN(reward)) newMetas.push({ id, target, reward });
        });
        metas = newMetas;
        localStorage.setItem('customMetas', JSON.stringify(metas));
        reminderSettings.enabled = reminderEnabledInput.checked;
        reminderSettings.time = reminderTimeInput.value;
        localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));
        showToast('Configurações guardadas!', 'success');
        settingsModal.style.display = 'none';
        scheduleReminder();
        loadData();
    });
    
    window.addEventListener('beforeinstallprompt', e => { 
        e.preventDefault(); 
        deferredInstallPrompt = e; 
        installAppButton.style.display = 'block';
    });
    installAppButton.addEventListener('click', async () => { 
        if (deferredInstallPrompt) { 
            deferredInstallPrompt.prompt(); 
            const { outcome } = await deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
                installAppButton.style.display = 'none';
            }
            deferredInstallPrompt = null; 
        } else { 
            showToast('App já instalado. Para reinstalar, limpe os dados do site no navegador.', 'info');
        }
    });

    clearCacheButton.addEventListener('click', () => {
        if ('caches' in window && 'serviceWorker' in navigator) {
            caches.keys().then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for(let registration of registrations) {
                        registration.unregister();
                    }
                    showToast('Cache limpo! A página será recarregada.', 'success');
                    setTimeout(() => window.location.reload(true), 2000);
                });
            });
        } else {
            showToast('Recurso não suportado neste navegador.', 'danger');
        }
    });

    themeToggleButton.addEventListener('click', () => {
        const currentTheme = document.body.className.replace('theme-','');
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];
        
        applyTheme(newTheme);
        localStorage.setItem('appTheme', newTheme);
        showToast(`Tema alterado para ${newTheme}!`, 'info');
        unlockAchievement('achieve-change-theme', 'Novo visual!');
    });
    
    tabsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button');
        if (!button) return;
        
        const currentActive = document.querySelector('.tab-button.active');
        const buttonArray = Array.from(tabButtons);
        const currentIndex = buttonArray.indexOf(currentActive);
        const nextIndex = buttonArray.indexOf(button);
        
        const direction = nextIndex > currentIndex ? 'left' : 'right';

        switchTab(button.dataset.tab, direction);
    });

    function switchTab(tabId, direction) {
        const currentActiveTab = document.querySelector('.tab-content.active');
        const nextTab = document.getElementById(`tab-${tabId}`);
        
        if (currentActiveTab === nextTab) return;

        // Atualiza botões
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });

        // Animação
        if (currentActiveTab) {
            currentActiveTab.style.transform = direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
            currentActiveTab.style.opacity = 0;
            currentActiveTab.classList.remove('active');
        }
        
        nextTab.style.transform = direction === 'left' ? 'translateX(100%)' : 'translateX(-100%)';
        nextTab.style.opacity = 0;
        
        // Força o navegador a aplicar o estilo inicial antes de animar
        setTimeout(() => {
            nextTab.classList.add('active');
            nextTab.style.transform = 'translateX(0)';
            nextTab.style.opacity = 1;

            renderTrendChart();
            renderCategoryPieChart();
        }, 50);
    }

    // --- LÓGICA DE SWIPE PARA ABAS ---
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        if (Math.abs(swipeDistance) < MIN_SWIPE_DISTANCE) return;

        const currentActive = document.querySelector('.tab-button.active');
        const buttonArray = Array.from(tabButtons);
        const currentIndex = buttonArray.indexOf(currentActive);
        let nextIndex;
        let direction;

        if (swipeDistance < 0) { // Swipe para a esquerda
            nextIndex = (currentIndex + 1) % buttonArray.length;
            direction = 'left';
        } else { // Swipe para a direita
            nextIndex = (currentIndex - 1 + buttonArray.length) % buttonArray.length;
            direction = 'right';
        }
        
        switchTab(buttonArray[nextIndex].dataset.tab, direction);
    }

    tabContentWrapper.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    tabContentWrapper.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });


    // --- INICIALIZAÇÃO ---
    const savedTheme = localStorage.getItem('appTheme') || 'tech';
    applyTheme(savedTheme);
    loadData(); // Inicia o carregamento dos dados diretamente
});
