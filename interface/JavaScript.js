document.addEventListener('DOMContentLoaded', function () {
    const menuButton = document.getElementById('Menu');
    const slidingMenu = document.getElementById('menu');
    const body = document.body;
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (menuButton && slidingMenu) {
        menuButton.addEventListener('click', function (e) {
            e.stopPropagation();
            slidingMenu.classList.toggle('abierto');
            menuButton.classList.toggle('abierto');
            body.classList.toggle('menu-open');
        });

        document.addEventListener('click', function (e) {
            if (slidingMenu.classList.contains('abierto') &&
                !slidingMenu.contains(e.target) &&
                e.target !== menuButton &&
                !menuButton.contains(e.target) &&
                !e.target.closest('.menu-toggle')) {
                slidingMenu.classList.remove('abierto');
                menuButton.classList.remove('abierto');
                body.classList.remove('menu-open');
            }
        });
    }

    document.querySelectorAll('.submenu a').forEach(item => {
        item.addEventListener('click', function () {
            setTimeout(() => {
                slidingMenu.classList.remove('abierto');
                menuButton.classList.remove('abierto');
                body.classList.remove('menu-open');
            }, 100);
        });
    });

    // Mostrar resumen al cargar la página por primera vez
    mostrarResumen();
});


function mostrarCargando() {
    const pantalla = document.getElementById("loadingOverlay");
    if (pantalla) {
        pantalla.style.display = "flex";
    }
}

function ocultarCargando() {
    const pantalla = document.getElementById("loadingOverlay");
    if (pantalla) {
        pantalla.style.display = "none";
    }
}

