#include <windows.h>
#include <bcrypt.h>
#include <tomcrypt.h>

/*
 * SQLCipher's libtomcrypt provider asks libtomcrypt for entropy. Use the
 * Windows system RNG instead of libtomcrypt's platform probes so the bundled
 * build has no OpenSSL, Perl, NASM or file-descriptor dependency.
 */
unsigned long rng_get_bytes(unsigned char *out, unsigned long outlen, void (*callback)(void)) {
    (void)callback;
    if (out == NULL || outlen == 0) return 0;
    if (BCryptGenRandom(NULL, out, (ULONG)outlen, BCRYPT_USE_SYSTEM_PREFERRED_RNG) != 0) return 0;
    return outlen;
}
