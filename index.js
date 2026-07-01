// 1. Importar las librerías necesarias
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

// 2. Configurar el estado de autenticación en un archivo JSON
// La sesión se guardará en "auth_info.json"
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

// 3. Crear la conexión
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Muestra el QR si no hay sesión guardada
});

// 4. Guardar las credenciales cuando se actualicen
sock.ev.on('creds.update', saveState);

// 5. Manejar eventos de conexión
sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Conexión cerrada, reconectando...', shouldReconnect);
        if (shouldReconnect) {
            // Reintentar conectar
            startSock();
        }
    } else if (connection === 'open') {
        console.log('✅ Bot conectado y listo!');
    }
});

// 6. Escuchar mensajes entrantes
sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && msg.message) {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (text === '!ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong!' });
        }
    }
});

console.log('🚀 Bot iniciado. Esperando mensajes...');
