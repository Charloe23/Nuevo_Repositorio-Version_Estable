#include "Pantalla.h"
#include <heltec.h>

int imagenActual = 0;

extern const unsigned char img1[];
extern const unsigned char img2[];
extern const unsigned char img3[];
extern const unsigned char img4[];
extern const unsigned char img5[];
extern const unsigned char img6[];

/* 
// Función para alternar imágenes (opcional)
void alternarImagen() {
    static unsigned long tiempoUltimaImagen = 0;
    unsigned long tiempoActual = millis();
    if (tiempoActual - tiempoUltimaImagen >= 500) { 
        imagenActual = (imagenActual + 1) % 6; 
        tiempoUltimaImagen = tiempoActual;
    }

    Heltec.display->clear();
    switch(imagenActual) {
        case 0: Heltec.display->drawXbm(0, 0, 128, 64, img1); break;
        case 1: Heltec.display->drawXbm(0, 0, 128, 64, img2); break;
        case 2: Heltec.display->drawXbm(0, 0, 128, 64, img3); break;
        case 3: Heltec.display->drawXbm(0, 0, 128, 64, img4); break;
        case 4: Heltec.display->drawXbm(0, 0, 128, 64, img5); break;
        case 5: Heltec.display->drawXbm(0, 0, 128, 64, img6); break;
    }
    Heltec.display->display();
}
*/
