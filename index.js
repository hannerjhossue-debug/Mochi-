const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

async function iniciarBot() {
    // Configuración de autenticación local (No requiere MongoDB)
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    });

    // Guardar credenciales cuando se actualicen
    sock.ev.on('creds.update', saveCreds);

    // Manejo de conexiones y reconexión automática
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const deberiaReconectar = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada debido a: ', lastDisconnect.error, '. Reconectando: ', deberiaReconectar);
            if (deberiaReconectar) {
                iniciarBot(); // Se reconecta automáticamente
            }
        } else if (connection === 'open') {
            console.log('¡Bot conectado exitosamente a WhatsApp!');
        }
    });

    // Escucha de mensajes y ejecución automática de comandos
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // Obtener el texto del mensaje
        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        // Si el mensaje no empieza con el prefijo '/', lo ignoramos
        if (!texto.startsWith('/')) return;

        // Separar el comando y los argumentos
        const args = texto.slice(1).trim().split(/ +/);
        const nombreComando = args.shift().toLowerCase();

        // Ruta del archivo del comando
        const rutaComando = path.join(__dirname, 'comandos', `${nombreComando}.js`);

        // Verificar si el comando existe y ejecutarlo
        if (fs.existsSync(rutaComando)) {
            try {
                const comando = require(rutaComando);
                await comando.execute(sock, msg, args);
            } catch (error) {
                console.error(`Error al ejecutar el comando ${nombreComando}:`, error);
            }
        }
    });
}

iniciarBot();
