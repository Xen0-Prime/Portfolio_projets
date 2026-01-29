// IoT Dashboard - Orange LTE-M Guadeloupe - Enhanced with Supabase
// Configuration MQTT
const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const TOPICS = {
    temperature: 'dev/data/guadeloupe/temperature',
    pression: 'dev/data/guadeloupe/pression',
    humidite: 'dev/data/guadeloupe/humidite',
    position: 'dev/data/guadeloupe/position',
    battery: 'dev/data/guadeloupe/battery'
};

// Configuration Supabase
const SUPABASE_CONFIG = {
    url: 'https://ifqzsnevfluflbosaptt.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcXpzbmV2Zmx1Zmxib3NhcHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDQwODEsImV4cCI6MjA4MzI4MDA4MX0.LxyNCjZF17XjYYc1VQTsbh8IQTXiWnHbkAu_l0aS5Ec',
    table: 'iot_data'
};

// Headers pour Supabase REST API
const SUPABASE_HEADERS = {
    'apikey': SUPABASE_CONFIG.key,
    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

// État pour collecte de données IoT
let currentDataBatch = {
    device_id: 'SampleOAGua',
    timestamp: null,
    temperature: null,
    humidity: null,
    pressure: null,
    battery: null,
    gyro_x: null,
    gyro_y: null,
    gyro_z: null,
    accel_x: null,
    accel_y: null,
    accel_z: null,
    pitch: null,
    roll: null,
    yaw: null
};

let isInsertingData = false;
const REQUIRED_FIELDS = ['temperature', 'humidity', 'pressure', 'battery']; // Champs principaux
const POSITION_FIELDS = ['pitch', 'roll', 'yaw']; // Champs position (au moins un requis)

// Statistiques d'insertion
let insertionStats = {
    total: 0,
    success: 0,
    errors: 0,
    lastInsert: null
};

// State
let client = null;
let isConnected = false;
const dataHistory = {
    temperature: [],
    pression: [],
    humidite: [],
    position: [],
    battery: []
};
const MAX_HISTORY = 20;

// Supabase state
let historicalData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let chartInstance = null;
let autoRefreshInterval = null;
let autoRefreshEnabled = false;
const AUTO_REFRESH_DELAY = 30000; // 30 secondes

// Orientation state - pour la visualisation 3D
let deviceOrientation = { x: 0, y: 0, z: 0 };
let lastUpdateTime = Date.now();

// DOM Elements
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const logContainer = document.getElementById('logContainer');
const deviceContainer = document.getElementById('deviceContainer');

// ========== SUPABASE FUNCTIONS ==========

// Initialiser Chart.js pour l'historique
let chartInstances = {};

function initHistoryChart() {
    // Graphique Température
    const ctxTemp = document.getElementById('historyChartTemp');
    if (ctxTemp) {
        chartInstances.temp = new Chart(ctxTemp, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Température (°C)',
                    data: [],
                    borderColor: '#ff453a',
                    backgroundColor: 'rgba(255, 69, 58, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: getChartOptions('Température (°C)', '°C')
        });
    }
    
    // Graphique Humidité
    const ctxHum = document.getElementById('historyChartHum');
    if (ctxHum) {
        chartInstances.hum = new Chart(ctxHum, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Humidité (%)',
                    data: [],
                    borderColor: '#5ac8fa',
                    backgroundColor: 'rgba(90, 200, 250, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: getChartOptions('Humidité (%)', '%')
        });
    }
    
    // Graphique Pression
    const ctxPress = document.getElementById('historyChartPress');
    if (ctxPress) {
        chartInstances.press = new Chart(ctxPress, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Pression (Pa)',
                    data: [],
                    borderColor: '#0a84ff',
                    backgroundColor: 'rgba(10, 132, 255, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: getChartOptions('Pression (Pa)', 'Pa')
        });
    }
    
    // Graphique Batterie
    const ctxBatt = document.getElementById('historyChartBatt');
    if (ctxBatt) {
        chartInstances.batt = new Chart(ctxBatt, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Batterie (%)',
                    data: [],
                    borderColor: '#30d158',
                    backgroundColor: 'rgba(48, 209, 88, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: getChartOptions('Batterie (%)', '%', 0, 100)
        });
    }
    
    // Graphique combiné (Tout)
    const ctxAll = document.getElementById('historyChartAll');
    if (ctxAll) {
        chartInstances.all = new Chart(ctxAll, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Température (°C)',
                        data: [],
                        borderColor: '#ff453a',
                        backgroundColor: 'rgba(255, 69, 58, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Humidité (%)',
                        data: [],
                        borderColor: '#5ac8fa',
                        backgroundColor: 'rgba(90, 200, 250, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Pression (Pa)',
                        data: [],
                        borderColor: '#0a84ff',
                        backgroundColor: 'rgba(10, 132, 255, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Batterie (%)',
                        data: [],
                        borderColor: '#30d158',
                        backgroundColor: 'rgba(48, 209, 88, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ff7900',
                        bodyColor: 'rgba(255, 255, 255, 0.9)',
                        padding: 12,
                        displayColors: true
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temp / Hum / Batt',
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Pression (Pa)',
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
    }
}

