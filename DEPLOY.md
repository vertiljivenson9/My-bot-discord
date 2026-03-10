# 🚀 Guía de Despliegue - Paso a Paso

## Resumen de Credenciales

| Variable | Descripción |
|----------|-------------|
| Application ID | Configurado en `wrangler.toml` |
| Public Key | Configurar como secreto |
| Bot Token | Configurar como secreto |

---

## Paso 1: Instalar Dependencias

```bash
npm install
```

---

## Paso 2: Login en Cloudflare

```bash
npx wrangler login
```
> Se abrirá el navegador. Autoriza con tu cuenta de Cloudflare.

---

## Paso 3: Crear Namespace KV

```bash
npx wrangler kv:namespace create "CONVERSATIONS"
```

**IMPORTANTE**: Copia el `id` que te devuelva y actualiza `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CONVERSATIONS"
id = "PEGA_EL_ID_AQUI"
```

---

## Paso 4: Configurar Secretos

```bash
# Token del bot
npx wrangler secret put DISCORD_BOT_TOKEN
# Pega tu token cuando te lo pida

# Clave pública
npx wrangler secret put DISCORD_PUBLIC_KEY
# Pega tu public key cuando te lo pida

# Application ID
npx wrangler secret put DISCORD_APPLICATION_ID
# Pega tu application ID cuando te lo pida
```

---

## Paso 5: Desplegar

```bash
npm run deploy
```

Copia la URL que te devuelva (ejemplo: `https://asistente-profesional.tu-subdomain.workers.dev`)

---

## Paso 6: Configurar Webhook en Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Menú **General Information**
3. Busca **Interactions Endpoint URL**
4. Pega tu URL del worker
5. Click **Save Changes**

✅ Si dice "Verified" = Todo correcto

---

## Paso 7: Registrar Comandos

```bash
DISCORD_APPLICATION_ID=tu_app_id DISCORD_BOT_TOKEN=tu_token_aqui npx tsx scripts/register.ts
```

Para registrar en un servidor específico (más rápido):
```bash
DISCORD_APPLICATION_ID=tu_app_id DISCORD_GUILD_ID=id_servidor DISCORD_BOT_TOKEN=tu_token_aqui npx tsx scripts/register.ts
```

---

## Paso 8: Invitar el Bot

1. Ve a OAuth2 > URL Generator en Discord Developer Portal
2. Selecciona:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Permisos:
   - ✅ Send Messages
   - ✅ Use Slash Commands
   - ✅ Read Message History
4. Copia la URL y ábrela para invitar a tu servidor

---

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/consultar <mensaje>` | Haz una consulta o pregunta |
| `/info` | Información del asistente |
| `/nueva` | Iniciar nueva conversación |

---

## Monitoreo

Ver logs en tiempo real:
```bash
npm run tail
```

---

## Próximos Pasos (Opcional)

Para conectar con IA real, añade:
```bash
npx wrangler secret put ZAI_API_KEY
# Pega tu API key
```

Sin API key, el asistente usará respuestas predefinidas inteligentes.
