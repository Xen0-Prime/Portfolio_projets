/*
* Software Name : iotContinuum
* SPDX-FileCopyrightText: Copyright (c) 2023 Orange SA
* SPDX-License-Identifier: MIT
*
* This software is distributed under the MIT License,
* the text of which is available at https://spdx.org/licenses/MIT.html
* or see the "LICENSE" file for more details.
*/

/*! @file LiveObjects_3D_Battery.ino
Copyright (c) 2023 ORANGE
Modified: Janvier 2025 - Ajout fonctionnalité batterie

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,


distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION */

#include <Arduino.h>
#include <HL7812.h>
#include <LiveObjects.h>
#include <Wire.h>
#include "PCA9534.h"
#include <BME280I2C.h>
#include <BME280.h>
#include "LSM6DSOXSensor.h"
#include <PubSubClient.h>
#include <SoftwareSerial.h>


#define DELAY_INFO      60000

LiveObjects* mLiveObjects = NULL;
// HL7812Base* hl7812 = mLiveObjects->getHl7812();

PCA9534 gpio;
BME280I2C bme;
LSM6DSOXSensor lsm6dsoxSensor = LSM6DSOXSensor(&Wire, LSM6DSOX_I2C_ADD_L);
  String temperature;
  String pression;
  String humidite;
  String position_gyro;
  String battery_percent;  // ⭐ NOUVELLE VARIABLE
  bool   connected_var;

// ===== VARIABLES POUR ORIENTATION 3D =====
float pitch = 0;  // Inclinaison avant/arrière
float roll = 0;   // Inclinaison gauche/droite  
float yaw = 0;    // Rotation horizontale
unsigned long lastOrientationTime = 0;
unsigned long lastYawResetTime = 0;  // Pour reset automatique du yaw

// ===== VARIABLES POUR BATTERIE =====
float batterySamples[BATTERY_SAMPLES] = {0};  // Tableau pour moyenne glissante
uint8_t batterySampleIndex = 0;
float currentBatteryVoltage = 0.0f;
uint8_t currentBatteryPercent = 0;
unsigned long lastBatteryWarningTime = 0;

/* This code example shows how to send data to LiveObjects servers using MQTT protocol with the HL7812.
IMPORTANT: LiveObjects credentials must be replaced in ConfigLiveObjects.h file first. */


// ===== FONCTION INITIALISATION MONITORING BATTERIE =====
void enable_battery_check() {
  pinMode(BAT_LEVEL, INPUT_ANALOG);
  analogReadResolution(12);
  
  // Initialiser le tableau de moyennes avec la valeur courante
  float initialVoltage = ((float)(analogRead(BAT_LEVEL) * 3.3) / 4096.0) * 2.0;
  for(int i = 0; i < BATTERY_SAMPLES; i++) {
    batterySamples[i] = initialVoltage;
  }

  delay(500);
  Serial.println("🔋 Battery monitoring enabled");
  Serial.print("📊 Samples for averaging: "); Serial.println(BATTERY_SAMPLES);
  Serial.print("⚠️  Critical threshold: "); Serial.print(BATTERY_CRITICAL); Serial.println("%");
  Serial.print("🟡 Low threshold: "); Serial.print(BATTERY_LOW); Serial.println("%");
}

// ===== FONCTION LECTURE TENSION BATTERIE AVEC MOYENNE =====
float read_battery_voltage_averaged() {
  // Lire la valeur ADC brute
  uint16_t adcValue = analogRead(BAT_LEVEL);
  
  // Convertir en tension (diviseur de tension x2)
  float voltage = ((float)(adcValue * 3.3) / 4096.0) * 2.0;
  
  // Ajouter au tableau de moyennes
  batterySamples[batterySampleIndex] = voltage;
  batterySampleIndex = (batterySampleIndex + 1) % BATTERY_SAMPLES;
  
  // Calculer la moyenne
  float sum = 0.0;
  for(int i = 0; i < BATTERY_SAMPLES; i++) {
    sum += batterySamples[i];
  }
  
  return sum / BATTERY_SAMPLES;
}

