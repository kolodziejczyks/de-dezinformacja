# De-Dezinformacja

Quick background check of a news link or news website. The interface is available in Polish and English.

Enter a news link and the app runs two lookups.

`BaseCheckService` reads the domain's registration data over RDAP, the HTTP/JSON successor of WHOIS. The browser calls the [rdap.org](https://rdap.org/) bootstrap (`https://rdap.org/domain/<domain>`), which redirects to the registry's RDAP server. The result card shows the registrar, registration date, domain age, expiry, last update, registrant organization and country when the registry publishes them, nameservers, and status.

`FactCheckService` searches the [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api/reference/rest/v1alpha1/claims/search) (`claims:search`) for reviews of that link. It queries the article URL first, in the current UI language (`pl` or `en`), and if that returns nothing it queries the domain. Each match shows the claim, claimant, publisher, textual rating, review date, and a link to the review. `reviewPublisherSiteFilter` is not used: that parameter selects the fact-checker's site, not the article being checked.

Registries often redact contact data. Thin registries such as Verisign (`.com`, `.net`) do not publish the registrant at all. A TLD with no RDAP service, a rate limit, or a network failure is explained on the card instead of shown as an empty result.

The language toggle is stored in `localStorage` and restored on startup. It defaults to Polish (`pl`).

## Tech stack

- Angular 22, Angular Material, and Angular CDK
- `@ngx-translate/core` for PL/EN
- Vitest via the `@angular/build:unit-test` builder
- Prettier

## Fact Check Tools API key

Fact checks call Google from the browser. The key lives in `src/environments/environment.ts`, which is gitignored.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or choose a project.
2. Enable the [Fact Check Tools API](https://console.cloud.google.com/apis/library/factchecktools.googleapis.com).
3. Create an API key under APIs & Services → Credentials.
4. Restrict the key. A key shipped in a frontend bundle is public: anyone can read it from the JavaScript. Set an application restriction of HTTP referrers (for example `http://localhost:4200/*` and your production origin) and an API restriction of Fact Check Tools API only.
5. Copy the example and paste the key:

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

```ts
export const environment = {
  factCheckApiKey: 'your-key',
};
```

`npm start`, `npm test`, and `npm run build` copy the example to `environment.ts` when that file is missing. An empty key does not call Google; the fact-check card explains that the key is not configured. A rejected key (API not enabled, or the referrer is not allowed) has its own message.

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
