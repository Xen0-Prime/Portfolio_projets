// ========================================
// Script de Simulation IoT → Supabase
// Pour démonstration pendant que MQTT est bloqué
// ========================================

// Configuration Supabase
const SUPABASE_URL = 'https://ifqzsnevfluflbosaptt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcXpzbmV2Zmx1Zmxib3NhcHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDQwODEsImV4cCI6MjA4MzI4MDA4MX0.LxyNCjZF17XjYYc1VQTsbh8IQTXiWnHbkAu_l0aS5Ec';

// Paramètres de simulation
const DEVICE_ID = 'SampleOAgua';
const INTERVAL = 30000;  // 30 secondes entre chaque envoi

// Valeurs de base (Guadeloupe)
const BASE_TEMP = 28;      // °C
const BASE_HUM = 70;       // %
const BASE_PRESS = 1013;   // hPa

// Fonction pour générer des données réalistes
function generateSensorData() {
    // Variations légères autour des valeurs de base
    const temperature = BASE_TEMP + (Math.random() * 4 - 2);  // ±2°C
    const humidity = BASE_HUM + (Math.random() * 10 - 5);     // ±5%
    const pressure = BASE_PRESS + (Math.random() * 4 - 2);    // ±2 hPa
    
    return {
        device_id: DEVICE_ID,
        temperature: Math.round(temperature * 100) / 100,
        humidity: Math.round(humidity * 100) / 100,
        pressure: Math.round(pressure * 100) / 100
    };
}

// Fonction d'envoi à Supabase
async function sendToSupabase(data) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/iot_data`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok || response.status === 201) {
            console.log('✅', new Date().toLocaleTimeString('fr-FR'), '- Données insérées:', data);
            return true;
        } else {
            console.error('❌ Erreur HTTP:', response.status);
            const text = await response.text();
            console.error('Réponse:', text);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Erreur réseau:', error.message);
        return false;
    }
}

// Boucle principale
console.log('========================================');
console.log('Simulation IoT Guadeloupe → Supabase');
console.log('========================================');
console.log('Device ID:', DEVICE_ID);
console.log('Interval:', INTERVAL / 1000, 'secondes');
console.log('URL:', SUPABASE_URL);
console.log('========================================\n');
console.log('Démarrage de la simulation...\n');

// Premier envoi immédiat
(async () => {
    const data = generateSensorData();
    await sendToSupabase(data);
})();

// Puis toutes les X secondes
setInterval(async () => {
    const data = generateSensorData();
    await sendToSupabase(data);
}, INTERVAL);

// Message d'information
console.log('💡 Appuyez sur Ctrl+C pour arrêter\n');