// ===== FONCTION CALCUL POURCENTAGE BATTERIE (NON-LINÉAIRE) =====
uint8_t calculate_battery_percent(float voltage) {
  // Courbe approximative pour batterie Li-ion (plus précis qu'un calcul linéaire)
  if (voltage >= BATTERY_V_MAX) return 100;
  else if (voltage >= 4.1f) return 95;
  else if (voltage >= 4.0f) return 85;
  else if (voltage >= 3.9f) return 75;
  else if (voltage >= 3.8f) return 65;
  else if (voltage >= 3.7f) return 50;
  else if (voltage >= 3.6f) return 35;
  else if (voltage >= 3.5f) return 20;
  else if (voltage >= 3.4f) return 10;
  else if (voltage >= 3.3f) return 5;
  else return 0;
}

// ===== FONCTION CALCUL POURCENTAGE BATTERIE (LINÉAIRE - ALTERNATIVE) =====
uint8_t calculate_battery_percent_linear(float voltage) {
  if (voltage <= BATTERY_V_MIN) return 0;
  if (voltage >= BATTERY_V_MAX) return 100;
  
  float percent = ((voltage - BATTERY_V_MIN) / (BATTERY_V_MAX - BATTERY_V_MIN)) * 100.0f;
  return (uint8_t)percent;
}

// ===== FONCTION MISE À JOUR ÉTAT BATTERIE =====
void update_battery_status() {
  // Lire la tension avec moyenne glissante
  currentBatteryVoltage = read_battery_voltage_averaged();
  
  // Calculer le pourcentage (utiliser la méthode non-linéaire pour plus de précision)
  currentBatteryPercent = calculate_battery_percent_linear(currentBatteryVoltage);
  
  // Stocker dans String pour MQTT
  battery_percent = String(currentBatteryPercent);
  
  // Affichage selon le niveau
  if (currentBatteryPercent >= 70) {
    Serial.print("🔋 Battery: "); 
    Serial.print(currentBatteryVoltage, 2); 
    Serial.print("V (");
    Serial.print(currentBatteryPercent);
    Serial.println("%) - Excellent");
  } else if (currentBatteryPercent >= 40) {
    Serial.print("🔋 Battery: "); 
    Serial.print(currentBatteryVoltage, 2); 
    Serial.print("V (");
    Serial.print(currentBatteryPercent);
    Serial.println("%) - Good");
  } else if (currentBatteryPercent >= BATTERY_LOW) {
    Serial.print("🟡 Battery: "); 
    Serial.print(currentBatteryVoltage, 2); 
    Serial.print("V (");
    Serial.print(currentBatteryPercent);
    Serial.println("%) - LOW");
  } else if (currentBatteryPercent >= BATTERY_CRITICAL) {
    Serial.print("🟠 Battery: "); 
    Serial.print(currentBatteryVoltage, 2); 
    Serial.print("V (");
    Serial.print(currentBatteryPercent);
    Serial.println("%) - VERY LOW");
  } else {
    Serial.print("🔴 Battery: "); 
    Serial.print(currentBatteryVoltage, 2); 
    Serial.print("V (");
    Serial.print(currentBatteryPercent);
    Serial.println("%) - CRITICAL!");
  }
}

// ===== FONCTION GESTION LED SELON NIVEAU BATTERIE =====
void update_battery_led() {
  if (currentBatteryPercent < BATTERY_CRITICAL) {
    // Critique: LED rouge clignotante
    gpio.digitalWrite(RED_LED, LOW);
    gpio.digitalWrite(GREEN_LED, HIGH);
    gpio.digitalWrite(BLUE_LED, HIGH);
  } else if (currentBatteryPercent < BATTERY_LOW) {
    // Faible: LED orange (rouge + vert)
    gpio.digitalWrite(RED_LED, LOW);
    gpio.digitalWrite(GREEN_LED, LOW);
    gpio.digitalWrite(BLUE_LED, HIGH);
  } else {
    // OK: LED verte
    gpio.digitalWrite(RED_LED, HIGH);
    gpio.digitalWrite(GREEN_LED, LOW);
    gpio.digitalWrite(BLUE_LED, HIGH);
  }
}

