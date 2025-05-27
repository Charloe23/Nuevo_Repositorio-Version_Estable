#include "Pantalla.h"
#include "interfaz.h"
#include "TransmisorRf.h"
#include "main.h"
#include <RCSwitch.h>


RCSwitch Transmisorrf = RCSwitch();

const char* codigosRF_Matriz[3][3] = {
    {"56700001", "33332002", "33333012"}, // 0, 2, 3
    {"33331013", "33334014", "33335015"}, // 1, 4, 5
    {"33336016", "33337017", "33339030"}  // 6, 7, 0
};

void enviarRF_Matriz(uint8_t fila, uint8_t columna, int zona, int tipoSensor, int id) {
    if (fila < 3 && columna < 3) {
        const char* codigo = codigosRF_Matriz[fila][columna];
        unsigned long codigoRF = strtoul(codigo, NULL, 10);
        Transmisorrf.send(codigoRF, 27);
        Serial.print("Código RF enviado: ");
        Serial.println(codigo);

        // Extraer el tipo de sensor real del cuarto dígito
        int tipoSensorReal = codigo[4] - '0';
        mostrarImagenPorTipoSensor(tipoSensorReal);
    }
}
