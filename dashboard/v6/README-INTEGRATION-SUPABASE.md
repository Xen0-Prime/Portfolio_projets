# 🎉 Dashboard IoT avec Intégration Supabase

## 📁 Fichiers Fournis

### Fichiers Principaux

1. **iot-dashboard-supabase.js** (1324 lignes)
   - JavaScript complet avec insertion Supabase automatique
   - Fonctions d'insertion toutes les 5 secondes
   - Validation des données
   - Retry automatique (3 tentatives)
   - Statistiques d'insertion

2. **iot-dashboard-v2-supabase.html** (479 lignes)
   - HTML complet avec badge Supabase dans le header
   - Structure prête à l'emploi

3. **iot-dashboard-supabase.css** (523 lignes)
   - CSS complet avec styles pour badge Supabase
   - Animation de sauvegarde
   - Responsive

4. **supabase-schema.sql**
   - Script SQL complet pour créer la table
   - Index pour performances
   - RLS (Row Level Security)
   - Vue statistiques 24h
   - Fonction de nettoyage

### Fichiers Documentation

- **GUIDE-SUPABASE-INSERTION.md** - Guide détaillé complet
- **MIGRATION-GUIDE.md** - Guide pas-à-pas
- **GUIDE-OPTIONS-DISCRETES.md** - Options d'affichage batterie

---

## 🚀 Installation Rapide (5 minutes)

### ÉTAPE 1 : Créer la Table Supabase

1. Va sur ton projet Supabase : https://supabase.com
2. Clique sur "SQL Editor"
3. Copie tout le contenu de `supabase-schema.sql`
4. Colle et clique "Run"
5. ✅ Tu devrais voir "Table iot_data créée avec succès !"

### ÉTAPE 2 : Déployer les Fichiers

1. **Remplace** tes fichiers par les nouveaux :
   - `iot-dashboard.js` → `iot-dashboard-supabase.js`
   - `iot-dashboard-v2.html` → `iot-dashboard-v2-supabase.html`
   - `iot-dashboard.css` → `iot-dashboard-supabase.css`

2. **Ouvre** `iot-dashboard-v2-supabase.html` dans ton navigateur

### ÉTAPE 3 : Tester

1. **Ouvre la console** (F12)
2. **Tape** : `testSupabaseInsert()`
3. **Vérifie** : Tu devrais voir "✅ Test réussi"
4. **Va sur Supabase** → Table Editor → iot_data
5. **Tu verras** : Une nouvelle ligne avec tes données de test !

---

## ✨ Ce Qui a Été Ajouté

### Dans le JavaScript

#### Configuration (lignes 18-64) :
```javascript
// Headers Supabase REST API
const SUPABASE_HEADERS = {...}

// État pour collecte de données
let currentDataBatch = {...}

// Statistiques
let insertionStats = {...}
```

#### Nouvelles Fonctions (lignes 362-560) :
- `validateData()` - Valide température, humidité, batterie, pression
- `insertDataToSupabase()` - Insère avec retry (3 tentatives)
- `scheduleDataInsertion()` - Planifie insertion (debounce 5s)
- `insertCurrentBatch()` - Insère le batch courant
- `updateSupabaseBadge()` - Met à jour le badge visuel
- `testSupabaseInsert()` - Fonction de test
- `showInsertionStats()` - Affiche statistiques

#### Modification MQTT (lignes 837-930) :
La fonction `client.on('message')` a été modifiée pour :
- Stocker chaque donnée reçue dans `currentDataBatch`
- Ajouter timestamp
- Appeler `scheduleDataInsertion()` après chaque donnée

### Dans le HTML

#### Badge Supabase (ligne 38-42) :
```html
<span class="badge bg-secondary" id="supabaseBadge">
    <span id="supabaseIcon">💾</span>
    <span id="supabaseText" class="d-none d-sm-inline">Prêt</span>
</span>
```

### Dans le CSS