// ===== FONCTION AFFICHAGE BATTERIE (CONSERVÉE POUR COMPATIBILITÉ) =====
void display_battery_level() {
  update_battery_status();
  delay(500);
}


void setupSensor() { 


  /* Init Serial (Serial Monitor) */
  Serial.begin(115200);

  /* Init GPIOs */
  gpio.begin();

  /* Init I2C */
  Wire.begin();
  
  /* Init BME280 - temperature + humidity + pressure sensor */
  bme.begin();
  
  /* Init LSM6DSOX sensor - accelerometer & gyroscope */
  lsm6dsoxSensor.begin();

  /* Setup LED GPIOs in ouput mode */
  gpio.pinMode(RED_LED, OUTPUT);
  gpio.pinMode(GREEN_LED, OUTPUT);
  gpio.pinMode(BLUE_LED, OUTPUT);


  gpio.digitalWrite(RED_LED, HIGH); // LED rouge Off
  gpio.digitalWrite(GREEN_LED, HIGH); // LED verte Off
  gpio.digitalWrite(BLUE_LED, HIGH); // LED bleu Off

  delay(500);
 
  /* Enable accelerometer and gyroscope, and check success */
  if (lsm6dsoxSensor.Enable_X() == LSM6DSOX_OK && lsm6dsoxSensor.Enable_G() == LSM6DSOX_OK) {
    Serial.println("Success enabling accelero and gyro");
  } else {
    Serial.println("Error enabling accelero and gyro");
  }
 
  /* Read ID of device and check that it is correct */
  uint8_t id;
  lsm6dsoxSensor.ReadID(&id);
  if (id != LSM6DSOX_ID) {
    Serial.println("Wrong ID for LSM6DSOX sensor. Check that device is plugged");
  } else {
    Serial.println("Receviced correct ID for LSM6DSOX sensor");
  }

  // Initialiser le timer pour le calcul d'orientation
  lastOrientationTime = millis();
  lastYawResetTime = millis();  // Timer pour reset yaw
  
  Serial.println("Start Setup Sensor");
  Serial.println("✅ Orientation 3D activée");
  Serial.println("⚙️  Zone morte gyroscope: 5 dps");
  Serial.println("🔄 Reset automatique yaw: toutes les 30s");
}

// ===== FONCTION CALCUL ORIENTATION 3D =====
void calculateOrientation(int32_t acceleration[3], int32_t rotation[3]) {
  // Convertir accélération de mg vers g
  float accelX = acceleration[0] / 1000.0;
  float accelY = acceleration[1] / 1000.0;
  float accelZ = acceleration[2] / 1000.0;
  
  // Convertir rotation de mdps vers dps
  float gyroX = rotation[0] / 1000.0;
  float gyroY = rotation[1] / 1000.0;
  float gyroZ = rotation[2] / 1000.0;
  
  // ===== PITCH et ROLL depuis accéléromètre (STABLE) =====
  pitch = atan2(-accelX, sqrt(accelY * accelY + accelZ * accelZ)) * 180.0 / PI;
  roll = atan2(accelY, accelZ) * 180.0 / PI;
  
  // ===== YAW depuis gyroscope (intégration) =====
  unsigned long currentTime = millis();
  float deltaTime = (currentTime - lastOrientationTime) / 1000.0; // secondes
  lastOrientationTime = currentTime;
  
  // ⭐ ZONE MORTE : ignorer les petites valeurs (seuil à 5 dps)
  const float GYRO_DEAD_ZONE = 5.0; // degrés par seconde
  
  if (abs(gyroZ) > GYRO_DEAD_ZONE) {
    yaw += gyroZ * deltaTime;
  }
  // Sinon, on considère que l'objet est immobile et on n'intègre pas
  
  // Normaliser yaw entre -180° et +180°
  while (yaw > 180.0) yaw -= 360.0;
  while (yaw < -180.0) yaw += 360.0;
  
  // ⭐ RESET AUTOMATIQUE du yaw toutes les 30 secondes pour éviter dérive
  const unsigned long YAW_RESET_INTERVAL = 30000; // 30 secondes
  if (currentTime - lastYawResetTime > YAW_RESET_INTERVAL) {
    yaw = 0;
    lastYawResetTime = currentTime;
    Serial.println("🔄 Yaw réinitialisé automatiquement");
  }
}

