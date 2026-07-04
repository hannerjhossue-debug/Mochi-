const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const conectarDB = require('./database');

async function iniciarBot() {
    // 1. Conectar a la base de datos Atlas
    await conectarDB();

    // 2. Configuración de autenticación
    const { state, saveCreds } = await useMultiFileAuthState('auth_maruchan');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false, // Lo manejamos manual abajo para evitar errores
        browser: ['Maruchan Bot', 'Safari', '3.0']
    });

    sock.ev.on('creds.update', saveCreds);

    // 3. CARGADOR DE PLUGINS (Lectura de archivos)
    const plugins = {};
    if (!fs.existsSync('./plugins')) {
        fs.mkdirSync('./plugins'); // Crea la carpeta si no existe
    }

    const cargarPlugins = () => {
        const archivos = fs.readdirSync('./plugins').filter(file => file.endsWith('.js'));
        for (const file of archivos) {
            delete require.cache[require.resolve(`./plugins/${file}`)]; // Limpia caché para recargar
            const command = require(`./plugins/${file}`);
            plugins[command.name] = command;
        }
        console.log(`✅ [SISTEMA] ${archivos.length} Plugins cargados correctamente`);
    };
    
    cargarPlugins();

    // 4. Manejo de conexión y QR
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('✨ ESCANEA EL QR CON TU WHATSAPP (Prefijo: / ) :');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const razon = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(`❌ Conexión cerrada. Razón: ${razon}. Reconectando...`);
            if (razon !== DisconnectReason.loggedOut) {
                iniciarBot();
            }
        } else if (connection === 'open') {
            console.log('✅ [SISTEMA] Maruchan Bot conectado con éxito y listo para usar');
        }
    });

    // 5. Escucha de mensajes con Prefijo
    sock.ev.on('messages.upsert', async chatUpdate => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message || m.key.fromMe) return;

            const from = m.key.remoteJid;
            const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
            
            // --- LÓGICA DE PREFIJO ---
            const prefix = '/'; 
            if (!body.startsWith(prefix)) return;

            // Separar comando y texto
            const comandoNombre = body.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
            const args = body.trim().split(/ +/).slice(1);
            const texto = args.join(' ');

            // Buscar plugin por nombre o alias
            const plugin = Object.values(plugins).find(p => 
                p.name === comandoNombre || (p.alias && p.alias.includes(comandoNombre))
            );
            
            if (plugin) {
                await plugin.run(sock, m, texto);
            }
        } catch (err) {
            console.log('❌ Error en el procesador de comandos:', err);
        }
    });
}

// Arrancar el bot
iniciarBot();
