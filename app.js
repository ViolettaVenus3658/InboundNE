// ==========================================
// FUNÇÕES UTILITÁRIAS GLOBAIS
// ==========================================
function getLocalDateStr() {
    const d = new Date();
    // Ajusta o offset do fuso horário para o fuso local do navegador Brasil
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0]; // Retorna exatamente o dia que é na sua máquina
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'error' ? '#ef4444' : '#10b981';
    toast.innerText = sanitizeText(message, 300);
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

const MAX_XML_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_LEN = 120;
const SYNC_SETTINGS_KEY = 'inbound_sync_settings';
const SYNC_HISTORY_KEY = 'inbound_sync_history';
const ALLOWED_STATUS_NQ = ['N/A', 'Resolvida', 'Pendente'];
const ALLOWED_BOOL_NQ = ['Não', 'Sim'];
const ALLOWED_CLASS_NQ = ['', 'Falta', 'Sobra', 'Avaria'];

function safeParseArray(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function safeParseObject(storageKey, fallback = {}) {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : fallback;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch (_) {
        return fallback;
    }
}

function sanitizeText(value, maxLen = MAX_TEXT_LEN) {
    const txt = String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/[<>`"']/g, '')
        .trim();
    return txt.slice(0, maxLen);
}

function sanitizeEnum(value, allowed, fallback) {
    const clean = sanitizeText(value, 40);
    return allowed.includes(clean) ? clean : fallback;
}

function toSafeNumber(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function sanitizeDate(value) {
    const clean = sanitizeText(value, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : getLocalDateStr();
}

function normalizeGestao(gestao = {}) {
    return {
        po: sanitizeText(gestao.po, 50),
        nr: sanitizeText(gestao.nr, 50),
        statusNessoft: sanitizeText(gestao.statusNessoft, 40) || 'Pendente',
        statusWiser: sanitizeText(gestao.statusWiser, 40) || 'Pendente',
        statusGeral: sanitizeText(gestao.statusGeral, 40) || 'Em andamento',
        ordemChegada: sanitizeText(gestao.ordemChegada, 40),
        obs: sanitizeText(gestao.obs, 250),
        temNq: sanitizeEnum(gestao.temNq, ALLOWED_BOOL_NQ, 'Não'),
        classNq: sanitizeEnum(gestao.classNq, ALLOWED_CLASS_NQ, ''),
        nqResolvida: sanitizeEnum(gestao.nqResolvida, ALLOWED_STATUS_NQ, 'N/A'),
        tipoFrete: sanitizeText(gestao.tipoFrete, 20) || 'CIF'
    };
}

function normalizeStateData(state) {
    const nfs = (state.nfs || []).map((nf) => ({
        id: sanitizeText(nf.id, 40),
        nf: sanitizeText(nf.nf, 30),
        importDate: sanitizeDate(nf.importDate),
        fornecedor: sanitizeText(nf.fornecedor, 120),
        emissao: sanitizeDate(nf.emissao),
        status: sanitizeText(nf.status, 40) || 'Aguardando Caminhão',
        items: (nf.items || []).map((item) => ({
            sku: sanitizeText(item.sku, 60),
            descricao: sanitizeText(item.descricao, 200),
            qtdEsperada: toSafeNumber(item.qtdEsperada, 0, 0, 1000000),
            qtdRecebida: toSafeNumber(item.qtdRecebida, 0, 0, 1000000),
            qtdLotes: Math.trunc(toSafeNumber(item.qtdLotes, 0, 0, 1000000)),
            status: sanitizeText(item.status, 30) || 'Pendente'
        }))
    }));

    const trucks = (state.trucks || []).map((t) => ({
        id: sanitizeText(t.id, 40),
        dataChegada: sanitizeDate(t.dataChegada),
        nomeCarro: sanitizeText(t.nomeCarro, 80),
        ldp: sanitizeText(t.ldp, 60),
        tipo: sanitizeText(t.tipo, 40),
        origem: sanitizeText(t.origem, 30),
        motorista: sanitizeText(t.motorista, 80),
        container: sanitizeText(t.container, 60),
        lacre: sanitizeText(t.lacre, 60),
        paletes: Math.trunc(toSafeNumber(t.paletes, 0, 0, 1000000)),
        status: sanitizeText(t.status, 60),
        nfsVinculadas: (t.nfsVinculadas || []).map((nf) => ({
            ...nf,
            nf: sanitizeText(nf.nf, 30),
            importDate: sanitizeDate(nf.importDate),
            fornecedor: sanitizeText(nf.fornecedor, 120),
            emissao: sanitizeDate(nf.emissao),
            status: sanitizeText(nf.status, 40),
            items: (nf.items || []).map((item) => ({
                sku: sanitizeText(item.sku, 60),
                descricao: sanitizeText(item.descricao, 200),
                qtdEsperada: toSafeNumber(item.qtdEsperada, 0, 0, 1000000),
                qtdRecebida: toSafeNumber(item.qtdRecebida, 0, 0, 1000000),
                qtdLotes: Math.trunc(toSafeNumber(item.qtdLotes, 0, 0, 1000000)),
                status: sanitizeText(item.status, 30) || 'Pendente'
            })),
            gestao: normalizeGestao(nf.gestao || {})
        }))
    }));

    const schedules = (state.schedules || []).map((s) => ({
        id: sanitizeText(s.id, 40),
        data: sanitizeDate(s.data),
        ldp: sanitizeText(s.ldp, 60),
        tipo: sanitizeText(s.tipo, 40),
        origem: sanitizeText(s.origem, 30),
        obs: sanitizeText(s.obs, 200),
        status: sanitizeText(s.status, 30) || 'Agendado'
    }));

    return { nfs, trucks, schedules };
}

// Configuração do Estado da Aplicação (Local Storage)
const normalizedBootState = normalizeStateData({
    nfs: safeParseArray('inbound_nfs'),
    trucks: safeParseArray('inbound_trucks'),
    schedules: safeParseArray('inbound_schedules')
});

const AppState = {
    nfs: normalizedBootState.nfs,
    trucks: normalizedBootState.trucks,
    schedules: normalizedBootState.schedules,
    save: function() {
        const normalized = normalizeStateData({
            nfs: this.nfs,
            trucks: this.trucks,
            schedules: this.schedules
        });
        this.nfs = normalized.nfs;
        this.trucks = normalized.trucks;
        this.schedules = normalized.schedules;

        localStorage.setItem('inbound_nfs', JSON.stringify(this.nfs));
        localStorage.setItem('inbound_trucks', JSON.stringify(this.trucks));
        localStorage.setItem('inbound_schedules', JSON.stringify(this.schedules));
        updateDashboard();
        renderNfsTable();
        renderTrucksTable();
        renderManagementTable();
        renderSchedulesTable();
    }
};

const SyncSettings = {
    autoClearAfterSync: false,
    load: function() {
        const saved = safeParseObject(SYNC_SETTINGS_KEY, {});
        this.autoClearAfterSync = Boolean(saved.autoClearAfterSync);
    },
    save: function() {
        localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify({
            autoClearAfterSync: this.autoClearAfterSync
        }));
    }
};

function refreshSyncSettingsUI() {
    const checkbox = document.getElementById('opt-auto-clear-sync');
    if (checkbox) checkbox.checked = SyncSettings.autoClearAfterSync;
}

window.toggleAutoClearSync = function(isChecked) {
    SyncSettings.autoClearAfterSync = Boolean(isChecked);
    SyncSettings.save();
    showToast(SyncSettings.autoClearAfterSync
        ? 'Limpeza automática ativada após sincronizar.'
        : 'Dados locais serão mantidos após sincronizar.');
};

function saveSyncSnapshot() {
    const current = safeParseArray(SYNC_HISTORY_KEY);
    current.unshift({
        ts: new Date().toISOString(),
        data: {
            nfs: AppState.nfs,
            trucks: AppState.trucks,
            schedules: AppState.schedules
        }
    });
    const compact = current.slice(0, 20);
    localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(compact));
}

function mergeByKey(localList, cloudList, keyGetter) {
    const map = new Map();
    (localList || []).forEach((item) => map.set(keyGetter(item), item));
    (cloudList || []).forEach((item) => map.set(keyGetter(item), item));
    return Array.from(map.values());
}

function mergeCloudState(cloudState) {
    AppState.nfs = mergeByKey(AppState.nfs, cloudState.nfs || [], (item) => item.id || ('NF_' + item.nf));
    AppState.trucks = mergeByKey(AppState.trucks, cloudState.trucks || [], (item) => item.id || ('TRK_' + item.ldp + '_' + item.dataChegada));
    AppState.schedules = mergeByKey(AppState.schedules, cloudState.schedules || [], (item) => item.id || ('SCH_' + item.ldp + '_' + item.data));
}

function extractRemoteStatePayload(remoteRaw) {
    if (!remoteRaw || typeof remoteRaw !== 'object') {
        return { nfs: [], trucks: [], schedules: [] };
    }

    if (Array.isArray(remoteRaw.nfs) || Array.isArray(remoteRaw.trucks) || Array.isArray(remoteRaw.schedules)) {
        return {
            nfs: Array.isArray(remoteRaw.nfs) ? remoteRaw.nfs : [],
            trucks: Array.isArray(remoteRaw.trucks) ? remoteRaw.trucks : [],
            schedules: Array.isArray(remoteRaw.schedules) ? remoteRaw.schedules : []
        };
    }

    if (remoteRaw.data && typeof remoteRaw.data === 'object') {
        return {
            nfs: Array.isArray(remoteRaw.data.nfs) ? remoteRaw.data.nfs : [],
            trucks: Array.isArray(remoteRaw.data.trucks) ? remoteRaw.data.trucks : [],
            schedules: Array.isArray(remoteRaw.data.schedules) ? remoteRaw.data.schedules : []
        };
    }

    if (typeof remoteRaw.payload === 'string') {
        try {
            const parsed = JSON.parse(remoteRaw.payload);
            return extractRemoteStatePayload(parsed);
        } catch (_) {
            return { nfs: [], trucks: [], schedules: [] };
        }
    }

    return { nfs: [], trucks: [], schedules: [] };
}

function restoreFromLastSyncSnapshot() {
    const history = safeParseArray(SYNC_HISTORY_KEY);
    if (!history.length || !history[0] || !history[0].data) return false;

    const backup = normalizeStateData(history[0].data);
    mergeCloudState(backup);
    AppState.save();
    return true;
}

document.querySelectorAll('.nav-links li').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));

        item.classList.add('active');
        const pageId = item.getAttribute('data-page');
        document.getElementById(pageId).classList.add('active');

        if(pageId === 'page-conference') {
            const fStart = document.getElementById('filter-date-start-conference');
            const fEnd = document.getElementById('filter-date-end-conference');
            const loc = getLocalDateStr();
            if(fStart && !fStart.value) fStart.value = loc;
            if(fEnd && !fEnd.value) fEnd.value = loc;
            renderConferenceTable();
        }
    });
});


// ==========================================
// IMPORTACAO XML
// ==========================================
const dropZone = document.getElementById('drop-zone');
const xmlInput = document.getElementById('xml-input');

if(dropZone){
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#3b82f6'; });
    dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'rgba(59,130,246,0.5)');
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(59,130,246,0.5)';
        handleFiles(e.dataTransfer.files);
    });
}
if(xmlInput) xmlInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    const todayStr = getLocalDateStr();

    Array.from(files).forEach(file => {
        if (!file.name.toLowerCase().endsWith('.xml')) return;
        if (file.size > MAX_XML_FILE_BYTES) {
            showToast(`Arquivo ${sanitizeText(file.name, 60)} excede 5MB.`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(e.target.result, 'text/xml');
            if (xml.getElementsByTagName('parsererror').length > 0) {
                showToast(`Arquivo ${sanitizeText(file.name, 60)} possui XML inválido.`, 'error');
                return;
            }
            
            const infNFe = xml.getElementsByTagName('infNFe')[0];
            if(!infNFe) { showToast(`Arquivo ${file.name} não é uma NF-e.`, 'error'); return; }

            const ide = xml.getElementsByTagName('ide')[0];
            const nNF = sanitizeText(ide ? ide.getElementsByTagName('nNF')[0]?.textContent : 'SN', 30);
            const rawDhEmi = ide ? ide.getElementsByTagName('dhEmi')[0]?.textContent.split('T')[0] : '';
            const dhEmi = sanitizeDate(rawDhEmi || todayStr);
            
            const emit = xml.getElementsByTagName('emit')[0];
            const xNome = sanitizeText(emit ? emit.getElementsByTagName('xNome')[0]?.textContent : 'Desconhecido', 120);

            if(AppState.nfs.find(n => n.nf === nNF)) {
                showToast(`NF ${nNF} já importada!`, 'error');
                return;
            }

            const detList = xml.getElementsByTagName('det');
            let items = [];
            for(let i=0; i<detList.length; i++) {
                const prod = detList[i].getElementsByTagName('prod')[0];
                const cProd = sanitizeText(prod.getElementsByTagName('cProd')[0]?.textContent || 'N/A', 60);
                const xProd = sanitizeText(prod.getElementsByTagName('xProd')[0]?.textContent || '', 200);
                const qCom = toSafeNumber(prod.getElementsByTagName('qCom')[0]?.textContent || '0', 0, 0, 1000000);
                
                items.push({
                    sku: cProd, descricao: xProd,
                    qtdEsperada: qCom, qtdRecebida: 0,
                    qtdLotes: 0, status: 'Pendente'
                });
            }

            AppState.nfs.push({
                id: 'NF-' + Date.now() + Math.random().toString().slice(2,5),
                nf: nNF,
                importDate: todayStr, 
                fornecedor: xNome,
                emissao: dhEmi,
                items: items,
                status: 'Aguardando Caminhão'
            });
            showToast(`NF ${nNF} importada com sucesso!`);
            AppState.save();
        };
        reader.readAsText(file);
    });
}

window.clearNfs = function() {
    if(confirm('Isso apaga todas as NFs não vinculadas. Continuar?')) {
        AppState.nfs = AppState.nfs.filter(n => n.status !== 'Aguardando Caminhão'); 
        AppState.save(); 
        showToast('NFs apagadas');
    }
}

function renderNfsTable() {
    const tbody = document.querySelector('#table-imported-nfs tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    AppState.nfs.filter(n => n.status === 'Aguardando Caminhão').forEach(nf => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${nf.nf}</strong></td>
                <td>${nf.importDate}</td>
                <td>${nf.fornecedor}</td>
                <td>${nf.emissao}</td>
                <td>${nf.items.length} itens</td>
                <td><span style="color:var(--warning)">${nf.status}</span></td>
            </tr>
        `;
    });
}


