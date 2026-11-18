# De-Dezinformacja

Quick background check of a news link or news website. The interface is available in Polish and English.

The current app is the UI shell: a link field, a PL/EN toggle, and a short description. The check itself is not implemented yet — `BaseCheckService` is only a stub.

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
