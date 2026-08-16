/**
 * تطبيع النص العربي (وأي نص) عشان نمسك محاولات الالتفاف على الفلتر:
 * - إزالة التشكيل
 * - توحيد أشكال الألف/الياء/الهاء
 * - تقليل تكرار الحروف (مثال: "ولاااااا" -> "ولا")
 * - إزالة الحروف المخفية (Zero-width) والمسافات الزايدة
 */
function normalize(text = "") {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "") // التشكيل
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/(.)\1{2,}/g, "$1") // تقليل الحروف المكررة
    .replace(/[\u200b\u200c\u200d\u200f\u202a-\u202e]/g, "") // حروف مخفية
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // إزالة الرموز والفواصل التي تُستخدم للف على الفلتر (مثل و.ل.ا)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * ⚠️ مهم: هذه القائمة فارغة قصدًا.
 * الألفاظ الممنوعة تختلف بشدة حسب اللهجة ومعايير كل جروب، فالأصح إنك
 * تحط قائمتك الخاصة هنا (أو تجيبها من ملف/قاعدة بيانات خارجية) بدل
 * الاعتماد على قائمة عامة جاهزة. أضف كل كلمة بصيغتها المطبّعة (بدون تشكيل).
 *
 * مثال:
 * const BAD_WORDS = ["كلمة1", "كلمة2", "كلمة3"];
 */
const BAD_WORDS = [];

function containsBadWord(text = "") {
  if (!BAD_WORDS.length) return false;
  const normalized = normalize(text);
  return BAD_WORDS.some((word) => normalized.includes(normalize(word)));
}

module.exports = { containsBadWord, normalize };
