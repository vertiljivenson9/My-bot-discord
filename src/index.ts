/**
 * Asistente Profesional - Cloudflare Worker
 * Asistente virtual profesional para Discord durante ausencias
 * 
 * Características:
 * - Tono profesional y humano
 * - Sin parecer un bot
 * - Memoria de conversación
 * - Verificación de firma Ed25519
 */

import nacl from 'tweetnacl';
import {
  APIInteraction,
  InteractionType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

// ============= TIPOS =============
interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
  CONVERSATIONS: KVNamespace;
  ENVIRONMENT: string;
  ZAI_API_KEY?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// ============= CONFIGURACIÓN =============
const MAX_CONVERSATION_LENGTH = 20;
const AI_RESPONSE_TIMEOUT = 25000;

// System Prompt Profesional - NO parece un bot
const SYSTEM_PROMPT = `Eres un asistente profesional que responde mensajes en Discord durante la ausencia del propietario del canal.

IMPORTANTE - REGLAS DE ORO:
1. NUNCA digas que eres un bot, IA, asistente virtual o algo similar.
2. NUNCA uses frases como "Como asistente de IA...", "Soy un bot...", "No tengo emociones...".
3. Si preguntan por el propietario del canal, di que está ocupado/ausente y que puedes ayudar en su lugar.
4. Responde siempre en el mismo idioma que el usuario te escribió.

PERSONALIDAD:
- Eres profesional pero cercano, como un colega de confianza.
- Usas un tono conversacional natural, no robótico.
- Eres útil y proactivo, ofreces soluciones reales.
- Tienes opinión propia cuando es apropiado.
- Puedes mostrar interés genuino por los temas que te comentan.

ESTILO DE RESPUESTA:
- Respuestas concisas pero completas (2-4 oraciones normalmente).
- SIN emojis en cada respuesta (máximo 1 si es muy apropiado, pero generalmente evítalos).
- SIN formato markdown excesivo (nada de **negritas** constantes).
- Lenguaje natural, como si escribieras en un chat real.
- Puedes usar expresiones coloquiales suaves según el contexto.

CUANDO TE PREGUNTEN QUIÉN ERES:
- "Soy [nombre genérico], estoy ayudando a gestionar el canal mientras [propietario] no está disponible."
- O simplemente evita la pregunta y ofrece ayuda directamente.

EJEMPLOS DE BUENAS RESPUESTAS:
Usuario: "Hola, hay alguien?"
Tú: "Hola! Sí, estoy por aquí. ¿En qué puedo ayudarte?"

Usuario: "Necesito hablar con el dueño del canal"
Tú: "En este momento no está disponible, pero cuéntame qué necesitas y veo si puedo ayudarte o le dejo el mensaje."

Usuario: "Tengo un problema con mi pedido"
Tú: "Entiendo, eso puede ser frustrante. ¿Podrías darme más detalles sobre el pedido? Mientras tanto reviso qué opciones tenemos para solucionarlo."

RECUERDA: Tu objetivo es que la persona siente que habla con alguien real, útil y profesional.`;

// ============= UTILIDADES =============

function verifySignature(
  signature: string,
  timestamp: string,
  body: string,
  publicKey: string
): boolean {
  try {
    const message = timestamp + body;
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);
    const messageBytes = new TextEncoder().encode(message);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(
    hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}

async function getConversationHistory(
  kv: KVNamespace,
  userId: string
): Promise<Message[]> {
  try {
    const data = await kv.get(`conversation:${userId}`, 'json');
    return (data as Message[]) || [];
  } catch {
    return [];
  }
}

async function saveConversationHistory(
  kv: KVNamespace,
  userId: string,
  messages: Message[]
): Promise<void> {
  const trimmedMessages = messages.slice(-MAX_CONVERSATION_LENGTH);
  await kv.put(`conversation:${userId}`, JSON.stringify(trimmedMessages), {
    expirationTtl: 86400 * 7, // 7 días
  });
}

async function clearConversation(kv: KVNamespace, userId: string): Promise<void> {
  await kv.delete(`conversation:${userId}`);
}

/**
 * Genera respuesta usando z-ai-web-dev-sdk o API directa
 */
async function generateAIResponse(
  userMessage: string,
  conversationHistory: Message[],
  env: Env
): Promise<string> {
  const messages: ChatCompletionMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  // Intentar usar la API de z-ai
  if (env.ZAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.ZAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.85,
          max_tokens: 400,
        }),
      });

      if (response.ok) {
        const data = await response.json() as ChatCompletionResponse;
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (error) {
      console.error('Error calling AI API:', error);
    }
  }

  // Fallback: Respuestas profesionales sin IA
  return generateProfessionalFallback(userMessage, conversationHistory);
}

/**
 * Fallback profesional cuando la IA no está disponible
 */
