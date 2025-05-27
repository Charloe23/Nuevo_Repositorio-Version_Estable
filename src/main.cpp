    #include "Pantalla.h"
    #include "interfaz.h"
    #include "TransmisorRf.h"
    #include "main.h"
    #include <RCSwitch.h>
    #include <heltec.h>
    #include <EEPROM.h>

    String Version = "3.1.1.1";
    const int EEPROM_SIZE = sizeof(SENSOR);

    boolean debug = true, variableDetectada = false, modoprog = false; 
    SENSOR activo{-1, -1, -1};

    const int BOTON_PRUEBA_PIN = 2;
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
    Heltec.display->clear();
    Heltec.display->drawString(0, 0, "Enviando LoRa:");
    Heltec.display->drawString(0, 20, mensaje);
    Heltec.display->display();

    // Aquí iría el código real para enviar por LoRa
    Serial.println("[LoRa] " + mensaje);
    delay(100);
    }

    void mostrarImagen(const unsigned char* imagen, int tipo) {
    Heltec.display->clear();
    Heltec.display->drawXbm(0, 0, 128, 64, imagen);
    Heltec.display->display();
    if (tipo == 1) {
    imagenMostrada = 1;
    } else {
    imagenMostrada = 2;
    tiempoUltimaImagen = millis();
    }
    }

    void mostrarInicio() {
    mostrarImagen(img1, 1);
    }

    void mostrarImagenPorTipoSensor(int tipoSensor) {
    switch (tipoSensor) {
    case 0: mostrarImagen(img3); break;
    case 1: mostrarImagen(img3); break;
    case 2: mostrarImagen(img5); break;
    case 3: 
    case 4: mostrarImagen(img8); break;
    case 5: 
    case 6: mostrarImagen(img6); break;
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
    int progEstado = digitalRead(prog);
    int estadoBoton = digitalRead(BOTON_PRUEBA_PIN);

    if (progEstado == LOW) {
    if (!progStart) progStart = millis();
    if (!modoprog && millis() - progStart >= 2000 && !esperandoLiberar) {
    modoprog = esperandoLiberar = true;
    entrarmodoprog();
    mostrarImagen(img4);
    if (!modoprog) imprimir("Entrando en modo programacion...", "cyan");
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

    if (mq6 == LOW && !variableDetectada) {
    enviarPorLora("ALERTA: Gas detectado");
    mostrarImagenPorTipoSensor(0);
    blinkLed();
    variableDetectada = true;
    imprimir("¡Gas detectado! Alerta enviada.", "rojo");
    } else if (mq6 == HIGH) {
    variableDetectada = false;
    }

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

    // Inicializar EEPROM
    EEPROM.begin(EEPROM_SIZE);

    // Leer configuración guardada
    EEPROM.get(0, activo);

    // Validar datos leídos
    if(activo.id < 1000 || activo.id > 9999 || 
    activo.zona < 1 || activo.zona > 510 ||
    activo.tipo < 0 || activo.tipo > 9) {
    imprimir("Datos EEPROM inválidos, restaurando valores por defecto", "amarillo");
    activo = {9999, 1, 9}; // Valores por defecto
    EEPROM.put(0, activo);
    EEPROM.commit();
    }

    imprimir("Configuración inicial:", "verde");
    imprimir("ID: " + String(activo.id));
    imprimir("Zona: " + String(activo.zona));
    imprimir("Tipo: " + String(activo.tipo));

    // Configurar pines
    pinMode(MQ6_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    pinMode(prog, INPUT_PULLUP);
    pinMode(BOTON_PRUEBA_PIN, INPUT_PULLUP);

    // Inicializar pantalla
    Heltec.begin(true, false, true);
    mostrarInicio();

    imprimir("Sistema iniciado correctamente", "verde");
    }

    void loop() {
    if(!modoprog) {
    manejarEntradas();
    }
    }