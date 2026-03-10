# 🤖 Asistente Profesional - Discord Bot

Bot de Discord con IA conversacional, desplegado en Cloudflare Workers. Responde como un asistente profesional durante tu ausencia, sin parecer un bot.

## ✨ Características

- **Tono profesional y humano** - No parece un bot
- **Comandos Slash** - `/consultar`, `/info`, `/nueva`
- **Memoria de conversación** - Contexto persistente con Cloudflare KV
- **Seguridad** - Verificación de firma Ed25519
- **Serverless** - Desplegado en Cloudflare Workers

## 🚀 Despliegue desde GitHub a Cloudflare

### Paso 1: Conectar Repositorio

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Menú **Workers & Pages** → **Create application**
3. Pestaña **Workers** → **Create Worker**
4. Nombre: `asistente-profesional`
5. Click **Deploy**
6. Ve a **Settings** → **Build deployments**
7. Activa **Connect a Git repository**
8. Selecciona `vertiljivenson9/My-bot-discord`
9. Rama: `main`

### Paso 2: Crear KV Namespace

1. Ve a **Workers & Pages** → **KV**
2. Click **Create a namespace**
3. Nombre: `CONVERSATIONS`
4. Click **Add**
5. **Copia el ID** generado

### Paso 3: Vincular KV al Worker

1. Ve a tu Worker → **Settings** → **Variables**
2. Sección **KV Namespace Bindings** → **Add binding**
   - Variable name: `CONVERSATIONS`
   - KV namespace: selecciona el creado
3. Click **Save**

### Paso 4: Configurar Secretos

En tu Worker → **Settings** → **Variables** → **Add variable**

| Variable | Valor |
|----------|-------|
| `DISCORD_BOT_TOKEN` | Tu token del bot de Discord |
| `DISCORD_PUBLIC_KEY` | Tu clave pública de Discord |
| `DISCORD_APPLICATION_ID` | Tu Application ID de Discord |

⚠️ **Marca cada una como "Secret"** (candado cerrado)

Click **Save and deploy**

### Paso 5: Configurar Webhook en Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación
3. **General Information** → **Interactions Endpoint URL**
4. Pega tu URL del worker: `https://asistente-profesional.TU-SUBDOMINIO.workers.dev`
5. Click **Save Changes**

✅ Debe aparecer "Verified"

### Paso 6: Registrar Comandos Slash

Ejecuta en tu terminal local:

```bash
DISCORD_APPLICATION_ID=tu_app_id DISCORD_BOT_TOKEN=tu_token npx tsx scripts/register.ts
```

### Paso 7: Invitar el Bot

1. Discord Developer Portal → **OAuth2** → **URL Generator**
2. Selecciona: `bot` + `applications.commands`
3. Permisos: `Send Messages`, `Use Slash Commands`, `Read Message History`
4. Copia la URL y ábrela para invitar a tu servidor

## 📋 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/consultar <mensaje>` | Haz una consulta o pregunta |
| `/info` | Información del asistente |
| `/nueva` | Iniciar nueva conversación |

## 🔧 Integración con IA

Para respuestas más inteligentes, añade tu API key:

```bash
npx wrangler secret put ZAI_API_KEY
```

Sin API key, usa respuestas predefinidas inteligentes.

## 📊 Monitoreo

Ver logs en tiempo real:
```bash
npx wrangler tail
```

O desde Cloudflare Dashboard → Workers → Logs

## 🔒 Seguridad

- Los secretos nunca se suben al repositorio
- Verificación de firma Ed25519 en cada petición
- Variables sensibles configuradas como Secrets en Cloudflare

## 📁 Estructura

```
├── src/
│   ├── index.ts           # Worker principal
│   └── register-commands.ts
├── scripts/
│   └── register.ts        # Registro de comandos
├── wrangler.toml          # Config Cloudflare
├── package.json
└── DEPLOY.md              # Guía detallada
```

## 📝 Licencia

MIT