// ==========================================
// RECEPCAO DE CAMINHOES
// ==========================================
window.openTruckModal = function() {
    document.getElementById('modal-truck').classList.add('open');
    document.getElementById('t-data').value = getLocalDateStr();
    
    const list = document.getElementById('t-nf-list');
    list.innerHTML = '';
    const disponiveis = AppState.nfs.filter(n => n.status === 'Aguardando Caminhão');
    if(disponiveis.length === 0) list.innerHTML = '<p class="subtext">Nenhuma NF disponível para vinculo.</p>';
    disponiveis.forEach(nf => {
        list.innerHTML += `<label><input type="checkbox" value="${nf.id}" class="nf-check"> NF-e ${nf.nf} - ${nf.fornecedor}</label>`;
    });
}
window.closeTruckModal = function() { document.getElementById('modal-truck').classList.remove('open'); }

window.saveTruck = function() {
    const nomeCarro = sanitizeText(document.getElementById('t-nome_carro').value, 80);
    const ldp = sanitizeText(document.getElementById('t-ldp').value, 60);
    const tipo = sanitizeText(document.getElementById('t-tipo').value, 40);
    const origem = sanitizeText(document.getElementById('t-origem').value, 30);
    const motorista = sanitizeText(document.getElementById('t-motorista').value, 80);
    const container = sanitizeText(document.getElementById('t-container').value, 60);
    const lacre = sanitizeText(document.getElementById('t-lacre').value, 60);
    const paletes = Math.trunc(toSafeNumber(document.getElementById('t-paletes').value, 0, 0, 1000000));
    const dataChegada = sanitizeDate(document.getElementById('t-data').value);

    const checks = document.querySelectorAll('.nf-check:checked');
    const nfIds = Array.from(checks).map(c => c.value);

    if(!nomeCarro || !ldp) return showToast('Preencha Nome do Carro e LDP', 'error');

    const nfsVinculadas = [];
    nfIds.forEach(id => {
        const nf = AppState.nfs.find(n => n.id === id);
        if(nf) {
            nf.status = 'Em Sistema';
            let nfc = JSON.parse(JSON.stringify(nf));
            nfc.gestao = {
                po: '', nr: '', statusNessoft: 'Pendente', 
                statusWiser: 'Pendente', statusGeral: 'Em andamento',
                ordemChegada: '', obs: '',
                temNq: 'Não', classNq: '', nqResolvida: 'N/A'
            };
            nfsVinculadas.push(nfc);
        }
    });

    AppState.trucks.push({
        id: 'TRK-' + Date.now(),
        dataChegada,
        nomeCarro, ldp, tipo, origem, motorista, container, lacre,
        paletes, nfsVinculadas, status: 'Recepção e Conferência'
    });

    closeTruckModal();
    showToast(`Carro ${nomeCarro} (${ldp}) salvo com sucesso`);
    AppState.save();
}

