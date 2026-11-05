# OmniMed Core local code signing

The public root certificate in this folder is used to trust locally signed OmniMed Core builds:

```text
MediCore-CodeSigning.cer
Subject:    CN=MediCore Local Code Signing, O=MediCore, C=IN
Thumbprint: 1180CA1A9509C9E968DED5E4274C89410AC52584
Valid to:   2031-11-03
```

This is a **self-signed local certificate**, not a public CA certificate. Windows trusts a signed
OmniMed Core build only after this certificate is installed on the client machine.

The certificate subject and filename retain the original MediCore naming for continuity; rotating the
subject would require distributing a new root certificate.

## Client installation

Install once on each client Windows machine. Administrator PowerShell:

```powershell
certutil -addstore -f Root .\MediCore-CodeSigning.cer
certutil -addstore -f TrustedPublisher .\MediCore-CodeSigning.cer
```

Per-user alternative without administrator rights:

```powershell
certutil -user -addstore -f Root .\MediCore-CodeSigning.cer
certutil -user -addstore -f TrustedPublisher .\MediCore-CodeSigning.cer
```

After installation, verify a downloaded installer or the installed app:

```powershell
Get-AuthenticodeSignature .\MediCore_0.4.1_x64-setup.exe
Get-AuthenticodeSignature "$env:LOCALAPPDATA\MediCore\medicore.exe"
```

Expected `Status`: `Valid`.

## Private key handling

Do **not** commit the private key or PFX. The developer signing material is stored outside the repository:

```text
%LOCALAPPDATA%\MediCore\CodeSigning\MediCore-CodeSigning.pfx
%LOCALAPPDATA%\MediCore\CodeSigning\pfx-password.txt
%LOCALAPPDATA%\MediCore\CodeSigning\thumbprint.txt
```

Back up these files securely. Losing the private key means future builds cannot use this root; losing
the password makes the PFX unusable for another machine. The certificate can be recreated, but clients
would need to install the new root certificate.

## Production note

A self-signed root is suitable for controlled client machines where IT installs the root certificate.
For general distribution, use a publicly trusted Windows code-signing certificate/HSM. Do not claim
SmartScreen reputation or public trust from this local certificate alone.
