// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    const menuButton = document.getElementById('Menu');
    const slidingMenu = document.getElementById('menu');
    const parametros = document.getElementById('parametros');
    const form = document.getElementById("form-parametros-form");
    const alarmIdInput = document.getElementById("alarm-id");

    if (menuButton && slidingMenu) {
        menuButton.addEventListener('click', function (e) {
            e.stopPropagation();
            slidingMenu.classList.toggle('abierto');
        });

        document.addEventListener('click', function (e) {
            if (slidingMenu.classList.contains('abierto') &&
                !slidingMenu.contains(e.target) &&
                e.target !== menuButton) {
                slidingMenu.classList.remove('abierto');
            }
        });
    }

    // Cerrar menú al hacer clic en submenú
    document.querySelectorAll('.submenu a').forEach(item => {
        item.addEventListener('click', function () {
            slidingMenu.classList.remove('abierto');
        });
    });
});

function mostrarCargando() {
    const pantalla = document.getElementById("pantalla-carga");
    pantalla.style.display = "flex";
    setTimeout(() => {
        pantalla.style.display = "none";
    }, 3000);
}

function showContent(contentId) {
    const contenido = document.getElementById("contenido");
    const timerSection = document.getElementById("timer");

    // Ocultar secciones
    contenido.innerHTML = "";
    timerSection.style.display = "none";

    if (contentId === 'id_restore') {
        contenido.innerHTML = `
        <div id="form-parametros">
            <h2>Formulario de Parámetros</h2>
            <form id="form-parametros-form">
                <label for="alarm-id">ID de la Alarma (4 dígitos):</label>
                <input type="text" id="alarm-id" name="alarm-id" maxlength="4" pattern="\\d{4}" required>

                <label for="zona">Zona (1 - 510):</label>
                <input type="number" id="zona" name="zona" min="1" max="510" required>

                <label for="sensor">Tipo de Sensor:</label>
                <select id="sensor" name="sensor" required>
                    <option value="" disabled selected>Seleccione un tipo</option>
                    <option value="0">Gas LP</option>
                    <option value="1">1-Humo</option>
                    <option value="2">2-Movimiento</option>
                    <option value="3">3-Puerta</option>
                    <option value="4">4-Ventana</option>
                    <option value="5">5-Cortina</option>
                    <option value="6">6-Boton Fisico</option>
                    <option value="7">7-Palanca</option>
                    <option value="8">8-</option>
                    <option value="9">9-Test</option>
                </select>

                <button type="submit" class="btn-guardar">Guardar en EEPROM</button>
            </form>
        </div>
        `;

        // Cargar valores actuales desde la EEPROM
        fetch("/leer-parametros")
            .then(response => response.json())
            .then(data => {
                if(data.id) document.getElementById("alarm-id").value = data.id;
                if(data.zona) document.getElementById("zona").value = data.zona;
                if(data.tipo) document.getElementById("sensor").value = data.tipo;
            });

        document.getElementById("form-parametros-form").addEventListener("submit", function(event) {
            event.preventDefault();
            const alarmId = document.getElementById("alarm-id").value;
            const zona = document.getElementById("zona").value;
            const sensor = document.getElementById("sensor").value;

            // Validación adicional
            if(alarmId.length !== 4 || isNaN(alarmId)) {
                alert("El ID de alarma debe ser exactamente 4 dígitos numéricos");
                return;
            }

            if(zona < 1 || zona > 510) {
                alert("La zona debe estar entre 1 y 510");
                return;
            }

            // Enviar datos al servidor
            fetch("/guardar-parametros", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `id=${alarmId}&zona=${zona}&tipo=${sensor}`
            })
            .then(response => response.json())
            .then(data => {
                if(data.status === "success") {
                    alert(`Datos guardados en EEPROM:\nID: ${alarmId}\nZona: ${zona}\nTipo: ${sensor}`);
                } else {
                    alert("Error al guardar en EEPROM: " + (data.message || ""));
                }
            })
            .catch(error => {
                alert("Error de conexión: " + error.message);
            });
        });
    } else if (contentId === 'timer') {
        timerSection.style.display = "block";
    }
}

