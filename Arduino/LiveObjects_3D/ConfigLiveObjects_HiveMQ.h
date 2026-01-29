/*
* Software Name : iotContinuum
* SPDX-FileCopyrightText: Copyright (c) 2023 Orange SA
* SPDX-License-Identifier: MIT
*/

#pragma once

#define MQTT_BUFFER             512
#define LIVEOBJECTS_MQTT_PORT   1883

// ⭐ BROKER HIVEMQ POUR TESTS
#define LIVEOBJECTS_HOST        "broker.hivemq.com"

#define DEVICE_NAME             "SampleOAGua"
#define STREAM_ID_CONFIG        "urn:lo:nsid:SampleConfig"
#define STREAM_ID_DATA          "urn:lo:nsid:SampleData"
#define STREAM_ID_EVENT         "urn:lo:nsid:SampleEvent"

#define MQTT_USER_NAME          ""
#define MQTT_PASSWORD           ""

#define RAT_TYPE                LTE
#define APN_NAME                "orangeiot"       
#define DEVICE_DELAY            2000  // Envoi toutes les 2 secondes
#define CMD_EDRX                "AT+KEDRXCFG=2,4,1,3"
#define CMD_PSM                 "AT+CPSMS=1,,,\"00100100\",\"00001000\""
#define ENABLE_EDRX             "ON"
#define ENABLE_PSM              "ON"

// ⭐ TOPICS POUR HIVEMQ (garde les mêmes)
#define LIVEOBJECTS_DATA_TOPIC              "dev/data"
#define LIVEOBJECTS_DATA_TOPIC_TEMPERATURE  "dev/data/guadeloupe/temperature"
#define LIVEOBJECTS_DATA_TOPIC_PRESSION     "dev/data/guadeloupe/pression"
#define LIVEOBJECTS_DATA_TOPIC_HUMIDITE     "dev/data/guadeloupe/humidite"
#define LIVEOBJECTS_DATA_TOPIC_POSITION     "dev/data/guadeloupe/position"

#define LIVEOBJECTS_CMD_TOPIC   "dev/cmd"

#define TAG_SENSORS             "sensor"
#define TAG_EVENT               "event"
#define TAG_CONFIG              "config"
#define TAG_TEMPERATURE         "temperature"
#define TAG_PRESSION            "pression"
#define TAG_HUMIDITE            "humidite"
#define TAG_POSITION            "position"
