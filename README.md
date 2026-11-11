# n8n-nodes-ssl-checker

An n8n community node for checking SSL/TLS certificates with [`ssl-checker`](https://www.npmjs.com/package/ssl-checker).

## Features

- Check one hostname or a newline-separated batch.
- HTTPS, SMTP, IMAP, POP3, and FTP via STARTTLS.
- Configure port, HTTPS method, SNI server name, and subject alternative name output.
- Optionally include expiration warnings and a TLS security grade.
- Return certificate validity, dates, issuer, subject, fingerprint, serial number, chain, negotiated TLS details, HSTS, and other fields provided by the dependency.

## Install through n8n

The n8n Community Nodes installer installs packages by npm name; it cannot install this workspace directory or a local tarball. Publish this package to npm first and make sure the n8n instance can reach the registry. Once published, install it without shell access:

1. In n8n, open **Settings** > **Community Nodes** > **Install**.
2. Enter `n8n-nodes-ssl-checker-standalone`, optionally followed by `@version`.
3. Accept the community-node risk notice and select **Install**.

n8n installs the package and its `ssl-checker` dependency. The n8n host must meet the Node.js version required by both n8n and `ssl-checker`.

## Usage

Choose **Check** and provide a hostname without a URL scheme or path, or choose **Check Many** and enter one hostname per line. Each output item contains the hostname plus the fields returned by `ssl-checker`. Batch failures are returned as items with an `error` field so successful checks remain available.

Port `0` uses the dependency's protocol default. The optional TLS grade performs additional active connection probes.