function renderTrucksTable() {
    const tbody = document.querySelector('#table-trucks tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    AppState.trucks.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${t.nomeCarro}</strong> <br><small>${t.dataChegada}</small></td>
                <td>${t.ldp}</td>
                <td>${t.tipo} / ${t.origem}</td>
                <td>${t.motorista}</td>
                <td>${t.container} <br><small>Lacre: ${t.lacre}</small></td>
                <td>${t.nfsVinculadas.length} NFs</td>
                <td><button class="btn btn-primary" onclick="deleteTruck('${t.id}')">Excluir</button></td>
            </tr>
        `;
    });
}
window.deleteTruck = function(id) {
    if(confirm('Apagar caminhão? NFs vinculadas voltarão para o pool.')){
        const t = AppState.trucks.find(x => x.id === id);
        if(t){
            t.nfsVinculadas.forEach(v => {
                const org = AppState.nfs.find(n => n.nf === v.nf);
                if(org) org.status = 'Aguardando Caminhão';
            });
            AppState.trucks = AppState.trucks.filter(x => x.id !== id);
            AppState.save();
        }
    }
}


// ==========================================
// CONFERÊNCIA
// ==========================================
window.clearConferenceFilters = function() {
    document.getElementById('filter-date-start-conference').value = '';
    document.getElementById('filter-date-end-conference').value = '';
    document.getElementById('filter-nf-conference').value = '';
    document.getElementById('filter-carro-conference').value = '';
    renderConferenceTable();
}

window.renderConferenceTable = function() {
    const fStart = document.getElementById('filter-date-start-conference')?.value;
    const fEnd = document.getElementById('filter-date-end-conference')?.value;
    const fNf = document.getElementById('filter-nf-conference')?.value.trim().toLowerCase();
    const fCarro = document.getElementById('filter-carro-conference')?.value.trim().toLowerCase();
    
    const tbody = document.querySelector('#table-conference tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let trucksToShow = AppState.trucks;
    if(fStart) trucksToShow = trucksToShow.filter(t => t.dataChegada >= fStart);
    if(fEnd) trucksToShow = trucksToShow.filter(t => t.dataChegada <= fEnd);
    if(fCarro) trucksToShow = trucksToShow.filter(t => t.nomeCarro.toLowerCase().includes(fCarro) || t.ldp.toLowerCase().includes(fCarro));

    let itemsCount = 0;

    trucksToShow.forEach(t => {
        t.nfsVinculadas.forEach((nf, nfIndex) => {
            if(fNf && !nf.nf.toLowerCase().includes(fNf)) return;

            nf.items.forEach((item, itemIndex) => {
                const isOk = (item.qtdRecebida === item.qtdEsperada);
                itemsCount++;
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${t.nomeCarro}</strong> <br><small>${t.ldp}</small></td>
                        <td><strong>${nf.nf}</strong></td>
                        <td>${item.sku}</td>
                        <td>${item.descricao.substring(0,25)}...</td>
                        <td style="font-weight:bold">${item.qtdEsperada}</td>
                        <td>
                            <input type="number" class="form-control" style="width:80px" 
                                value="${item.qtdRecebida}" 
                                onchange="updateItemConf('${t.id}', ${nfIndex}, ${itemIndex}, 'qtdRecebida', this.value)">
                        </td>
                        <td>
                            <input type="number" class="form-control" style="width:70px"
                                value="${item.qtdLotes || 0}"
                                onchange="updateItemConf('${t.id}', ${nfIndex}, ${itemIndex}, 'qtdLotes', this.value)">
                        </td>
                        <td style="color:${isOk && item.qtdRecebida > 0 ? 'var(--success)' : (item.qtdRecebida > 0 ? 'var(--danger)' : 'var(--warning)')}">
                            ${item.qtdRecebida === 0 ? 'Aguardando' : (isOk ? 'OK' : 'Divergência')}
                        </td>
                    </tr>
                `;
            });
        });
    });

    if(itemsCount === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-muted)">Nenhum item pendente de conferência para esses filtros.</td></tr>`;
    }
}