// Options communes pour les graphiques individuels
function getChartOptions(title, unit, min = null, max = null) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: title,
                color: '#ff7900',
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: {
                    bottom: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ff7900',
                bodyColor: 'rgba(255, 255, 255, 0.9)',
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: function(context) {
                        return context.parsed.y.toFixed(1) + ' ' + unit;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: { 
                    color: 'rgba(255, 255, 255, 0.6)',
                    maxRotation: 45,
                    minRotation: 45
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                min: min,
                max: max,
                ticks: { 
                    color: 'rgba(255, 255, 255, 0.6)',
                    callback: function(value) {
                        return value + ' ' + unit;
                    }
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        }
    };
}

// Charger l'historique depuis Supabase
async function loadHistory(hours = 24) {
    const loadBtn = document.getElementById('loadHistoryBtn');
    const statusEl = document.getElementById('historyStatus');
    
    if (loadBtn) loadBtn.disabled = true;
    if (statusEl) {
        statusEl.textContent = 'Chargement...';
        statusEl.className = 'text-warning';
    }

    try {
        const now = new Date();
        const past = new Date(now - hours * 60 * 60 * 1000);

        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?timestamp=gte.${past.toISOString()}&order=timestamp.desc&limit=1000`,
            {
                headers: {
                    'apikey': SUPABASE_CONFIG.key,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        historicalData = await response.json();
        
        if (statusEl) {
            statusEl.textContent = `✅ ${historicalData.length} entrées chargées`;
            statusEl.className = 'text-success';
        }

        addLog(`📊 Historique: ${historicalData.length} entrées sur ${hours}h`, 'success');
        
        updateHistoryChart();
        updateHistoryTable();
        updateStatistics();

    } catch (error) {
        console.error('Erreur Supabase:', error);
        if (statusEl) {
            statusEl.textContent = `❌ Erreur: ${error.message}`;
            statusEl.className = 'text-danger';
        }
        addLog(`❌ Erreur chargement historique: ${error.message}`, 'error');
    } finally {
        if (loadBtn) loadBtn.disabled = false;
    }
}

// ===== AUTO-REFRESH DU GRAPHIQUE =====

/**
 * Active/désactive l'auto-refresh
 */
function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    
    const btn = document.getElementById('autoRefreshBtn');
    const icon = btn?.querySelector('.refresh-icon');
    
    if (autoRefreshEnabled) {
        // Démarrer l'auto-refresh
        startAutoRefresh();
        if (btn) {
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-success');
            btn.innerHTML = '<span class="refresh-icon spinning">🔄</span> Auto-refresh ON';
        }
        addLog('🔄 Auto-refresh activé (30s)', 'success');
    } else {
        // Arrêter l'auto-refresh
        stopAutoRefresh();
        if (btn) {
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-secondary');
            btn.innerHTML = '<span class="refresh-icon">🔄</span> Auto-refresh OFF';
        }
        addLog('⏸️ Auto-refresh désactivé', '');
    }
}

/**
 * Démarre l'auto-refresh
 */
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Charger immédiatement
    loadHistory(24);
    
    // Puis recharger toutes les 30 secondes
    autoRefreshInterval = setInterval(() => {
        if (autoRefreshEnabled) {
            console.log('🔄 Auto-refresh du graphique...');
            loadHistory(24);
        }
    }, AUTO_REFRESH_DELAY);
}

/**
 * Arrête l'auto-refresh
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Mettre à jour le graphique d'historique
function updateHistoryChart() {
    if (Object.keys(chartInstances).length === 0 || historicalData.length === 0) return;

    const labels = historicalData.reverse().map(d => 
        new Date(d.timestamp).toLocaleString('fr-FR', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    );

    const tempData = historicalData.map(d => d.temperature);
    const humData = historicalData.map(d => d.humidity);
    const pressData = historicalData.map(d => d.pressure);
    const batteryData = historicalData.map(d => d.battery);

    // Graphique température
    if (chartInstances.temp) {
        chartInstances.temp.data.labels = labels;
        chartInstances.temp.data.datasets[0].data = tempData;
        chartInstances.temp.update();
    }
    
    // Graphique humidité
    if (chartInstances.hum) {
        chartInstances.hum.data.labels = labels;
        chartInstances.hum.data.datasets[0].data = humData;
        chartInstances.hum.update();
    }
    
    // Graphique pression
    if (chartInstances.press) {
        chartInstances.press.data.labels = labels;
        chartInstances.press.data.datasets[0].data = pressData;
        chartInstances.press.update();
    }
    
    // Graphique batterie
    if (chartInstances.batt) {
        chartInstances.batt.data.labels = labels;
        chartInstances.batt.data.datasets[0].data = batteryData;
        chartInstances.batt.update();
    }
    
    // Graphique combiné
    if (chartInstances.all) {
        chartInstances.all.data.labels = labels;
        chartInstances.all.data.datasets[0].data = tempData;
        chartInstances.all.data.datasets[1].data = humData;
        chartInstances.all.data.datasets[2].data = pressData;
        chartInstances.all.data.datasets[3].data = batteryData;
        chartInstances.all.update();
    }
}

// Mettre à jour le tableau d'historique
function updateHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody || historicalData.length === 0) return;

    tbody.innerHTML = '';

    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, historicalData.length);
    const pageData = historicalData.slice(startIdx, endIdx);

    pageData.forEach(row => {
        const tr = document.createElement('tr');
        const time = new Date(row.timestamp).toLocaleString('fr-FR');
        
        // Classe CSS pour la batterie selon le niveau
        let batteryClass = 'text-success';
        if (row.battery < 20) batteryClass = 'text-danger';
        else if (row.battery < 40) batteryClass = 'text-warning';
        
        tr.innerHTML = `
            <td class="font-monospace small">${time}</td>
            <td class="text-end ${getValueClass(row.temperature, 20, 30)}">${row.temperature?.toFixed(1) || '-'} °C</td>
            <td class="text-end ${getValueClass(row.humidity, 40, 70)}">${row.humidity?.toFixed(1) || '-'} %</td>
            <td class="text-end">${row.pressure ? Math.round(row.pressure) : '-'} Pa</td>
            <td class="text-end ${batteryClass}">
                ${row.battery !== null && row.battery !== undefined ? row.battery + ' %' : '-'}
            </td>
            <td class="text-center">
                <span class="badge bg-secondary">${row.device_id || 'N/A'}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePagination();
}

// Obtenir la classe CSS selon la valeur
function getValueClass(value, min, max) {
    if (!value) return '';
    if (value < min) return 'text-info';
    if (value > max) return 'text-danger';
    return 'text-success';
}

// Mettre à jour la pagination
function updatePagination() {
    const paginationEl = document.getElementById('historyPagination');
    if (!paginationEl) return;

    const totalPages = Math.ceil(historicalData.length / ITEMS_PER_PAGE);
    
    paginationEl.innerHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Précédent</a>
        </li>
        <li class="page-item active">
            <span class="page-link">${currentPage} / ${totalPages}</span>
        </li>
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Suivant</a>
        </li>
    `;
}

// Changer de page
function changePage(page) {
    const totalPages = Math.ceil(historicalData.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    updateHistoryTable();
}

// Mettre à jour les statistiques
function updateStatistics() {
    if (historicalData.length === 0) return;

    const temps = historicalData.map(d => d.temperature).filter(v => v != null);
    const hums = historicalData.map(d => d.humidity).filter(v => v != null);
    const press = historicalData.map(d => d.pressure).filter(v => v != null);
    const batts = historicalData.map(d => d.battery).filter(v => v != null);

    const stats = {
        temp: { 
            avg: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
            min: Math.min(...temps).toFixed(1),
            max: Math.max(...temps).toFixed(1)
        },
        hum: { 
            avg: (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1),
            min: Math.min(...hums).toFixed(1),
            max: Math.max(...hums).toFixed(1)
        },
        press: { 
            avg: Math.round(press.reduce((a, b) => a + b, 0) / press.length),
            min: Math.round(Math.min(...press)),
            max: Math.round(Math.max(...press))
        },
        batt: batts.length > 0 ? {
            avg: Math.round(batts.reduce((a, b) => a + b, 0) / batts.length),
            min: Math.round(Math.min(...batts)),
            max: Math.round(Math.max(...batts))
        } : { avg: '-', min: '-', max: '-' }
    };

    document.getElementById('statTempAvg').textContent = stats.temp.avg;
    document.getElementById('statTempMin').textContent = stats.temp.min;
    document.getElementById('statTempMax').textContent = stats.temp.max;
    
    document.getElementById('statHumAvg').textContent = stats.hum.avg;
    document.getElementById('statHumMin').textContent = stats.hum.min;
    document.getElementById('statHumMax').textContent = stats.hum.max;
    
    document.getElementById('statPressAvg').textContent = stats.press.avg;
    document.getElementById('statPressMin').textContent = stats.press.min;
    document.getElementById('statPressMax').textContent = stats.press.max;
    
    // Ajouter stats batterie si les éléments existent
    const battAvg = document.getElementById('statBattAvg');
    const battMin = document.getElementById('statBattMin');
    const battMax = document.getElementById('statBattMax');
    if (battAvg) battAvg.textContent = stats.batt.avg;
    if (battMin) battMin.textContent = stats.batt.min;
    if (battMax) battMax.textContent = stats.batt.max;
}

// Exporter les données en CSV
function exportToCSV() {
    if (historicalData.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }

    const headers = ['Timestamp', 'Device ID', 'Temperature', 'Humidity', 'Pressure', 'Battery'];
    const csv = [
        headers.join(','),
        ...historicalData.map(row => [
            new Date(row.timestamp).toISOString(),
            row.device_id || '',
            row.temperature || '',
            row.humidity || '',
            row.pressure || '',
            row.battery || ''
        ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iot-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}


// ========== FONCTIONS D'INSERTION SUPABASE ==========

/**
 * Fonction sleep pour les retry
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Valide les données avant insertion
 */
function validateData(data) {
    if (data.temperature !== null && (data.temperature < -50 || data.temperature > 100)) {
        console.warn('⚠️ Température hors limites:', data.temperature);
        return false;
    }
    if (data.humidity !== null && (data.humidity < 0 || data.humidity > 100)) {
        console.warn('⚠️ Humidité hors limites:', data.humidity);
        return false;
    }
    if (data.battery !== null && (data.battery < 0 || data.battery > 100)) {
        console.warn('⚠️ Batterie hors limites:', data.battery);
        return false;
    }
    
    // Pression: accepter hPa (900-1100) ou Pa (80000-120000)
    if (data.pressure !== null) {
        const isHpa = data.pressure >= 900 && data.pressure <= 1100;
        const isPa = data.pressure >= 80000 && data.pressure <= 120000;
        
        if (!isHpa && !isPa) {
            console.warn('⚠️ Pression hors limites:', data.pressure);
            return false;
        }
        
        // Convertir hPa en Pa si nécessaire
        if (isHpa) {
            console.log(`🔄 Conversion: ${data.pressure} hPa → ${data.pressure * 100} Pa`);
            data.pressure = data.pressure * 100;
        }
    }
    
    return true;
}

/**
 * Insère les données dans Supabase via REST API
 */
async function insertDataToSupabase(data, retries = 3) {
    insertionStats.total++;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const url = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: SUPABASE_HEADERS,
                body: JSON.stringify(data)
            });
            
            if (response.ok || response.status === 201) {
                console.log('✅ Données insérées dans Supabase');
                insertionStats.success++;
                insertionStats.lastInsert = new Date();
                return true;
            }
            
            if (response.status >= 500 && attempt < retries) {
                console.log(`⚠️ Erreur serveur, tentative ${attempt + 1}/${retries}`);
                await sleep(1000 * attempt);
                continue;
            }
            
            const errorText = await response.text();
            console.error('❌ Erreur Supabase:', response.status, errorText);
            insertionStats.errors++;
            return false;
            
        } catch (error) {
            console.error('❌ Erreur réseau:', error);
            if (attempt < retries) {
                await sleep(1000 * attempt);
            } else {
                insertionStats.errors++;
                return false;
            }
        }
    }
    return false;
}

/**
 * Vérifie si toutes les données principales sont présentes et insère
 */
function checkAndInsertBatch() {
    // Vérifier les 4 champs principaux
    const fieldsPresent = REQUIRED_FIELDS.filter(field => 
        currentDataBatch[field] !== null && currentDataBatch[field] !== undefined
    ).length;
    
    // Vérifier si au moins un champ de position est présent
    const hasPosition = POSITION_FIELDS.some(field => 
        currentDataBatch[field] !== null && currentDataBatch[field] !== undefined
    );
    
    const totalFields = fieldsPresent + (hasPosition ? 1 : 0);
    
    // Insérer uniquement si les 5 données sont présentes (4 champs + position)
    if (fieldsPresent === 4 && hasPosition && !isInsertingData) {
        console.log(`✅ 5/5 données complètes (${REQUIRED_FIELDS.join(', ')} + position), insertion...`);
        insertCurrentBatch();
    } else {
        const missing = [];
        if (fieldsPresent < 4) {
            REQUIRED_FIELDS.forEach(field => {
                if (currentDataBatch[field] === null || currentDataBatch[field] === undefined) {
                    missing.push(field);
                }
            });
        }
        if (!hasPosition) missing.push('position');
        
        console.log(`⏳ En attente de données (${totalFields}/5) - Manquant: ${missing.join(', ')}`);
    }
}

/**
 * Insère le batch courant dans Supabase
 */
async function insertCurrentBatch() {
    const hasData = currentDataBatch.temperature !== null ||
                    currentDataBatch.humidity !== null ||
                    currentDataBatch.pressure !== null ||
                    currentDataBatch.battery !== null;
    
    if (!hasData || isInsertingData) return;
    
    isInsertingData = true;
    updateSupabaseBadge('saving');
    
    try {
        const dataToInsert = { ...currentDataBatch };
        
        if (!validateData(dataToInsert)) {
            console.error('❌ Données invalides');
            updateSupabaseBadge('error');
            isInsertingData = false;
            return;
        }
        
        const success = await insertDataToSupabase(dataToInsert);
        
        if (success) {
            addLog(`💾 Données sauvegardées`, 'success');
            updateSupabaseBadge('saved');
            
            // ⭐ Réinitialiser le batch après insertion réussie
            resetCurrentBatch();
            
            // ⭐ Rafraîchir automatiquement le graphique après insertion
            await refreshHistoryAfterInsert();
        } else {
            addLog(`❌ Erreur sauvegarde`, 'error');
            updateSupabaseBadge('error');
        }
        
    } catch (error) {
        console.error('❌ Erreur insertion:', error);
        updateSupabaseBadge('error');
    } finally {
        isInsertingData = false;
    }
}

/**
 * Réinitialise le batch de données après insertion
 */
function resetCurrentBatch() {
    currentDataBatch = {
        device_id: 'SampleOAGua',
        timestamp: null,
        temperature: null,
        humidity: null,
        pressure: null,
        battery: null,
        gyro_x: null,
        gyro_y: null,
        gyro_z: null,
        accel_x: null,
        accel_y: null,
        accel_z: null,
        pitch: null,
        roll: null,
        yaw: null
    };
    console.log('🔄 Batch réinitialisé');
}

/**
 * Rafraîchit l'historique après une insertion (sans recharger tout)
 */
async function refreshHistoryAfterInsert() {
    // Ne rafraîchir que si l'historique a déjà été chargé
    if (historicalData.length === 0) return;
    
    try {
        // Charger silencieusement les 50 dernières entrées
        const response = await fetch(
            `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?order=timestamp.desc&limit=50`,
            {
                headers: {
                    'apikey': SUPABASE_CONFIG.key,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
                }
            }
        );
        
        if (response.ok) {
            const latestData = await response.json();
            
            // Mettre à jour historicalData avec les dernières données
            // Fusionner en évitant les doublons
            const existingIds = new Set(historicalData.map(d => d.id));
            const newEntries = latestData.filter(d => !existingIds.has(d.id));
            
            if (newEntries.length > 0) {
                historicalData = [...newEntries, ...historicalData].slice(0, 1000);
                
                // Mettre à jour l'affichage
                updateHistoryChart();
                updateHistoryTable();
                updateStatistics();
                
                // ⭐ Mettre à jour le badge de statut avec le nombre total d'entrées
                const statusEl = document.getElementById('historyStatus');
                if (statusEl) {
                    statusEl.textContent = `✅ ${historicalData.length} entrées`;
                    statusEl.className = 'text-success';
                }
                
                console.log(`🔄 Graphique rafraîchi: ${newEntries.length} nouvelles entrées (Total: ${historicalData.length})`);
            }
        }
    } catch (error) {
        console.error('Erreur rafraîchissement:', error);
    }
}

/**
 * Met à jour le badge de statut Supabase
 */
function updateSupabaseBadge(status) {
    const badge = document.getElementById('supabaseBadge');
    const icon = document.getElementById('supabaseIcon');
    const text = document.getElementById('supabaseText');
    
    if (!badge) return;
    
    switch(status) {
        case 'saving':
            badge.className = 'badge bg-warning text-dark';
            if (icon) icon.textContent = '💾';
            if (text) text.textContent = 'Sauvegarde...';
            break;
        case 'saved':
            badge.className = 'badge bg-success';
            if (icon) icon.textContent = '✅';
            if (text) text.textContent = 'Sauvegardé';
            setTimeout(() => {
                badge.className = 'badge bg-secondary';
                if (icon) icon.textContent = '💾';
                if (text) text.textContent = 'Prêt';
            }, 2000);
            break;
        case 'error':
            badge.className = 'badge bg-danger';
            if (icon) icon.textContent = '❌';
            if (text) text.textContent = 'Erreur';
            setTimeout(() => {
                badge.className = 'badge bg-secondary';
                if (icon) icon.textContent = '💾';
                if (text) text.textContent = 'Prêt';
            }, 3000);
            break;
    }
}

/**
 * Fonction de test
 */
async function testSupabaseInsert() {
    const testData = {
        device_id: 'SampleOAGua',
        timestamp: new Date().toISOString(),
        temperature: 25.5,
        humidity: 60.0,
        pressure: 101325,
        battery: 85
    };
    
    console.log('🧪 Test insertion Supabase...');
    updateSupabaseBadge('saving');
    const success = await insertDataToSupabase(testData);
    console.log(success ? '✅ Test réussi' : '❌ Test échoué');
}

function showInsertionStats() {
    console.log('📊 Statistiques Supabase:');
    console.log(`  Total: ${insertionStats.total}`);
    console.log(`  Succès: ${insertionStats.success}`);
    console.log(`  Erreurs: ${insertionStats.errors}`);
    if (insertionStats.total > 0) {
        console.log(`  Taux: ${(insertionStats.success / insertionStats.total * 100).toFixed(1)}%`);
    }
}

// Rendre les fonctions disponibles globalement
window.testSupabaseInsert = testSupabaseInsert;
window.showInsertionStats = showInsertionStats;

// ========== MQTT FUNCTIONS (conservées) ==========

function initCharts() {
    ['Temperature', 'Pressure', 'Humidity'].forEach(type => {
        const chart = document.getElementById(`chart${type}`);
        if (chart) {
            for (let i = 0; i < MAX_HISTORY; i++) {
                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                bar.style.height = '10%';
                chart.appendChild(bar);
            }
        }
    });
}

function updateChart(type, values) {
    const chartId = type === 'pression' ? 'chartPressure' : 
                   type === 'humidite' ? 'chartHumidity' : 
                   type === 'temperature' ? 'chartTemperature' : null;
    
    if (!chartId) return;
    
    const chart = document.getElementById(chartId);
    if (!chart) return;
    
    const bars = chart.querySelectorAll('.chart-bar');
    
    if (values.length === 0) return;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    values.forEach((val, i) => {
        if (bars[i]) {
            const height = ((val - min) / range * 80) + 20;
            bars[i].style.height = `${height}%`;
        }
    });
}

function addLog(message, type = '') {
    const time = new Date().toLocaleTimeString('fr-FR');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message ${type}">${message}</span>
    `;
    logContainer.insertBefore(entry, logContainer.firstChild);
    
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

function setStatus(status) {
    statusBadge.className = `status-badge ${status}`;
    switch(status) {
        case 'connected':
            statusText.textContent = 'Connecté';
            connectBtn.textContent = 'Se déconnecter';
            connectBtn.classList.add('disconnect');
            connectBtn.disabled = false;
            break;
        case 'connecting':
            statusText.textContent = 'Connexion...';
            connectBtn.disabled = true;
            break;
        case 'error':
            statusText.textContent = 'Erreur';
            connectBtn.disabled = false;
            connectBtn.classList.remove('disconnect');
            break;
        default:
            statusText.textContent = 'Déconnecté';
            connectBtn.textContent = 'Se connecter au broker';
            connectBtn.disabled = false;
            connectBtn.classList.remove('disconnect');
    }
}

function setTopicSubscribed(topic, subscribed) {
    const topicMap = {
        [TOPICS.temperature]: 'topicTemp',
        [TOPICS.pression]: 'topicPressure',
        [TOPICS.humidite]: 'topicHumidity',
        [TOPICS.position]: 'topicPosition',
        [TOPICS.battery]: 'topicBattery'
    };
    const el = document.getElementById(topicMap[topic]);
    if (el) {
        el.classList.toggle('subscribed', subscribed);
    }
}

function updateValue(type, value) {
    const idMap = {
        temperature: { value: 'valueTemperature', time: 'timeTemperature', card: 'cardTemperature' },
        pression: { value: 'valuePressure', time: 'timePressure', card: 'cardPressure' },
        humidite: { value: 'valueHumidity', time: 'timeHumidity', card: 'cardHumidity' },
        position: { time: 'timePosition', card: 'cardPosition' },
        battery: { value: 'valueBattery', time: 'timeBattery', card: 'cardBattery' }
    };
    
    const ids = idMap[type];
    if (!ids) return;

    if (type === 'position') {
        updatePositionValue(value, ids);
        return;
    }
    
    // ⭐ GESTION SPÉCIALE BATTERIE
    if (type === 'battery') {
        updateBatteryValue(value, ids);
        return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const valueEl = document.getElementById(ids.value);
    if (type === 'pression') {
        valueEl.textContent = Math.round(numValue);
    } else {
        valueEl.textContent = numValue.toFixed(1);
    }

    const timeEl = document.getElementById(ids.time);
    timeEl.textContent = new Date().toLocaleTimeString('fr-FR');

    const card = document.getElementById(ids.card);
    card.classList.add('updated');
    setTimeout(() => card.classList.remove('updated'), 600);

    dataHistory[type].push(numValue);
    if (dataHistory[type].length > MAX_HISTORY) {
        dataHistory[type].shift();
    }
    updateChart(type, dataHistory[type]);
}

// ===== FONCTION SPÉCIALE BATTERIE =====

/**
 * Met à jour l'affichage de la batterie
 */
function updateBatteryValue(value, ids) {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    
    // Limiter entre 0 et 100
    const batteryLevel = Math.max(0, Math.min(100, numValue));
    
    // Mettre à jour la valeur affichée
    const valueEl = document.getElementById(ids.value);
    if (valueEl) {
        valueEl.textContent = batteryLevel;
    }
    
    // Mettre à jour le timestamp
    const timeEl = document.getElementById(ids.time);
    if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString('fr-FR');
    }
    
    // Animation de la carte
    const card = document.getElementById(ids.card);
    if (card) {
        card.classList.add('updated');
        setTimeout(() => card.classList.remove('updated'), 600);
        
        // Changer la couleur de la bordure selon le niveau
        card.classList.remove('battery-high', 'battery-medium', 'battery-low', 'battery-critical');
        if (batteryLevel >= 70) {
            card.classList.add('battery-high');
        } else if (batteryLevel >= 40) {
            card.classList.add('battery-medium');
        } else if (batteryLevel >= 20) {
            card.classList.add('battery-low');
        } else {
            card.classList.add('battery-critical');
        }
    }
    
    // Mettre à jour l'indicateur de niveau (barre ou cercle)
    updateBatteryIndicator(batteryLevel);
    
    // Ajouter à l'historique
    dataHistory.battery.push(batteryLevel);
    if (dataHistory.battery.length > MAX_HISTORY) {
        dataHistory.battery.shift();
    }
    updateChart('battery', dataHistory.battery);
    
    // Log avec emoji selon niveau
    let emoji = '🔋';
    let status = 'OK';
    if (batteryLevel < 20) {
        emoji = '🔴';
        status = 'CRITIQUE';
    } else if (batteryLevel < 40) {
        emoji = '🟠';
        status = 'FAIBLE';
    } else if (batteryLevel < 70) {
        emoji = '🟡';
        status = 'BON';
    } else {
        emoji = '🟢';
        status = 'EXCELLENT';
    }
    
    addLog(`${emoji} Batterie: ${batteryLevel}% (${status})`, batteryLevel < 20 ? 'error' : 'data');
}

/**
 * Met à jour l'indicateur visuel de batterie (barre, cercle, etc.)
 */
function updateBatteryIndicator(level) {
    // Si tu as un élément avec ID batteryBar ou batteryCircle dans ton HTML
    const batteryBar = document.getElementById('batteryBar');
    const batteryCircle = document.getElementById('batteryCircleProgress');
    const batteryStatus = document.getElementById('batteryStatus');
    
    // Mise à jour barre
    if (batteryBar) {
        batteryBar.style.width = `${level}%`;
        batteryBar.className = 'battery-bar';
        if (level >= 70) batteryBar.classList.add('battery-high');
        else if (level >= 40) batteryBar.classList.add('battery-medium');
        else if (level >= 20) batteryBar.classList.add('battery-low');
        else batteryBar.classList.add('battery-critical');
    }
    
    // Mise à jour cercle SVG (si tu utilises l'option discrète)
    if (batteryCircle) {
        const circumference = 157;
        const offset = circumference - (circumference * level / 100);
        batteryCircle.style.strokeDashoffset = offset;
        
        // Couleur selon niveau
        if (level >= 70) batteryCircle.style.stroke = '#30d158';
        else if (level >= 40) batteryCircle.style.stroke = '#ffd60a';
        else if (level >= 20) batteryCircle.style.stroke = '#ff9500';
        else batteryCircle.style.stroke = '#ff453a';
    }
    
    // Mise à jour texte de status
    if (batteryStatus) {
        if (level >= 70) batteryStatus.textContent = 'Excellent';
        else if (level >= 40) batteryStatus.textContent = 'Bon';
        else if (level >= 20) batteryStatus.textContent = 'Faible';
        else batteryStatus.textContent = 'Critique';
    }
}

function updatePositionValue(value, ids) {
    const statusMessage = document.getElementById('statusMessage3D');
    
    if (typeof value === 'object' && value.gyro && value.accel && value.orientation) {
        const pitch = value.orientation.pitch || 0;
        const roll = value.orientation.roll || 0;
        const yaw = value.orientation.yaw || 0;
        
        deviceOrientation.x = pitch;
        deviceOrientation.y = roll;
        deviceOrientation.z = yaw;
        
        applyDeviceOrientation();
        
        if (statusMessage) {
            statusMessage.classList.add('hidden');
        }
        
        addLog(`✅ Position 3D: Pitch=${pitch.toFixed(1)}°, Roll=${roll.toFixed(1)}°, Yaw=${yaw.toFixed(1)}°`, 'success');
    } 
    else if (typeof value === 'object' && (value.x !== undefined || value.X !== undefined)) {
        const gyroX = value.x || value.X || 0;
        const gyroY = value.y || value.Y || 0;
        const gyroZ = value.z || value.Z || 0;
        
        const DISPLAY_SCALE = 0.08;
        deviceOrientation.x = gyroX * DISPLAY_SCALE;
        deviceOrientation.y = gyroY * DISPLAY_SCALE;
        deviceOrientation.z = gyroZ * DISPLAY_SCALE;
        
        deviceOrientation.x = Math.max(-90, Math.min(90, deviceOrientation.x));
        deviceOrientation.y = Math.max(-90, Math.min(90, deviceOrientation.y));
        deviceOrientation.z = Math.max(-90, Math.min(90, deviceOrientation.z));
        
        applyDeviceOrientation();
        
        if (statusMessage) {
            statusMessage.className = 'status-message error';
            statusMessage.innerHTML = `
                <span class="status-icon">⚠️</span>
                <span class="status-text">
                    <strong>Mode compatibilité</strong><br>
                    Gyroscope seul: ${Math.round(gyroX)}, ${Math.round(gyroY)}, ${Math.round(gyroZ)} mdps
                </span>
            `;
            statusMessage.classList.remove('hidden');
        }
        
        addLog(`⚠️ Mode compat: Gyro=${Math.round(gyroX)},${Math.round(gyroY)},${Math.round(gyroZ)}`, 'error');
    }
    else {
        if (statusMessage) {
            statusMessage.className = 'status-message error';
            statusMessage.innerHTML = `
                <span class="status-icon">❌</span>
                <span class="status-text">
                    <strong>Format incorrect</strong><br>
                    Format requis: {gyro, accel, orientation}
                </span>
            `;
            statusMessage.classList.remove('hidden');
        }
        addLog(`❌ Format position incorrect`, 'error');
    }

    const timeEl = document.getElementById(ids.time);
    timeEl.textContent = new Date().toLocaleTimeString('fr-FR');

    const card = document.getElementById(ids.card);
    card.classList.add('updated');
    setTimeout(() => card.classList.remove('updated'), 600);
}

function applyDeviceOrientation() {
    const xAngle = document.getElementById('angleX');
    const yAngle = document.getElementById('angleY');
    const zAngle = document.getElementById('angleZ');

    if (xAngle) xAngle.textContent = deviceOrientation.x.toFixed(1);
    if (yAngle) yAngle.textContent = deviceOrientation.y.toFixed(1);
    if (zAngle) zAngle.textContent = deviceOrientation.z.toFixed(1);

    lastUpdateTime = Date.now();
}

function connect() {
    if (isConnected) {
        disconnect();
        return;
    }

    setStatus('connecting');
    addLog('🔄 Connexion au broker MQTT...', '');

    client = mqtt.connect(BROKER_URL);

    client.on('connect', () => {
        isConnected = true;
        setStatus('connected');
        addLog('✅ Connecté au broker MQTT', 'success');

        Object.values(TOPICS).forEach(topic => {
            client.subscribe(topic, (err) => {
                if (!err) {
                    setTopicSubscribed(topic, true);
                    addLog(`📡 Abonné à: ${topic}`, 'success');
                } else {
                    addLog(`❌ Erreur abonnement: ${topic}`, 'error');
                }
            });
        });
    });

    client.on('message', (topic, message) => {
        const payload = message.toString();
        addLog(`📩 ${topic}: ${payload}`, 'data');

        try {
            const data = JSON.parse(payload);
            
            // Format LiveObjects: {"s":"urn:lo:nsid:SampleData","v":valeur,"tags":[...]}
            let value = data.v !== undefined ? data.v : data;
            
            if (topic === TOPICS.temperature) {
                updateValue('temperature', value);
                currentDataBatch.temperature = parseFloat(value);
                currentDataBatch.timestamp = new Date().toISOString();
                checkAndInsertBatch();
            }
            else if (topic === TOPICS.pression) {
                updateValue('pression', value);
                currentDataBatch.pressure = parseFloat(value);
                currentDataBatch.timestamp = new Date().toISOString();
                checkAndInsertBatch();
            }
            else if (topic === TOPICS.humidite) {
                updateValue('humidite', value);
                currentDataBatch.humidity = parseFloat(value);
                currentDataBatch.timestamp = new Date().toISOString();
                checkAndInsertBatch();
            }
            else if (topic === TOPICS.battery) {
                updateValue('battery', value);
                currentDataBatch.battery = parseInt(value);
                currentDataBatch.timestamp = new Date().toISOString();
                checkAndInsertBatch();
            }
            else if (topic === TOPICS.position) {
                updateValue('position', value);
                
                // Extraire les données de position
                if (typeof value === 'object') {
                    if (value.gyro) {
                        currentDataBatch.gyro_x = value.gyro.x;
                        currentDataBatch.gyro_y = value.gyro.y;
                        currentDataBatch.gyro_z = value.gyro.z;
                    }
                    if (value.accel) {
                        currentDataBatch.accel_x = value.accel.x;
                        currentDataBatch.accel_y = value.accel.y;
                        currentDataBatch.accel_z = value.accel.z;
                    }
                    if (value.orientation) {
                        currentDataBatch.pitch = value.orientation.pitch;
                        currentDataBatch.roll = value.orientation.roll;
                        currentDataBatch.yaw = value.orientation.yaw;
                    }
                }
                currentDataBatch.timestamp = new Date().toISOString();
                checkAndInsertBatch();
            }
        } catch (e) {
            // Fallback: valeur brute (nombre)
            const value = parseFloat(payload);
            if (!isNaN(value)) {
                if (topic === TOPICS.temperature) {
                    updateValue('temperature', value);
                    currentDataBatch.temperature = value;
                    currentDataBatch.timestamp = new Date().toISOString();
                    checkAndInsertBatch();
                }
                else if (topic === TOPICS.pression) {
                    updateValue('pression', value);
                    currentDataBatch.pressure = value;
                    currentDataBatch.timestamp = new Date().toISOString();
                    checkAndInsertBatch();
                }
                else if (topic === TOPICS.humidite) {
                    updateValue('humidite', value);
                    currentDataBatch.humidity = value;
                    currentDataBatch.timestamp = new Date().toISOString();
                    checkAndInsertBatch();
                }
                else if (topic === TOPICS.battery) {
                    updateValue('battery', value);
                    currentDataBatch.battery = parseInt(value);
                    currentDataBatch.timestamp = new Date().toISOString();
                    checkAndInsertBatch();
                }
            }
        }
    });

    client.on('error', (error) => {
        setStatus('error');
        addLog(`❌ Erreur MQTT: ${error.message}`, 'error');
    });

    client.on('close', () => {
        isConnected = false;
        setStatus('disconnected');
        addLog('🔌 Déconnecté du broker', '');
        Object.values(TOPICS).forEach(topic => setTopicSubscribed(topic, false));
    });
}

function disconnect() {
    if (client) {
        client.end();
        client = null;
    }
}

// ========== 3D VISUALIZATION (conservée) ==========
let scene, camera, renderer, gyroscopeDevice;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngle = { theta: 0, phi: 0.3 };

function init3DScene() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('threejsCanvas'),
        antialias: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(5, 5, 5);
    pointLight.castShadow = true;
    scene.add(pointLight);

    const orangeLight = new THREE.PointLight(0xFF7900, 0.5);
    orangeLight.position.set(-5, 3, -5);
    scene.add(orangeLight);

    createAxes();
    
    gyroscopeDevice = createGyroscopeDevice();
    scene.add(gyroscopeDevice);

    const canvas = document.getElementById('threejsCanvas');
    setupMouseControls(canvas);

    window.addEventListener('resize', onWindowResize);

    animate3DScene();
}

function createAxes() {
    const axisLength = 3;
    const axisWidth = 0.02;

    const xGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xFF6B6B });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    scene.add(xAxis);

    const xConeGeometry = new THREE.ConeGeometry(axisWidth * 3, axisWidth * 10, 8);
    const xCone = new THREE.Mesh(xConeGeometry, xMaterial);
    xCone.position.x = axisLength / 2 + 0.1;
    xCone.rotation.z = -Math.PI / 2;
    scene.add(xCone);

    addAxisLabel('X', axisLength / 2 + 0.3, 0, 0, 0xFF6B6B);

    const yGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x4ECDC4 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    scene.add(yAxis);

    const yConeGeometry = new THREE.ConeGeometry(axisWidth * 3, axisWidth * 10, 8);
    const yCone = new THREE.Mesh(yConeGeometry, yMaterial);
    yCone.position.y = axisLength / 2 + 0.1;
    scene.add(yCone);

    addAxisLabel('Y', 0, axisLength / 2 + 0.3, 0, 0x4ECDC4);

    const zGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0xA855F7 });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    scene.add(zAxis);

    const zConeGeometry = new THREE.ConeGeometry(axisWidth * 3, axisWidth * 10, 8);
    const zCone = new THREE.Mesh(zConeGeometry, zMaterial);
    zCone.position.z = axisLength / 2 + 0.1;
    zCone.rotation.x = Math.PI / 2;
    scene.add(zCone);

    addAxisLabel('Z', 0, 0, axisLength / 2 + 0.3, 0xA855F7);
}

