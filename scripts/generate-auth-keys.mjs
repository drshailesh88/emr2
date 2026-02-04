// Script to generate JWT keys for Convex Auth
import { generateKeyPair, exportPKCS8, exportJWK } from "jose";
import { writeFileSync } from "fs";

async function main() {
  // Generate RSA key pair with extractable keys
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });

  // Export private key in PKCS#8 format (for JWT_PRIVATE_KEY)
  const privatePem = await exportPKCS8(privateKey);

  // Export public key in JWK format (for JWKS)
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  publicJwk.kid = "convex-auth-key";

  const jwks = JSON.stringify({ keys: [publicJwk] });

  // Write to temp files
  writeFileSync("/tmp/private.pem", privatePem);
  writeFileSync("/tmp/jwks.json", jwks);

  console.log("Keys generated successfully!");
  console.log("\nFiles written:");
  console.log("  /tmp/private.pem (JWT_PRIVATE_KEY)");
  console.log("  /tmp/jwks.json (JWKS)");
}

main().catch(console.error);
