const OpenAI = require("openai");

const MONTHS = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11
};

const WEEKDAYS = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6
};

function removeAccents(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function addDays(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function nextWeekday(targetDay, baseDate, forceNextWeek) {
  const date = new Date(baseDate);
  const baseDay = date.getDay();
  let delta = (targetDay - baseDay + 7) % 7;
  if (forceNextWeek) {
    delta = delta === 0 ? 7 : delta + 7;
  } else if (delta === 0) {
    delta = 7;
  }
  date.setDate(date.getDate() + delta);
  return date;
}

function parseExplicitDate(normalized, baseDate) {
  const dayMonthYear = normalized.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
  if (dayMonthYear) {
    const day = parseInt(dayMonthYear[1], 10);
    const month = parseInt(dayMonthYear[2], 10) - 1;
    const year = dayMonthYear[3]
      ? parseYear(dayMonthYear[3])
      : baseDate.getFullYear();
    const candidate = new Date(year, month, day);
    if (!Number.isNaN(candidate.getTime())) {
      if (candidate < baseDate) {
        candidate.setFullYear(candidate.getFullYear() + 1);
      }
      return candidate;
    }
  }

  const dayMonthText = normalized.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{2,4}))?/);
  if (dayMonthText) {
    const day = parseInt(dayMonthText[1], 10);
    const month = MONTHS[dayMonthText[2]];
    const year = dayMonthText[3] ? parseYear(dayMonthText[3]) : baseDate.getFullYear();
    const candidate = new Date(year, month, day);
    if (!Number.isNaN(candidate.getTime())) {
      if (candidate < baseDate) {
        candidate.setFullYear(candidate.getFullYear() + 1);
      }
      return candidate;
    }
  }

  return null;
}

function parseYear(value) {
  const year = parseInt(value, 10);
  if (year < 100) {
    return 2000 + year;
  }
  return year;
}

function extractTimeFromText(text) {
  const stripped = text
    .replace(/\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?/g, " ")
    .replace(/\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{2,4})?/gi, " ");

  const timeRegex = /(?:a\s+l[ao]s?\s+|para\s+l[ao]s\s+|sobre\s+l[ao]s\s+)?(\d{1,2})(?:[:h](\d{2}))?\s*(am|pm)?/i;
  const match = stripped.match(timeRegex);
  if (!match) {
    return null;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3] ? match[3].toLowerCase() : null;

  if (meridiem === "pm" && hours < 12) {
    hours += 12;
  } else if (meridiem === "am" && hours === 12) {
    hours = 0;
  }

  if (!meridiem && hours <= 6) {
    hours += 12;
  }

  return { hours, minutes };
}

function parseRelativeDays(normalized, baseDate) {
  const relativeMatch = normalized.match(/en\s+(\d+)\s+dias?/);
  if (relativeMatch) {
    const days = parseInt(relativeMatch[1], 10);
    return addDays(baseDate, days);
  }
  return null;
}

function parseWeekday(normalized, baseDate) {
  const weekdayMatch = normalized.match(/(?:este|esta|el)?\s*(proximo)?\s*(domingo|lunes|martes|miercoles|jueves|viernes|sabado)/);
  if (!weekdayMatch) {
    return null;
  }
  const forceNextWeek = Boolean(weekdayMatch[1]);
  const weekdayKey = weekdayMatch[2];
  const targetDay = WEEKDAYS[weekdayKey];
  return nextWeekday(targetDay, baseDate, forceNextWeek);
}

function parseDueDateFromText(text) {
  const baseDate = new Date();
  const lower = text.toLowerCase();
  const normalized = removeAccents(lower);

  if (!text || text.trim() === "") {
    return null;
  }

  if (normalized.includes("pasado manana")) {
    const date = addDays(baseDate, 2);
    applyTimeFromText(lower, date);
    return date.toISOString();
  }
  if (normalized.includes("manana")) {
    const date = addDays(baseDate, 1);
    applyTimeFromText(lower, date);
    return date.toISOString();
  }
  if (normalized.includes("hoy")) {
    const date = new Date(baseDate);
    applyTimeFromText(lower, date);
    return date.toISOString();
  }

  const relative = parseRelativeDays(normalized, baseDate);
  if (relative) {
    applyTimeFromText(lower, relative);
    return relative.toISOString();
  }

  const weekday = parseWeekday(normalized, baseDate);
  if (weekday) {
    applyTimeFromText(lower, weekday);
    return weekday.toISOString();
  }

  const explicit = parseExplicitDate(normalized, baseDate);
  if (explicit) {
    applyTimeFromText(lower, explicit);
    return explicit.toISOString();
  }

  return null;
}

