# 🤖 Bot de Discord con IA - Cloudflare Worker

Bot de Discord conversacional impulsado por IA, desplegado en Cloudflare Workers para máxima velocidad y escalabilidad.

## ✨ Características

- **IA Conversacional**: Respuestas naturales con toque humano usando z-ai-web-dev-sdk
- **Memoria de Conversación**: Contexto persistente usando Cloudflare KV
- **Comandos Slash**: Interacción moderna con Discord
- **Seguridad**: Verificación de firmas Ed25519
- **Serverless**: Desplegado en Cloudflare Workers (sin servidor que mantener)

## 📋 Requisitos Previos

1. **Cuenta de Discord Developer**: [Portal de Desarrolladores](https://discord.com/developers/applications)
2. **Cuenta de Cloudflare**: [Cloudflare Dashboard](https://dash.cloudflare.com)
3. **Wrangler CLI**: Herramienta de línea de comandos de Cloudflare
4. **Node.js 18+**: Entorno de ejecución

## 🚀 Guía de Instalación

### Paso 1: Crear la Aplicación de Discord

1. Ve al [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)
2. Haz clic en **"New Application"**
3. Dale un nombre a tu bot (ej: "MiBotIA")
4. Guarda el **Application ID** (lo necesitarás más tarde)

### Paso 2: Configurar el Bot

1. En el menú lateral, ve a **"Bot"**
2. Haz clic en **"Add Bot"**
3. Guarda el **Token** del bot (¡guárdalo seguro!)
4. En la misma página, ve a **"Public Key"** y guárdala también

5. **Habilita los Intents necesarios**:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT (opcional)

### Paso 3: Configurar Interacciones

1. Ve a **"General Information"** en el menú lateral
2. Copia el **Public Key** y el **Application ID**

### Paso 4: Instalar Dependencias

```bash
cd discord-bot-cloudflare
npm install
```

### Paso 5: Configurar Wrangler

1. **Inicia sesión en Cloudflare**:
```bash
npx wrangler login
```

2. **Crea un namespace KV** (para memoria de conversación):
```bash
npx wrangler kv:namespace create "CONVERSATIONS"
```

3. **Anota el ID del namespace** y actualízalo en `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CONVERSATIONS"
id = "TU_KV_NAMESPACE_ID_AQUI"
```

### Paso 6: Configurar Secretos

Configura las variables de entorno como secretos:

```bash
# Token del bot de Discord
npx wrangler secret put DISCORD_BOT_TOKEN
# Pega tu token cuando te lo pida

# Clave pública de Discord
npx wrangler secret put DISCORD_PUBLIC_KEY
# Pega tu public key

# ID de la aplicación
npx wrangler secret put DISCORD_APPLICATION_ID
# Pega tu application ID
```

### Paso 7: Desplegar el Worker

```bash
npm run deploy
```

Después del despliegue, obtendrás una URL como:
```
https://discord-ai-bot.TU-SUBDOMINIO.workers.dev
```

### Paso 8: Configurar Webhook en Discord

1. Ve al **Portal de Desarrolladores de Discord**
2. Selecciona tu aplicación
3. Ve a **"General Information"**
4. En **"Interactions Endpoint URL"**, pega tu URL del worker:
```
https://discord-ai-bot.TU-SUBDOMINIO.workers.dev
```
5. Haz clic en **"Save Changes"**

✅ Si todo está bien, verás un mensaje de éxito.

### Paso 9: Registrar Comandos Slash

Opción A: **Script local** (crea un archivo `scripts/register.ts`):

```typescript
import { commands } from './src/register-commands';

async function register() {
  const response = await fetch(
    `https://discord.com/api/v10/applications/${process.env.DISCORD_APPLICATION_ID}/commands`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    }
  );
  
  console.log(await response.json());
}

register();
```

Ejecuta con:
```bash
DISCORD_APPLICATION_ID=tu_id DISCORD_BOT_TOKEN=tu_token npx tsx scripts/register.ts
```

Opción B: **Usar curl**:
```bash
curl -X PUT \
  -H "Authorization: Bot TU_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name":"hola","description":"Saluda al bot"},{"name":"chat","description":"Chatea con la IA","options":[{"type":3,"name":"mensaje","description":"Tu mensaje","required":true}]},{"name":"limpiar","description":"Limpia tu historial"},{"name":"ayuda","description":"Muestra los comandos"}]' \
  "https://discord.com/api/v10/applications/TU_APPLICATION_ID/commands"
```

### Paso 10: Invitar el Bot a tu Servidor

1. Ve al **Portal de Desarrolladores**
2. Selecciona tu aplicación
3. Ve a **"OAuth2"** → **"URL Generator"**
4. Selecciona:
   - ✅ `bot`
   - ✅ `applications.commands`
5. En **"Bot Permissions"**, selecciona:
   - ✅ Send Messages
   - ✅ Use Slash Commands
   - ✅ Read Message History
6. Copia la URL generada y ábrela en tu navegador
7. Selecciona tu servidor y autoriza el bot

## 🎮 Uso

Una vez el bot esté en tu servidor, puedes usar los comandos:

| Comando | Descripción |
|---------|-------------|
| `/hola` | Saluda al bot |
| `/chat <mensaje>` | Chatea con la IA |
| `/limpiar` | Limpia tu historial de conversación |
| `/ayuda` | Muestra los comandos disponibles |

## 🔧 Configuración Avanzada

### Personalizar el System Prompt

En `src/index.ts`, modifica la constante `SYSTEM_PROMPT`:

```typescript
const SYSTEM_PROMPT = `Eres un asistente especializado en [TU_TEMA]...
// Personaliza según tus necesidades
`;
```

### Cambiar Modelo de IA

El worker usa un endpoint de API. Puedes modificar:
- `model`: El modelo a usar (gpt-4, gpt-4o-mini, etc.)
- `temperature`: Creatividad de las respuestas (0-1)
- `max_tokens`: Longitud máxima de respuesta

### Variables de Entorno Adicionales

Si usas una API externa para la IA, añade:

```bash
npx wrangler secret put ZAI_API_KEY
```

## 📊 Monitoreo

Ver logs en tiempo real:
```bash
npm run tail
```

## 🔄 Actualizaciones

Para actualizar el código:
1. Modifica los archivos necesarios
2. Ejecuta `npm run deploy`

## ❓ Solución de Problemas

### El webhook no se puede verificar
- Verifica que la `DISCORD_PUBLIC_KEY` sea correcta
- Asegúrate de que la URL del worker termine en `/` o no tenga trailing slash inconsistente

### Los comandos no aparecen
- Ejecuta el script de registro de comandos
- Espera unos minutos (puede tardar en propagarse)
- Verifica que el bot tenga el scope `applications.commands`

### La IA no responde
- Verifica la API key de z-ai
- Revisa los logs con `npm run tail`
- Comprueba que el endpoint de la API esté accesible

### Error de memoria KV
- Verifica que el namespace KV esté configurado correctamente
- Comprueba que el binding `CONVERSATIONS` coincida

## 📁 Estructura del Proyecto

```
discord-bot-cloudflare/
├── src/
│   ├── index.ts           # Worker principal
│   └── register-commands.ts # Registro de comandos
├── package.json           # Dependencias
├── tsconfig.json          # Config TypeScript
├── wrangler.toml          # Config Cloudflare
└── README.md              # Este archivo
```

## 📜 Licencia

MIT License - Siéntete libre de modificar y usar según tus necesidades.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Abre un issue o pull request.
