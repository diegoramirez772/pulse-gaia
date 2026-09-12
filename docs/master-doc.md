# PULSE / ContextOS — Documento Maestro

PULSE / CONTEXTOS
The Context Layer for Proactive AI
Documento maestro de concepto — Global Hackathon: “Agents, Everywhere: Bots, Channels, & More”
Objetivo del documento: definir con precisión el problema, la propuesta, la experiencia del usuario, la Agent Surface, la arquitectura, el stack y una demo realizable durante el build.

## 1. Resumen ejecutivo

PULSE no es un chatbot y no es una aplicación que simplemente replica un chat de IA en varios dispositivos.
PULSE es una capa de contexto para agentes: un Agent Core persistente que mantiene la identidad, memoria, contexto, permisos y estado del trabajo del usuario mientras este se mueve entre aplicaciones, canales, dispositivos y entornos.
La idea central es simple: el usuario cambia de dispositivo; el agente no pierde el hilo.
El agente puede aparecer donde el usuario ya está trabajando mediante una Agent Surface mínima —voz, texto y acciones contextuales— en lugar de obligarlo a abrir otra ventana de chat.

## 2. El reto del hackathon

El reto parte de una premisa: la mayoría de los agentes todavía esperan dentro de una ventana de chat separada. El objetivo es construir agentes que aparezcan dentro de las herramientas, canales, dispositivos y entornos donde la gente ya trabaja, habla y vive.
Esto abre varios espacios: trabajo (Slack, Teams, correo, documentos, colaboración), bolsillo (móvil, mensajes, notificaciones), web/navegador, hogar, voz, visión y mundo físico.
Nuestra interpretación del reto es llevarlo un paso más allá: no queremos crear un agente que simplemente viva en muchas aplicaciones. Queremos una infraestructura que permita que el mismo agente tenga continuidad a través de todas ellas.

## 3. El problema que realmente resolvemos

El problema no es “la gente necesita otro asistente”. Tampoco es solamente “las aplicaciones están fragmentadas”.
El problema es la pérdida de continuidad del usuario frente a un ecosistema digital fragmentado.
Una persona puede empezar una actividad en una PC, recibir información en un teléfono, continuar en una tableta y terminar en otra aplicación. Cada superficie conoce solo una parte de lo que está ocurriendo. Los agentes actuales también suelen depender de la superficie donde fueron invocados.
Resultado: el usuario tiene que volver a explicar qué estaba haciendo, qué había decidido, qué esperaba de alguien, qué documento estaba usando o qué acción había quedado pendiente.
PULSE ataca esa ruptura de continuidad.
Problema en una frase: “My digital work follows me, but my AI doesn't.”

## 4. Por qué esto importa

La IA ya puede razonar y ejecutar acciones, pero necesita contexto confiable para hacerlo bien.
Los conectores tradicionales pueden dar acceso a datos, pero no necesariamente representan el estado vivo del entorno del usuario.
El contexto puede cambiar mientras el usuario trabaja.
El mismo trabajo puede atravesar varias aplicaciones y dispositivos.
La experiencia actual obliga al usuario a elegir explícitamente dónde hablar con el agente.
El reto busca precisamente sacar al agente de la ventana de chat y colocarlo donde ocurre la actividad.
La oportunidad tecnológica es construir la capa que hace posible esa experiencia.

## 5. La solución

PULSE convierte señales autorizadas del ecosistema digital del usuario en un contexto estructurado y persistente. El Agent Core utiliza ese contexto para razonar, detectar momentos relevantes y actuar con autorización.
La solución tiene cuatro ideas fundamentales:
Contexto continuo: el agente mantiene el hilo aunque cambie la aplicación o dispositivo.
Presencia contextual: la interfaz aparece cuando es útil, no como una aplicación que el usuario tiene que buscar.
Seguridad: el agente no recibe automáticamente todo; una capa de permisos y relevancia decide qué puede conocer y qué puede hacer.
Agente portable: identidad, memoria y estado pertenecen al usuario/agente, no a una sola superficie.

## 6. La idea clave: el agente no vive en la app

Esta distinción es fundamental para el pitch.
Un chatbot vive en una interfaz. PULSE vive como un agente distribuido.
La app, extensión, overlay o ventana son solamente superficies. El verdadero producto es el Agent Core y la infraestructura que conecta esas superficies.
Conceptualmente:
Usuario → dispositivos/apps → OS Adapters → Context Layer → Context Firewall → Agent Core → Agent Surface → acción
Por eso no importa si mañana agregamos otra plataforma. No reconstruimos el agente: agregamos otro adapter.

## 7. ¿Qué es la Agent Surface?

