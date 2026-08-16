const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process'); 

// =========================================
// 🌐 1. خادم الويب
// =========================================
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => { res.send('البوت يعمل بنجاح! الأقفال مكسورة بقوة لينكس 🚀'); });
app.listen(PORT, () => { console.log(`🌍 خادم الويب يعمل على المنفذ ${PORT}`); });

// =========================================
// 🗄️ 2. نظام الذاكرة الدائمة والكاسحة ومكسر الأقفال
// =========================================
const dataPath = fs.existsSync('/data') ? '/data' : __dirname;
const dbFile = path.join(dataPath, 'warnings.json');
const settingsFile = path.join(dataPath, 'settings.json');
const merchantsFile = path.join(dataPath, 'merchants.json');

function safeReadJSON(filePath, defaultValue = {}) {
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8').trim();
            if (!raw) return defaultValue;
            return JSON.parse(raw);
        }
    } catch (e) {}
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
}

let userWarnings = safeReadJSON(dbFile);
function saveWarnings() { fs.writeFileSync(dbFile, JSON.stringify(userWarnings, null, 2)); }
let groupSettings = safeReadJSON(settingsFile);
function saveSettings() { fs.writeFileSync(settingsFile, JSON.stringify(groupSettings, null, 2)); }
let pendingMerchantsData = safeReadJSON(merchantsFile);
const pendingMerchants = {};
function saveMerchants() {
    const toSave = {};
    for (const key in pendingMerchants) { toSave[key] = pendingMerchants[key].expireTime; }
    fs.writeFileSync(merchantsFile, JSON.stringify(toSave, null, 2));
}

function unlockChromiumProfile() {
    try {
        execSync(`find ${dataPath} -name "SingletonLock" -o -name "SingletonCookie" -o -name "SingletonSocket" | xargs rm -rf 2>/dev/null || true`);
        console.log('🔓 تم تدمير الأقفال الوهمية بقوة أوامر لينكس.');
    } catch (err) {
        const pathsToCheck = [
            path.join(dataPath, 'session'),
            path.join(dataPath, 'session', 'Default'),
            path.join(dataPath, '.wwebjs_auth', 'session'),
            path.join(dataPath, '.wwebjs_auth', 'session', 'Default')
        ];
        const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
        pathsToCheck.forEach(dir => {
            lockFiles.forEach(file => {
                try { fs.rmSync(path.join(dir, file), { force: true, recursive: true }); } catch (e) {}
            });
        });
    }
}

function clearChromiumCache() {
    try {
        const paths = [
            path.join(dataPath, 'session', 'Default'),
            path.join(dataPath, '.wwebjs_auth', 'session', 'Default')
        ];
        const junkFolders = ['Cache', 'Code Cache', 'Media Cache', 'GPUCache', 'VideoDecodeStats', path.join('Service Worker', 'CacheStorage'), path.join('Service Worker', 'ScriptCache')];
        paths.forEach(basePath => {
            if (fs.existsSync(basePath)) {
                junkFolders.forEach(folder => {
                    const targetPath = path.join(basePath, folder);
                    if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
                });
            }
        });
        console.log('🧹 تم تنظيف كاش المتصفح.');
    } catch (err) {}
}

unlockChromiumProfile();
clearChromiumCache();

// =========================================
// 🚫 3. نظام Anti-Spam
// =========================================
const spamTracker = {};
const SPAM_LIMIT = 5;       
const SPAM_WINDOW = 10000;  

function isSpamming(senderId) {
    const now = Date.now();
    if (!spamTracker[senderId] || (now - spamTracker[senderId].lastReset > SPAM_WINDOW)) {
        spamTracker[senderId] = { count: 1, lastReset: now };
        return false;
    }
    spamTracker[senderId].count++;
    return spamTracker[senderId].count > SPAM_LIMIT;
}

setInterval(() => {
    let changed = false;
    for (const key in userWarnings) {
        if (userWarnings[key] === 0) { delete userWarnings[key]; changed = true; }
    }
    if (changed) saveWarnings();
    for (const key in spamTracker) { delete spamTracker[key]; }
    unlockChromiumProfile();
    clearChromiumCache(); 
    if (global.gc) { global.gc(); } 
}, 2 * 60 * 60 * 1000); 