function applyTimeFromText(originalText, date) {
  const time = extractTimeFromText(originalText);
  if (!time) {
    date.setHours(9, 0, 0, 0);
    return;
  }
  date.setHours(time.hours, time.minutes, 0, 0);
}

function formatDate(dateString) {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function shortDate(dateString) {
  if (!dateString) {
    return null;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: date.getHours() === 0 && date.getMinutes() === 0 ? undefined : "short"
  });
}

function sanitizePriority(priority) {
  if (!priority) {
    return "normal";
  }
  const normalized = priority.toLowerCase();
  if (["baja", "low"].includes(normalized)) {
    return "low";
  }
  if (["alta", "high"].includes(normalized)) {
    return "high";
  }
  return "normal";
}

function buildListMessage(tasks) {
  if (tasks.length === 0) {
    return "No tienes tareas pendientes. ¡Buen trabajo!";
  }
  const lines = tasks.map((task, index) => {
    const statusEmoji = task.status === "done" ? "✅" : "🕒";
    const due = shortDate(task.dueDate);
    const priority = task.priority ? ` · prioridad ${task.priority}` : "";
    const dueLabel = due ? ` · vence ${due}` : "";
    return `${index + 1}. ${statusEmoji} ${task.title}${dueLabel}${priority}`;
  });
  return ["Aquí tienes tu lista actual:", ...lines].join("\n");
}

class Assistant {
  constructor({ storage, metaConfig, openaiClient }) {
    this.storage = storage;
    this.metaConfig = metaConfig;
    this.openai = openaiClient;
  }

  async handleIncomingMessage(userId, message) {
    const interpretation = await this.interpretMessage(message);
    const normalizedIntent = interpretation.intent || "unknown";
    let responseText = "";

    if (normalizedIntent === "create_task") {
      const taskInfo = interpretation.task || { title: message };
      const task = this.createTask(userId, taskInfo);
      const due = shortDate(task.dueDate);
      const dueSegment = due ? ` para ${due}` : "";
      responseText = `Perfecto, añadí \"${task.title}\"${dueSegment}. Cuando la completes dime \"completa ${task.title}\".`;
    } else if (normalizedIntent === "list_tasks" || normalizedIntent === "get_summary") {
      const tasks = this.storage.listTasks(userId);
      responseText = buildListMessage(tasks);
    } else if (normalizedIntent === "complete_task") {
      const matcher = this.resolveCompletionMatcher(interpretation.complete || {}, message);
      const completed = this.storage.completeTask(userId, matcher);
      if (completed) {
        responseText = `Genial, marqué \"${completed.title}\" como terminada.`;
      } else {
        responseText = "No encontré la tarea que quieres completar. Puedes decirme \"completa 2\" o \"completa reporte semanal\".";
      }
    } else if (normalizedIntent === "clear_completed") {
      const removed = this.storage.clearCompleted(userId);
      if (removed === 0) {
        responseText = "No había tareas completadas para archivar.";
      } else {
        responseText = `Archivadas ${removed} tareas completadas.`;
      }
    } else if (normalizedIntent === "help") {
      responseText = this.helpMessage();
    } else {
      const task = this.createTask(userId, { title: message });
      responseText = `Entendido, registré \"${task.title}\". Pídeme la lista cuando quieras diciendo \"lista\".`;
    }

    await this.sendWhatsAppMessage(userId, responseText);
    return {
      intent: normalizedIntent,
      responseText
    };
  }

  helpMessage() {
    return [
      "Puedo ayudarte a organizarte:",
      "• Crea tareas: \"Recuérdame pagar la renta el lunes\"",
      "• Lista tareas: \"lista\" o \"resumen\"",
      "• Completa tareas: \"completa 2\" o \"completa renta\"",
      "• Limpia completadas: \"archiva completadas\"",
      "• Pide ayuda en cualquier momento: \"ayuda\""
    ].join("\n");
  }

