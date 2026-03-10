#!/usr/bin/env npx tsx
/**
 * Script para registrar comandos slash en Discord
 * 
 * Uso:
 *   DISCORD_BOT_TOKEN=tu_token npx tsx scripts/register.ts
 * 
 * Para un servidor específico:
 *   DISCORD_GUILD_ID=tu_guild_id DISCORD_BOT_TOKEN=tu_token npx tsx scripts/register.ts
 */

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID || 'TU_APPLICATION_ID';

const commands = [
  {
    name: 'consultar',
    description: 'Haz una consulta o pregunta',
    options: [
      {
        type: 3,
        name: 'mensaje',
        description: 'Tu consulta o mensaje',
        required: true,
      },
    ],
  },
  {
    name: 'info',
    description: 'Información sobre el asistente',
  },
  {
    name: 'nueva',
    description: 'Iniciar una nueva conversación',
  },
];

async function registerCommands() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken) {
    console.error('❌ Error: Debes configurar DISCORD_BOT_TOKEN');
    console.error('   DISCORD_BOT_TOKEN=tu_token npx tsx scripts/register.ts');
    process.exit(1);
  }

  const url = guildId
    ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

  console.log(`📤 Registrando ${commands.length} comandos...`);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', response.status, errorText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Comandos registrados:');
    data.forEach((cmd: any) => {
      console.log(`   /${cmd.name} - ${cmd.description}`);
    });
    
    if (guildId) {
      console.log(`\n📌 Comandos registrados solo para el servidor: ${guildId}`);
    } else {
      console.log('\n⏳ Comandos globales - pueden tardar hasta 1 hora en aparecer');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

registerCommands();
