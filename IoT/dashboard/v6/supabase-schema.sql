-- ========================================
-- Script SQL pour Dashboard IoT Guadeloupe
-- Table: iot_data
-- ========================================

-- Créer la table principale
CREATE TABLE IF NOT EXISTS iot_data (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    device_id TEXT NOT NULL,
    temperature REAL,
    humidity REAL,
    pressure REAL,
    battery INTEGER,
    gyro_x REAL,
    gyro_y REAL,
    gyro_z REAL,
    accel_x REAL,
    accel_y REAL,
    accel_z REAL,
    pitch REAL,
    roll REAL,
    yaw REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_iot_data_timestamp ON iot_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_iot_data_device ON iot_data(device_id);
CREATE INDEX IF NOT EXISTS idx_iot_data_device_time ON iot_data(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_iot_data_created_at ON iot_data(created_at DESC);

-- Créer un index pour les requêtes par plage de dates
CREATE INDEX IF NOT EXISTS idx_iot_data_timestamp_brin ON iot_data USING BRIN (timestamp);

-- Ajouter des commentaires sur les colonnes
COMMENT ON TABLE iot_data IS 'Données IoT du capteur BME280 + LSM6DSOX en Guadeloupe';
COMMENT ON COLUMN iot_data.id IS 'Identifiant unique auto-incrémenté';
COMMENT ON COLUMN iot_data.timestamp IS 'Horodatage de la mesure';
COMMENT ON COLUMN iot_data.device_id IS 'Identifiant de l''appareil';
COMMENT ON COLUMN iot_data.temperature IS 'Température en degrés Celsius';
COMMENT ON COLUMN iot_data.humidity IS 'Humidité relative en pourcentage';
COMMENT ON COLUMN iot_data.pressure IS 'Pression atmosphérique en Pascals';
COMMENT ON COLUMN iot_data.battery IS 'Niveau de batterie en pourcentage';
COMMENT ON COLUMN iot_data.gyro_x IS 'Gyroscope axe X en degrés par seconde';
COMMENT ON COLUMN iot_data.gyro_y IS 'Gyroscope axe Y en degrés par seconde';
COMMENT ON COLUMN iot_data.gyro_z IS 'Gyroscope axe Z en degrés par seconde';
COMMENT ON COLUMN iot_data.accel_x IS 'Accéléromètre axe X en g';
COMMENT ON COLUMN iot_data.accel_y IS 'Accéléromètre axe Y en g';
COMMENT ON COLUMN iot_data.accel_z IS 'Accéléromètre axe Z en g';
COMMENT ON COLUMN iot_data.pitch IS 'Angle de tangage (pitch) en degrés';
COMMENT ON COLUMN iot_data.roll IS 'Angle de roulis (roll) en degrés';
COMMENT ON COLUMN iot_data.yaw IS 'Angle de lacet (yaw) en degrés';

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- Activer RLS sur la table
ALTER TABLE iot_data ENABLE ROW LEVEL SECURITY;

-- Politique: Autoriser les insertions anonymes (pour le dashboard)
CREATE POLICY "Allow anonymous inserts" ON iot_data
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Politique: Autoriser les lectures anonymes (pour le dashboard)
CREATE POLICY "Allow anonymous reads" ON iot_data
    FOR SELECT
    TO anon
    USING (true);

-- Politique: Autoriser les lectures authentifiées
CREATE POLICY "Allow authenticated reads" ON iot_data
    FOR SELECT
    TO authenticated
    USING (true);

-- Politique: Autoriser les suppressions authentifiées (optionnel)
-- Décommenter si tu veux pouvoir supprimer des données
-- CREATE POLICY "Allow authenticated deletes" ON iot_data
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- ========================================
-- Vue pour les statistiques récentes
-- ========================================

CREATE OR REPLACE VIEW iot_data_stats_24h AS
SELECT 
    device_id,
    COUNT(*) as total_records,
    AVG(temperature) as avg_temperature,
    MIN(temperature) as min_temperature,
    MAX(temperature) as max_temperature,
    AVG(humidity) as avg_humidity,
    MIN(humidity) as min_humidity,
    MAX(humidity) as max_humidity,
    AVG(pressure) as avg_pressure,
    MIN(pressure) as min_pressure,
    MAX(pressure) as max_pressure,
    AVG(battery) as avg_battery,
    MIN(battery) as min_battery,
    MAX(battery) as max_battery,
    MIN(timestamp) as first_record,
    MAX(timestamp) as last_record
FROM iot_data
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY device_id;

COMMENT ON VIEW iot_data_stats_24h IS 'Statistiques des 24 dernières heures par appareil';

-- ========================================
-- Fonction pour nettoyer les anciennes données (optionnel)
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_old_iot_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    remaining_count INTEGER;
BEGIN
    DELETE FROM iot_data
    WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Vérifier si la table est vide
    SELECT COUNT(*) INTO remaining_count FROM iot_data;
    
    -- Si la table est vide, réinitialiser la séquence à 1
    IF remaining_count = 0 THEN
        ALTER SEQUENCE iot_data_id_seq RESTART WITH 1;
        RAISE NOTICE 'Table vide : séquence ID réinitialisée à 1';
    END IF;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_iot_data IS 'Supprime les données IoT plus anciennes que X jours (par défaut 30). Réinitialise l''ID à 1 si la table devient vide.';

-- ========================================
-- Fonction pour vider complètement la base et réinitialiser l'ID
-- ========================================

CREATE OR REPLACE FUNCTION truncate_iot_data()
RETURNS TEXT AS $$
BEGIN
    -- Supprimer toutes les données
    TRUNCATE TABLE iot_data RESTART IDENTITY CASCADE;
    
    RAISE NOTICE 'Table iot_data vidée et ID réinitialisé à 1';
    
    RETURN 'Table vidée avec succès. Prochain ID : 1';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION truncate_iot_data IS 'Vide complètement la table iot_data et réinitialise l''ID à 1. À utiliser avec précaution !';

-- ========================================
-- Exemples de requêtes utiles
-- ========================================

-- Sélectionner les données des 24 dernières heures
-- SELECT * FROM iot_data 
-- WHERE timestamp >= NOW() - INTERVAL '24 hours'
-- ORDER BY timestamp DESC;

-- Obtenir les statistiques des 24h
-- SELECT * FROM iot_data_stats_24h;

-- Nettoyer les données de plus de 30 jours (réinitialise l'ID si table vide)
-- SELECT cleanup_old_iot_data(30);

-- Vider COMPLÈTEMENT la table et réinitialiser l'ID à 1
-- SELECT truncate_iot_data();

-- Compter le nombre d'enregistrements par jour
-- SELECT 
--     DATE(timestamp) as date,
--     COUNT(*) as records_count
-- FROM iot_data
-- GROUP BY DATE(timestamp)
-- ORDER BY date DESC;

-- Moyenne de température par heure des dernières 24h
-- SELECT 
--     DATE_TRUNC('hour', timestamp) as hour,
--     AVG(temperature) as avg_temp,
--     COUNT(*) as records
-- FROM iot_data
-- WHERE timestamp >= NOW() - INTERVAL '24 hours'
-- GROUP BY DATE_TRUNC('hour', timestamp)
-- ORDER BY hour DESC;

-- ========================================
-- Fin du script
-- ========================================

-- Afficher un message de confirmation
DO $$ 
BEGIN
    RAISE NOTICE 'Table iot_data créée avec succès !';
    RAISE NOTICE 'Index créés pour optimiser les performances.';
    RAISE NOTICE 'RLS activé avec politiques pour accès anonyme.';
    RAISE NOTICE 'Vue iot_data_stats_24h créée.';
    RAISE NOTICE 'Fonction cleanup_old_iot_data disponible (réinitialise ID si table vide).';
    RAISE NOTICE 'Fonction truncate_iot_data disponible pour vider la base.';
END $$;