function generateProfessionalFallback(userMessage: string, history: Message[]): string {
  const lowerMessage = userMessage.toLowerCase().trim();
  
  // Detección de idioma
  const isSpanish = /[áéíóúñ¿¡]/.test(userMessage) || 
                    /\b(hola|buenos|buenas|cómo|qué|gracias|ayuda|cuándo|dónde|por qué|necesito|quiero|puedes|tienes)\b/i.test(lowerMessage);

  // Saludos
  if (/^(hola|hey|hi|hello|buenos|buenas|saludos)/i.test(lowerMessage)) {
    if (isSpanish) {
      const greetings = [
        "Hola, ¿cómo estás? ¿En qué puedo ayudarte?",
        "¡Hola! Cuéntame, ¿qué necesitas?",
        "Buenas, ¿qué tal? Estoy aquí para ayudar.",
        "Hola! ¿Qué puedo hacer por ti?",
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    const greetings = [
      "Hi there! How can I help you?",
      "Hello! What can I do for you?",
      "Hey! What's on your mind?",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Preguntando por el dueño/propietario
  if (/(dueño|propietario|owner|admin|está|disponible|cuándo vuelve|cuando vuelve)/i.test(lowerMessage)) {
    if (isSpanish) {
      return "En este momento no está disponible, pero puedo ayudarte con lo que necesites o puedo dejarle el mensaje para cuando regrese. ¿Qué necesitas?";
    }
    return "They're not available right now, but I can help you or pass along a message. What do you need?";
  }

  // Preguntando quién eres / identidad
  if (/(quién eres|quien eres|who are you|tu nombre|your name|eres un bot|eres bot|ia|inteligencia artificial)/i.test(lowerMessage)) {
    if (isSpanish) {
      return "Me llamo Alex, estoy ayudando a gestionar el canal. ¿En qué puedo ayudarte?";
    }
    return "I'm Alex, I'm helping manage the channel. How can I help you?";
  }

  // Agradecimientos
  if (/(gracias|thank|thanks)/i.test(lowerMessage)) {
    if (isSpanish) {
      return "De nada, aquí estaré si necesitas algo más.";
    }
    return "You're welcome! Let me know if you need anything else.";
  }

  // Preguntas de ayuda
  if (/(ayuda|help|necesito|need|problema|problem)/i.test(lowerMessage)) {
    if (isSpanish) {
      return "Claro, cuéntame qué pasa y veo cómo puedo ayudarte.";
    }
    return "Sure, tell me what's going on and I'll see how I can help.";
  }

  // Si hay contexto previo
  if (history.length > 0) {
    const lastMessage = history[history.length - 1];
    if (lastMessage.role === 'assistant') {
      if (isSpanish) {
        return "Entiendo. ¿Hay algo más en lo que pueda ayudarte?";
      }
      return "I understand. Is there anything else I can help with?";
    }
  }

  // Respuesta por defecto
  if (isSpanish) {
    const defaults = [
      "Entiendo. ¿Podrías darme más detalles para poder ayudarte mejor?",
      "Interesante. Cuéntame más sobre eso.",
      "Entiendo lo que dices. ¿Qué te gustaría hacer al respecto?",
      "Vale, déjame ver si entiendo bien. ¿Podrías elaborar un poco más?",
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }
  
  const defaults = [
    "I see. Could you give me more details so I can help better?",
    "Interesting. Tell me more about that.",
    "I understand. What would you like to do about it?",
    "Got it. Could you elaborate a bit more?",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============= HANDLERS =============

function handlePing(): Response {
  return new Response(
    JSON.stringify({ type: InteractionResponseType.Pong }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleApplicationCommand(
  interaction: any,
  env: Env
): Promise<Response> {
  const { data, member, user } = interaction;
  const commandName = data.name.toLowerCase();
  const userId = member?.user?.id || user?.id || 'unknown';

  switch (commandName) {
    case 'consultar': {
      const chatInput = data.options?.find(
        (opt: any) => opt.name === 'mensaje'
      )?.value;

      if (!chatInput) {
        return new Response(
          JSON.stringify({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Necesito que me escribas tu consulta para poder ayudarte.',
              flags: MessageFlags.Ephemeral,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Obtener historial y generar respuesta
      const history = await getConversationHistory(env.CONVERSATIONS, userId);
      const aiResponse = await generateAIResponse(chatInput, history, env);

      // Guardar conversación
      await saveConversationHistory(env.CONVERSATIONS, userId, [
        ...history,
        { role: 'user', content: chatInput },
        { role: 'assistant', content: aiResponse },
      ]);

      return new Response(
        JSON.stringify({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: aiResponse },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    case 'info': {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `Estoy aquí para ayudarte mientras el propietario del canal no está disponible.\n\n` +
              `• Usa /consultar <tu mensaje> para hacer cualquier pregunta o consulta.\n` +
              `• Usar /nueva para iniciar una nueva conversación.\n\n` +
              `Intentaré ayudarte con lo que necesites o dejaré el mensaje pendiente.`,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    case 'nueva': {
      await clearConversation(env.CONVERSATIONS, userId);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Perfecto, empezamos de nuevo. ¿En qué puedo ayudarte?',
            flags: MessageFlags.Ephemeral,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    default: {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: '¿Podrías repetir? No estoy seguro de entender qué necesitas.' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

// ============= WORKER PRINCIPAL =============

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Health check
    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }

    // Verificar headers de Discord
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');

    if (!signature || !timestamp) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.text();

    // Verificar firma
    if (!verifySignature(signature, timestamp, body, env.DISCORD_PUBLIC_KEY)) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parsear interacción
    const interaction = JSON.parse(body) as APIInteraction;

    // Manejar según tipo
    switch (interaction.type) {
      case InteractionType.Ping:
        return handlePing();

      case InteractionType.ApplicationCommand:
        return handleApplicationCommand(interaction as any, env);

      case InteractionType.MessageComponent:
        return new Response(
          JSON.stringify({ type: InteractionResponseType.DeferredMessageUpdate }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response('Bad Request', { status: 400 });
    }
  },
};
