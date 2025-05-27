#ifndef INTERFAZ_H
    #define INTERFAZ_H
    #include "main.h"

    extern AsyncWebServer server;
    void entrarmodoprog();
    void endpointsMProg(void *pvParameters);
    void enviarPorLora(String mensaje);
 

#endif // INTERFAZ_H

//pio run --target uploadfs    comando que debe ser abierto en una terminal de pio para poder cargar la app