// =========================================
// 👑 4. أرقام المالكين (ضع رقمك هنا بعد كشفه)
// =========================================
const MY_ADMIN_NUMBERS =[
    "201092996413",
    "201091885491",
    "27041768431630"
];

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

// =========================================
// 🚀 5. إعدادات البوت والاتصال 
// =========================================
let isReconnecting = false;
let isBotReady = false; 
let connectionAttemptTime = Date.now(); 

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: dataPath }),
    puppeteer: {
        headless: true,
        args:[
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas', 
            '--no-first-run', 
            '--no-zygote', 
            '--disable-gpu',
            '--js-flags="--max-old-space-size=200"', 
            '--disk-cache-size=1',                
            '--disable-application-cache', 
            '--disable-offline-load-stale-cache',
            '--disable-background-timer-throttling', 
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=site-per-process,Translate,OptimizationHints,MediaRouter',
            '--renderer-process-limit=1',
            '--mute-audio'
        ]
    }
});

client.on('qr', qr => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    console.log('🔗 افتح هذا الرابط لمسح الـ QR:\n' + qrUrl);
    try { qrcode.generate(qr, { small: true }); } catch (e) {}
});

client.on('ready', () => {
    console.log('✅ البوت جاهز ومستقر ويعمل الآن.');
    isBotReady = true;
    restoreMerchantTimers();
});

client.on('disconnected', async () => {
    if (isReconnecting) return;
    isReconnecting = true;
    isBotReady = false;
    connectionAttemptTime = Date.now(); 
    try { await client.destroy(); } catch (err) {}
    setTimeout(async () => {
        unlockChromiumProfile(); 
        try { await client.initialize(); } catch (err) {}
        isReconnecting = false;
    }, 5000);
});

// =========================================
// ⏱️ 6. كلب الحراسة ومراقبة الرام
// =========================================
setInterval(() => {
    if (!isBotReady && (Date.now() - connectionAttemptTime > 6 * 60 * 1000)) process.exit(1); 
}, 60 * 1000); 

setInterval(async () => {
    const memoryUsageMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    if (memoryUsageMB > 250 && !isReconnecting) {
        isReconnecting = true; isBotReady = false; connectionAttemptTime = Date.now();
        try {
            await client.destroy(); 
            unlockChromiumProfile(); clearChromiumCache(); if (global.gc) { global.gc(); }
            setTimeout(async () => { try { await client.initialize(); } catch (err) {} isReconnecting = false; }, 5000);
        } catch (e) { isReconnecting = false; }
    }
}, 3 * 60 * 1000); 

// =========================================
// ⚙️ 8. القوانين والكلمات المسيئة
// =========================================
const botPrefix = "بوت دارك فاير | Dark Fire Bot \n\n";
const rulesText = `لائحة القوانين:\n1. ممنوع إرسال لينكات 🟥\n2. شتائم = كيك (طرد) 🟥\n3. ممنوع منشن للكل 🟥\n4. صلِّ على النبي واذكر الله.`;
const badWords =['شرموط', 'متناك', 'هنيكك', 'معرص', 'عرص', 'خول', 'علق', 'زاني', 'زانية', 'سكس', 'كسمك', 'كشمك', 'كس','كسم امك','يكسمك','يمتناك','العرص','يمعرص','قحبة','متناكين'];

