// كشف أي رابط: http(s)، www، روابط دعوة جروبات واتساب، أو روابط اختصار شائعة
const URL_REGEX =
  /((https?:\/\/|www\.)\S+|chat\.whatsapp\.com\/\S+|wa\.me\/\S+|t\.me\/\S+|bit\.ly\/\S+)/i;

function containsLink(text = "") {
  return URL_REGEX.test(text);
}

module.exports = { containsLink };
