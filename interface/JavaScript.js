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

    // Mostrar resumen al cargar
    mostrarResumen();
});

function mostrarCargando() {
    const pantalla = document.getElementById("pantalla-carga");
    pantalla.style.display = "flex";
}

function ocultarCargando() {
    const pantalla = document.getElementById("pantalla-carga");
    pantalla.style.display = "none";
}

function showContent(contentId) {
    const contenido = document.getElementById("contenido");
    const timerSection = document.getElementById("timer");

    // Ocultar secciones
    contenido.innerHTML = "";

    if (contentId === 'id_restore') {
        contenido.innerHTML = `
        <div id="form-parametros">
            <h2>Formulario de Parámetros</h2>
            <form id="form-parametros-form">
                <label for="alarm-id">ID de la Alarma (4 dígitos):</label>
                <input type="number" id="alarm-id" name="alarm-id" min="0" max="9999" required>
                <div id="error-alarm-id" class="error-message">Debe ingresar exactamente 4 dígitos (0000-9999)</div>

                <label for="zona">Zona (001 - 510):</label>
                <input type="number" id="zona" name="zona" min="1" max="510" required>
                <div id="error-zona" class="error-message">Debe ingresar exactamente 3 dígitos (001-510)</div>

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

        // Validación en tiempo real para alarm-id (4 dígitos exactos)
        document.getElementById("alarm-id").addEventListener("input", function(e) {
            const errorElement = document.getElementById("error-alarm-id");
            // Limitar a 4 dígitos
            if (this.value.length > 4) {
                this.value = this.value.slice(0, 4);
            }
            if(this.value.length !== 4 || !/^\d+$/.test(this.value)) {
                errorElement.style.display = "block";
            } else {
                errorElement.style.display = "none";
            }
        });

        // Validación en tiempo real para zona (3 dígitos exactos, 001-510)
        document.getElementById("zona").addEventListener("input", function(e) {
            const errorElement = document.getElementById("error-zona");
            // Limitar a 3 dígitos
            if (this.value.length > 3) {
                this.value = this.value.slice(0, 3);
            }
            // Validar que tenga exactamente 3 dígitos y esté en el rango correcto
            const zonaNum = parseInt(this.value, 10);
            if(isNaN(zonaNum) || zonaNum < 1 || zonaNum > 510 || !/^\d{3}$/.test(this.value)) {
                errorElement.style.display = "block";
            } else {
                errorElement.style.display = "none";
            }
        });

        // Cargar valores actuales desde la EEPROM
        mostrarCargando();
        fetch("/leer-parametros")
            .then(response => response.json())
            .then(data => {
                if(data.id) document.getElementById("alarm-id").value = data.id.toString().padStart(4, '0');
                if(data.zona) document.getElementById("zona").value = data.zona.toString().padStart(3, '0');
                if(data.tipo) document.getElementById("sensor").value = data.tipo;
                ocultarCargando();
            })
            .catch((error) => {
                 console.error("Error al cargar parámetros:", error);
                 alert("Error al cargar parámetros: " + error.message);
                 ocultarCargando();
            });

        document.getElementById("form-parametros-form").addEventListener("submit", function(event) {
            event.preventDefault();
            const alarmId = document.getElementById("alarm-id").value;
            const zona = document.getElementById("zona").value;
            const sensor = document.getElementById("sensor").value;

            // Validación adicional antes de enviar
            const alarmIdNum = parseInt(alarmId, 10);
            if (isNaN(alarmIdNum) || alarmIdNum < 0 || alarmIdNum > 9999 || alarmId.length !== 4) {
                alert("El ID de alarma debe ser un número de exactamente 4 dígitos (0000-9999)");
                return;
            }

            // Validar zona como número, rango y exactamente 3 dígitos
            const zonaNum = parseInt(zona, 10);
            if(isNaN(zonaNum) || zonaNum < 1 || zonaNum > 510 || zona.length !== 3) {
                alert("La zona debe ser un número entre 001 y 510 (exactamente 3 dígitos)");
                return;
            }

            mostrarCargando();

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
                ocultarCargando();
                if(data.status === "success") {
                    const mensajeRF = `${alarmId}${zona.toString().padStart(3, '0')}${sensor}`;
                    alert(`Datos guardados en EEPROM:\nID: ${alarmId}\nZona: ${zona}\nTipo: ${sensor}\n\nSeñal RF: ${mensajeRF}`);

                    // Mostrar en el monitor
                    const monitor = document.getElementById("monitor");
                    if (monitor) {
                        monitor.innerHTML += `<p>ID: ${alarmId} Zona: ${zona.toString().padStart(3, '0')} Tipo: ${sensor}</p>`;
                        monitor.innerHTML += `<p>Enviando Señal RF: ${mensajeRF}</p>`;
                    }
                } else {
                    alert("Error al guardar en EEPROM: " + (data.message || ""));
                }
            })
            .catch(error => {
                ocultarCargando();
                alert("Error de conexión: " + error.message);
            });
        });
    } else if (contentId === 'timer') {
        contenido.innerHTML = `
        <div class="pruebas-container">
            <h2>Pruebas RF</h2>
            <div class="rf-buttons">
                <button onclick="leerRF()" class="btn-rf">Leer Señal RF</button>
            </div>
            <div id="rf-display" class="rf-display"></div>

            <h2>Selección de Imágenes</h2>
            <div class="image-buttons">
                <button onclick="seleccionarImagen(1)">Imagen 1</button>
                <button onclick="seleccionarImagen(2)">Imagen 2</button>
                <button onclick="seleccionarImagen(3)">Imagen 3</button>
                <button onclick="seleccionarImagen(4)">Imagen 4</button>
                <button onclick="seleccionarImagen(5)">Imagen 5</button>
                <button onclick="seleccionarImagen(6)">Imagen 6</button>
                <button onclick="seleccionarImagen(7)">Imagen 7</button>
                <button onclick="seleccionarImagen(8)">Imagen 8</button>
                <button onclick="seleccionarImagen(9)">Imagen 9</button>
            </div>
        </div>
        `;
        ocultarCargando();
    } else if (contentId === 'pruebas') {
         contenido.innerHTML = `
         <div class="pruebas-container">
             <h2>Pruebas RF (Sección 'pruebas')</h2>
             <p>Contenido específico para la sección 'pruebas'.</p>
         </div>
         `;
         ocultarCargando();
    }
}

function leerRF() {
    const rfDisplay = document.getElementById("rf-display");

    rfDisplay.innerHTML = `
    <div class="rf-image-container">
        <img src="esperando.png" alt="Enviando señal"><br>
        <small>Enviando señal RF...</small>
    </div>
    `;

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
            <div class="rf-image-container">
                <img src="rf-ok.png" alt="Señal enviada"><br>
                <small>Señal RF enviada</small>
            </div>
            <div class="rf-image-container">
                <img src="rf-ok.png" alt="ID"><br>
                <small>ID: ${data.id || '?'}</small>
            </div>
            <div class="rf-image-container">
                <img src="rf-ok.png" alt="Zona"><br>
                <small>Zona: ${data.zona || '?'}</small>
            </div>
            <div class="rf-image-container">
                <img src="rf-ok.png" alt="Tipo"><br>
                <small>Tipo: ${data.tipo || '?'}</small>
            </div>
            `;

            const monitor = document.getElementById("monitor");
            if (monitor) {
                monitor.innerHTML += `<p>ID: ${data.id} Zona: ${data.zona} Tipo: ${data.tipo}</p>`;
                const mensajeRF = `${data.id}${data.zona.toString().padStart(3, '0')}${data.tipo}`;
                monitor.innerHTML += `<p>Enviando Señal RF: ${mensajeRF}</p>`;
            }
        } else {
            rfDisplay.innerHTML = `<div class="rf-image-container" style="grid-column: 1 / -1;">
                <img src="rf-error.png" alt="Error"><br>
                <small>Error: ${data.message || "Error desconocido"}</small>
            </div>`;
        }
    })
    .catch(error => {
        rfDisplay.innerHTML = `<div class="rf-image-container" style="grid-column: 1 / -1;">
            <img src="rf-error.png" alt="Error"><br>
            <small>Error de conexión: ${error.message}</small>
        </div>`;
    });
}

