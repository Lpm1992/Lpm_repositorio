
(function () {
  window.addEventListener("load", () => {
    const boton = document.createElement("button");
    boton.innerText = "🤖 Descargar XML (Clic Humano)";
    boton.style.position = "fixed";
    boton.style.bottom = "20px";
    boton.style.right = "20px";
    boton.style.padding = "10px 20px";
    boton.style.backgroundColor = "#1976D2";
    boton.style.color = "white";
    boton.style.border = "none";
    boton.style.borderRadius = "5px";
    boton.style.cursor = "pointer";
    boton.style.zIndex = 9999;
    document.body.appendChild(boton);

    boton.addEventListener("click", () => {
      console.log("Botón activado: Inicia la descarga.");
      descargarEnTodasLasPaginas();
    });

    function sriBloqueado() {
      return (
        document.body.innerText.includes("comportamiento inusual") ||
        !document.querySelector(".ui-paginator-current") ||
        document.querySelector("div[id*='captcha']") !== null
      );
    }

    function obtenerPaginaActualYTotal() {
      const texto = document.querySelector(".ui-paginator-current");
      if (!texto) return { actual: 1, total: 1 };
      const match = texto.textContent.match(/(\d+) de (\d+)/);
      if (!match) return { actual: 1, total: 1 };
      return {
        actual: parseInt(match[1]),
        total: parseInt(match[2])
      };
    }

    function simularClickCompleto(elemento) {
      if (!elemento) return;
      const mouseDown = new MouseEvent("mousedown", { bubbles: true });
      const mouseUp = new MouseEvent("mouseup", { bubbles: true });
      const click = new MouseEvent("click", { bubbles: true });

      elemento.dispatchEvent(mouseDown);
      elemento.dispatchEvent(mouseUp);
      elemento.dispatchEvent(click);
      console.log("Simulación completa de clic enviada.");
    }

    function avanzarPagina() {
      const pagina = obtenerPaginaActualYTotal();
      console.log(`Página actual: ${pagina.actual} / ${pagina.total}`);
      localStorage.setItem("ultima_pagina", pagina.actual);
      if (pagina.actual < pagina.total) {
        const siguiente = document.querySelector(".ui-paginator-next");
        if (siguiente) {
          console.log("Botón siguiente detectado, simulando clic humano...");
          simularClickCompleto(siguiente);
          return true;
        } else {
          console.log("Botón siguiente NO encontrado.");
        }
      } else {
        console.log("Última página alcanzada.");
      }
      return false;
    }

    function esperarMinimoXMLsYDescargar(minimos = 5, timeout = 10000) {
      let intentos = 0;
      const maxIntentos = timeout / 500;
      const intervalo = setInterval(() => {
        if (sriBloqueado()) {
          clearInterval(intervalo);
          console.log("⚠️ SRI bloqueó la descarga. Esperando 30 segundos para reintentar sin recargar...");
          setTimeout(() => {
            console.log("🔁 Reintentando sin recargar la página...");
            descargarEnTodasLasPaginas();
          }, 30000);
          return;
        }
        const nuevosXML = document.querySelectorAll('img[src*="xml.gif"]');
        intentos++;
        console.log(`Intento ${intentos}: encontrados ${nuevosXML.length} XML`);
        if (nuevosXML.length >= minimos || intentos >= maxIntentos) {
          clearInterval(intervalo);
          console.log("Comenzando descarga de esta página...");
          setTimeout(() => descargarEnTodasLasPaginas(), 1000);
        }
      }, 500);
    }

    function descargarEnTodasLasPaginas() {
      if (sriBloqueado()) {
        console.log("⚠️ Descarga bloqueada por el SRI. Esperando 30 segundos para reintentar sin recargar...");
        setTimeout(() => {
          console.log("🔁 Reintentando sin recargar la página...");
          descargarEnTodasLasPaginas();
        }, 30000);
        return;
      }

      const imagenesXML = Array.from(document.querySelectorAll('img[src*="xml.gif"]'));
      console.log(`Encontrados ${imagenesXML.length} comprobantes para descargar.`);
      if (imagenesXML.length === 0) {
        console.log("⚠️ No se encontraron XML. Esperando 30 segundos para reintentar...");
        setTimeout(() => {
          console.log("🔁 Reintentando sin recargar la página...");
          descargarEnTodasLasPaginas();
        }, 30000);
        return;
      }

      const ultimoXML = parseInt(localStorage.getItem("ultimo_xml_descargado")) || 0;

      imagenesXML.forEach((img, index) => {
        if (index < ultimoXML) return;

        const enlace = img.closest("a");
        if (enlace) {
          console.log(`Programando descarga XML #${index + 1}`);
          setTimeout(() => {
            enlace.click();
            localStorage.setItem("ultimo_xml_descargado", index + 1);
          }, (index - ultimoXML) * 2000);
        }
      });

      setTimeout(() => {
        if (avanzarPagina()) {
          localStorage.setItem("ultimo_xml_descargado", 0);
          esperarMinimoXMLsYDescargar();
        } else {
          alert("✔ Descarga finalizada en todas las páginas.");
          localStorage.removeItem("ultima_pagina");
          localStorage.removeItem("ultimo_xml_descargado");
        }
      }, (imagenesXML.length - ultimoXML) * 2000 + 1500);
    }

    // Al cargar, recuperar última página (si aplica)
    const paginaGuardada = parseInt(localStorage.getItem("ultima_pagina")) || 1;
    const paginaActual = obtenerPaginaActualYTotal().actual;
    if (paginaActual < paginaGuardada) {
      console.log(`Saltando a página guardada: ${paginaGuardada}`);
      for (let i = paginaActual; i < paginaGuardada; i++) {
        avanzarPagina();
      }
    }
  });
})();