bool getSensorInfo()

{

  Serial.println(" declenchement fonction getSensorInfo()");
/* Read temperature, humidity & pressure values */
  float temp = bme.temp();
  float hum = bme.hum();
  float pres = bme.pres();
  /* Plot data (friendly format for the Serial Plotter) */

  temperature = String(temp);
  pression = String(pres);
  humidite = String(hum);
  
  // Serial.println("Temp:" + temperature + "°C, Humidity:" + humidite + "%, Pressure:" + pression) + "Pa");

  /* Read accelerometer */
  int32_t acceleration[3] = {0, 0, 0};
  uint8_t acceleroStatus;
  lsm6dsoxSensor.Get_X_DRDY_Status(&acceleroStatus);
  if (acceleroStatus == 1) { /* Status == 1 means a new data is available */
    lsm6dsoxSensor.Get_X_Axes(acceleration);
    /* Plot data (friendly format for the Serial Plotter) */
    Serial.println("Accel_X:" + String(acceleration[0]) + "mg, Accel_Y:" + String(acceleration[1]) + "mg, Accel_Z:" + String(acceleration[2]) + "mg");
  }

  /* Read gyroscope */
  int32_t rotation[3] = {0, 0, 0};
  uint8_t gyroStatus;
  lsm6dsoxSensor.Get_G_DRDY_Status(&gyroStatus);
  if (gyroStatus == 1) { // Status == 1 means a new data is available
    lsm6dsoxSensor.Get_G_Axes(rotation);
    /* Plot data in milli degrees per second (friendly format for the Serial Plotter) */
    Serial.println("Rot_X:" + String(rotation[0]) + "mdps, Rot_Y:" + String(rotation[1]) + "mdps, Rot_Z:" + String(rotation[2]) + "mdps");
    
    // ===== CALCULER L'ORIENTATION 3D =====
    calculateOrientation(acceleration, rotation);
    
    // ===== CONSTRUIRE LE JSON COMPLET POUR DASHBOARD 3D =====
    // Format: {gyro:{x,y,z}, accel:{x,y,z}, orientation:{pitch,roll,yaw}}
    
    // Convertir les valeurs
    float gyroX_dps = rotation[0] / 1000.0;
    float gyroY_dps = rotation[1] / 1000.0;
    float gyroZ_dps = rotation[2] / 1000.0;
    
    float accelX_g = acceleration[0] / 1000.0;
    float accelY_g = acceleration[1] / 1000.0;
    float accelZ_g = acceleration[2] / 1000.0;
    
    // Construire le JSON
    position_gyro = "{";
    position_gyro += "\"gyro\":{\"x\":" + String(gyroX_dps, 2) + ",\"y\":" + String(gyroY_dps, 2) + ",\"z\":" + String(gyroZ_dps, 2) + "},";
    position_gyro += "\"accel\":{\"x\":" + String(accelX_g, 3) + ",\"y\":" + String(accelY_g, 3) + ",\"z\":" + String(accelZ_g, 3) + "},";
    position_gyro += "\"orientation\":{\"pitch\":" + String(pitch, 1) + ",\"roll\":" + String(roll, 1) + ",\"yaw\":" + String(yaw, 1) + "}";
    position_gyro += "}";
    
    Serial.println("🧭 Orientation: Pitch=" + String(pitch, 1) + "° Roll=" + String(roll, 1) + "° Yaw=" + String(yaw, 1) + "°");
  }
  
  // ===== LIRE L'ÉTAT DE LA BATTERIE =====
  update_battery_status();
  
	return true;
}


void hl7812Callback(void* object, uint16_t type , uint32_t value) {
   Serial.println("hl7812Callback callback"); 
}

void mqttMessageReceived(String &topic, String &payload) {
    Serial.println("incoming: " + topic + " - " + payload);    
}