La Agent Surface es la forma mínima mediante la cual el usuario interactúa con el agente sin abandonar el entorno donde está trabajando.
No es una segunda ventana de ChatGPT. Es una interfaz contextual.
Puede tener:
Un pequeño botón flotante o trigger contextual.
Activación por voz mediante una palabra o gesto permitido por el sistema.
Un campo de texto para escribir cuando hablar no sea conveniente.
Un botón de micrófono.
Acciones rápidas generadas por el contexto.
Respuestas breves y contextuales.
Una opción para expandir a una conversación completa cuando sea necesario.

## 8. ¿Cómo responde el agente?

La respuesta no tiene que ser siempre un chat.
Dependiendo del contexto, el Agent Core puede elegir una de varias formas de interacción:
Proactiva: aparece una tarjeta pequeña: “Encontré algo que requiere tu atención.”
Voz: el agente habla o responde cuando el usuario está usando manos libres.
Texto breve: aparece una respuesta contextual sin abrir una conversación completa.
Input: el usuario escribe una instrucción dentro de la Agent Surface.
Acción: el agente ofrece botones como “Revisar”, “Abrir”, “Preparar mensaje” o “Enviar”.
Conversación completa: solo cuando la tarea necesita más interacción.
Principio UX: la conversación es un mecanismo, no el producto.

## 9. Ejemplo completo de interacción

Escenario: el usuario está programando en su PC.
El usuario recibe un mensaje: “¿Mañana me pasas la API?”.
El sistema autorizado detecta el evento.
El Context Engine identifica una posible persona, compromiso, proyecto y deadline.
El contexto se relaciona con actividad del proyecto.
Más tarde, el usuario cambia al teléfono.
El mismo Agent Core ya conoce el estado relevante.
La Agent Surface aparece solo cuando existe una razón para hacerlo.
El agente dice: “Carlos espera la API mañana. Encontré trabajo relacionado que sigue pendiente. ¿Quieres que revise qué falta?”.
El usuario responde por voz: “Sí”.
El Agent Core consulta las capacidades disponibles y analiza el contexto.
El agente responde: “El bloqueo está en la revisión del PR. ¿Quieres que prepare un mensaje para el revisor?”.
El usuario dice: “Sí, prepáralo”.
El agente genera el mensaje y lo muestra para aprobación.
El usuario autoriza el envío.
El adapter ejecuta la acción permitida.
El resultado vuelve al Context Layer y queda registrado como parte del estado.

## 10. ¿Qué ocurre cuando el agente responde?

La respuesta sigue un ciclo controlado:
1. Detectar: llega un evento o el usuario invoca al agente.
2. Entender: el Context Engine interpreta qué está ocurriendo.
3. Recuperar: obtiene únicamente el contexto relevante.
4. Filtrar: el Context Firewall aplica permisos y minimización.
5. Razonar: el Agent Core determina qué significa el contexto.
6. Decidir: NO_ACTION, INFORM, ASK_PERMISSION o EXECUTE.
7. Presentar: la Agent Surface selecciona voz, texto, tarjeta o acción.
8. Actuar: el OS Adapter ejecuta únicamente capacidades autorizadas.
9. Registrar: el resultado actualiza el contexto.

## 11. Context Layer / Work Graph

Para evitar que el agente dependa de conversaciones aisladas, los eventos se convierten en entidades y relaciones.
Ejemplo:
Carlos → pidió → API
Carlos → espera → mañana
API → pertenece a → Proyecto Atlas
Proyecto Atlas → tiene → PR #184
PR #184 → estado → pendiente
PR #184 → necesita → revisión
Usuario → trabaja en → Proyecto Atlas
El valor no está en guardar texto sin estructura. Está en mantener relaciones útiles para el razonamiento.

## 12. Context Firewall / Seguridad

La seguridad no debe ser una característica secundaria. Es parte del producto.
El Context Firewall decide qué información puede cruzar desde el sistema operativo hacia el Agent Core, para qué propósito, con qué agente, durante cuánto tiempo y qué información puede salir del dispositivo.
Permisos explícitos.
Minimización de datos.
Filtrado por relevancia.
Separación entre contexto privado y contexto compartible.
Acciones con autorización.
Registro de acciones.
Posibilidad de revocar capacidades por dispositivo.
No asumir que todo lo que el sistema puede detectar debe enviarse al modelo.
Principio: “The agent can know what it needs, without needing to know everything.”

## 13. OS Adapters

Cada sistema operativo tiene capacidades diferentes. En lugar de intentar forzar una única app multiplataforma a tener acceso idéntico, PULSE usa pequeños OS Adapters.
Android Adapter: notificaciones, accesibilidad, voz, superficies flotantes y otras capacidades disponibles con permisos.
Windows Adapter: superficie de escritorio, notificaciones y automatización/capacidades permitidas por Windows.
Android Tablet: reutiliza el adapter de Android con una superficie adaptada al tamaño de pantalla.
Futuro: macOS, iOS, Linux, wearables, automóvil, hogar, etc.
El Agent Core no necesita saber cómo funciona cada sistema operativo. Solo recibe eventos normalizados y solicita capacidades mediante un protocolo común.

