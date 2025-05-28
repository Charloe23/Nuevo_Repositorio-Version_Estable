#include "Pantalla.h"
#include "interfaz.h"
#include "TransmisorRf.h"
#include "main.h"
#include <RCSwitch.h>
#include <heltec.h>
#include <EEPROM.h>

// --- Códigos RF
#define CODIGO_RF_GAS 33330001
#define CODIGO_RF_PRUEBA 33330009
#define RF_BITS 27

// --- Variables globales
String Version = "3.3.3.9";
const int EEPROM_SIZE = sizeof(SENSOR);

boolean debug = true, variableDetectada = false, modoprog = false;
SENSOR activo{-1, -1, -1};
RCSwitch transmisorRF;

const int BOTON_PRUEBA_PIN = 2;
unsigned long tiempoUltimaImagen = 0;
int imagenMostrada = 1;

extern const unsigned char img1[], img2[], img3[], img4[], img5[], img6[], img7[], img8[];

void imprimir(String m, String c) {
    if (!debug) return;
    const char* col = "\033[0m";
    if (c == "rojo") col = "\033[31m";
    else if (c == "verde") col = "\033[32m";
    else if (c == "amarillo") col = "\033[33m";
    else if (c == "cyan") col = "\033[36m";
    Serial.print(col); Serial.println(m); Serial.print("\033[0m");
}

void enviarPorLora(String mensaje) {
    Serial.println("[LoRa] " + mensaje);
    // No tocar pantalla OLED aquí
}

void mostrarImagen(const unsigned char* imagen, int tipo) {
    Heltec.display->clear();
    Heltec.display->drawXbm(0, 0, 128, 64, imagen);
    Heltec.display->display();

    imagenMostrada = tipo;

    if (tipo == 2) {
        tiempoUltimaImagen = millis(); // Se borra después
    } else {
        tiempoUltimaImagen = 0; // Nunca se borra automáticamente
    }
}

void mostrarInicio() {
    mostrarImagen(img1, 1);
}

void mostrarImagenPorTipoSensor(int tipoSensor) {
    switch (tipoSensor) {
        case 0: case 1: mostrarImagen(img3); break;
        case 2: mostrarImagen(img5); break;
        case 3: case 4: mostrarImagen(img8); break;
        case 5: case 6: mostrarImagen(img6); break;
        case 7: mostrarImagen(img7); break;
        case 9: mostrarImagen(img2); break;
        default: mostrarImagen(img1); break;
    }
}

void blinkLed() {
    for (int i = 0; i < 2; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(500);
        digitalWrite(LED_PIN, LOW);
        delay(500);
    }
}

void manejarEntradas() {
    static unsigned long t = 0, progStart = 0;
    static bool esperandoLiberar = false;
    static bool botonAnterior = HIGH;

    int mq6 = digitalRead(MQ6_PIN);
    int progEstado = digitalRead(PIN_PROG);
    int estadoBoton = digitalRead(BOTON_PRUEBA_PIN);

    if (progEstado == LOW) {
        if (!progStart) progStart = millis();
        if (!modoprog && millis() - progStart >= 2000 && !esperandoLiberar) {
            modoprog = esperandoLiberar = true;
            entrarmodoprog();
            mostrarImagen(img4);
            imprimir("Entrando en modo programacion...", "cyan");
        }
    } else {
        progStart = 0;
        esperandoLiberar = false;
    }

    if (!modoprog) {
        if (millis() - t > 10000) {
            imprimir("Lectura MQ-6: " + String(mq6));
            t = millis();
        }

        // --- Sensor de gas (envía señal RF al detectar)
        if (mq6 == LOW && !variableDetectada) {
            enviarPorLora("ALERTA: Gas detectado");

            // ✅ Enviar señal RF de gas
            transmisorRF.send(CODIGO_RF_GAS, RF_BITS);
            Serial.println("[RF] Señal GAS enviada: " + String(CODIGO_RF_GAS));

            mostrarImagenPorTipoSensor(0);
            blinkLed();
            variableDetectada = true;
            imprimir("¡Gas detectado! Alerta enviada.", "rojo");
        } else if (mq6 == HIGH) {
            variableDetectada = false;
        }

        // --- Botón de prueba (envía señal RF al pulsar)
        if (estadoBoton == LOW && botonAnterior == HIGH) {
            enviarPorLora("PRUEBA: Botón pulsado");

            // ✅ Enviar señal RF de prueba
            transmisorRF.send(CODIGO_RF_PRUEBA, RF_BITS);
            Serial.println("[RF] Señal PRUEBA enviada: " + String(CODIGO_RF_PRUEBA));

            blinkLed();
            mostrarImagen(img2);
            imprimir("Prueba RF enviada", "verde");
        }

        botonAnterior = estadoBoton;
    }

    if (!modoprog && imagenMostrada == 2 && millis() - tiempoUltimaImagen >= 10000) {
        mostrarInicio();
    }
}

void setup() {
    Serial.begin(115200);
    EEPROM.begin(EEPROM_SIZE);
    EEPROM.get(0, activo);

    if (activo.id < 1000 || activo.id > 9999 ||
        activo.zona < 1 || activo.zona > 510 ||
        activo.tipo < 0 || activo.tipo > 9) {
        imprimir("Datos EEPROM inválidos, restaurando valores por defecto", "amarillo");
        activo = {9999, 1, 9};
        EEPROM.put(0, activo);
        EEPROM.commit();
    }

    imprimir("Configuración inicial:", "verde");
    imprimir("ID: " + String(activo.id));
    imprimir("Zona: " + String(activo.zona));
    imprimir("Tipo: " + String(activo.tipo));

    pinMode(MQ6_PIN, INPUT_PULLUP);         // MQ6 → pin 48
    pinMode(LED_PIN, OUTPUT);               // LED
    pinMode(PIN_PROG, INPUT_PULLUP);        // Botón de programación
    pinMode(BOTON_PRUEBA_PIN, INPUT_PULLUP);// Botón de prueba

    transmisorRF.enableTransmit(14);        // Pin para transmisión RF
    transmisorRF.setProtocol(1);
    transmisorRF.setPulseLength(350);

    Heltec.begin(true, false, true);
    mostrarInicio();

    imprimir("Sistema iniciado correctamente", "verde");
}

void loop() {
    if (!modoprog) {
        manejarEntradas();
    }
}
