// Base de datos temporal en memoria (se borra si reinicias el bot, ideal para no usar Mongo)
const usuariosAFK = new Map();

module.exports = {
    async execute(sock, msg, args) {
        const del = msg.key.remoteJid;
        const usuario = msg.key.participant || msg.key.remoteJid;
        const razon = args.join(" ") || "No especificada";

        // Guardamos al usuario en la lista de inactivos
        usuariosAFK.set(usuario, {
            razon: razon,
            tiempo: new Date()
        });

        await sock.sendMessage(del, { 
            text: `💤 *AFK:* Activado. Ahora estás inactivo.\n*Razón:* ${razon}` 
        }, { quoted: msg });
    }
};