window.updateItemConf = function(truckId, nfIndex, itemIndex, field, value) {
    const truck = AppState.trucks.find(t => t.id === truckId);
    if(truck) {
        if(field === 'qtdRecebida') {
            truck.nfsVinculadas[nfIndex].items[itemIndex].qtdRecebida = toSafeNumber(value, 0, 0, 1000000);
        }
        if(field === 'qtdLotes') {
            truck.nfsVinculadas[nfIndex].items[itemIndex].qtdLotes = Math.trunc(toSafeNumber(value, 0, 0, 1000000));
        }
        AppState.save();
        renderConferenceTable(); 
    }
}


// ==========================================
// GESTÃO GERAL (O EXCEL)
// ==========================================
window.saveGestaoCell = function(truckId, nfIndex, c_field, val) {
    const trk = AppState.trucks.find(t => t.id === truckId);
    if(trk && trk.nfsVinculadas[nfIndex]) {
        if(!trk.nfsVinculadas[nfIndex].gestao) trk.nfsVinculadas[nfIndex].gestao = {};
        if (c_field === 'temNq') {
            trk.nfsVinculadas[nfIndex].gestao[c_field] = sanitizeEnum(val, ALLOWED_BOOL_NQ, 'Não');
        } else if (c_field === 'classNq') {
            trk.nfsVinculadas[nfIndex].gestao[c_field] = sanitizeEnum(val, ALLOWED_CLASS_NQ, '');
        } else if (c_field === 'nqResolvida') {
            trk.nfsVinculadas[nfIndex].gestao[c_field] = sanitizeEnum(val, ALLOWED_STATUS_NQ, 'N/A');
        } else {
            trk.nfsVinculadas[nfIndex].gestao[c_field] = sanitizeText(val, c_field === 'obs' ? 250 : 80);
        }
        AppState.save();
    }
}

