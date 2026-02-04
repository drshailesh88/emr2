# Lessons Learned

This file captures patterns and rules learned from corrections during development.
Review this at the start of each session.

## Patterns to Avoid

### 1. Marking tasks complete without testing (2024-02-04)
**What happened:** Marked Tasks #5 and #6 (Convex Auth, Login/Signup) as complete without testing. User encountered multiple errors:
- Missing `JWT_PRIVATE_KEY` environment variable
- Wrong key format (needed RSA PKCS#8, not Ed25519)
- Missing `JWKS` environment variable
- Signup flow broken, wasting user's time

**Rule:** NEVER mark a task complete without actually testing it works as a user would.

## Patterns to Follow

### 1. Ralph Wiggum Protocol (MANDATORY for all features)
```
1. Implement the feature
2. TEST AS USER (click through the UI manually OR run Playwright)
3. If fails → fix → retest (loop max 10 times)
4. If passes → git commit → mark complete
5. NEVER skip step 2
```

### 2. For Auth Flows Specifically
Before marking auth-related tasks complete:
- [ ] Clear any test data
- [ ] Sign up with fresh test account
- [ ] Verify redirect to dashboard works
- [ ] Verify user appears in database
- [ ] Test logout works
- [ ] Test login with same account works

## Project-Specific Rules

### Convex Auth Environment Variables Required
```bash
# Generate and set RSA key for JWT signing
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out /tmp/key.pem
npx convex env set JWT_PRIVATE_KEY -- "$(cat /tmp/key.pem)"

# Generate JWKS from the private key (public key in JWK format)
# Required for token verification
npx convex env set JWKS '{"keys":[...]}'
```

---
*Update this file after ANY correction from the user*