function leerRF() {
    const rfDisplay = document.getElementById("rf-display");

    rfDisplay.innerHTML = `
    <div style="text-align: center;">
    <img src="esperando.png" alt="Enviando señal" style="width: 80px;"><br><small>Enviando señal RF...</small>
    </div>
    `;

    // Enviar comando para transmitir RF
    fetch("/enviar-rf-prueba", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({modo: "prueba"})
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === "success") {
            rfDisplay.innerHTML = `
            <div style="text-align: center;">
            <img src="rf-ok.png" alt="Señal enviada" style="width: 80px;"><br><small>Señal RF enviada</small>
            </div>
            <div style="text-align: center;">
            <img src="rf-ok.png" alt="ID" style="width: 80px;"><br><small>ID: ${data.id || '?'}</small>
            </div>
            <div style="text-align: center;">
            <img src="rf-ok.png" alt="Zona" style="width: 80px;"><br><small>Zona: ${data.zona || '?'}</small>
            </div>
            <div style="text-align: center;">
            <img src="rf-ok.png" alt="Tipo" style="width: 80px;"><br><small>Tipo: ${data.tipo || '?'}</small>
            </div>
            `;
        } else {
            rfDisplay.innerHTML = "<p style='color:red;'>Error al enviar señal RF: " + (data.message || "") + "</p>";
        }
    })
    .catch(error => {
        rfDisplay.innerHTML = "<p style='color:red;'>Error de conexión: " + error.message + "</p>";
    });
}

function mostrarResumen() {
    const contenido = document.getElementById("contenido");
    contenido.innerHTML = `
    <div class="resumen-box">
        <h2>📡 Resumen de Lecturas</h2>
        <div id="resumen-display" class="resumen-datos">
            <p>Cargando datos actuales...</p>
        </div>
    </div>
    `;

    // Obtener datos actuales
    fetch("/leer-parametros")
        .then(response => response.json())
        .then(data => {
            document.getElementById("resumen-display").innerHTML = `
            <div class="dato-item">
                <span class="dato-label">ID Alarma:</span>
                <span class="dato-valor">${data.id || 'No configurado'}</span>
            </div>
            <div class="dato-item">
                <span class="dato-label">Zona:</span>
                <span class="dato-valor">${data.zona || 'No configurada'}</span>
            </div>
            <div class="dato-item">
                <span class="dato-label">Tipo Sensor:</span>
                <span class="dato-valor">${getTipoSensorNombre(data.tipo) || 'No configurado'}</span>
            </div>
            `;
        });
}

function getTipoSensorNombre(tipo) {
    const tipos = {
        "0": "Gas LP",
        "1": "Humo",
        "2": "Movimiento",
        "3": "Puerta",
        "4": "Ventana",
        "5": "Cortina",
        "6": "Botón Físico",
        "7": "Palanca",
        "8": "Sin definir",
        "9": "Test"
    };
    return tipos[tipo] || "Desconocido";
}

function salir() {
    if(confirm("¿Está seguro que desea salir y reiniciar la tarjeta? El LED se apagará.")) {
        const contenido = document.getElementById("contenido");
        const pantallaCarga = document.getElementById("pantalla-carga");

        contenido.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <h2>🔄 Reiniciando tarjeta...</h2>
            <p>La tarjeta se reiniciará, el LED se apagará y volverá al modo normal</p>
        </div>
        `;
        pantallaCarga.style.display = "flex";

        fetch("/reiniciar", { method: "POST" })
            .then(() => {
                setTimeout(() => {
                    location.reload();
                }, 5000);
            })
            .catch(() => {
                pantallaCarga.style.display = "none";
                alert("No se pudo reiniciar la tarjeta. Intente nuevamente.");
            });
    }
}