function renderManagementTable() {
    const tbody = document.querySelector('#table-management tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    AppState.trucks.forEach(t => {
        const dataObj = new Date(t.dataChegada);
        // Garantindo que a data não quebre: usando formatação robusta de string.
        let anoStr, mesIdx, dia;
        if(t.dataChegada.includes('-')) {
             const parts = t.dataChegada.split('-');
             anoStr = parts[0]; 
             mesIdx = parseInt(parts[1])-1;
             dia = parts[2];
        } else {
             anoStr = dataObj.getFullYear();
             mesIdx = dataObj.getMonth();
             dia = ("0" + dataObj.getDate()).slice(-2);
        }
        
        const mesesShort = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const mesStr = mesesShort[mesIdx];
        const dataBr = dia + '/' + ("0" + (mesIdx+1)).slice(-2) + '/' + anoStr;

        t.nfsVinculadas.forEach((nf, nfIndex) => {            
            const g = nf.gestao || {};

            tbody.innerHTML += `
                <tr>
                    <td>${dataBr}</td>
                    <td>${mesStr}</td>
                    <td>${anoStr}</td>
                    <td><strong>${nf.nf}</strong></td>
                    <td>${t.ldp}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'po', this.innerText)">${g.po||''}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'nr', this.innerText)">${g.nr||''}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'statusNessoft', this.innerText)">${g.statusNessoft||''}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'statusWiser', this.innerText)">${g.statusWiser||''}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'statusGeral', this.innerText)">${g.statusGeral||''}</td>
                    <td>${t.tipo}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'tipoFrete', this.innerText)">${g.tipoFrete||'CIF'}</td>
                    <td>${t.paletes}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'ordemChegada', this.innerText)">${g.ordemChegada||''}</td>
                    <td contenteditable="true" style="border:1px dashed var(--secondary)" onblur="saveGestaoCell('${t.id}', ${nfIndex}, 'obs', this.innerText)">${g.obs||''}</td>
                    
                    <!-- Seletores de NQ -->
                    <td>
                        <select class="table-select" onchange="saveGestaoCell('${t.id}', ${nfIndex}, 'temNq', this.value)">
                            <option value="Não" ${g.temNq === 'Não' ? 'selected' : ''}>Não</option>
                            <option value="Sim" ${g.temNq === 'Sim' ? 'selected' : ''}>Sim</option>
                        </select>
                    </td>
                    <td>
                        <select class="table-select" onchange="saveGestaoCell('${t.id}', ${nfIndex}, 'classNq', this.value)">
                            <option value="" ${g.classNq === '' || !g.classNq ? 'selected' : ''}>-</option>
                            <option value="Falta" ${g.classNq === 'Falta' ? 'selected' : ''}>Falta</option>
                            <option value="Sobra" ${g.classNq === 'Sobra' ? 'selected' : ''}>Sobra</option>
                            <option value="Avaria" ${g.classNq === 'Avaria' ? 'selected' : ''}>Avaria</option>
                        </select>
                    </td>
                    <td>
                        <select class="table-select" onchange="saveGestaoCell('${t.id}', ${nfIndex}, 'nqResolvida', this.value)">
                            <option value="N/A" ${g.nqResolvida === 'N/A' || !g.nqResolvida ? 'selected' : ''}>N/A</option>
                            <option value="Resolvida" ${g.nqResolvida === 'Resolvida' ? 'selected' : ''}>Resolvida</option>
                            <option value="Pendente" ${g.nqResolvida === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        </select>
                    </td>
                </tr>
            `;
        });
    });
}

