module.exports = {
    async execute(sock, msg, args) {
        const del = msg.key.remoteJid; // ID del chat de donde vino el mensaje
        
        // Responder al mensaje
        await sock.sendMessage(del, { text: '¡Hola! Soy tu bot de WhatsApp.' }, { quoted: msg });
    }
};