function showContent(contentId) {
    const contenido = document.getElementById("contenido");
    if (!contenido) {
        console.error("Contenedor 'contenido' no encontrado.");
        return;
    }
    contenido.innerHTML = "";

    if (contentId === 'parametros') {
        contenido.innerHTML = `
        <div id="form-parametros">
            <h2>Configurar Parámetros del Sensor</h2>
            <form id="form-parametros-form">
                <label for="alarm-id">ID de la Alarma (4 dígitos):</label>
                <input type="number" id="alarm-id" name="alarm-id" min="0" max="9999" required placeholder="Ej: 1234">
                <div id="error-alarm-id" class="error-message">Debe ingresar exactamente 4 dígitos (0000-9999).</div>

                <label for="zona">Zona (001 - 510):</label>
                <input type="number" id="zona" name="zona" min="1" max="510" required placeholder="Ej: 001">
                <div id="error-zona" class="error-message">Debe ingresar exactamente 3 dígitos (001-510).</div>

                <label for="sensor">Tipo de Sensor:</label>
                <select id="sensor" name="sensor" required>
                    <option value="" disabled selected>Seleccione un tipo de sensor</option>
                    <option value="0">0 - Gas LP</option>
                    <option value="1">1 - Humo</option>
                    <option value="2">2 - Movimiento</option>
                    <option value="3">3 - Puerta</option>
                    <option value="4">4 - Ventana</option>
                    <option value="5">5 - Cortina</option>
                    <option value="6">6 - Botón Físico</option>
                    <option value="7">7 - Palanca</option>
                    <option value="8">8 - Otros / Sin definir</option>
                    <option value="9">9 - Test</option>
                </select>

                <button type="submit" class="btn-guardar"><i class="fas fa-save"></i> Guardar en EEPROM</button>
            </form>
        </div>
        `;

        document.getElementById("alarm-id").addEventListener("input", function(e) {
            const errorElement = document.getElementById("error-alarm-id");
            if (this.value.length > 4) {
                this.value = this.value.slice(0, 4);
            }
            if(this.value.length !== 4 || !/^\d+$/.test(this.value)) {
                errorElement.style.display = "block";
            } else {
                errorElement.style.display = "none";
            }
        });

        document.getElementById("zona").addEventListener("input", function(e) {
            const errorElement = document.getElementById("error-zona");
            if (this.value.length > 3) {
                this.value = this.value.slice(0, 3);
            }
            const zonaNum = parseInt(this.value, 10);
            if(isNaN(zonaNum) || zonaNum < 1 || zonaNum > 510 || this.value.length !== 3) {
                errorElement.style.display = "block";
            } else {
                errorElement.style.display = "none";
            }
        });


        mostrarCargando();
        fetch("/leer-parametros")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if(data.id !== undefined) document.getElementById("alarm-id").value = data.id.toString().padStart(4, '0');
                if(data.zona !== undefined) document.getElementById("zona").value = data.zona.toString().padStart(3, '0');
                if(data.tipo !== undefined) document.getElementById("sensor").value = data.tipo;
                // Eliminamos las líneas que intentaban cargar los valores de codigoSensor y codigoPrueba
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
            // Eliminamos las constantes codigoSensor y codigoPrueba

            const alarmIdNum = parseInt(alarmId, 10);
            if (isNaN(alarmIdNum) || alarmIdNum < 0 || alarmIdNum > 9999 || alarmId.length !== 4) {
                alert("El ID de alarma debe ser un número de exactamente 4 dígitos (0000-9999).");
                return;
            }

            const zonaNum = parseInt(zona, 10);
            if(isNaN(zonaNum) || zonaNum < 1 || zonaNum > 510 || zona.length !== 3) {
                alert("La zona debe ser un número entre 001 y 510 (exactamente 3 dígitos).");
                return;
            }

            mostrarCargando();
            // Asegúrate de que los nombres de los campos coincidan con los que espera el backend
            // Eliminamos el envío de codigoSensor y codigoPrueba en el body
            // Modificar la parte del código donde se hace el fetch para guardar parámetros
fetch("/guardar-parametros", {
    method: "POST",
    headers: {
        "Content-Type": "application/json", // Cambiar a JSON
    },
    body: JSON.stringify({ // Enviar como objeto JSON
        id: alarmId,
        zona: zona,
        tipo: sensor,
        codigoSensor: codigoSensor,
        codigoPrueba: codigoPrueba
    })
})
.then(response => {
    if (!response.ok) {
        // Intentar obtener más detalles del error
        return response.text().then(text => {
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
        });
    }
    return response.json();
})
.catch(error => {
    console.error("Error completo:", error);
    ocultarCargando();
    alert(`⚠️ Error detallado: ${error.message}`);
    agregarMensajeMonitor(`Error completo al guardar: ${error.stack}`, true);
});
        });

    } else if (contentId === 'pruebas-rf') {
        contenido.innerHTML = `
        <div class="pruebas-container">
            <h2><i class="fas fa-broadcast-tower"></i> Pruebas de Señal RF</h2>
            <div class="rf-buttons">
                <button onclick="leerRF()" class="btn-rf"><i class="fas fa-wifi"></i> Leer y Enviar RF</button>
            </div>
            <div id="rf-display" class="rf-display"></div>

            <hr>

            <h2><i class="fas fa-images"></i> Selección de Imágenes</h2>
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
    }
}

function leerRF() {
    const rfDisplay = document.getElementById("rf-display");
    if (!rfDisplay) {
        console.error("Contenedor 'rf-display' no encontrado.");
        return;
    }

    rfDisplay.innerHTML = `
    <div class="rf-image-container sending" style="grid-column: 1 / -1;">
        <img src="esperando.png" alt="Enviando señal">
        <small>Enviando señal RF...</small>
    </div>
    `;
    agregarMensajeMonitor("Intentando leer parámetros y enviar señal RF de prueba...");

    // Primero, leer los parámetros guardados
    fetch("/leer-parametros")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        // Modificar la parte del código que maneja la respuesta exitosa
.then(data => {
    ocultarCargando();
    if(data.status === "success") {
        alert(`✅ ¡Parámetros guardados con éxito!`);
        agregarMensajeMonitor(`Parámetros guardados correctamente`);
        
        // Forzar una nueva lectura de parámetros para actualizar el resumen
        return fetch("/leer-parametros")
            .then(response => response.json())
            .then(updatedData => {
                // Actualizar manualmente los campos en el resumen
                const resumenDisplay = document.getElementById("resumen-display");
                if (resumenDisplay) {
                    const codigoSensorElement = resumenDisplay.querySelector(".dato-item:nth-child(4) .dato-valor");
                    const codigoPruebaElement = resumenDisplay.querySelector(".dato-item:nth-child(5) .dato-valor");
                    
                    if (codigoSensorElement) {
                        codigoSensorElement.innerHTML = updatedData.codigoSensor || '<span class="not-set">No configurado</span>';
                    }
                    if (codigoPruebaElement) {
                        codigoPruebaElement.innerHTML = updatedData.codigoPrueba || '<span class="not-set">No configurado</span>';
                    }
                }
            });
    } else {
        throw new Error(data.message || "Error desconocido del servidor");
    }
})
        .then(response => {
            if (!response.ok) {
                // Intenta leer el mensaje de error del servidor si es JSON
                return response.json().then(errorData => {
                    throw new Error(`HTTP error status: ${response.status}, Message: ${errorData.message || response.statusText}`);
                }).catch(() => {
                    // Si no es JSON, usa el statusText por defecto
                    throw new Error(`HTTP error status: ${response.status}, Message: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if(data.status === "success") {
                // Mostrar el código RF que realmente se envió desde el ESP32 (si lo devuelve)
                const codigoEnviado = data.codigo_enviado || 'N/A'; // Usar el que devuelve el ESP32 si lo tiene
                const idMostrar = data.id || '?';
                const zonaMostrar = data.zona || '?';
                const tipoMostrar = getTipoSensorNombre(data.tipo) || '?';

                rfDisplay.innerHTML = `
                <div class="rf-image-container">
                    <img src="rf-ok.png" alt="ID">
                    <small>ID: ${idMostrar.toString().padStart(4, '0')}</small>
                </div>
                <div class="rf-image-container">
                    <img src="rf-ok.png" alt="Zona">
                    <small>Zona: ${zonaMostrar.toString().padStart(3, '0')}</small>
                </div>
                <div class="rf-image-container">
                    <img src="rf-ok.png" alt="Tipo">
                    <small>Tipo: ${tipoMostrar}</small>
                </div>
                <div class="rf-image-container" style="grid-column: 1 / -1; background-color: #e6ffe6; border-left: 5px solid #28a745;">
                    <img src="confirm-icon.png" alt="Confirmación">
                    <small style="color: #28a745; font-weight: bold;">Señal RF generada y enviada: ${codigoEnviado}!</small>
                </div>
                `;
                agregarMensajeMonitor(`Señal RF de prueba enviada: ID ${idMostrar}, Zona ${zonaMostrar}, Tipo ${tipoMostrar}. Código enviado: ${codigoEnviado}`);
                // Actualizar el resumen con la última señal RF enviada
                const lastRfSentElement = document.getElementById('last-rf-sent');
                if (lastRfSentElement) {
                    lastRfSentElement.textContent = codigoEnviado;
                }
            } else {
                rfDisplay.innerHTML = `<div class="rf-image-container" style="grid-column: 1 / -1; background-color: #ffe6e6; border-left: 5px solid #dc3545;">
                    <img src="rf-error.png" alt="Error">
                    <small style="color: #dc3545; font-weight: bold;">Error al enviar señal: ${data.message || "Error desconocido"}</small>
                </div>`;
                agregarMensajeMonitor(`Error al enviar señal RF: ${data.message || "Error desconocido"}`, true);
            }
        })
        .catch(error => {
            rfDisplay.innerHTML = `<div class="rf-image-container" style="grid-column: 1 / -1; background-color: #ffe6e6; border-left: 5px solid #dc3545;">
                <img src="rf-error.png" alt="Error">
                <small style="color: #dc3545; font-weight: bold;">Error de conexión: ${error.message}</small>
            </div>`;
            agregarMensajeMonitor(`Error de conexión al enviar RF: ${error.message}`, true);
        });
}