  createTask(userId, taskInfo) {
    const dueDate = this.resolveDueDate(taskInfo);
    const normalized = {
      title: taskInfo.title || taskInfo.text || "Tarea sin título",
      dueDate,
      priority: sanitizePriority(taskInfo.priority)
    };
    return this.storage.addTask(userId, normalized);
  }

  resolveCompletionMatcher(completeInfo, originalMessage) {
    if (typeof completeInfo.index === "number") {
      return completeInfo.index;
    }
    if (typeof completeInfo.title === "string" && completeInfo.title.trim() !== "") {
      return completeInfo.title.trim();
    }
    const numberMatch = originalMessage.match(/(\d+)/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1], 10);
      return Number.isNaN(index) ? originalMessage : index - 1;
    }
    return originalMessage;
  }

  resolveDueDate(taskInfo) {
    if (taskInfo.dueDate) {
      const parsed = formatDate(taskInfo.dueDate);
      if (parsed) {
        return parsed;
      }
    }
    const fromTitle = parseDueDateFromText(taskInfo.title || "");
    if (fromTitle) {
      return fromTitle;
    }
    if (typeof taskInfo.notes === "string") {
      const fromNotes = parseDueDateFromText(taskInfo.notes);
      if (fromNotes) {
        return fromNotes;
      }
    }
    return null;
  }

  async interpretMessage(message) {
    const trimmed = message.trim();
    if (!this.openai) {
      return this.heuristicInterpretation(trimmed);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente que clasifica mensajes de WhatsApp para un organizador de tareas. Responde solo con JSON válido."
          },
          {
            role: "user",
            content: trimmed
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intent_schema",
            schema: {
              type: "object",
              properties: {
                intent: {
                  type: "string",
                  enum: [
                    "create_task",
                    "list_tasks",
                    "complete_task",
                    "clear_completed",
                    "get_summary",
                    "help",
                    "unknown"
                  ]
                },
                task: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    dueDate: { type: "string" },
                    priority: { type: "string" },
                    notes: { type: "string" }
                  }
                },
                complete: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    title: { type: "string" }
                  }
                }
              },
              additionalProperties: false
            }
          }
        }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return this.heuristicInterpretation(trimmed);
      }
      const parsed = JSON.parse(content);
      if (parsed.intent === "unknown" || !parsed.intent) {
        return this.heuristicInterpretation(trimmed);
      }
      return parsed;
    } catch (error) {
      console.warn("Fallo al interpretar con OpenAI, usando heurísticas", error.message);
      return this.heuristicInterpretation(trimmed);
    }
  }

  heuristicInterpretation(message) {
    const normalized = message.toLowerCase();
    if (normalized === "lista" || normalized.includes("lista de tareas") || normalized.includes("resumen")) {
      return { intent: "list_tasks" };
    }
    if (normalized.startsWith("completa") || normalized.startsWith("terminé") || normalized.includes("marca como completada")) {
      const withoutVerb = message.replace(/completa|terminé|marca como completada/gi, "").trim();
      const numberMatch = withoutVerb.match(/(\d+)/);
      if (numberMatch) {
        const idx = parseInt(numberMatch[1], 10) - 1;
        return { intent: "complete_task", complete: { index: idx } };
      }
      return { intent: "complete_task", complete: { title: withoutVerb } };
    }
    if (normalized.includes("archiva completada") || normalized.includes("limpia completadas")) {
      return { intent: "clear_completed" };
    }
    if (normalized.includes("ayuda") || normalized.includes("cómo funcionas")) {
      return { intent: "help" };
    }
    return {
      intent: "create_task",
      task: { title: message }
    };
  }

  async sendWhatsAppMessage(to, body) {
    if (!this.metaConfig.accessToken || !this.metaConfig.phoneNumberId) {
      console.info("Mensaje para %s: %s", to, body);
      return;
    }

    const url = `https://graph.facebook.com/v21.0/${this.metaConfig.phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.metaConfig.accessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error al enviar mensaje a WhatsApp: %s", errorBody);
    }
  }
}

function createAssistant({ storage, metaConfig, openaiApiKey }) {
  let openaiClient = null;
  if (openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: openaiApiKey });
  }
  return new Assistant({ storage, metaConfig, openaiClient });
}

module.exports = {
  Assistant,
  createAssistant
};
