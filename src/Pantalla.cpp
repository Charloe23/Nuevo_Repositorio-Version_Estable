#include "Pantalla.h"
#include <heltec.h>

//unsigned long tiempoUltimaImagen = 0;
int imagenActual = 0;

extern const unsigned char img1[];
extern const unsigned char img2[];
extern const unsigned char img3[];
extern const unsigned char img4[];
extern const unsigned char img5[];
extern const unsigned char img6[];

/*void alternarImagen() {
    unsigned long tiempoActual = millis();
    if (tiempoActual - tiempoUltimaImagen >= 500) { 
        imagenActual = (imagenActual + 1) % 6; 
        tiempoUltimaImagen = tiempoActual;
    }

    Heltec.display->clear();
    if (imagenActual == 0) {
        Heltec.display->drawXbm(0, 0, 128, 64, img1);
    } else if (imagenActual == 1) {
        Heltec.display->drawXbm(0, 0, 128, 64, img2);
    } else if (imagenActual == 2) {
        Heltec.display->drawXbm(0, 0, 128, 64, img3);
    } else if (imagenActual == 3) {
        Heltec.display->drawXbm(0, 0, 128, 64, img4);
    } else if (imagenActual == 4) {
        Heltec.display->drawXbm(0, 0, 128, 64, img5);
    } else {
        Heltec.display->drawXbm(0, 0, 128, 64, img6);
    }
    Heltec.display->display();
}*/