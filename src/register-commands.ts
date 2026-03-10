/**
 * Registro de comandos slash profesionales
 */

import {
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

// Comandos profesionales - Sin parecer bot
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  {
    name: 'consultar',
    description: 'Haz una consulta o pregunta',
    options: [
      {
        type: 3, // STRING
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

export { commands };
