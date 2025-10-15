# Lpm_repositorio
Repositorio de pruebas codex

## Recursos
- [Guía para crear un organizador con inteligencia artificial como asistente de WhatsApp](organizador_asistente_whatsapp.md)

## Asistente de WhatsApp con IA

Este repositorio incluye un servidor Express listo para conectarse con la WhatsApp Cloud API y operar como un asistente organizador.

### Requisitos previos

1. Node.js 18 o superior.
2. Credenciales de Meta (token de verificación, token de acceso y `phone_number_id`).
3. Una clave válida de la API de OpenAI (opcional, pero recomendada para interpretar mensajes de manera inteligente).

### Configuración

1. Copia el archivo `.env.example` a `.env` y completa los valores necesarios.
2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Ejecuta el servidor:

   ```bash
   npm start
   ```

4. Expone el puerto configurado (por defecto `3000`) a internet con una herramienta como ngrok y configura la URL como webhook en el panel de Meta.

### Flujo básico

1. El webhook recibe mensajes entrantes, normaliza el contenido y delega en el asistente.
2. El asistente interpreta la intención (creación/listado/completado de tareas) usando OpenAI si está disponible o heurísticas predefinidas.
3. Las tareas se almacenan en `data/tasks.json` por usuario.
4. Las respuestas se envían nuevamente por WhatsApp o, si faltan credenciales, se registran en consola para pruebas locales.

Consulta la guía enlazada para más detalles de arquitectura y despliegue.