#### Styles Badge (lignes 516-548) :
- Style du badge
- Animation `savingPulse`
- Responsive

---

## 🎯 Comment Ça Marche

### Flux de Données

```
1. Arduino envoie → MQTT
          ↓
2. Dashboard reçoit → client.on('message')
          ↓
3. Données stockées → currentDataBatch
          ↓
4. Timer déclenché → scheduleDataInsertion()
          ↓
5. Après 5 secondes → insertCurrentBatch()
          ↓
6. Validation → validateData()
          ↓
7. Insertion → insertDataToSupabase()
          ↓
8. Badge mis à jour → updateSupabaseBadge()
          ↓
9. Log affiché → addLog()
```

### Comportement du Badge

| État | Badge | Signification |
|------|-------|---------------|
| 💾 Prêt | Gris | En attente de données |
| 💾 Sauvegarde... | Jaune animé | Insertion en cours |
| ✅ Sauvegardé | Vert | Insertion réussie (2s) |
| ❌ Erreur | Rouge | Échec insertion (3s) |

---

## 🧪 Commandes de Test

### Dans la Console Navigateur (F12)

```javascript
// Test d'insertion manuelle
testSupabaseInsert()
// Résultat : ✅ Test réussi

// Afficher les statistiques
showInsertionStats()
// Résultat :
//   Total: 5
//   Succès: 5
//   Erreurs: 0
//   Taux: 100%

// Forcer insertion immédiate
forceInsert()
```

### Commandes MQTT Test

```bash
# Température
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "dev/data/guadeloupe/temperature" \
  -m "25.5"

# Humidité
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "dev/data/guadeloupe/humidite" \
  -m "60"

# Pression
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "dev/data/guadeloupe/pression" \
  -m "101325"

# Batterie
mosquitto_pub -h broker.hivemq.com -p 1883 \
  -t "dev/data/guadeloupe/battery" \
  -m "85"
```

**Après 5 secondes**, tu devrais voir :
- Badge devient jaune → "Sauvegarde..."
- Puis vert → "✅ Sauvegardé"
- Log : "💾 Données sauvegardées"
- Nouvelle ligne dans Supabase !

---

## 📊 Requêtes Supabase Utiles

### Voir les dernières données

```sql
SELECT * FROM iot_data 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Statistiques des 24h

```sql
SELECT * FROM iot_data_stats_24h;
```

### Données d'aujourd'hui

```sql
SELECT * FROM iot_data 
WHERE DATE(timestamp) = CURRENT_DATE
ORDER BY timestamp DESC;
```

### Moyenne par heure

```sql
SELECT 
    DATE_TRUNC('hour', timestamp) as heure,
    AVG(temperature) as temp_moy,
    AVG(humidity) as hum_moy,
    COUNT(*) as nb_mesures
FROM iot_data
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY heure DESC;
```

### Nettoyer données anciennes (>30 jours)

```sql
SELECT cleanup_old_iot_data(30);
```

---

## ⚙️ Configuration

### Modifier l'intervalle d'insertion

Dans `iot-dashboard-supabase.js` ligne 59 :
```javascript
const INSERT_INTERVAL = 5000; // 5 secondes

// Pour 10 secondes :
const INSERT_INTERVAL = 10000;

