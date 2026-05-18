import cryptoJs from "crypto-js";

export function hashToken(token: string) {
  return cryptoJs.SHA256(token).toString(cryptoJs.enc.Hex);
}

export function hashMessage(message: string, secret: string) {
  return cryptoJs.HmacSHA256(message, secret).toString(cryptoJs.enc.Hex);
}