bool publishDeviceInfo() {
    HL7812Base* hl7812 = mLiveObjects->getHl7812();

    String imsi = hl7812->getIMSI();
    Serial.print("ISMI="); Serial.println(imsi); 

    String rssi = hl7812->getRSSI();
    Serial.print("RSSI="); Serial.println(rssi); 

    String imei = hl7812->getIMEI();
    Serial.print("IMEI="); Serial.println(imei); 

    String apn = hl7812->getAPN();
    Serial.print("APN="); Serial.println(apn); 

    String deviceInfo = "{\"imsi\":\"" + imsi + "\",\"imei\":\"" + imei + "\",\"rssi\":" + rssi + ",\"apn\":" + apn + "}";
    
    return mLiveObjects->publish(String(STREAM_ID_CONFIG).c_str(), deviceInfo.c_str(), TAG_CONFIG);  
  return true;
}


void schedule() {




  
    uint32_t countBeforeReset = 0;
    uint32_t current = millis();

    while(true) {
        bool state = mLiveObjects->loop();   
        
        if(!state) {
            Serial.println("Module disconnected");
            Serial.println("Attempt to reconnect");

            mLiveObjects->disconnect();
            delay(3000);

            if(!mLiveObjects->connect()) {
                countBeforeReset++;
                if(countBeforeReset > 3) {
                    NVIC_SystemReset();
                }
            }

            delay(2000);
        }        
     
        if(millis() - current > DELAY_INFO) {
            Serial.println("Publish info device");
            bool toto = publishDeviceInfo();
            delay(250);            
            current = millis();           
        }
        
        delay(250);
    } 
}




bool publishSensorInfo() {

    gpio.digitalWrite(BLUE_LED, LOW); // LED On
    
    bool status = getSensorInfo();
    Serial.println("publishSensorInfo : Temp = " + temperature + " °C, Humidity = " + humidite + " %, Pressure = " + pression + " Pa");
    Serial.println("publishSensorInfo : Position 3D = " + position_gyro);
    Serial.println("publishSensorInfo : Battery = " + battery_percent + " %");  // ⭐ NOUVEAU LOG
    
/* case liveObjects
    status = mLiveObjects->publish(String(STREAM_ID_CONFIG).c_str(), temperature.c_str(), TAG_TEMPERATURE);
    status = mLiveObjects->publish(String(STREAM_ID_CONFIG).c_str(), humidite.c_str(), TAG_HUMIDITE);
    status = mLiveObjects->publish(String(STREAM_ID_CONFIG).c_str(), pression.c_str(), TAG_PRESSION);
*/
// case mosquitto

    status = mLiveObjects->publish_mosquitto(String(STREAM_ID_DATA).c_str(), temperature.c_str(), TAG_TEMPERATURE, 1);
    status = mLiveObjects->publish_mosquitto(String(STREAM_ID_DATA).c_str(), humidite.c_str(), TAG_HUMIDITE, 3);
    status = mLiveObjects->publish_mosquitto(String(STREAM_ID_DATA).c_str(), pression.c_str(), TAG_PRESSION, 2);
    
    // ⭐ PUBLICATION BATTERIE
    status = mLiveObjects->publish_mosquitto(String(STREAM_ID_DATA).c_str(), battery_percent.c_str(), TAG_BATTERY, 5);
    
    if (status) {
      Serial.println("✅ Batterie publiée: " + battery_percent + "%");
    } else {
      Serial.println("❌ Erreur publication batterie");
    }
    
    // ⭐ PUBLICATION POSITION 3D AVEC FORMAT COMPLET
    status = mLiveObjects->publish_mosquitto(String(STREAM_ID_DATA).c_str(), position_gyro.c_str(), TAG_POSITION, 4);
   
    if (status) {
      Serial.println("✅ Position 3D publiée avec succès");
    } else {
      Serial.println("❌ Erreur publication Position 3D");
    }
    
    // ⭐ METTRE À JOUR LED SELON BATTERIE
    update_battery_led();
    
    delay(500);
    gpio.digitalWrite(BLUE_LED, HIGH); // LED Off
    
    return status;
}

