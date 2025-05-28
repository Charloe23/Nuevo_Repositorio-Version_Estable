    #include "Pantalla.h"
    #include "interfaz.h"
    #include "TransmisorRf.h"
    #include "main.h"
    #include <RCSwitch.h>
    #include <heltec.h>
    #include <EEPROM.h>
// --- RF
RCSwitch receptorRF = RCSwitch();
RCSwitch transmisorRF = RCSwitch();

// --- Códigos RF
#define CODIGO_RF_GAS 33330001
#define CODIGO_RF_PRUEBA 33330009
#define RF_BITS 27

// --- Variables
String Version = "3.1.1.1";
const int EEPROM_SIZE = sizeof(SENSOR);
boolean debug = true, variableDetectada = false, modoprog = false; 
SENSOR activo{-1, -1, -1};

// --- Pines (usar los definidos en main.h excepto BOTON_PRUEBA_PIN)
const int BOTON_PRUEBA_PIN = 2; // botón de prueba queda aquí
// LED_PIN, MQ6_PIN, prog están definidos en main.h
const int RECEPTOR_RF_PIN = 32;
const int TRANSMISOR_RF_PIN = 33;

unsigned long tiempoUltimaImagen = 0;
int imagenMostrada = 1;

// --- Imágenes externas
extern const unsigned char img1[], img2[], img3[], img4[], img5[], img6[], img7[], img8[];

// --- Funciones auxiliares
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
    Heltec.display->clear();
    Heltec.display->drawString(0, 0, "Enviando LoRa:");
    Heltec.display->drawString(0, 20, mensaje);
    Heltec.display->display();
    Serial.println("[LoRa] " + mensaje);
    delay(100);
}

void mostrarImagen(const unsigned char* imagen, int tipo) {
    Heltec.display->clear();
    Heltec.display->drawXbm(0, 0, 128, 64, imagen);
    Heltec.display->display();
    imagenMostrada = (tipo == 1) ? 1 : 2;
    if (tipo != 1) tiempoUltimaImagen = millis();
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

// --- Entradas locales
void manejarEntradas() {
    static unsigned long t = 0, progStart = 0;
    static bool esperandoLiberar = false;
    static bool botonAnterior = HIGH;

    int mq6 = digitalRead(MQ6_PIN);
    int progEstado = digitalRead(prog);
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

        // --- Alerta de gas
      if (mq6 == LOW && !variableDetectada) {
    enviarPorLora("ALERTA: Gas detectado");
    transmisorRF.send(CODIGO_RF_GAS, RF_BITS);  // <--- ARREGLADO
    delay(100);  // asegurar transmisión
    Serial.println("Enviando señal de gas: " + String(CODIGO_RF_GAS));
    mostrarImagenPorTipoSensor(0);
    blinkLed();
    variableDetectada = true;
    imprimir("¡Gas detectado! Alerta enviada.", "rojo");
} else if (mq6 == HIGH) {
    variableDetectada = false;
}


        // --- Botón de prueba
    if (estadoBoton == LOW && botonAnterior == HIGH) {
    enviarPorLora("PRUEBA: Botón pulsado");
    transmisorRF.send(CODIGO_RF_PRUEBA, RF_BITS);  // <--- ARREGLADO
    delay(100);  // asegurar transmisión
    Serial.println("Enviando señal de botón de prueba: " + String(CODIGO_RF_PRUEBA));
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

// --- Recepción RF
void manejarRecepcionRF() {
    if (receptorRF.available()) {
        unsigned long codigo = receptorRF.getReceivedValue();
        imprimir("RF recibido: " + String(codigo), "cyan");
        Serial.println("[DEBUG] Código recibido: " + String(codigo));

        if (codigo == CODIGO_RF_GAS) {
            mostrarImagen(img3);
            blinkLed();
            imprimir("¡Alerta RF recibida! Código de gas", "rojo");
        } else if (codigo == CODIGO_RF_PRUEBA) {
            mostrarImagen(img2);
            blinkLed();
            imprimir("Prueba RF recibida", "verde");
        }

        receptorRF.resetAvailable();
    }
}

// --- Setup
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

    pinMode(MQ6_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    pinMode(prog, INPUT_PULLUP);
    pinMode(BOTON_PRUEBA_PIN, INPUT_PULLUP);

    Heltec.begin(true, false, true);
    mostrarInicio();

    receptorRF.enableReceive(RECEPTOR_RF_PIN);
    transmisorRF.enableTransmit(TRANSMISOR_RF_PIN);

    imprimir("Receptor RF activado en pin " + String(RECEPTOR_RF_PIN), "cyan");
    imprimir("Transmisor RF configurado en pin " + String(TRANSMISOR_RF_PIN), "cyan");
    imprimir("Sistema iniciado correctamente", "verde");
}

// --- Loop principal
void loop() {
    if (!modoprog) {
        manejarEntradas();
        manejarRecepcionRF();
    }
}