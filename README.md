# DDezinformacja

Check a news link against public sources. The interface is Polish by default, with an English toggle.

Enter a news link. Four checks run together. Each one has its own card, and a newer submit cancels the previous lookup.

`BaseCheckService` looks up the site's registered domain over RDAP, the HTTP/JSON successor of WHOIS. Subdomains are reduced to the registrable name, and multi-part public suffixes stay intact: `przegladsportowy.onet.pl` is queried as `onet.pl`, `news.bbc.co.uk` as `bbc.co.uk`, and `news.example.com.pl` as `example.com.pl`. A host that is only `www` plus a public suffix (`www.gov.pl`) is queried as registered. The browser calls the [rdap.org](https://rdap.org/) bootstrap (`https://rdap.org/domain/<domain>`), which redirects to the registry's RDAP server. The result card shows the registrar, registration date, domain age, expiry, last update, registrant organization and country when the registry publishes them, nameservers, and status.

Registries often redact contact data. Thin registries such as Verisign (`.com`, `.net`) do not publish the registrant at all. A domain registered less than a year ago, and a registrant with no published organization, are marked on the card. The card opens with a plain-language summary. Each field label has an info button with a one-line explanation, and common status codes show their meaning the same way. A TLD with no RDAP service, a rate limit, or a network failure is explained on the card instead of shown as an empty result.

The other three cards use the same shell:

- **CERT Polska warning list.** The browser asks `GET /api/cert?domain=...` on this app's own server. The server downloads [the public feed](https://hole.cert.pl/domains/v2/domains.txt), keeps it in memory, and refreshes it every 30 minutes. A refresh sends the saved `ETag` and `Last-Modified` header, and a `304` keeps the current copy. A failed refresh also keeps the current copy. The check looks at the host, each parent, and the registrable domain, and it also tries a `www.` form of those names. A listed child does not flag its parent. A hit is a warning. No hit is a calm "not on the CERT Polska warning list". The card says the list is about phishing and scams, not whether a news story is true. [About the list](https://cert.pl/lista-ostrzezen/).
- **Wayback Machine.** The browser calls `GET /api/wayback?target=...`. The server asks the [CDX API](https://archive.org/help/wayback_api.php) for the earliest saved copy of the site root, and for the exact URL when the link has a path. CDX answers do not include a CORS header, so the browser cannot read them itself. A failed call is tried once more. The card shows that date and a link to the copy. No capture, and a lookup error, each get their own message.
- **Tranco.** The browser calls [`/api/ranks/domain/{domain}`](https://tranco-list.eu/api_documentation) once per lookup, for the registrable domain. The card shows the newest rank, or "not in the top 1 million". Calls are spaced at one per second, which is the list's limit. The info button explains what the rank means.

The page uses Inter (self-hosted, regular through semibold) and follows the system light or dark setting. Result sections share the `.report-card` styles in `src/styles.scss`. On a wide window the three extra checks sit in a row. On a narrow window they stack.

The language toggle is stored in `localStorage` and restored on startup. It defaults to Polish (`pl`).

## Tech stack

- Angular 22, Angular Material, and Angular CDK
- `@ngx-translate/core` for PL/EN
- A small Node.js server in `server/` for the CERT Polska list and the Wayback lookup (no extra runtime dependencies)
- Vitest via the `@angular/build:unit-test` builder, and Vitest again for the server
- Prettier

## Install

```bash
npm ci
```

## Development

The CERT check needs the API. The dev server proxies `/api` to it (`proxy.conf.json`, port 3333).

One command starts both:

```bash
npm run dev
```

Open `http://localhost:4200/`. The app reloads when you change a source file. The API restarts when you stop the command.

On Windows PowerShell, from the project folder:

```powershell
npm ci
npm run dev
```

Then open `http://localhost:4200/`.

To run them in two terminals instead:

```powershell
npm run start:api
```

```powershell
npm start
```

`npm start` alone still serves the Angular app, but the CERT and Wayback cards will show that their lookup could not be reached. Tranco is called from the browser, so it does not need the API.

The API reads these environment variables:

| Variable          | Default                                       | Meaning                                              |
| ----------------- | --------------------------------------------- | ---------------------------------------------------- |
| `PORT`            | `3333`                                        | Port the API listens on. The dev proxy expects 3333. |
| `CERT_FEED_URL`   | `https://hole.cert.pl/domains/v2/domains.txt` | Warning list feed.                                   |
| `CERT_REFRESH_MS` | `1800000`                                     | How often to refresh the list (30 minutes).          |
| `STATIC_DIR`      | unset                                         | Folder of built files to serve next to `/api`.       |

In PowerShell, set a variable for the current window with `$env:PORT = "3333"`.

## Tests

```bash
npm test
npm run test:server
```

`npm test` runs the Angular unit tests. `npm run test:server` runs the CERT list matching, cache, and HTTP tests. HTTP tests use a fake feed, not the live list.

## Format

Check formatting:

```bash
npx prettier . --check
```

Write formatting:

```bash
npx prettier . --write
```

## Production build

```bash
npm run build
npm run build:server
```

The Angular build is written to `dist/ddezinformacja/browser`. The API build is written to `server/dist`.

## Deployment

Run one Node process for the API. Give it the built app if you want the same process to serve the pages:

```powershell
npm ci
npm run build
npm run build:server
$env:STATIC_DIR = "dist/ddezinformacja/browser"
$env:PORT = "3333"
node server/dist/index.js
```

Open `http://localhost:3333/`. `GET /api/health` returns `{ "ok": true }` when the process is up. The warning list loads on startup and then refreshes in memory. Restarting the process downloads it again.

You can also host the `dist/ddezinformacja/browser` files on their own and proxy only `/api` to the Node process. The Angular app calls `/api/cert` and `/api/wayback` on the same origin. The API calls `web.archive.org` for Wayback. Tranco is called from the visitor's browser, so the page needs to be allowed to reach `tranco-list.eu`.

A reverse proxy in front of a separate static host:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3333;
}
```

The list is a few megabytes and is not shared between processes. One API process is enough. Two processes each keep their own copy, which is fine, they do not need a database.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and pull requests to `main`, on Node.js 22:

1. `npx prettier . --check`
2. `npm test` and `npm run test:server`
3. `npm run build` and `npm run build:server`

## License

[Apache License 2.0](LICENSE).