function enviarRF() {
    mostrarCargando();

    fetch("/leer-parametros")
        .then(response => response.json())
        .then(data => {
            if(data.id && data.zona && data.tipo) {
                const id = data.id.toString().padStart(4, '0');
                const zona = data.zona.toString().padStart(3, '0');
                const tipo = data.tipo;
                const mensajeRF = `${id}${zona}${tipo}`;

                const monitor = document.getElementById("monitor");
                if (monitor) {
                    monitor.innerHTML += `<p>ID: ${id} Zona: ${zona} Tipo: ${tipo}</p>`;
                    monitor.innerHTML += `<p>Enviando Señal RF: ${mensajeRF}</p>`;
                }

                fetch("/enviar-rf", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        comando: "enviar_rf",
                        id: id,
                        zona: zona,
                        tipo: tipo
                    })
                })
                .then(response => response.json())
                .then(data => {
                    ocultarCargando();
                    if(data.status === "success") {
                        alert(`Señal RF enviada correctamente: ${mensajeRF}`);
                    } else {
                        alert("Error al enviar señal RF: " + (data.message || ""));
                    }
                })
                .catch(error => {
                    ocultarCargando();
                    alert("Error de conexión: " + error.message);
                });
            } else {
                ocultarCargando();
                alert("No se encontraron parámetros configurados");
            }
        })
        .catch(error => {
            ocultarCargando();
            alert("Error al leer parámetros: " + error.message);
        });
}

