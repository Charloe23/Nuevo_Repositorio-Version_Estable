#ifndef MAIN_H
#define MAIN_H

#include <Arduino.h>
#include <Keypad.h>
#include <EEPROM.h>
#include <AsyncTCP.h>
#include <RCSwitch.h>
#include "esp_task_wdt.h"
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>

// Pines
#define LED_PIN 35
#define MQ6_PIN 48
#define PIN_PROG 0
#define ROWS 3
#define COLS 3

// Configuración RF
const int RF_BITS = 24;

// Estructura de sensor
struct SENSOR {
  int id;
  int zona;
  int tipo;
  long codigoSensor;  // Código RF para detección de gas (ej. 33330125)
  long codigoPrueba;  // Código RF para botón de prueba (ej. 33339125)
};

// Variables y funciones externas
extern const char* TipoSensor[9][2];
extern boolean variableDetectada;
extern byte rowPins[ROWS];
extern byte colPins[COLS];
extern bool modoprog;
extern RCSwitch transmisorRF;
void imprimir(String m, String c="");
extern SENSOR activo;
void mostrarImagen(const unsigned char* imagen, int tipo = 2);

// Prototipos setup/loop
void setup();
void loop();

#endif // MAIN_H