const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode-terminal');
const pino = require('pino');

async function connectToWhatsApp() {
    // Gestiona las credenciales de la sesión
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    // Inicializa el bot
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Esto muestra el QR en Termux
        logger: pino({ level: 'silent' }) // Oculta logs innecesarios
    });

    // Escucha las actualizaciones de la conexión
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('--- ESCANEA EL SIGUIENTE CÓDIGO QR CON TU WHATSAPP ---');
            QRCode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada debido a:', lastDisconnect?.error, '. Reconectando:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('¡Bot conectado exitosamente a WhatsApp!');
        }
    });

    // Guarda las credenciales cada vez que se actualizan
    sock.ev.on('creds.update', saveCreds);

    // Escucha los mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return; // Ignora mensajes propios o vacíos

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // Comando básico de prueba
        if (text === '!ping') {
            await sock.sendMessage(from, { text: '¡Pong! 🏓 El bot está activo.' });
        }
    });
}

// Iniciar el bot
connectToWhatsApp();
