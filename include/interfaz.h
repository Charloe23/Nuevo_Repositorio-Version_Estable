#ifndef INTERFAZ_H
    #define INTERFAZ_H
    #include "main.h"
    extern const int CODIGO_RF_PRUEBA;
    extern const int RF_BITS;
    extern AsyncWebServer server;
    void entrarmodoprog();
    void endpointsMProg(void *pvParameters);
    void enviarPorLora(String mensaje);
 

#endif // INTERFAZ_H