function addAxisLabel(text, x, y, z, color) {
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(x, y, z);
    scene.add(sphere);
}

function createGyroscopeDevice() {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.1);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a2e,
        shininess: 100,
        specular: 0xFF7900,
        emissive: 0x0a0a0f
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const screenGeometry = new THREE.BoxGeometry(0.7, 1.45, 0.11);
    const screenMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF7900,
        emissive: 0xFF7900,
        emissiveIntensity: 0.3,
        shininess: 80,
        opacity: 0.9,
        transparent: true
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.05;
    group.add(screen);

    const borderGeometry = new THREE.BoxGeometry(0.82, 1.62, 0.12);
    const borderMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF7900,
        emissive: 0xFF7900,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    group.add(border);

    const notchGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.12);
    const notchMaterial = new THREE.MeshPhongMaterial({ color: 0x0a0a0f });
    const notch = new THREE.Mesh(notchGeometry, notchMaterial);
    notch.position.set(0, 0.75, 0.05);
    group.add(notch);

    const buttonGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
    const buttonMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF7900,
        emissive: 0xFF7900,
        emissiveIntensity: 0.3
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.rotation.x = Math.PI / 2;
    button.position.set(0, -0.7, 0.06);
    group.add(button);

    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.2, 3);
    const arrowMaterial = new THREE.MeshPhongMaterial({
        color: 0x4ECDC4,
        emissive: 0x4ECDC4,
        emissiveIntensity: 0.5
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.set(0, 0.9, 0);
    arrow.rotation.x = Math.PI;
    group.add(arrow);

    return group;
}

function setupMouseControls(canvas) {
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        cameraAngle.theta += deltaX * 0.01;
        cameraAngle.phi += deltaY * 0.01;

        cameraAngle.phi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi));

        updateCameraPosition();

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            previousMousePosition = { 
                x: e.touches[0].clientX, 
                y: e.touches[0].clientY 
            };
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault();

        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        cameraAngle.theta += deltaX * 0.01;
        cameraAngle.phi += deltaY * 0.01;

        cameraAngle.phi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi));

        updateCameraPosition();

        previousMousePosition = { 
            x: e.touches[0].clientX, 
            y: e.touches[0].clientY 
        };
    });

    canvas.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function updateCameraPosition() {
    const radius = 6;
    camera.position.x = radius * Math.sin(cameraAngle.theta) * Math.cos(cameraAngle.phi);
    camera.position.y = radius * Math.sin(cameraAngle.phi);
    camera.position.z = radius * Math.cos(cameraAngle.theta) * Math.cos(cameraAngle.phi);
    camera.lookAt(0, 0, 0);
}

