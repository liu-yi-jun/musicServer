const crypto = require("crypto");
let key = '0123456789Eigene'
module.exports = {

  // AES 加密
  aesEncrypt (message) {
    const cipher = crypto.createCipheriv("aes128", key, key);
    let crypted = cipher.update(message, "utf8", "hex");
    crypted += cipher.final("hex");
    return crypted;
  },

  // AES 解密
  aesDecrypt (text) {
    const cipher = crypto.createDecipheriv("aes128", key, key);
    let decrypted = cipher.update(text, "hex", "utf8");
    decrypted += cipher.final("utf8");
    return decrypted;
  }
}



