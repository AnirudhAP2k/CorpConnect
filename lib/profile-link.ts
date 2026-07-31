import CryptoJS from "crypto-js";

const TOKEN_PREFIX = "u1";
const IV_WORDS = 4; // 128-bit IV
const IV_BYTES = IV_WORDS * 4;

function getSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET is not set");
    return secret;
}

function getKey() {
    return CryptoJS.SHA256(`${getSecret()}:public-profile`);
}

/**
 * A per-user IV keeps the link stable, so the same profile always shares the
 * same URL instead of producing a new one on every copy.
 */
function getIv(userId: string) {
    const digest = CryptoJS.HmacSHA256(`iv:${userId}`, getSecret());
    return CryptoJS.lib.WordArray.create(digest.words.slice(0, IV_WORDS), IV_BYTES);
}

function toBase64Url(wordArray: CryptoJS.lib.WordArray): string {
    return wordArray
        .toString(CryptoJS.enc.Base64)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return CryptoJS.enc.Base64.parse(padded);
}

/**
 * Encrypts a user ID into an opaque, URL-safe token for public profile links.
 */
export function encodeProfileToken(userId: string): string {
    const iv = getIv(userId);
    const { ciphertext } = CryptoJS.AES.encrypt(userId, getKey(), {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    // `concat` mutates its receiver, so start from a copy of the IV.
    const payload = iv.clone().concat(ciphertext);

    return `${TOKEN_PREFIX}${toBase64Url(payload)}`;
}

/**
 * Reverses `encodeProfileToken`. Returns null when the token is malformed or
 * was not produced by this deployment's secret.
 */
export function decodeProfileToken(token: string): string | null {
    if (!token.startsWith(TOKEN_PREFIX)) return null;

    try {
        const payload = fromBase64Url(token.slice(TOKEN_PREFIX.length));
        if (payload.sigBytes <= IV_BYTES) return null;

        const iv = CryptoJS.lib.WordArray.create(payload.words.slice(0, IV_WORDS), IV_BYTES);
        const ciphertext = CryptoJS.lib.WordArray.create(
            payload.words.slice(IV_WORDS),
            payload.sigBytes - IV_BYTES
        );

        const decrypted = CryptoJS.AES.decrypt(
            CryptoJS.lib.CipherParams.create({ ciphertext }),
            getKey(),
            { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        const userId = decrypted.toString(CryptoJS.enc.Utf8);
        if (!userId) return null;

        // Re-encoding proves the IV matches this user, so a tampered token fails.
        return encodeProfileToken(userId) === token ? userId : null;
    } catch {
        return null;
    }
}

/**
 * Absolute, shareable URL for a user's public profile.
 */
export function getPublicProfileUrl(userId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${baseUrl.replace(/\/$/, "")}/u/${encodeProfileToken(userId)}`;
}