## 14. Por qué no Flutter como núcleo

Flutter sigue siendo viable para una interfaz multiplataforma, pero no es la pieza central de esta arquitectura.
Flutter resuelve principalmente el problema de construir una aplicación multiplataforma. Nuestro problema es diferente: queremos que un agente viva dentro de múltiples entornos y tenga integración profunda con cada sistema operativo.
Por eso, la arquitectura preferida es:
React/TypeScript para superficies rápidas y reutilizables.
Agent Core independiente.
OS Adapters nativos para acceso profundo.
Protocolo común entre Core y Adapters.
Si se usa Flutter en el futuro, puede ser una superficie, pero no debe convertirse en el límite de la arquitectura.

## 15. Stack tecnológico recomendado

Agent Core: TypeScript + Node.js.
AI reasoning: OpenAI API.
Context model: TypeScript + estructura de entidades/relaciones.
Persistencia: Postgres/Supabase para el prototipo.
Realtime: WebSockets o eventos HTTP.
Surface: React + TypeScript para la UI universal/prototipo.
Android Adapter: código nativo Android donde sean necesarias capacidades profundas.
Windows Adapter: APIs nativas de Windows para capacidades profundas.
Tablet: Android Adapter.
Autenticación: una identidad de agente/usuario compartida entre dispositivos.
No se necesita un framework de agentes enorme. El objetivo es demostrar la arquitectura y una ruta funcional de percepción → contexto → razonamiento → interacción → acción.

## 16. Instalación y distribución

El usuario instala el agente en cada dispositivo, pero todos los dispositivos se vinculan a la misma identidad.
Android/tableta: instalación del cliente/adapter y concesión de permisos.
Windows: instalación del cliente/adapter de escritorio.
Superficie React: puede funcionar como interfaz complementaria.
Inicio de sesión: vincula el dispositivo al Agent Core.
Permisos: el usuario elige qué capacidades habilita en cada dispositivo.
Conceptualmente, el usuario no está instalando “un chatbot diferente” en cada dispositivo. Está conectando nuevos nodos a su agente.

## 17. Multi-dispositivo

Este es uno de los diferenciadores más fuertes.
La identidad y el contexto viven en el Agent Core. Los dispositivos son superficies y sensores/actuadores.
Ejemplo:
PC: trabajo principal.
Teléfono: notificaciones y contexto móvil.
Tableta: otra superficie de interacción.
Cambio de dispositivo: no reinicia la conversación ni el estado.
Acción en un dispositivo: puede reflejarse en el estado del agente en todos los demás.
La frase conceptual: “Your agent follows you, not the app.”

## 18. Accesibilidad como caso de impacto

La accesibilidad puede ser una demostración especialmente poderosa sin convertir el producto entero en una herramienta exclusiva para discapacidad.
Una persona con discapacidad visual puede interactuar principalmente mediante voz.
Una persona con limitaciones motoras puede usar comandos de voz para navegar y ejecutar acciones.
Una persona que no puede usar una interfaz tradicional puede recibir información resumida mediante voz o texto.
El agente puede adaptar la forma de interacción al contexto y capacidades disponibles.
La visión es más amplia: construir una interfaz adaptativa para la computación agéntica. Accesibilidad demuestra por qué esa flexibilidad importa.

## 19. Qué NO es PULSE

No es otro chatbot.
No es una aplicación de notas.
No es solamente un gestor de tareas.
No es una colección de integraciones MCP.
No es un asistente que intenta automatizar todo sin permiso.
No es una aplicación que espía el dispositivo.
No es una UI multiplataforma disfrazada de infraestructura.

## 20. Qué sí es PULSE

Una capa de contexto para agentes.
Un Agent Core persistente.
Una infraestructura multi-dispositivo.
Un sistema de OS Adapters.
Una Agent Surface contextual.
Una arquitectura de seguridad basada en permisos y minimización.
Una base para agentes que puedan aparecer donde ocurre el trabajo.

## 21. Demo de 2 minutos

Inicio: pantalla limpia. Texto: “AI shouldn't wait for you to talk to it.”
PC: el usuario trabaja en un proyecto.
Entra un mensaje con un compromiso realista.
PULSE convierte el evento en contexto estructurado.
Se muestra el Work Graph mínimo.
El usuario cambia al teléfono.
La Agent Surface aparece: “I found something relevant to your work.”
El agente explica el compromiso y su relación con otro evento.
Usuario: “Revísalo.”
El agente razona y encuentra el bloqueo.
Usuario: “Avísale.”
Aparece el mensaje preparado.
Usuario autoriza.
La acción se ejecuta.
Cierre: “Your device changes. Your agent doesn't lose the thread.”

