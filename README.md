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

## Fact-check lookup

Submitting a news link asks the [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api) (`claims:search`) for reviews of that address. The UI language is sent as `languageCode` (`pl` or `en`).

### API key

The key is not committed. The app reads it at runtime from `public/config/fact-check.json`.

1. Enable **Fact Check Tools API** in [Google Cloud Console](https://console.cloud.google.com/apis/library/factchecktools.googleapis.com) and create an API key.
2. Copy the example and set `apiKey`:

```bash
cp public/config/fact-check.example.json public/config/fact-check.json
```

3. Restart or refresh the app.

A key used from this frontend is visible to anyone who can load the site. In Google Cloud, restrict it by HTTP referrer (local and production origins) and limit it to the Fact Check Tools API.

`claims:search` has no field for the article being reviewed. `query` with the exact URL matches when that URL is itself a fact-check, and usually misses an ordinary news article. `query` with the bare domain (`onet.pl`, without `www` or `https://`) returns reviews that mention the outlet, including after a subdomain such as `wiadomosci.onet.pl` misses. `reviewPublisherSiteFilter` only keeps reviews published by that host, so this lookup does not send it.