window.exportVisaoGeral = function() {
    let csv = ['"Data";"Mês";"Ano";"NF-e";"LDP";"PO";"NR";"Status Nessoft";"Status Wiser";"Status Geral";"Classificação da Carga";"Tipo de Frete";"Paletes QTD";"Ordem de Chegada";"OBS";"NQ";"Class. NQ";"NQ RESOLVIDA?"'];
    
    AppState.trucks.forEach(t => {
        let anoStr, mesIdx, dia;
        if(t.dataChegada.includes('-')) {
             const parts = t.dataChegada.split('-');
             anoStr = parts[0]; 
             mesIdx = parseInt(parts[1])-1;
             dia = parts[2];
        } else {
             anoStr = ''; mesIdx = 0; dia = '';
        }
        const mesesShort = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        const mesStr = mesesShort[mesIdx];
        const dataBr = dia + '/' + ("0" + (mesIdx+1)).slice(-2) + '/' + anoStr;

        t.nfsVinculadas.forEach(nf => {
            const g = nf.gestao || {};
            const ordemChegada = g.ordemChegada || t.nomeCarro || '';
            let row = [
                dataBr,
                mesStr,
                anoStr,
                nf.nf,
                t.ldp,
                g.po || '',
                g.nr || '',
                g.statusNessoft || '',
                g.statusWiser || '',
                g.statusGeral || '',
                t.tipo,
                g.tipoFrete || 'CIF',
                t.paletes,
                ordemChegada,
                g.obs || '',
                g.temNq || 'Não',
                g.classNq || '',
                g.nqResolvida || 'N/A'
            ];
            const escapedRow = row.map(v => '"' + String(v).replace(/"/g, '""') + '"');
            csv.push(escapedRow.join(';'));
        });
    });

    triggerDownload(csv.join('\n'), 'VisaoGeral_Recebimento.csv');
}

// ==========================================
// INTEGRAÇÃO: GOOGLE SHEETS
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxZDkkscsavHeUDmyLhGCVJwSPwvBj-WsUV5XYTJeRgOEadahVbUInsrXt2jfNcTdxb/exec';

window.sincronizarGoogle = async function() {
    if (window.__syncInProgress) return;
    if(AppState.trucks.length === 0) {
        showToast('Nada para sincronizar.', 'error');
        return;
    }

    if (!GOOGLE_SCRIPT_URL.startsWith('https://script.google.com/')) {
        showToast('URL de sincronização inválida.', 'error');
        return;
    }

    window.__syncInProgress = true;
    
    const btnD = document.getElementById('btn-sync');
    const btnG = document.getElementById('btn-sync-gestao');
    if(btnD) { btnD.innerText = 'Enviando...'; btnD.disabled = true; }
    if(btnG) { btnG.innerText = 'Enviando...'; btnG.disabled = true; }

    try {
        let linhasGestao = [];
        let linhasItens = [];

        AppState.trucks.forEach(t => {
            let anoStr, mesIdx, dia;
            if(t.dataChegada.includes('-')) {
                 const parts = t.dataChegada.split('-');
                 anoStr = parts[0]; 
                 mesIdx = parseInt(parts[1])-1;
                 dia = parts[2];
            } else {
                 anoStr = ''; mesIdx = 0; dia = '';
            }
            const dataBr = dia ? (dia + '/' + ("0" + (mesIdx+1)).slice(-2) + '/' + anoStr) : t.dataChegada;
            const mesesShort = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
            const mesStr = mesesShort[mesIdx];

            t.nfsVinculadas.forEach(nf => {
                const g = nf.gestao || {};
                const ordemChegada = g.ordemChegada || t.nomeCarro || '';
                linhasGestao.push([
                    dataBr, mesStr, anoStr, nf.nf, t.ldp,
                    g.po || '', g.nr || '', g.statusNessoft || '', g.statusWiser || '', g.statusGeral || '',
                    t.tipo, g.tipoFrete || 'CIF', t.paletes, ordemChegada, g.obs || '',
                    g.temNq || 'Não', g.classNq || '', g.nqResolvida || 'N/A'
                ]);

                nf.items.forEach(i => {
                    linhasItens.push([
                        dataBr, t.nomeCarro, t.ldp, t.tipo, nf.nf, 
                        i.sku, i.descricao, i.qtdEsperada, i.qtdRecebida, i.qtdLotes || 0
                    ]);
                });
            });
        });

        // 1. Enviar Visão Geral
        if(linhasGestao.length > 0) {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ tipo: 'visao_geral', linhas: linhasGestao })
            });
        }

        // 2. Enviar Itens
        if(linhasItens.length > 0) {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ tipo: 'itens', linhas: linhasItens })
            });
        }

        // 3. Enviar snapshot completo do estado para leitura futura (Puxar da Nuvem)
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                tipo: 'estado',
                estado: {
                    nfs: AppState.nfs,
                    trucks: AppState.trucks,
                    schedules: AppState.schedules
                }
            })
        });

        showToast('Upload concluído com sucesso pro Banco de Dados!', 'success');

        saveSyncSnapshot();
        if (SyncSettings.autoClearAfterSync) {
            AppState.trucks = [];
            AppState.save();
            showToast('Sincronizado. Limpeza automática local executada.', 'success');
        } else {
            showToast('Sincronizado e dados locais mantidos nesta máquina.', 'success');
        }

    } catch(err) {
        showToast('Erro ao sincronizar: ' + err.message, 'error');
    } finally {
        window.__syncInProgress = false;
    }

    if(btnD) { btnD.innerText = '☁️ Sincronizar Nuvem'; btnD.disabled = false; }
    if(btnG) { btnG.innerText = '☁️ Sincronizar Nuvem'; btnG.disabled = false; }
}


