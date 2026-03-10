# Guía de Integración con z-ai-web-dev-sdk

Esta guía explica cómo integrar el bot de Discord con el SDK de z-ai para generar respuestas de IA.

## Opciones de Integración

### Opción 1: API Directa (Recomendada para Cloudflare Workers)

Dado que Cloudflare Workers no es un entorno Node.js completo, la forma más confiable es hacer peticiones HTTP directas a la API.

```typescript
// En src/index.ts
async function generateAIResponse(
  userMessage: string,
  conversationHistory: Message[],
  apiKey: string
): Promise<string> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.z.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',  // o 'gpt-4o' para mejor calidad
      messages,
      temperature: 0.8,      // Creatividad (0-1)
      max_tokens: 500,       // Longitud máxima de respuesta
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Opción 2: Usando un Worker Separado como Proxy

Si prefieres usar el SDK completo de z-ai, puedes crear un worker separado que actúe como proxy:

**worker-ai/index.ts:**
```typescript
import ZAI from 'z-ai-web-dev-sdk';

export default {
  async fetch(request: Request): Promise<Response> {
    const { messages } = await request.json();
    
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 500,
    });

    return new Response(JSON.stringify({
      content: completion.choices[0].message.content,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

**Luego en tu worker de Discord:**
```typescript
const aiResponse = await fetch('https://tu-ai-proxy.workers.dev', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
});
```

## Configuración de API Key

### Desarrollo Local

1. Crea un archivo `.dev.vars`:
```env
ZAI_API_KEY=tu_api_key_aqui
```

2. Ejecuta el worker en modo desarrollo:
```bash
npx wrangler dev --local
```

### Producción

Configura el secreto en Cloudflare:
```bash
npx wrangler secret put ZAI_API_KEY
```

Cuando te lo pida, pega tu API key.

## Personalización del Comportamiento

### System Prompt Avanzado

Puedes personalizar el comportamiento del bot modificando el `SYSTEM_PROMPT`:

```typescript
const SYSTEM_PROMPT = `Eres [NOMBRE], un asistente para [PROPÓSITO].

Personalidad:
- Tono: [casual/profesional/amigable]
- Estilo: [conciso/detallado/técnico]
- Idioma: [español/inglés/multilingüe]

Reglas específicas:
1. [Regla 1]
2. [Regla 2]
...

Ejemplos de respuestas deseadas:
Usuario: "Hola"
Tú: "[Respuesta ejemplo]"
`;
```

### Temperatura y Tokens

| Parámetro | Valor | Efecto |
|-----------|-------|--------|
| temperature | 0.2 | Respuestas más predecibles |
| temperature | 0.8 | Respuestas más creativas (recomendado) |
| temperature | 1.0 | Máxima creatividad |
| max_tokens | 100 | Respuestas cortas |
| max_tokens | 500 | Respuestas moderadas (recomendado) |
| max_tokens | 2000 | Respuestas largas |

## Manejo de Errores

```typescript
async function generateAIResponse(
  userMessage: string,
  history: Message[],
  apiKey: string
): Promise<string> {
  try {
    // Intentar respuesta con IA
    const response = await fetch('https://api.z.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: buildMessages(userMessage, history),
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error(`AI API error: ${response.status}`);
      return generateFallbackResponse(userMessage);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateFallbackResponse(userMessage);

  } catch (error) {
    console.error('Error calling AI:', error);
    return generateFallbackResponse(userMessage);
  }
}

function generateFallbackResponse(message: string): string {
  // Respuestas predefinidas cuando la IA no está disponible
  const responses = [
    "🤔 Hmm, estoy teniendo problemas técnicos. ¿Podrías repetir?",
    "😅 Ups, algo salió mal. Intenta de nuevo en un momento.",
    "🔧 Estoy en mantenimiento. ¡Vuelve pronto!",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
```

## Rate Limiting

Para evitar exceder límites de API:

```typescript
// Almacenar última llamada por usuario
const lastCall = await kv.get(`rate:${userId}`);
if (lastCall && Date.now() - parseInt(lastCall) < 3000) {
  return "⏳ Por favor espera unos segundos antes de enviar otro mensaje.";
}
await kv.put(`rate:${userId}`, Date.now().toString(), { expirationTtl: 10 });
```

## Monitoreo y Debugging

### Logs en Tiempo Real

```bash
npx wrangler tail
```

### Debugging en el Código

```typescript
console.log('Received message:', userMessage);
console.log('History length:', history.length);
console.log('AI Response:', aiResponse);
```

## Pruebas

### Probar el Webhook Localmente

```bash
# Instalar ngrok para exponer el worker local
ngrok http 8787

# Configurar la URL de ngrok en Discord Developer Portal
# Luego probar con el bot en Discord
```

### Prueba Manual del Endpoint

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type": application/json" \
  -H "x-signature-ed25519: test" \
  -H "x-signature-timestamp: test" \
  -d '{"type":1}'
```

## Costos Estimados

Con gpt-4o-mini:
- ~$0.15 por 1M tokens de entrada
- ~$0.60 por 1M tokens de salida

Para un bot activo con ~1000 mensajes/día:
- Tokens por mensaje: ~500 input + ~100 output
- Costo diario: ~$0.08
- Costo mensual: ~$2.40

## Siguientes Pasos

1. ✅ Configura tu API key de z-ai
2. ✅ Despliega el worker
3. ✅ Registra los comandos en Discord
4. ✅ ¡Prueba el bot!

Para soporte adicional, consulta la documentación de:
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Discord API](https://discord.com/developers/docs)
- [z-ai-web-dev-sdk](https://github.com/z-ai/sdk)
