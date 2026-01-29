// IoT Dashboard - Orange LTE-M Guadeloupe
// Configuration MQTT
const BROKER_URL = 'wss://test.mosquitto.org:8081/mqtt';
const TOPICS = {
    temperature: 'dev/data/guadeloupe/temperature',
    pression: 'dev/data/guadeloupe/pression',
    humidite: 'dev/data/guadeloupe/humidite',
    position: 'dev/data/guadeloupe/position'
};

// State
let client = null;
let isConnected = false;
const dataHistory = {
    temperature: [],
    pression: [],
    humidite: [],
    position: []
};
const MAX_HISTORY = 20;

// 3D Visualization state
let currentRotation = { x: 0, y: 0, z: 0 };
let targetRotation = { x: 0, y: 0, z: 0 };
const ROTATION_SMOOTHING = 0.1; // Facteur de lissage (0-1)
const GYRO_TO_ROTATION_SCALE = 0.01; // Échelle de conversion mdps vers degrés

// DOM Elements
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const logContainer = document.getElementById('logContainer');
const deviceCube = document.getElementById('deviceCube');
const vizScene = document.getElementById('vizScene');

// Initialize mini charts
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

// Update mini chart
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

// Add log entry
function addLog(message, type = '') {
    const time = new Date().toLocaleTimeString('fr-FR');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message ${type}">${message}</span>
    `;
    logContainer.insertBefore(entry, logContainer.firstChild);
    
    // Keep only last 50 entries
    while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// Update connection status
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

// Update topic subscription status
function setTopicSubscribed(topic, subscribed) {
    const topicMap = {
        [TOPICS.temperature]: 'topicTemp',
        [TOPICS.pression]: 'topicPressure',
        [TOPICS.humidite]: 'topicHumidity',
        [TOPICS.position]: 'topicPosition'
    };
    const el = document.getElementById(topicMap[topic]);
    if (el) {
        el.classList.toggle('subscribed', subscribed);
    }
}

// Update data display
function updateValue(type, value) {
    const idMap = {
        temperature: { value: 'valueTemperature', time: 'timeTemperature', card: 'cardTemperature' },
        pression: { value: 'valuePressure', time: 'timePressure', card: 'cardPressure' },
        humidite: { value: 'valueHumidity', time: 'timeHumidity', card: 'cardHumidity' },
        position: { time: 'timePosition', card: 'cardPosition' }
    };
    
    const ids = idMap[type];
    if (!ids) return;

    // Handle position data (gyroscope with X, Y, Z)
    if (type === 'position') {
        updatePositionValue(value, ids);
        return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // Update value - format selon le type
    const valueEl = document.getElementById(ids.value);
    if (type === 'pression') {
        // Pression en Pa, afficher en entier
        valueEl.textContent = Math.round(numValue);
    } else {
        valueEl.textContent = numValue.toFixed(1);
    }

    // Update timestamp
    const timeEl = document.getElementById(ids.time);
    timeEl.textContent = new Date().toLocaleTimeString('fr-FR');

    // Flash animation
    const card = document.getElementById(ids.card);
    card.classList.add('updated');
    setTimeout(() => card.classList.remove('updated'), 600);

    // Update history
    dataHistory[type].push(numValue);
    if (dataHistory[type].length > MAX_HISTORY) {
        dataHistory[type].shift();
    }
    updateChart(type, dataHistory[type]);
}

// Update position (gyroscope) values
function updatePositionValue(value, ids) {
    let x, y, z;
    
    // Handle different formats
    if (typeof value === 'object') {
        // Format: {x: 100, y: 200, z: 300}
        x = value.x || value.X || 0;
        y = value.y || value.Y || 0;
        z = value.z || value.Z || 0;
    } else if (typeof value === 'string') {
        // Try to parse as JSON object
        try {
            const parsed = JSON.parse(value);
            x = parsed.x || parsed.X || 0;
            y = parsed.y || parsed.Y || 0;
            z = parsed.z || parsed.Z || 0;
        } catch (e) {
            // Format: "100,200,300" or "100;200;300"
            const parts = value.split(/[,;]/);
            if (parts.length >= 3) {
                x = parseFloat(parts[0]) || 0;
                y = parseFloat(parts[1]) || 0;
                z = parseFloat(parts[2]) || 0;
            } else {
                return;
            }
        }
    } else {
        return;
    }

    // Update display
    document.getElementById('valuePosX').textContent = Math.round(x);
    document.getElementById('valuePosY').textContent = Math.round(y);
    document.getElementById('valuePosZ').textContent = Math.round(z);

    // Update timestamp
    const timeEl = document.getElementById(ids.time);
    timeEl.textContent = new Date().toLocaleTimeString('fr-FR');

    // Flash animation
    const card = document.getElementById(ids.card);
    card.classList.add('updated');
    setTimeout(() => card.classList.remove('updated'), 600);
    
    // Update 3D visualization
    update3DVisualization(x, y, z);
}

// Update 3D visualization based on gyroscope data
function update3DVisualization(gyroX, gyroY, gyroZ) {
    // Convertir les valeurs du gyroscope (mdps) en rotations cibles (degrés)
    // Le gyroscope mesure la vitesse de rotation, on l'intègre pour obtenir l'angle
    targetRotation.x += gyroX * GYRO_TO_ROTATION_SCALE;
    targetRotation.y += gyroY * GYRO_TO_ROTATION_SCALE;
    targetRotation.z += gyroZ * GYRO_TO_ROTATION_SCALE;
    
    // Limiter les rotations entre -180 et 180 degrés
    targetRotation.x = normalizeAngle(targetRotation.x);
    targetRotation.y = normalizeAngle(targetRotation.y);
    targetRotation.z = normalizeAngle(targetRotation.z);
}

// Normalize angle to -180 to 180 range
function normalizeAngle(angle) {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
}

// Smooth animation loop for 3D visualization
function animate3D() {
    // Interpolation lisse vers la rotation cible
    currentRotation.x += (targetRotation.x - currentRotation.x) * ROTATION_SMOOTHING;
    currentRotation.y += (targetRotation.y - currentRotation.y) * ROTATION_SMOOTHING;
    currentRotation.z += (targetRotation.z - currentRotation.z) * ROTATION_SMOOTHING;
    
    // Appliquer la transformation au cube
    if (deviceCube) {
        deviceCube.style.transform = `
            rotateX(${currentRotation.x}deg)
            rotateY(${currentRotation.y}deg)
            rotateZ(${currentRotation.z}deg)
        `;
    }
    
    // Mettre à jour l'affichage des rotations
    if (document.getElementById('rotX')) {
        document.getElementById('rotX').textContent = Math.round(currentRotation.x) + '°';
        document.getElementById('rotY').textContent = Math.round(currentRotation.y) + '°';
        document.getElementById('rotZ').textContent = Math.round(currentRotation.z) + '°';
    }
    
    // Continuer l'animation
    requestAnimationFrame(animate3D);
}

// Reset 3D visualization
function reset3DVisualization() {
    currentRotation = { x: 0, y: 0, z: 0 };
    targetRotation = { x: 0, y: 0, z: 0 };
}

// Connect to MQTT broker
function connect() {
    setStatus('connecting');
    addLog('Connexion au broker MQTT...');

    const options = {
        keepalive: 60,
        clientId: 'webClient_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000
    };

    client = mqtt.connect(BROKER_URL, options);

    client.on('connect', () => {
        isConnected = true;
        setStatus('connected');
        addLog('Connecté au broker Mosquitto', 'success');

        // Subscribe to topics
        Object.entries(TOPICS).forEach(([name, topic]) => {
            client.subscribe(topic, { qos: 0 }, (err) => {
                if (err) {
                    addLog(`Erreur subscription ${name}: ${err.message}`, 'error');
                } else {
                    addLog(`Souscrit à ${topic}`, 'success');
                    setTopicSubscribed(topic, true);
                }
            });
        });
    });

    client.on('message', (topic, message) => {
        const rawMessage = message.toString();
        const type = Object.entries(TOPICS).find(([_, t]) => t === topic)?.[0];
        
        if (type) {
            try {
                // Parse le format JSON du capteur iotContinuum
                // Format: {"s":"urn:lo:nsid:SampleData","v":25.5,"tags":["temperature"]}
                // Format position: {"s":"...","v":{"x":100,"y":200,"z":300},"tags":["position"]}
                const data = JSON.parse(rawMessage);
                const value = data.v;
                const streamId = data.s || '';
                const tags = data.tags || [];
                
                if (type === 'position') {
                    addLog(`${type}: X=${value.x || value.X}, Y=${value.y || value.Y}, Z=${value.z || value.Z}`, 'data');
                } else {
                    addLog(`${type}: ${value} (${tags.join(', ')})`, 'data');
                }
                updateValue(type, value);
            } catch (e) {
                // Si ce n'est pas du JSON, essayer comme valeur brute
                addLog(`${type}: ${rawMessage}`, 'data');
                updateValue(type, rawMessage);
            }
        }
    });

    client.on('error', (err) => {
        addLog(`Erreur: ${err.message}`, 'error');
        setStatus('error');
    });

    client.on('close', () => {
        if (isConnected) {
            addLog('Connexion fermée');
            isConnected = false;
            setStatus('');
            Object.values(TOPICS).forEach(topic => setTopicSubscribed(topic, false));
        }
    });

    client.on('offline', () => {
        addLog('Client hors ligne', 'error');
    });

    client.on('reconnect', () => {
        addLog('Tentative de reconnexion...');
        setStatus('connecting');
    });
}

// Disconnect from MQTT broker
function disconnect() {
    if (client) {
        client.end(true);
        client = null;
        isConnected = false;
        setStatus('');
        addLog('Déconnexion du broker');
        Object.values(TOPICS).forEach(topic => setTopicSubscribed(topic, false));
    }
}

// Toggle connection
function toggleConnection() {
    if (isConnected) {
        disconnect();
    } else {
        connect();
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    addLog('Interface prête. Cliquez pour vous connecter.');
    
    // Démarrer l'animation 3D
    animate3D();
    
    // Ajouter l'interaction tactile pour contrôler manuellement la vue 3D
    const vizContainer = document.querySelector('.viz-container');
    if (vizContainer) {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        vizContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            vizContainer.style.cursor = 'grabbing';
        });
        
        vizContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            targetRotation.y += deltaX * 0.5;
            targetRotation.x -= deltaY * 0.5;
            
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        vizContainer.addEventListener('mouseup', () => {
            isDragging = false;
            vizContainer.style.cursor = 'grab';
        });
        
        vizContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            vizContainer.style.cursor = 'grab';
        });
        
        // Touch support
        vizContainer.addEventListener('touchstart', (e) => {
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        });
        
        vizContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const deltaX = e.touches[0].clientX - lastX;
            const deltaY = e.touches[0].clientY - lastY;
            
            targetRotation.y += deltaX * 0.5;
            targetRotation.x -= deltaY * 0.5;
            
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        });
        
        vizContainer.addEventListener('touchend', () => {
            isDragging = false;
        });
        
        vizContainer.style.cursor = 'grab';
    }
});
