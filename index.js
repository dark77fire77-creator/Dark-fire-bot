const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const pino = require("pino");

const { containsLink } = require("./filters/linkFilter");
const { containsBadWord } = require("./filters/wordFilter");

// ================== إعدادات قابلة للتعديل ==================
const CONFIG = {
  deleteViolatingMessage: true, // احذف الرسالة المخالفة (يتطلب أن يكون البوت أدمن)
  kickOnViolation: true, // فعّل الطرد التلقائي
  warnBeforeKick: true, // أول مخالفة = تحذير، تاني مخالفة = طرد
  allowedGroups: [], // فارغة = يعمل في كل الجروبات. أو حط: ["12036xxxxxxx-xxxxx@g.us"]
  exemptNumbers: [], // أرقام مستثناة من الفحص (أدمنية الجروب) بصيغة "2010xxxxxxx@s.whatsapp.net"
};
// =============================================================

const warnings = new Map(); // senderId -> عدد المخالفات

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }), // غيّرها لـ "info" لو حابب تشوف اللوجات
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("امسح كود QR ده من واتساب (أجهزة مرتبطة > ربط جهاز):");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("الاتصال اتقفل. إعادة المحاولة:", shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("✅ البوت شغال ومتصل بواتساب");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const chatId = msg.key.remoteJid || "";
    const isGroup = chatId.endsWith("@g.us");
    if (!isGroup) return; // نراقب الجروبات بس

    if (CONFIG.allowedGroups.length && !CONFIG.allowedGroups.includes(chatId)) {
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    if (CONFIG.exemptNumbers.includes(senderId)) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      "";

    const isViolation = containsLink(text) || containsBadWord(text);
    if (!isViolation) return;

    try {
      // 1) حذف الرسالة المخالفة
      if (CONFIG.deleteViolatingMessage) {
        await sock.sendMessage(chatId, { delete: msg.key });
      }

      if (!CONFIG.kickOnViolation) return;

      const count = (warnings.get(senderId) || 0) + 1;
      warnings.set(senderId, count);

      if (CONFIG.warnBeforeKick && count === 1) {
        // تحذير أول مرة
        await sock.sendMessage(chatId, {
          text: `⚠️ @${senderId.split("@")[0]} تم حذف رسالتك (روابط/ألفاظ ممنوعة). تكرار المخالفة = طرد فوري.`,
          mentions: [senderId],
        });
      } else {
        // طرد (يتطلب أن يكون البوت أدمن في الجروب)
        await sock.groupParticipantsUpdate(chatId, [senderId], "remove");
        warnings.delete(senderId);
        console.log(`تم طرد ${senderId} من ${chatId}`);
      }
    } catch (err) {
      console.error("حصل خطأ أثناء تنفيذ الإجراء:", err?.message || err);
    }
  });
}

startBot();