function onWindowResize() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate3DScene() {
    requestAnimationFrame(animate3DScene);
    
    if (gyroscopeDevice && deviceOrientation) {
        gyroscopeDevice.rotation.x = THREE.MathUtils.degToRad(deviceOrientation.x);
        gyroscopeDevice.rotation.y = THREE.MathUtils.degToRad(deviceOrientation.y);
        gyroscopeDevice.rotation.z = THREE.MathUtils.degToRad(deviceOrientation.z);
    }

    renderer.render(scene, camera);
}

function initialize3DVisualization() {
    init3DScene();
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initialize3DVisualization();
    initHistoryChart();
    
    // Charger automatiquement les dernières 24h
    setTimeout(() => loadHistory(24), 1000);
});


// ========== FONCTION 1 : EFFACER LE JOURNAL D'ACTIVITÉ ==========

function clearActivityLog() {
    // Confirmation
    const confirmation = confirm("Voulez-vous effacer le journal d'activité ?");
    
    if (!confirmation) {
        console.log("❌ Effacement du journal annulé");
        return;
    }
    
    console.log("🗑️ Effacement du journal d'activité...");
    
    // Réinitialiser le conteneur
    const logContainer = document.getElementById('logContainer');
    
    if (logContainer) {
        logContainer.innerHTML = `
            <div class="log-entry">
                <span class="log-time">${new Date().toLocaleTimeString('fr-FR')}</span>
                <span class="log-message">✅ Journal effacé</span>
            </div>
        `;
        
        console.log("✅ Journal d'activité effacé");
    } else {
        console.error("❌ Élément logContainer introuvable");
    }
}