void receptionSMS() {
  
  bool smsrecu = false;
  HL7812Base* hl7812 = mLiveObjects->getHl7812();
  SoftwareSerial mySerial(2, 3); // RX, TX pour Arduino

  while (!smsrecu) {
   Serial.println("En attente de Message SMS"); 
  // Lire les messages entrants du module HL7812
  if (mySerial.available()) {
    String message = mySerial.readString();
    Serial.println("Message reçu : ");
    Serial.println(message);
    
    // Si un message de notification de réception de SMS est détecté
    if (message.indexOf("+CMTI:") != -1) {
      // Extraire l'indice du message
      int index = message.substring(message.indexOf(",") + 1).toInt();
      
      // Lire le SMS à partir de l'indice
      hl7812->ReadSMS(index);
      smsrecu = true;
    }
  }

  // Attendre avant de vérifier à nouveau
  delay(500);
  }

  Serial.println("Message affiché sur la CONSOLE");
}



void execute() {    

   
     
    mLiveObjects = new LiveObjects();
    Serial.println("Connect to LiveObjects");
    HL7812Base* hl7812 = mLiveObjects->getHl7812();
	  Serial.println("getHl7812 objects");

    //hl7812->initializeSMSMT();
    //receptionSMS();
    connected_var = mLiveObjects->begin(); 
    if (connected_var) {
    Serial.println("connected_var = TRUE : PDP Context ouvert");
    }
    else if (!connected_var) {
    Serial.println("connected_var = FALSE : PDP Context ferme");
    }
    if(!mLiveObjects->connect()) {
        Serial.println("Connection to LiveObjects failed");
        
        while(true) {
         gpio.digitalWrite(RED_LED, LOW); // LED On
         delay(500);
         gpio.digitalWrite(RED_LED, HIGH); // LED Off
         delay(500);
        }
    }     

/*
	mLiveObjects->setReceivedMessageCallback(mqttMessageReceived);
    mLiveObjects->subscribeCommand();
*/    
    if(!publishDeviceInfo()) {
        Serial.println("publishDeviceInfo failed");
        return;
    }
    else {
        Serial.println("publishDeviceInfo success ");
    }
    
   // schedule(); 

	setupSensor();
  display_battery_level();
	bool Status = publishSensorInfo();
	//boucle envoi de donnée
	while(Status == true) { 
    display_battery_level();
    Status = publishSensorInfo();
    
    // ⭐ ALERTE BATTERIE CRITIQUE
    if (currentBatteryPercent <= BATTERY_CRITICAL) {
      unsigned long currentTime = millis();
      // Afficher alerte toutes les 30 secondes
      if (currentTime - lastBatteryWarningTime > 30000) {
        Serial.println("⚠️⚠️⚠️ ALERTE: BATTERIE CRITIQUE! ⚠️⚠️⚠️");
        Serial.println("⚠️  Niveau: " + String(currentBatteryPercent) + "%");
        Serial.println("⚠️  Tension: " + String(currentBatteryVoltage, 2) + "V");
        lastBatteryWarningTime = currentTime;
      }
    }


//session recovery

if (Status == false) {
            Serial.println("on relance la session MQTT car Status = false");
            //connected_var = mLiveObjects->updatePDP();
            if(!mLiveObjects->reconnect()) {
                    Serial.println("on tente un reouverture de PDP");
                    connected_var = mLiveObjects->updatePDP();
                    Serial.println("on tente un reouverture de socket TCP");
   
                    if(!mLiveObjects->reconnect()) {
                    Serial.println("recovery en echec");
                          while(true)
                          {
                            gpio.digitalWrite(RED_LED, LOW); // LED On
                            delay(500);
                            gpio.digitalWrite(RED_LED, HIGH); // LED Off
                            delay(500);
                           } // end while
   
   
                  }
                  else
                  {
                    Status = true ;
                  }
            }
            else
            {
              Status = true ;
            }
}
 else
 {
  delay(DEVICE_DELAY);
 }
} // fin while 

/*boucle envoi de donnée
  while(Status == true) { 
    Status = publishSensorInfo();
   //  delay(7200000);
   delay(DEVICE_DELAY);
  }*/
 
}
  
	

void setup()
{  
/* while(!Serial){
  }
*/ 
  Serial.begin(115200);
  delay(2000);
  Serial.println("Start test Liveobjects");
  Serial.println("=== VERSION AVEC ORIENTATION 3D + BATTERIE ===");

  enable_battery_check();

  execute();
}

void loop(){
}