function seleccionarImagen(numeroImagen) {
    mostrarCargando();

    fetch("/cambiar-imagen", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({imagen: numeroImagen})
    })
    .then(response => response.json())
    .then(data => {
        ocultarCargando();
        if(data.status === "success") {
            alert(`Imagen ${numeroImagen} seleccionada correctamente`);

            const monitor = document.getElementById("monitor");
            if (monitor) {
                monitor.innerHTML += `<p>Imagen ${numeroImagen} seleccionada</p>`;
            }
        } else {
            alert("Error al cambiar imagen: " + (data.message || ""));
        }
    })
    .catch(error => {
        ocultarCargando();
        alert("Error de conexión: " + error.message);
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
        <div id="monitor" class="monitor-datos">
            <h3>Monitor de Señales</h3>
            <div class="monitor-content"></div>
        </div>
    </div>
    `;

    fetch("/leer-parametros")
        .then(response => response.json())
        .then(data => {
            document.getElementById("resumen-display").innerHTML = `
            <div class="dato-item">
                <span class="dato-label">ID Alarma:</span>
                <span class="dato-valor">${data.id ? data.id.toString().padStart(4, '0') : 'No configurado'}</span>
            </div>
            <div class="dato-item">
                <span class="dato-label">Zona:</span>
                <span class="dato-valor">${data.zona ? data.zona.toString().padStart(3, '0') : 'No configurada'}</span>
            </div>
            <div class="dato-item">
                <span class="dato-label">Tipo Sensor:</span>
                <span class="dato-valor">${getTipoSensorNombre(data.tipo) || 'No configurado'}</span>
            </div>
            `;
            ocultarCargando();
        })
        .catch(() => ocultarCargando());
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
                    pantallaCarga.style.display = "none";
                    location.reload();
                }, 5000);
            })
            .catch(() => {
                pantallaCarga.style.display = "none";
                alert("No se pudo reiniciar la tarjeta. Intente nuevamente.");
            });
    }
}