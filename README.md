# De-Dezinformacja

Quick background check of a news link or news website. The interface is available in Polish and English.

Enter a news link and `BaseCheckService` looks up that site's registered domain over RDAP, the HTTP/JSON successor of WHOIS. Subdomains are reduced to the registrable name, and multi-part public suffixes stay intact: `przegladsportowy.onet.pl` is queried as `onet.pl`, `news.bbc.co.uk` as `bbc.co.uk`, and `news.example.com.pl` as `example.com.pl`. A host that is only `www` plus a public suffix (`www.gov.pl`) is queried as registered. The browser calls the [rdap.org](https://rdap.org/) bootstrap (`https://rdap.org/domain/<domain>`), which redirects to the registry's RDAP server. The result card shows the registrar, registration date, domain age, expiry, last update, registrant organization and country when the registry publishes them, nameservers, and status.

Registries often redact contact data. Thin registries such as Verisign (`.com`, `.net`) do not publish the registrant at all. A TLD with no RDAP service, a rate limit, or a network failure is explained on the card instead of shown as an empty result.

The language toggle is stored in `localStorage` and restored on startup. It defaults to Polish (`pl`).

## Tech stack

- Angular 22, Angular Material, and Angular CDK
- `@ngx-translate/core` for PL/EN
- Vitest via the `@angular/build:unit-test` builder
- Prettier

## Install

```bash
npm ci
```

## Development server

```bash
npm start
```

Open `http://localhost:4200/`. The app reloads when you change a source file.

## Tests

```bash
npm test
```

Unit tests run with Vitest.

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
```

Output is written to `dist/`.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and pull requests to `main`, on Node.js 22:

1. `npx prettier . --check`
2. `npm test`
3. `npm run build`

## License

[Apache License 2.0](LICENSE).