function cleanText(text) {
    let t = text.toLowerCase().replace(/[\u0617-\u061A\u064B-\u0652]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
    return t.replace(/[^a-zA-Z\u0621-\u064A\s]/g, "").replace(/(.)\1+/gu, "$1");
}
const cleanedBadWords = badWords.map(word => cleanText(word));
function containsBadWordSmart(messageText) {
    const cleanedMessage = cleanText(messageText);
    const messageWords = cleanedMessage.split(/\s+/);
    return messageWords.some(userWord => cleanedBadWords.some(badWord => {
        let strippedWord = userWord.replace(/^(ال|و|ف|ب|ك|ل)+/, '');
        return userWord === badWord || strippedWord === badWord;
    }));
}

// =========================================
// 🛡️ 9. نظام التجار
// =========================================
async function restoreMerchantTimers() {
    const now = Date.now();
    for (const userKey in pendingMerchantsData) {
        const expireTime = pendingMerchantsData[userKey];
        const remaining = expireTime - now;
        const parts = userKey.split('_SPLIT_');
        const chatId = parts[0], userId = parts[1];

        if (remaining <= 0) {
            try {
                const chat = await client.getChatById(chatId);
                const botId = client.info.wid._serialized.replace(/:\d+/, "");
                if(chat.participants.some(p => p.id._serialized === botId && (p.isAdmin || p.isSuperAdmin))) await chat.removeParticipants([userId]);
            } catch (err) {}
            delete pendingMerchantsData[userKey];
        } else {
            const kickTimer = setTimeout(async () => {
                if (pendingMerchants[userKey]) {
                    try {
                        const chat = await client.getChatById(chatId);
                        const userNumber = userId.split('@')[0];
                        const botId = client.info.wid._serialized.replace(/:\d+/, "");
                        if(chat.participants.some(p => p.id._serialized === botId && (p.isAdmin || p.isSuperAdmin))) {
                            await chat.removeParticipants([userId]);
                            await chat.sendMessage(`${botPrefix}🚫 تم طرد (@${userNumber}) لتجاوزه المهلة بدون توثيق.`, { mentions: [userId] });
                        }
                    } catch (err) {}
                    delete pendingMerchants[userKey]; delete pendingMerchantsData[userKey]; saveMerchants();
                }
            }, remaining);
            pendingMerchants[userKey] = { warningTimer: null, kickTimer, expireTime };
        }
    }
    saveMerchants();
}

client.on('group_join', async (notification) => {
    try {
        const chatId = notification.chatId;
        const settings = groupSettings[chatId];
        if (!settings || !settings.merchant || !settings.expireAt || Date.now() > settings.expireAt) return;

        for (const joinedUserId of notification.recipientIds) {
            const userNumber = joinedUserId.split('@')[0];
            if (MY_ADMIN_NUMBERS.includes(userNumber)) continue;

            const chat = await client.getChatById(chatId);
            const welcomeMsg = `${botPrefix}أهلاً بك (@${userNumber}) في جروب التجار!\nأمامك (30 دقيقة) لعمل منشن لـ 5 تجار وإلا سيتم طردك.`;
            await chat.sendMessage(welcomeMsg, { mentions: [joinedUserId] });

            const userKey = `${chatId}_SPLIT_${joinedUserId}`;
            const expireTime = Date.now() + (30 * 60 * 1000); 

            const kickTimer = setTimeout(async () => {
                if (pendingMerchants[userKey]) {
                    try {
                        const botId = client.info.wid._serialized.replace(/:\d+/, "");
                        if (chat.participants.some(p => p.id._serialized === botId && (p.isAdmin || p.isSuperAdmin))) {
                            await chat.removeParticipants([joinedUserId]);
                            await chat.sendMessage(`${botPrefix}🚫 تم طرد (@${userNumber}) لعدم التوثيق.`, { mentions:[joinedUserId] });
                        }
                    } catch (err) {}
                    delete pendingMerchants[userKey]; delete pendingMerchantsData[userKey]; saveMerchants();
                }
            }, 30 * 60 * 1000); 

            pendingMerchants[userKey] = { warningTimer: null, kickTimer, expireTime };
            pendingMerchantsData[userKey] = expireTime; saveMerchants();
        }
    } catch (error) {}
});

// =========================================
// 📩 10. نظام استقبال الرسائل والأوامر
// =========================================
client.on('message_create', async msg => {
    try {
        if (!msg || msg.isStatus || msg.from === 'status@broadcast') return;

        let chat;
        try { chat = await msg.getChat(); } catch (e) { return; } 
        if (!chat || !chat.id) return;
        
        let rawSenderId = msg.fromMe ? (msg.from || msg.to) : (msg.author || msg.from);
        if (msg.fromMe && client.info && client.info.wid) { rawSenderId = client.info.wid._serialized; }
        if (!rawSenderId) return; 
        
        // استخراج الرقم بشكل نقي جداً (أرقام فقط)
        let senderId = rawSenderId.replace(/:\d+/, "");
        let senderNumber = senderId.split('@')[0].replace(/\D/g, "");

        const text = msg.body ? msg.body.trim() : "";
        if (!text && !msg.hasMedia) return;

        // 🔥 الأمر السحري الجديد: اكشف رقمك الحقيقي (يعمل للجميع في الخاص والجروب)
        if (text === '!رقمي' || text === '!معلوماتي') {
            await msg.reply(`🤖 أهلاً بك!\nالرقم الخاص بك كما يقرأه البوت هو:\n*${senderNumber}*\n\n(انسخ هذا الرقم وضعه في قائمة MY_ADMIN_NUMBERS في الكود لتصبح المالك)`);
            return;
        }

        // التحقق من المالك بشكل أكثر مرونة
        const isBotOwner = msg.fromMe || MY_ADMIN_NUMBERS.some(admin => senderNumber.includes(admin) || admin.includes(senderNumber));

        // منع استجابة البوت في الخاص إلا للمالك
        if (!chat.isGroup && !isBotOwner) return;

        if (isBotOwner) {
            if (text === '!كل الجروبات' || text === '!الجروبات') {
                await chat.sendMessage(`${botPrefix}⏳ جاري جمع البيانات...`);
                let report = `${botPrefix}📋 *تقرير الجروبات:*\n\n`;
                let active = 0, expired = 0, allChats =[];
                try { allChats = await client.getChats(); } catch(e) {}
                for (const gId in groupSettings) {
                    const gs = groupSettings[gId];
                    if (!gs.expireAt) continue;
                    let groupName = "غير معروف";
                    const targetChat = allChats.find(c => c.id._serialized === gId);
                    if (targetChat && targetChat.name) groupName = targetChat.name;
                    
                    if (gs.expireAt > Date.now()) { active++; report += `🟢 ${groupName}\n`; } 
                    else { expired++; report += `🔴 ${groupName}\n`; }
                }
                await chat.sendMessage(report + `\nمفعل: ${active} | منتهي: ${expired}`); return;
            }

            if (text.startsWith('!اذاعة')) {
                const isGeneralBroadcast = text.startsWith('!اذاعة عامة');
                const broadcastText = text.replace(isGeneralBroadcast ? '!اذاعة عامة' : '!اذاعة', '').trim();
                if (!broadcastText && !msg.hasMedia) return await chat.sendMessage(`⚠️ خطأ! اكتب الرسالة مع الأمر.`);
                
                await chat.sendMessage(`${botPrefix}⏳ جاري الإذاعة...`);
                let targetGroups =[], allChats =[];
                try { allChats = await client.getChats(); } catch(e) {}

                if (isGeneralBroadcast) targetGroups = allChats.filter(c => c.isGroup).map(c => c.id._serialized);
                else for (const gId in groupSettings) { if (groupSettings[gId].expireAt > Date.now()) targetGroups.push(gId); }

                targetGroups =[...new Set(targetGroups)];
                if (targetGroups.length === 0) return await chat.sendMessage(`❌ لا توجد جروبات.`);

                let media = null; if (msg.hasMedia) { try { media = await msg.downloadMedia(); } catch (e) {} }
                const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
                let success = 0;

                for (const gId of targetGroups) {
                    try {
                        const targetChat = await client.getChatById(gId);
                        if (media) await targetChat.sendMessage(media, { caption: broadcastText });
                        else await targetChat.sendMessage(broadcastText);
                        success++; await sleep(3000);
                    } catch (err) {}
                }
                await chat.sendMessage(`📢 تمت الإذاعة بنجاح لـ ${success} جروب.`); return;
            }

            if (!chat.isGroup) {
                if (text.startsWith('!تفعيل') || text.startsWith('!ايقاف') || text === '!فحص' || text === '!صلاحياتي') {
                    await chat.sendMessage(`⚠️ هذه الأوامر تعمل داخل الجروبات فقط.`); return;
                }
            }
        }

        if (!chat.isGroup) return;

        const chatId = chat.id._serialized;
        let botIsAdmin = false;
        try {
            const botId = client.info.wid._serialized.replace(/:\d+/, "");
            botIsAdmin = chat.participants.some(p => p.id._serialized === botId && (p.isAdmin || p.isSuperAdmin));
        } catch(e) {}
        const isSenderAdmin = chat.participants.some(p => p.id._serialized === senderId && (p.isAdmin || p.isSuperAdmin));

        if (!groupSettings[chatId]) groupSettings[chatId] = { links: false, swear: false, merchant: false, stickers: false, antiMention: false, linkAction: 'kick', expireAt: null, expiredNotified: false };

        if (isBotOwner) {
            if (text === '!صلاحياتي') return await chat.sendMessage(`${botPrefix}🔍 أنت المالك ✅ | المشرف: ${isSenderAdmin ? 'نعم':'لا'}`);
            if (text === '!تفعيل الروابط') { groupSettings[chatId].links = true; saveSettings(); return await chat.sendMessage(`✅ تم التفعيل`); }
            if (text === '!ايقاف الروابط') { groupSettings[chatId].links = false; saveSettings(); return await chat.sendMessage(`🛑 تم الإيقاف`); }
            if (text === '!تفعيل الشتائم') { groupSettings[chatId].swear = true; saveSettings(); return await chat.sendMessage(`✅ تم التفعيل`); }
            if (text === '!ايقاف الشتائم') { groupSettings[chatId].swear = false; saveSettings(); return await chat.sendMessage(`🛑 تم الإيقاف`); }
            if (text === '!تفعيل التجار') { groupSettings[chatId].merchant = true; saveSettings(); return await chat.sendMessage(`✅ تم التفعيل`); }
            if (text === '!ايقاف التجار') { groupSettings[chatId].merchant = false; saveSettings(); return await chat.sendMessage(`🛑 تم الإيقاف`); }
            if (text === '!تفعيل الملصقات') { groupSettings[chatId].stickers = true; saveSettings(); return await chat.sendMessage(`✅ تم التفعيل`); }
            if (text === '!ايقاف الملصقات') { groupSettings[chatId].stickers = false; saveSettings(); return await chat.sendMessage(`🛑 تم الإيقاف`); }
            if (text === '!تفعيل المنشن للاعضاء') { groupSettings[chatId].antiMention = 'members'; saveSettings(); return await chat.sendMessage(`✅ تم التفعيل`); }
            if (text === '!تفعيل المنشن للكل') { groupSettings[chatId].antiMention = 'all'; saveSettings(); return await chat.sendMessage(`✅ تم التفعيل`); }
            if (text === '!ايقاف المنشن') { groupSettings[chatId].antiMention = false; saveSettings(); return await chat.sendMessage(`🛑 تم الإيقاف`); }
            if (text === '!نظام الروابط طرد') { groupSettings[chatId].linkAction = 'kick'; saveSettings(); return await chat.sendMessage(`⚙️ النظام: طرد`); }
            if (text === '!نظام الروابط حذف') { groupSettings[chatId].linkAction = 'deleteOnly'; saveSettings(); return await chat.sendMessage(`⚙️ النظام: حذف`); }

            if (text === '!تفعيل الكل') {
                groupSettings[chatId].expireAt = Date.now() + (3650 * 24 * 60 * 60 * 1000);
                groupSettings[chatId].links = true; groupSettings[chatId].swear = true; groupSettings[chatId].merchant = true; groupSettings[chatId].stickers = true; groupSettings[chatId].antiMention = 'members'; groupSettings[chatId].expiredNotified = false; saveSettings();
                return await chat.sendMessage(`${botPrefix}✅🔥 تم تفعيل جميع الميزات كباقة مدى الحياة!`); 
            }

            if (text.startsWith('!تفعيل ')) {
                const parts = text.split(' '); const packageType = parts[1];
                let daysToAdd = packageType === '1' ? 5 : packageType === '2' ? 7 : packageType === '3' ? 30 : 0;
                if (daysToAdd > 0) {
                    groupSettings[chatId].expireAt = Date.now() + (daysToAdd * 24 * 60 * 60 * 1000);
                    groupSettings[chatId].links = true; groupSettings[chatId].swear = true; groupSettings[chatId].merchant = true; groupSettings[chatId].stickers = true; groupSettings[chatId].antiMention = 'members'; groupSettings[chatId].expiredNotified = false; saveSettings();
                    return await chat.sendMessage(`✅ تم التفعيل لمدة ${daysToAdd} يوم.`); 
                }
            }

            if (text === '!ايقاف الكل' || text === '!الغاء الاشتراك' || text === '!ايقاف الاشتراك') {
                groupSettings[chatId].expireAt = Date.now() - 1000; groupSettings[chatId].expiredNotified = true; 
                groupSettings[chatId].links = false; groupSettings[chatId].swear = false; groupSettings[chatId].merchant = false; groupSettings[chatId].stickers = false; groupSettings[chatId].antiMention = false; saveSettings();
                return await chat.sendMessage(`🛑 تم إيقاف جميع الميزات.`);
            }

            if (text === '!فحص') return await chat.sendMessage(`${botPrefix}📊 الجروب ${groupSettings[chatId].expireAt > Date.now() ? 'مفعل ✅' : 'منتهي ❌'}`);
        }

        const settings = groupSettings[chatId];
        if (!settings.expireAt) return; 
        if (Date.now() > settings.expireAt) {
            if (!settings.expiredNotified) { groupSettings[chatId].expiredNotified = true; saveSettings(); try { await chat.sendMessage(`⚠️ انتهى الاشتراك.`); } catch (e) {} }
            return; 
        }

        if (text === '!قوانين') return await chat.sendMessage(`${botPrefix}${rulesText}`); 
        
        const isolatedUserKey = `${chatId}_${senderId}`; 
        if (text === '!انذاراتي') return await chat.sendMessage(`${botPrefix}⚠️ إنذاراتك: ${userWarnings[isolatedUserKey] || 0}`, { mentions:[senderId] });

        if (text === '!ملصق' && settings.stickers) {
            try {
                let targetMsg = msg.hasQuotedMsg ? await msg.getQuotedMessage() : msg;
                if (targetMsg.hasMedia) {
                    const media = await targetMsg.downloadMedia();
                    if (media) await chat.sendMessage(media, { sendMediaAsSticker: true, stickerName: 'دارك فاير' });
                }
            } catch (error) {} return;
        }

        if (settings.merchant && pendingMerchants[`${chatId}_SPLIT_${senderId}`]) {
            const mentions = await msg.getMentions();
            if (mentions && [...new Set(mentions.map(m => m.id._serialized))].length >= 5) {
                clearTimeout(pendingMerchants[`${chatId}_SPLIT_${senderId}`].kickTimer);
                delete pendingMerchants[`${chatId}_SPLIT_${senderId}`]; delete pendingMerchantsData[`${chatId}_SPLIT_${senderId}`]; saveMerchants();
                await chat.sendMessage(`${botPrefix}✅ تم توثيقك.`);
            }
        }

        if (settings.antiMention) {
            if (text.includes('@الكل') || text.includes('@all') || text.includes('@everyone')) {
                if (settings.antiMention === 'all' || ((settings.antiMention === 'members' || settings.antiMention === true) && !isSenderAdmin)) {
                    if (botIsAdmin) try { await msg.delete(true); } catch (e) {}
                    return await chat.sendMessage(`${botPrefix}⚠️ يُمنع استخدام منشن الكل هنا.`, { mentions:[senderId] });
                }
            }
        }

        if (isSenderAdmin) return; 

        if (isSpamming(senderId)) {
            if (botIsAdmin) try { await msg.delete(true); } catch (e) {}
            if (spamTracker[senderId].count === SPAM_LIMIT + 1) await chat.sendMessage(`${botPrefix}⚠️ توقف عن السبام!`, { mentions:[senderId] });
            return; 
        }

        if (settings.swear && containsBadWordSmart(msg.body)) {
            if (botIsAdmin) try { await msg.delete(true); } catch (e) {}
            return await chat.sendMessage(`${botPrefix}⚠️ عيب يا (@${senderNumber})! لا تشتم.`, { mentions:[senderId] });
        }

        if (settings.links && /(https?:\/\/[^\s]+)/i.test(msg.body)) {
            if (botIsAdmin) try { await msg.delete(true); } catch (e) {}
            if (settings.linkAction === 'deleteOnly') {
                return await chat.sendMessage(`${botPrefix}⚠️ ممنوع الروابط.`, { mentions:[senderId] });
            } else {
                userWarnings[isolatedUserKey] = (userWarnings[isolatedUserKey] || 0) + 1; saveWarnings();
                if (userWarnings[isolatedUserKey] < 3) return await chat.sendMessage(`${botPrefix}⚠️ إنذار ${userWarnings[isolatedUserKey]}/3 للروابط.`, { mentions:[senderId] });
                else {
                    if (botIsAdmin) {
                        try { await chat.removeParticipants([senderId]); userWarnings[isolatedUserKey] = 0; saveWarnings(); } catch (e) {}
                        return await chat.sendMessage(`${botPrefix}🚫 تم طرد (@${senderNumber}) بسبب الروابط.`, { mentions:[senderId] });
                    }
                }
            }
        }
    } catch (err) {}
});

client.initialize();
process.on('SIGINT', async () => { try { await client.destroy(); process.exit(0); } catch (err) { process.exit(1); } });
