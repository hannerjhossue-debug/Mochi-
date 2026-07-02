const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // SISTEMA DE VINCULACIÓN POR CÓDIGO (SIN QR)
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const phoneNumber = await question('Introduce tu número de WhatsApp con código de país (Ej: 54911xxxxxxx o 346xxxxxx):\n> ');
            const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            console.log(`\n🔑 TU CÓDIGO DE VINCULACIÓN ES: ${code}\n`);
            console.log('Ve a WhatsApp > Dispositivos vinculados > Vincular con el número de teléfono e ingresa ese código.');
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('¡Bot conectado exitosamente con código!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text === '!ping') {
            await sock.sendMessage(from, { text: '¡Pong! 🏓 Funcionando desde código de vinculación.' });
        }
    });
}

connectToWhatsApp();
