/**
 * Translation dictionary for EN/ES support.
 * Add new keys here and consume via useTranslation().
 */

export type Language = 'en' | 'es'

export const translations = {
  en: {
    taskInput: {
      title: "What do you need to do today?",
      placeholder: "Fix segments dataset\nCreate PoP for business metrics\nStart Iceberg table",
      tip: "Be vague if you want — I'll ask questions to help clarify.",
      button: "Get Clarity →",
    },
    clarification: {
      title: "I need a bit more context",
      subtitle: "Answer what you can — skip the rest",
      skip: "Skip",
      button: "Break It Down →",
      placeholder: "Type your answer...",
    },
    taskList: {
      title: "Your Tasks",
      subtitle: "Concrete & Achievable",
      addMore: "Add More",
      clearAll: "Clear All",
      clearConfirmTitle: "Clear all tasks?",
      clearConfirmDescription: "This will archive all your current tasks. You won't be able to undo this action.",
      clearConfirmCancel: "Cancel",
      clearConfirmConfirm: "Clear All",
      stepsLabel: "steps done",
      whySteps: "Why these steps?",
      hideReasoning: "Hide reasoning",
      howBrokeDown: "How I broke this down:",
      yourRole: "Your role:",
      contextLabel: "Context:",
      yourAnswers: "Your answers:",
      regenerateStep: "Regenerate step",
      regenerating: "Regenerating…",
      restoreTask: "Restore",
      archivedEmpty: "No archived tasks yet.",
    },
    empty: {
      title: "Ready to kill the paralysis?",
      subtitle: "Paste your vague to-do here. I'll ask a few questions, then break it into concrete steps.",
      exampleButton: "Try an example",
      exampleTasks: "Need inspiration? Try one:",
      exampleList: [
        "Write a blog post about our new product launch",
        "Set up CI/CD for the backend microservice",
        "Prepare slides for the team retrospective",
        "Debug the memory leak in the data pipeline",
      ],
    },
    tabs: {
      active: "Active Tasks",
      archived: "Archived",
    },
    loading: {
      analyzing: "Analyzing your tasks...",
      subtitle: "Using your profile + answers to create concrete steps",
    },
    errors: {
      clarificationFailed: "Failed to get clarification. Please try again.",
      breakdownFailed: "Something went wrong. Please try again.",
      clearFailed: "Failed to clear tasks.",
      restoreFailed: "Failed to restore task. Please try again.",
    },
  },
  es: {
    taskInput: {
      title: "¿Qué necesitas hacer hoy?",
      placeholder: "Arreglar dataset de segmentos\nCrear PoP para métricas de negocio\nIniciar tabla Iceberg",
      tip: "Sé vago si quieres — te haré preguntas para aclarar.",
      button: "Dame Claridad →",
    },
    clarification: {
      title: "Necesito un poco más de contexto",
      subtitle: "Responde lo que puedas — omite el resto",
      skip: "Omitir",
      button: "Descomponer →",
      placeholder: "Escribe tu respuesta...",
    },
    taskList: {
      title: "Tus Tareas",
      subtitle: "Concretas y Alcanzables",
      addMore: "Agregar Más",
      clearAll: "Limpiar Todo",
      clearConfirmTitle: "¿Limpiar todas las tareas?",
      clearConfirmDescription: "Esto archivará todas tus tareas actuales. No podrás deshacer esta acción.",
      clearConfirmCancel: "Cancelar",
      clearConfirmConfirm: "Limpiar Todo",
      stepsLabel: "pasos completados",
      whySteps: "¿Por qué estos pasos?",
      hideReasoning: "Ocultar razonamiento",
      howBrokeDown: "Cómo lo descompuse:",
      yourRole: "Tu rol:",
      contextLabel: "Contexto:",
      yourAnswers: "Tus respuestas:",
      regenerateStep: "Regenerar paso",
      regenerating: "Regenerando…",
      restoreTask: "Restaurar",
      archivedEmpty: "Aún no hay tareas archivadas.",
    },
    empty: {
      title: "¿Listo para matar la parálisis?",
      subtitle: "Pega tu tarea vaga aquí. Te haré algunas preguntas, luego la descompondré en pasos concretos.",
      exampleButton: "Probar un ejemplo",
      exampleTasks: "¿Necesitas inspiración? Prueba una:",
      exampleList: [
        "Escribir un post sobre el lanzamiento de nuestro nuevo producto",
        "Configurar CI/CD para el microservicio backend",
        "Preparar slides para la retrospectiva del equipo",
        "Depurar la fuga de memoria en el pipeline de datos",
      ],
    },
    tabs: {
      active: "Tareas Activas",
      archived: "Archivadas",
    },
    loading: {
      analyzing: "Analizando tus tareas...",
      subtitle: "Usando tu perfil + respuestas para crear pasos concretos",
    },
    errors: {
      clarificationFailed: "Error al obtener aclaración. Inténtalo de nuevo.",
      breakdownFailed: "Algo salió mal. Inténtalo de nuevo.",
      clearFailed: "Error al limpiar las tareas.",
      restoreFailed: "Error al restaurar la tarea. Inténtalo de nuevo.",
    },
  },
}

export type Translations = typeof translations['en']

/** Returns the translation object for the given language (defaults to 'en'). */
export function getTranslations(language: string): Translations {
  return translations[(language as Language) in translations ? (language as Language) : 'en']
}
