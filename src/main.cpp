#include "Pantalla.h"
#include "interfaz.h"
#include "TransmisorRf.h"
#include "main.h"
#include <RCSwitch.h>
#include <heltec.h>
#include <EEPROM.h>


RCSwitch transmisorRF;


String Version = "3.7.8.16";
const int EEPROM_SIZE = sizeof(SENSOR);
boolean debug = true, variableDetectada = false, modoprog = false; 
SENSOR activo{-1, -1, -1};


const int BOTON_PRUEBA_PIN = 2;
const int TRANSMISOR_RF_PIN = 33; 

unsigned long tiempoUltimaImagen = 0;
int imagenMostrada = 1;


extern const unsigned char img1[], img2[], img3[], img4[], img5[], img6[], img7[], img8[];

void imprimir(String m, String c ) {
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
    
    // Enviar por RF si es una alerta importante
    if (mensaje.indexOf("ALERTA:") >= 0) {
        transmisorRF.send(CODIGO_RF_GAS, RF_BITS);
        Serial.println("[RF] Señal de alerta enviada: " + String(CODIGO_RF_GAS));
    } else if (mensaje.indexOf("PRUEBA:") >= 0) {
        transmisorRF.send(CODIGO_RF_PRUEBA, RF_BITS);
        Serial.println("[RF] Señal de prueba enviada: " + String(CODIGO_RF_PRUEBA));
    }
}

void mostrarImagen(const unsigned char* imagen, int tipo) {
    Heltec.display->clear();
    Heltec.display->drawXbm(0, 0, 128, 64, imagen);
    Heltec.display->display();
    imagenMostrada = tipo;
    if (tipo == 2) tiempoUltimaImagen = millis();
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

    // Modo programación
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

        // --- Alerta de gas con RF
        if (mq6 == LOW && !variableDetectada) {
            enviarPorLora("ALERTA: Gas detectado");
            mostrarImagenPorTipoSensor(0);
            blinkLed();
            variableDetectada = true;
            imprimir("¡Gas detectado! Alerta enviada.", "rojo");
        } else if (mq6 == HIGH) {
            variableDetectada = false;
        }

        // --- Botón de prueba con RF
        if (estadoBoton == LOW && botonAnterior == HIGH) {
            enviarPorLora("PRUEBA: Botón pulsado");
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

    // Configuración de pines
    pinMode(MQ6_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    pinMode(PIN_PROG, INPUT_PULLUP);
    pinMode(BOTON_PRUEBA_PIN, INPUT_PULLUP);

    // Configuración RF
    transmisorRF.enableTransmit(TRANSMISOR_RF_PIN);
    transmisorRF.setProtocol(1);
    transmisorRF.setPulseLength(350);

    // Inicialización OLED
    Heltec.begin(true, false, true);
    mostrarInicio();

    imprimir("Sistema iniciado correctamente", "verde");
    imprimir("Transmisor RF configurado en pin " + String(TRANSMISOR_RF_PIN), "cyan");
}

void loop() {
    if (!modoprog) {
        manejarEntradas();
    }
}