// Pour 30 secondes :
const INSERT_INTERVAL = 30000;
```

### Modifier les limites de validation

Dans `validateData()` ligne 374-390 :
```javascript
// Température
if (data.temperature !== null && (data.temperature < -50 || data.temperature > 100)) {
    // Modifier -50 et 100 selon tes besoins
}
```

### Changer l'ID de l'appareil

Dans `currentDataBatch` ligne 21 :
```javascript
device_id: 'SampleOAGua', // Change par ton ID
```

---

## 🐛 Troubleshooting

### Problème : Badge reste gris "Prêt"

**Causes possibles :**
1. MQTT pas connecté
2. Aucune donnée reçue
3. Timer pas déclenché

**Solution :**
```javascript
// Console
forceInsert() // Force une insertion
```

### Problème : Badge devient rouge "Erreur"

**Causes possibles :**
1. Mauvaise clé Supabase
2. Table inexistante
3. RLS mal configuré
4. Problème réseau

**Solution :**
1. Vérifie la console pour les erreurs
2. Teste avec `testSupabaseInsert()`
3. Vérifie dans Supabase → SQL Editor :
```sql
SELECT * FROM iot_data LIMIT 1;
```

### Problème : Pas d'insertion visible dans Supabase

**Vérifications :**
1. Console : Y a-t-il des erreurs ?
2. Badge : Change-t-il de couleur ?
3. Log : "💾 Données sauvegardées" apparaît ?
4. Table : Nom correct (`iot_data`) ?

**Test manuel :**
```javascript
testSupabaseInsert()
```

### Problème : Trop d'insertions

**Solution :** Augmente `INSERT_INTERVAL`
```javascript
const INSERT_INTERVAL = 30000; // 30 secondes au lieu de 5
```

---

## 📈 Performances

### Avec l'insertion actuelle (5 secondes) :

- **1 minute** : 12 insertions
- **1 heure** : 720 insertions
- **1 jour** : 17,280 insertions
- **1 mois** : ~518,400 insertions

### Supabase Free Tier :

- ✅ 500 MB stockage → Environ **500,000 lignes**
- ✅ 2 GB bande passante/mois → Largement suffisant
- ✅ Requêtes illimitées

**Recommandation :** Nettoie les données anciennes régulièrement :
```sql
-- Tous les mois, garde seulement 30 jours
SELECT cleanup_old_iot_data(30);
```

---

## ✅ Checklist de Vérification

- [ ] Table `iot_data` créée dans Supabase
- [ ] RLS activé avec politiques
- [ ] 3 fichiers remplacés (JS, HTML, CSS)
- [ ] Page ouverte dans navigateur
- [ ] Console ouverte (F12)
- [ ] `testSupabaseInsert()` → ✅ Test réussi
- [ ] Supabase → Table Editor → 1 ligne visible
- [ ] MQTT connecté
- [ ] Badge Supabase visible dans header
- [ ] Données reçues → Badge change de couleur
- [ ] Log "💾 Données sauvegardées" visible
- [ ] Supabase → Nouvelles lignes ajoutées

---

## 🎓 Pour ton Rapport de Stage

### Points Techniques à Mentionner

1. **Architecture REST API**
   - Communication HTTP avec Supabase
   - Headers d'authentification
   - Format JSON

2. **Gestion des Données**
   - Collecte en temps réel via MQTT
   - Aggregation des données (batch)
   - Insertion périodique (debounce)

3. **Robustesse**
   - Validation des données
   - Retry automatique
   - Gestion des erreurs

4. **UX/UI**
   - Badge visuel de statut
   - Feedback temps réel
   - Responsive design

### Captures d'Écran Recommandées

1. Dashboard avec badge "Sauvegardé" (vert)
2. Console avec statistiques d'insertion
3. Supabase Table Editor avec données
4. Graphique historique avec données
5. Arduino Serial Monitor + Dashboard

---

## 🔄 Comparaison Avant/Après

| Aspect | Avant | Après |
|--------|-------|-------|
| **Stockage** | Local seulement | Supabase cloud |
| **Historique** | 20 dernières valeurs | Illimité |
| **Persistance** | ❌ Perdu au refresh | ✅ Permanent |
| **Analyse** | Limitée | SQL complet |
| **Export** | Manuel | Automatique |
| **Graphiques** | Mini-charts | Historique complet |
| **Multi-device** | ❌ Non | ✅ Oui |

---

**Félicitations ! Ton dashboard est maintenant connecté à Supabase ! 🎉**

Pour toute question, consulte les guides détaillés ou teste avec les commandes de la console.