## 22. Demo técnica mínima

Para tres horas, no intentaremos demostrar todo el mundo digital. Demostraremos el principio con pocas superficies y eventos reales.
Android: un evento de notificación autorizado.
PC: una superficie funcional o evento simulado/controlado.
Agent Core: recibe ambos eventos.
Context Engine: los conecta.
Agent Surface: voz + texto + acciones.
Una acción real con autorización.
Sincronización de contexto entre dispositivos.
Lo importante es que el espectador vea que la arquitectura no depende de una sola app.

## 23. Plan de construcción — 180 minutos

Tiempo
Objetivo
Resultado
0–20 min
Agent Core + identidad
Core recibe eventos y mantiene sesión
20–55 min
Context Engine
Eventos → entidades/relaciones
55–95 min
Android Adapter + Surface
Notificación + overlay/voz/texto
95–125 min
PC/Windows surface
Segundo nodo/superficie
125–145 min
Razonamiento + acción
Detectar → preguntar → ejecutar
145–165 min
Multi-device sync
Mismo contexto en PC/teléfono
165–180 min
Demo + README
Flujo cerrado y presentable

## 24. El “momento wow”

El momento que debe recordar el juez no es una respuesta inteligente del modelo.
Debe ser el cambio de dispositivo.
Ejemplo: el usuario empieza en PC. El juez ve el contexto. El usuario bloquea la PC, toma el teléfono y PULSE continúa exactamente donde quedó. Después el agente aparece en la superficie móvil sin que el usuario tenga que reconstruir la historia.
Ese instante demuestra de golpe: contexto + multi-dispositivo + presencia + agente.

## 25. Riesgos y límites técnicos

Android y Windows no exponen exactamente las mismas capacidades.
Accesibilidad y overlays requieren permisos explícitos y deben usarse de forma transparente.
No todas las apps exponen el mismo nivel de información.
No conviene prometer acceso total al dispositivo.
Para el hackathon se debe demostrar acceso profundo real en una o dos plataformas y presentar el resto como arquitectura extensible.
El modelo no debe recibir indiscriminadamente información privada.
Las acciones sensibles deben requerir confirmación.

## 26. Ventaja competitiva

Un participante puede construir un agente para Slack. Otro puede construir un agente para WhatsApp. Otro puede construir un agente para programadores.
Nuestra apuesta es diferente: construir la infraestructura que permite que el agente exista independientemente de dónde esté el usuario.
El nicho puede ser programación, productividad o accesibilidad para la demo, pero la arquitectura es horizontal.
Eso permite tener las dos cosas que buscamos: un problema concreto que se puede demostrar y una tecnología suficientemente general como para convertirse en infraestructura.

## 27. Posicionamiento

No decir: “Construimos un asistente que puede controlar tu teléfono.”
No decir: “Construimos una app de IA para múltiples dispositivos.”
Decir:
“We built a context layer that lets an agent follow your work across apps and devices.”
Y después:
“The user changes surfaces. The agent keeps the context.”

## 28. Pitch de 30 segundos

“AI agents are becoming capable of doing work, but they still lose the thread when users move between apps and devices. PULSE is a context layer for proactive AI. It gives one agent persistent identity, real-time context, secure permissions and native capabilities across the user's devices. Instead of opening another chat, the agent appears where the user is already working, understands what is happening, and acts when it is useful. Your device changes. Your agent doesn't lose the thread.”

## 29. Pitch de 10 segundos

“PULSE lets an AI agent follow your work across apps and devices without losing context.”

## 30. La tesis del proyecto

La tesis es que el futuro no será una colección de chatbots, uno por aplicación.
Será una capa de agentes que pueda percibir el entorno digital, mantener contexto, respetar permisos y aparecer en cualquier superficie donde el usuario necesite ayuda.
PULSE es un prototipo de esa capa.

## 31. Arquitectura resumida

DEVICE / APP
↓
OS ADAPTER
↓
EVENT BUS / CONTEXT LAYER
↓
CONTEXT FIREWALL
↓
AGENT CORE
├── Identity
├── Memory
├── Reasoning
├── Tools
└── Policy
↓
AGENT SURFACE
├── Voice
├── Text
├── Context card
└── Actions
↓
OS ADAPTER → ACTION

## 32. Definición final

PULSE / ContextOS es infraestructura para agentes que necesitan vivir fuera de una ventana de chat. Mantiene una identidad y un contexto persistentes, recibe señales autorizadas desde diferentes dispositivos y aplicaciones, protege ese contexto mediante una capa de seguridad y presenta al agente justo donde el usuario está trabajando.
El producto no es el botón. No es la ventana. No es el chatbot.
El producto es la continuidad del agente.