// ==========================================
// DASHBOARD & ANALYTICS
// ==========================================
window.applyDashFilters = function() { updateDashboard(); }
window.clearDashFilters = function() {
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    document.getElementById('filter-nf').value = '';
    document.getElementById('filter-sku').value = '';
    updateDashboard();
}

function updateDashboard() {
    if(!document.getElementById('stat-trucks')) return; // previne erro se n tiver dash

    const fStart = document.getElementById('filter-date-start')?.value;
    const fEnd = document.getElementById('filter-date-end')?.value;
    const fNf = document.getElementById('filter-nf')?.value.trim().toLowerCase();
    const fSku = document.getElementById('filter-sku')?.value.trim().toLowerCase();

    let filteredTrucks = [];
    let totalTrucks = 0, totalNfs = 0, totalPals = 0, totalLotes = 0;
    let uniqueSkus = new Set();
    let countTipos = {};
    
    // Contadores para barra de progresso
    let tEsps = 0, tRecs = 0;

    AppState.trucks.forEach(t => {
        let validNfsParaEsteCarro = [];

        t.nfsVinculadas.forEach(nf => {
            // IMPORT DATE FILTER (RANGE)
            if(fStart && nf.importDate < fStart) return; 
            if(fEnd && nf.importDate > fEnd) return; 
            if(fNf && !nf.nf.toLowerCase().includes(fNf)) return; 
            
            let validItems = [];
            nf.items.forEach(i => {
                if(fSku && !i.sku.toLowerCase().includes(fSku) && !i.descricao.toLowerCase().includes(fSku)) return;
                
                validItems.push(i);
                uniqueSkus.add(i.sku);
                totalLotes += parseInt(i.qtdLotes || 0);
                
                tEsps += i.qtdEsperada;
                tRecs += (i.qtdRecebida || 0);
            });

            if(validItems.length > 0) validNfsParaEsteCarro.push(nf);
        });

        if(validNfsParaEsteCarro.length > 0) {
            filteredTrucks.push(t);
            totalTrucks++;
            totalNfs += validNfsParaEsteCarro.length;
            totalPals += (t.paletes || 0);
            countTipos[t.tipo] = (countTipos[t.tipo] || 0) + 1;
        }
    });

    // Atualizando o bloco de Tipos de Carga
    const tiposContainer = document.getElementById('tipos-carga-container');
    const panelTipos = document.getElementById('panel-tipos-carga');
    if(tiposContainer) {
        tiposContainer.innerHTML = '';
        const thKeys = Object.keys(countTipos);
        if(thKeys.length === 0) {
            panelTipos.style.display = 'none';
        } else {
            panelTipos.style.display = 'block';
            thKeys.forEach(tipo => {
                tiposContainer.innerHTML += `
                   <div style="background: rgba(59,130,246,0.15); border: 1px solid var(--primary); padding: 15px; border-radius: 8px; flex: 1; min-width: 140px; text-align: center;">
                       <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 5px; font-weight: 500;">Cargas de <br><strong style="color: white">${tipo}</strong></div>
                       <div style="font-size: 28px; font-weight: bold; color: var(--primary);">${countTipos[tipo]}</div>
                   </div>
                `;
            });
        }
    }

    document.getElementById('stat-trucks').innerText = totalTrucks;
    document.getElementById('stat-nfs').innerText = totalNfs;
    document.getElementById('stat-paletes').innerText = totalPals;
    document.getElementById('stat-lotes').innerText = totalLotes;
    document.getElementById('stat-items').innerText = uniqueSkus.size;
    
    const tbody = document.querySelector('#dashboard-recent-trucks tbody');
    tbody.innerHTML = '';
    filteredTrucks.slice(-5).forEach(t => {
        tbody.innerHTML += `<tr>
            <td><strong>${t.nomeCarro}</strong> <br><small>Motorista: ${t.motorista}</small></td>
            <td>${t.ldp}</td>
            <td>${t.tipo} / ${t.origem}</td>
            <td>${t.dataChegada.split('-').reverse().join('/')}</td>
            <td><span style="color:var(--primary)">${t.status}</span></td>
        </tr>`;
    });
    window._currentDashExportSet = filteredTrucks;

    // --- ANIMACAO PROGRESSO ---
    const pct = tEsps > 0 ? Math.round((tRecs / tEsps) * 100) : 0;
    document.getElementById('lbl-recebidos').innerText = tRecs;
    document.getElementById('lbl-abertos').innerText = (tEsps - tRecs);
    document.getElementById('txt-progresso').innerText = pct + '%';
    setTimeout(() => {
        const animElem = document.getElementById('anim-progress');
        if(animElem) animElem.style.width = pct + '%';
    }, 100);

    // --- CHART DE AGENDAMENTOS ---
    drawSchedulesChart();
}

