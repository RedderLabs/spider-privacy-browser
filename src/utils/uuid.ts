// RFC 4122 v4 UUID generator for ephemeral, in-memory tab ids.
//
// Prefers crypto.getRandomValues when the runtime provides it (real device
// crypto, a polyfill, or Node's webcrypto under Jest) and degrades to a
// Math.random fallback otherwise. We deliberately do NOT hard-depend on the
// react-native-get-random-values native module: it requires RN >= 0.81 (this
// app is 0.76.9 with the New Architecture) and fails to link here. Tab ids are
// throwaway identifiers, so cryptographic strength is not required — only
// uniqueness within a session.
/* eslint-disable no-bitwise -- RFC 4122 requires bit masking of the random bytes. */

const HEX: string[] = [];
for (let i = 0; i < 256; i++) {
  HEX[i] = (i + 0x100).toString(16).substring(1);
}

const getRandomBytes = (n: number): Uint8Array => {
  const bytes = new Uint8Array(n);
  const c: {getRandomValues?: (a: Uint8Array) => Uint8Array} | undefined = (
    globalThis as any
  ).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
    return bytes;
  }
  // Non-cryptographic fallback — adequate for ephemeral in-memory tab ids.
  for (let i = 0; i < n; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

export const uuidv4 = (): string => {
  const bytes = getRandomBytes(16);

  // Per RFC 4122 §4.4: set version (4) and variant (10xx) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return (
    HEX[bytes[0]] + HEX[bytes[1]] + HEX[bytes[2]] + HEX[bytes[3]] + '-' +
    HEX[bytes[4]] + HEX[bytes[5]] + '-' +
    HEX[bytes[6]] + HEX[bytes[7]] + '-' +
    HEX[bytes[8]] + HEX[bytes[9]] + '-' +
    HEX[bytes[10]] + HEX[bytes[11]] + HEX[bytes[12]] + HEX[bytes[13]] + HEX[bytes[14]] + HEX[bytes[15]]
  );
};