// ========== FONCTION EFFACER TOUTE LA BASE SUPABASE ==========
async function deleteAllHistory() {
    const confirmation = confirm(
        "⚠️ ATTENTION ⚠️\n\n" +
        "Êtes-vous sûr de vouloir SUPPRIMER TOUTES les données de la base Supabase ?\n\n" +
        "Cette action est IRRÉVERSIBLE !\n\n" +
        "Cliquez sur OK pour continuer."
    );
    
    if (!confirmation) {
        console.log("❌ Suppression annulée");
        return;
    }
    
    const doubleConfirmation = confirm(
        "⚠️ DERNIÈRE CONFIRMATION ⚠️\n\n" +
        "Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT toutes les données.\n\n" +
        "Voulez-vous vraiment continuer ?"
    );
    
    if (!doubleConfirmation) {
        console.log("❌ Suppression annulée");
        return;
    }
    
    console.log("🗑️ Suppression de toutes les données Supabase...");
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/iot_data?id=gt.0`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.key,
                'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });
        
        if (response.ok || response.status === 204) {
            console.log("✅ Toutes les données supprimées");
            alert("✅ Base de données Supabase vidée avec succès !");
            
            document.getElementById('historyStatus').textContent = 'Non chargé';
            document.getElementById('historyStatus').className = 'badge bg-secondary';
            
            document.getElementById('historyTableBody').innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-body-secondary py-4">
                        Base de données vidée. En attente de nouvelles données...
                    </td>
                </tr>
            `;
            
            ['statTempMin', 'statTempAvg', 'statTempMax',
             'statHumMin', 'statHumAvg', 'statHumMax',
             'statPressMin', 'statPressAvg', 'statPressMax'].forEach(id => {
                const elem = document.getElementById(id);
                if (elem) elem.textContent = '--';
            });
            
            if (window.historyChart || chartInstance) {
                const chart = window.historyChart || chartInstance;
                chart.data.labels = [];
                chart.data.datasets.forEach(dataset => {
                    dataset.data = [];
                });
                chart.update();
            }
            
        } else {
            const errorText = await response.text();
            console.error("❌ Erreur:", response.status, errorText);
            alert(`❌ Erreur: ${response.status}`);
        }
        
    } catch (error) {
        console.error("❌ Erreur:", error);
        alert(`❌ Erreur: ${error.message}`);
    }
}

