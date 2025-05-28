#include "main.h" 
#include "interfaz.h" 
#include "TransmisorRf.h" 
#include "Pantalla.h" 
#include <SPIFFS.h>
#include <WiFi.h>
#include <esp_task_wdt.h>
#include <ArduinoJson.h>
#include <esp_system.h>
#include <EEPROM.h>
#include <ESPAsyncWebServer.h> 

IPAddress local_IP(192, 168, 8, 28);
IPAddress gateway(192, 168, 14, 1);
IPAddress subnet(255, 255, 255, 0);

const char* ssidAP = "Probando";
const char* passwordAP = "87654321";

AsyncWebServer server(80); 

extern String Version; 
extern SENSOR activo;
extern void enviarPorLora(String msg); 
extern void mostrarImagen(const unsigned char* imagen, int tipo);
extern const unsigned char img2[]; 
extern RCSwitch transmisorRF;
extern void imprimir(String m, String c);

void animacionCarga() {
    const char* estados[] = {"-", "\\", "|", "/"};
    for (int i = 0; i < 10; i++) {
        Serial.print("\rCargando... ");
        Serial.print(estados[i % 4]);
        delay(200);
    }
    Serial.println("\rCargando... ¡Listo!");
}

void endpointsMProg(void *pvParameters) {
    animacionCarga();
    WiFi.mode(WIFI_AP);

    if (!WiFi.softAPConfig(local_IP, gateway, subnet)) {
        imprimir("Error al configurar la IP estática");
        vTaskDelete(NULL);
        return;
    }

    WiFi.softAP(ssidAP, passwordAP);
    IPAddress IP = WiFi.softAPIP();
    imprimir("Punto de acceso creado: " + IP.toString());

    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        if (!SPIFFS.exists("/interfaz.html.gz")) {
            request->send(404, "text/plain", "Archivo no encontrado");
            return;
        }
        AsyncWebServerResponse *response = request->beginResponse(SPIFFS, "/interfaz.html.gz", "text/html");
        response->addHeader("Content-encoding", "gzip");
        request->send(response);
    });

   server.on("/cambiar-imagen", HTTP_POST, [](AsyncWebServerRequest *request){
    // No respondemos aquí, respondemos en el body callback
}, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
    // Leer cuerpo completo
    String body = "";
    for (size_t i = 0; i < len; i++) {
        body += (char)data[i];
    }

    DynamicJsonDocument doc(256);
    DeserializationError error = deserializeJson(doc, body);
    if (error) {
        request->send(400, "application/json", "{\"error\":\"JSON inválido\"}");
        return;
    }

    int imagen = doc["imagen"] | 1;

    // Validar rango
    if (imagen < 1 || imagen > 9) {
        request->send(400, "application/json", "{\"error\":\"Número de imagen inválido (1-9)\"}");
        return;
    }

    // Mostrar imagen según número
switch (imagen) {
    case 1: mostrarImagen(img1, 1); break;
    case 2: mostrarImagen(img2, 1); break;
    case 3: mostrarImagen(img3, 1); break;
    case 4: mostrarImagen(img4, 1); break;
    case 5: mostrarImagen(img5, 1); break;
    case 6: mostrarImagen(img6, 1); break;
    case 7: mostrarImagen(img7, 1); break;
    case 8: mostrarImagen(img8, 1); break;
    case 9: mostrarImagen(img9, 1); break;
}

    // Enviar mensaje LoRa si quieres
    String loraMsg = "IMG:" + String(imagen);
    enviarPorLora(loraMsg);

    // Responder al cliente
    DynamicJsonDocument res(128);
    res["status"] = "success";
    res["message"] = "Imagen cambiada";
    res["imagen"] = imagen;
    String jsonResponse;
    serializeJson(res, jsonResponse);
    request->send(200, "application/json", jsonResponse);

    Serial.println("[IMAGEN] Cambio solicitado: " + String(imagen));
});

    server.on("/enviar-rf", HTTP_POST, [](AsyncWebServerRequest *request){
        if(request->hasParam("body", true)) {
            String body = request->getParam("body", true)->value();
            DynamicJsonDocument doc(256);
            deserializeJson(doc, body);

            String comando = doc["comando"] | "";
            int id = doc["id"] | activo.id;
            int zona = doc["zona"] | activo.zona;
            int tipo = doc["tipo"] | activo.tipo;

            String loraMsg = "RF:" + String(id) + "," + String(zona) + "," + String(tipo);
            enviarPorLora(loraMsg);

            DynamicJsonDocument response(200);
            response["status"] = "success";
            response["message"] = "Señal RF enviada";
            response["id"] = id;
            response["zona"] = zona;
            response["tipo"] = tipo;

            String jsonResponse;
            serializeJson(response, jsonResponse);
            request->send(200, "application/json", jsonResponse);

            Serial.println("\n[RF] Señal enviada: " + loraMsg);
        } else {
            request->send(400, "text/plain", "Falta el cuerpo de la solicitud");
        }
    });

    server.on("/leer-parametros", HTTP_GET, [](AsyncWebServerRequest *request){
        DynamicJsonDocument doc(200);
        doc["id"] = activo.id;
        doc["zona"] = activo.zona;
        doc["tipo"] = activo.tipo;
        
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    server.on("/guardar-parametros", HTTP_POST, [](AsyncWebServerRequest *request){
        if (request->hasParam("id", true) && request->hasParam("zona", true) && request->hasParam("tipo", true)) {
            int nuevoId = request->getParam("id", true)->value().toInt();
            int nuevaZona = request->getParam("zona", true)->value().toInt();
            int nuevoTipo = request->getParam("tipo", true)->value().toInt();

            if(nuevoId < 1000 || nuevoId > 9999) {
                request->send(400, "text/plain", "ID debe ser de 4 dígitos");
                return;
            }
            
            if(nuevaZona < 1 || nuevaZona > 510) {
                request->send(400, "text/plain", "Zona debe estar entre 1 y 510");
                return;
            }
            
            if(nuevoTipo < 0 || nuevoTipo > 9) {
                request->send(400, "text/plain", "Tipo de sensor inválido");
                return;
            }

            activo.id = nuevoId;
            activo.zona = nuevaZona;
            activo.tipo = nuevoTipo;

            EEPROM.put(0, activo);
            if(!EEPROM.commit()) {
                request->send(500, "text/plain", "Error al guardar en EEPROM");
                return;
            }

            String loraMsg = "PARAM:" + String(activo.id) + "," + String(activo.zona) + "," + String(activo.tipo);
            enviarPorLora(loraMsg);

            DynamicJsonDocument doc(200);
            doc["status"] = "success";
            doc["message"] = "Parámetros guardados correctamente";
            doc["id"] = activo.id;
            doc["zona"] = activo.zona;
            doc["tipo"] = activo.tipo;

            String response;
            serializeJson(doc, response);
            request->send(200, "application/json", response);

            Serial.println("\n[EEPROM] Datos guardados:");
            Serial.println("ID: " + String(activo.id));
            Serial.println("Zona: " + String(activo.zona));
            Serial.println("Tipo: " + String(activo.tipo));
            
            mostrarImagen(img2); 
        } else {
            request->send(400, "text/plain", "Faltan parámetros");
        }
    });

    server.on("/enviar-rf-prueba", HTTP_POST, [](AsyncWebServerRequest *request){
        transmisorRF.send(CODIGO_RF_PRUEBA, RF_BITS);
        delay(100);

        DynamicJsonDocument doc(200);
        doc["status"] = "success";
        doc["message"] = "Señal RF de prueba enviada";
        doc["codigo"] = CODIGO_RF_PRUEBA;
        doc["bits"] = RF_BITS;

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);

        Serial.println("\n[PRUEBA] Señal RF enviada. Código: " + String(CODIGO_RF_PRUEBA));
    });

    server.on("/enviar-rf-alerta", HTTP_POST, [](AsyncWebServerRequest *request){
        transmisorRF.send(CODIGO_RF_GAS, RF_BITS);
        delay(100);

        DynamicJsonDocument doc(200);
        doc["status"] = "success";
        doc["message"] = "Señal RF de alerta enviada";
        doc["codigo"] = CODIGO_RF_GAS;
        doc["bits"] = RF_BITS;

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);

        Serial.println("\n[ALERTA] Señal RF enviada. Código: " + String(CODIGO_RF_GAS));
    });

    server.on("/reiniciar", HTTP_POST, [](AsyncWebServerRequest *request) {
        digitalWrite(LED_PIN, LOW); 
        delay(100);
        
        request->send(200, "text/plain", "Reiniciando tarjeta...");
        delay(100);
        ESP.restart();
    });

    server.begin();

    while (true) {
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
}

void entrarModoProgramacion() { 
    imprimir("Entrando a modo programación...");
    extern bool modoprog;
    modoprog = true; 
    esp_task_wdt_reset();

    digitalWrite(LED_PIN, HIGH); 

    vTaskDelay(1000 / portTICK_PERIOD_MS);

    if (!SPIFFS.begin(true)) {
        imprimir("Error al montar SPIFFS");
        digitalWrite(LED_PIN, LOW);
        return;
    }

    imprimir("Activando Modo Programación...");
    xTaskCreatePinnedToCore(
        endpointsMProg, 
        "endpoints",
        8192,
        NULL,
        2,
        NULL,
        0
    );

    imprimir("---# Modo Programación Activado #---", "verde");
}

void entrarmodoprog() {
    entrarModoProgramacion();
}