function enviarRF() {
    mostrarCargando();
    agregarMensajeMonitor("Intentando enviar señal RF con parámetros guardados...");

    fetch("/leer-parametros", {
        method: "GET", // Use GET for reading parameters
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if(data.id !== undefined && data.zona !== undefined && data.tipo !== undefined) {
            const id = data.id.toString().padStart(4, '0');
            const zona = data.zona.toString().padStart(3, '0');
            const tipo = data.tipo.toString(); // Asegurarse que es string para concatenación
            const codigoRFNumerico = parseInt(`${id}${zona}${tipo}`, 10); // Convertir la cadena a un número

            agregarMensajeMonitor(`Parámetros obtenidos para envío: ID ${id}, Zona ${zona}, Tipo ${getTipoSensorNombre(tipo)}. Código RF numérico a enviar: ${codigoRFNumerico}`);

            fetch("/enviar-rf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comando: "enviar_rf",
                    id: id,
                    zona: zona,
                    tipo: tipo,
                    codigo_rf_numerico: codigoRFNumerico // Enviamos el código numérico para ser transmitido
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(`HTTP error status: ${response.status}, Message: ${errorData.message || response.statusText}`);
                    }).catch(() => {
                        throw new Error(`HTTP error status: ${response.status}, Message: ${response.statusText}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                ocultarCargando();
                if(data.status === "success") {
                    alert(`✅ Señal RF enviada correctamente: ${data.codigo_rf_enviado || codigoRFNumerico}`);
                    agregarMensajeMonitor(`Señal RF enviada con éxito: ${data.codigo_rf_enviado || codigoRFNumerico}`);
                    const lastRfSentElement = document.getElementById('last-rf-sent');
                    if (lastRfSentElement) {
                        lastRfSentElement.textContent = data.codigo_rf_enviado || codigoRFNumerico;
                    }
                } else {
                    alert(`❌ Error al enviar señal RF: ${data.message || ""}`);
                    agregarMensajeMonitor(`Error al enviar señal RF: ${data.message || ""}`, true);
                }
            })
            .catch(error => {
                ocultarCargando();
                alert(`⚠️ Error de conexión: ${error.message}`);
                agregarMensajeMonitor(`Error de conexión al enviar RF: ${error.message}`, true);
            });
        } else {
            ocultarCargando();
            alert("⚠️ No se encontraron parámetros configurados (ID, Zona, Tipo) para enviar señal RF.");
            agregarMensajeMonitor("No se encontraron parámetros configurados para enviar señal RF.", true);
        }
    })
    .catch(error => {
        ocultarCargando();
        alert(`⚠️ Error al leer parámetros para enviar RF: ${error.message}`);
        agregarMensajeMonitor(`Error al leer parámetros para enviar RF: ${error.message}`, true);
    });
}


function seleccionarImagen(numeroImagen) {
    mostrarCargando();
    agregarMensajeMonitor(`Intentando seleccionar Imagen ${numeroImagen}...`);

    fetch("/cambiar-imagen", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({imagen: numeroImagen})
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        ocultarCargando();
        if(data.status === "success") {
            alert(`✅ Imagen ${numeroImagen} seleccionada correctamente!`);
            agregarMensajeMonitor(`Imagen ${numeroImagen} seleccionada.`);
            const lastImageSelectedElement = document.getElementById('last-image-selected');
            if (lastImageSelectedElement) {
                lastImageSelectedElement.textContent = `Imagen ${numeroImagen}`;
            }
        } else {
            alert(`❌ Error al cambiar imagen: ${data.message || "Error desconocido"}`);
            agregarMensajeMonitor(`Error al seleccionar imagen ${numeroImagen}: ${data.message || "Error desconocido"}`, true);
        }
    })
    .catch(error => {
        ocultarCargando();
        alert(`⚠️ Error de conexión al cambiar imagen: ${error.message}`);
        agregarMensajeMonitor(`Error de conexión al seleccionar imagen ${numeroImagen}: ${error.message}`, true);
    });
}

function mostrarResumen() {
    const contenido = document.getElementById("contenido");
    if (!contenido) {
        console.error("Contenedor 'contenido' no encontrado.");
        return;
    }
    contenido.innerHTML = `
    <div class="resumen-box">
        <h2><i class="fas fa-chart-bar"></i> Resumen de Configuración</h2>
        <div id="resumen-display" class="resumen-datos">
            <p class="loading-message"><i class="fas fa-spinner fa-spin"></i> Cargando datos actuales...</p>
        </div>
        <div id="monitor" class="monitor-datos">
            <h3><i class="fas fa-terminal"></i> Monitor de Actividad</h3>
            <div class="monitor-content">
                <p class="initial-message">Esperando eventos...</p>
            </div>
        </div>
    </div>
    `;

    fetch("/leer-parametros")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const resumenDisplay = document.getElementById("resumen-display");
            if (resumenDisplay) {
                // Generar dinámicamente los campos que deben mostrarse
                let resumenHTML = `
                    <div class="dato-item">
                        <span class="dato-label"><i class="fas fa-fingerprint"></i> ID Alarma:</span>
                        <span class="dato-valor">${data.id ? data.id.toString().padStart(4, '0') : '<span class="not-set">No configurado</span>'}</span>
                    </div>
                    <div class="dato-item">
                        <span class="dato-label"><i class="fas fa-map-marker-alt"></i> Zona:</span>
                        <span class="dato-valor">${data.zona ? data.zona.toString().padStart(3, '0') : '<span class="not-set">No configurada</span>'}</span>
                    </div>
                    <div class="dato-item">
                        <span class="dato-label"><i class="fas fa-cogs"></i> Tipo Sensor:</span>
                        <span class="dato-valor">${getTipoSensorNombre(data.tipo) || '<span class="not-set">No configurado</span>'}</span>
                    </div>
                `;

                // Mostrar Código RF Sensor y Código RF Prueba solo si ID, Zona y Tipo están configurados
                if (data.id !== undefined && data.zona !== undefined && data.tipo !== undefined) {
                    resumenHTML += `
                        <div class="dato-item">
                            <span class="dato-label"><i class="fas fa-key"></i> Código RF Sensor:</span>
                            <span class="dato-valor">${data.codigoSensor ? data.codigoSensor : '<span class="not-set">No configurado</span>'}</span>
                        </div>
                        <div class="dato-item">
                            <span class="dato-label"><i class="fas fa-wrench"></i> Código RF Prueba:</span>
                            <span class="dato-valor">${data.codigoPrueba ? data.codigoPrueba : '<span class="not-set">No configurado</span>'}</span>
                        </div>
                    `;
                }

                // Añadir los nuevos campos para Última Señal RF Enviada y Última Imagen Seleccionada
                resumenHTML += `
                    <div class="dato-item">
                        <span class="dato-label"><i class="fas fa-wifi"></i> Última Señal RF Enviada:</span>
                        <span class="dato-valor" id="last-rf-sent">${data.last_rf_sent ? data.last_rf_sent : '<span class="not-set">Ninguna</span>'}</span>
                    </div>
                    <div class="dato-item">
                        <span class="dato-label"><i class="fas fa-image"></i> Última Imagen Seleccionada:</span>
                        <span class="dato-valor" id="last-image-selected">${data.last_image_selected ? `Imagen ${data.last_image_selected}` : '<span class="not-set">Ninguna</span>'}</span>
                    </div>
                `;
                
                resumenDisplay.innerHTML = resumenHTML;
            }
            ocultarCargando();
        })
        .catch((error) => {
            console.error("Error al cargar resumen:", error);
            const resumenDisplay = document.getElementById("resumen-display");
            if (resumenDisplay) {
                resumenDisplay.innerHTML = `<p class="error-message"><i class="fas fa-exclamation-circle"></i> Error al cargar datos del resumen: ${error.message}. Intente recargar la página.</p>`;
            }
            ocultarCargando();
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

function agregarMensajeMonitor(mensaje, isError = false) {
    const monitorContent = document.querySelector("#monitor .monitor-content");
    if (monitorContent) {
        // Eliminar el mensaje inicial si existe
        const initialMessage = monitorContent.querySelector(".initial-message");
        if (initialMessage) {
            initialMessage.remove();
        }

        const p = document.createElement("p");
        p.textContent = `${new Date().toLocaleTimeString()}: ${mensaje}`;
        if (isError) {
            p.classList.add("error-monitor-message");
        } else {
            p.classList.add("success-monitor-message"); // Add a success class for regular messages
        }
        monitorContent.appendChild(p);
        monitorContent.scrollTop = monitorContent.scrollHeight; // Auto-scroll to bottom
    }
}


function salir() {
    if(confirm("¿Está seguro que desea salir y reiniciar la tarjeta? El LED se apagará.")) {
        const contenido = document.getElementById("contenido");
        const pantallaCarga = document.getElementById("loadingOverlay");

        contenido.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <h2>🔄 Reiniciando tarjeta...</h2>
            <p>La tarjeta se reiniciará, el LED se apagará y volverá al modo normal</p>
        </div>
        `;
        pantallaCarga.style.display = "flex";
        agregarMensajeMonitor("Iniciando reinicio de la tarjeta...");

        fetch("/reiniciar", { method: "POST" })
            .then(() => {
                setTimeout(() => {
                    pantallaCarga.style.display = "none";
                    location.reload();
                }, 5000); // Give it some time before reloading
            })
            .catch((error) => {
                pantallaCarga.style.display = "none";
                alert("No se pudo reiniciar la tarjeta. Intente nuevamente.");
                agregarMensajeMonitor(`Error al intentar reiniciar: ${error.message}`, true);
            });
    }
}