function drawSchedulesChart() {
    const chart = document.getElementById('chart-schedules');
    if(!chart) return;
    chart.innerHTML = '';
    
    let counts = {};
    AppState.schedules.forEach(s => {
        counts[s.data] = (counts[s.data] || 0) + 1;
    });

    let keys = Object.keys(counts).sort((a,b) => new Date(a) - new Date(b)).slice(0, 10); 
    let maxCount = Math.max(...Object.values(counts), 1); 

    if(keys.length === 0) {
        chart.innerHTML = '<div style="color:var(--text-muted); width:100%; text-align:center; padding-top:20px;">Nenhuma carga na agenda.</div>';
        return;
    }

    keys.forEach(k => {
        let val = counts[k];
        let heightPct = (val / maxCount) * 100;
        let diaStr = k.split('-').slice(1,3).reverse().join('/'); 
        
        chart.innerHTML += `
            <div class="bar-wrap">
                <span class="bar-val">${val}</span>
                <div class="bar-col" style="height: ${heightPct}%;" title="${diaStr} - ${val} caminhões"></div>
                <span class="bar-label">${diaStr}</span>
            </div>
        `;
    });
}

window.exportAnalyticReport = function() {
    if(!window._currentDashExportSet || window._currentDashExportSet.length === 0) return showToast('Nada para exportar', 'error');
    
    const trucks = window._currentDashExportSet;
    let csv = ['"Data Importação";"Caminhão";"LDP";"Tipo";"Origem";"NF-e";"SKU";"Descrição";"Qtd Esperada";"Qtd Recebida";"Qtd Lotes"'];
    
    trucks.forEach(t => {
        t.nfsVinculadas.forEach(nf => {
            nf.items.forEach(i => {
                csv.push(`"${(nf.importDate||t.dataChegada).split('-').reverse().join('/')}";"${t.nomeCarro}";"${t.ldp}";"${t.tipo}";"${t.origem}";"${nf.nf}";"${i.sku}";"${i.descricao.replace(/"/g,'')}";"${i.qtdEsperada}";"${i.qtdRecebida}";"${i.qtdLotes||0}"`);
            });
        });
    });

    triggerDownload(csv.join('\n'), 'Relatorio_Analitico_Inbound.csv');
}

function triggerDownload(content, filename) {
    const blob = new Blob(["\uFEFF"+content], { type: 'text/csv;charset=utf-8;' }); 
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ==========================================
// AGENDAMENTOS
// ==========================================
window.openScheduleModal = function() {
    document.getElementById('modal-schedule').classList.add('open');
    document.getElementById('s-data').value = getLocalDateStr();
}
window.closeScheduleModal = function() { document.getElementById('modal-schedule').classList.remove('open'); }

window.saveSchedule = function() {
    const data = sanitizeDate(document.getElementById('s-data').value);
    const ldp = sanitizeText(document.getElementById('s-ldp').value || 'TBD', 60);
    const tipo = sanitizeText(document.getElementById('s-tipo').value, 40);
    const origem = sanitizeText(document.getElementById('s-origem').value, 30);
    const obs = sanitizeText(document.getElementById('s-obs').value, 200);

    if(!data) return showToast('Preencha a data', 'error');

    AppState.schedules.push({
        id: 'SCH-'+Date.now(),
        data, ldp, tipo, origem, obs, status: 'Agendado'
    });
    AppState.save();
    closeScheduleModal();
    showToast('Agendamento salvo!');
}

function renderSchedulesTable() {
    const tbody = document.querySelector('#table-schedules tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    let sArray = [...AppState.schedules].sort((a,b) => new Date(a.data) - new Date(b.data));
    sArray.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${s.data.split('-').reverse().join('/')}</strong></td>
                <td>${s.ldp}</td>
                <td>${s.tipo}</td>
                <td>${s.origem}</td>
                <td>${s.obs}</td>
                <td><span style="color:var(--primary)">${s.status}</span></td>
                <td><button class="btn btn-secondary" onclick="delSchedule('${s.id}')">Excluir</button></td>
            </tr>
        `;
    });
}
window.delSchedule = function(id) {
    AppState.schedules = AppState.schedules.filter(x => x.id !== id);
    AppState.save();
}

// INICIA
SyncSettings.load();
refreshSyncSettingsUI();
AppState.save();
