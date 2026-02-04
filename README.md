# TypeScript loader for Node.js

- Depends **only** on `typescript` package
- Automatically performs typecheck before running
- Supports `moduleResolution`, `paths`, `tsx` and all other TypeScript features

### Installation

```sh
npm i -D @krutoo/ts-loader typescript
```

### Usage

First you need a valid `tsconfig.json` in your project root folder.

Then you can use package as regular ESM loader:

```sh
node --import @krutoo/ts-loader ./my-program.tsx
```

To use it automatically in all NPM scripts you need to place it to `.npmrc`:

```ini
node-options='--import @krutoo/ts-loader'
```

### Why

Modern Node.js supports basic TypeScript syntax via type stripping.

The main feature of TypeScript as language is **static analysis** aka typecheck.
Without typecheck, this is just transpilation like in Babel.

This loader gives you ability to:

- Use full TypeScript syntax in your project without bundling/transpilation
- Automatically perform typecheck before running (no need to `tsc --noEmit && node ./my-code.ts`)

### Credits

This loader is inspired by brilliant [tsimp](https://github.com/tapjs/tsimp) package

### To Do

- Using `tsgo`
- Allow missing `tsconfig.json` and skip typecheck if not present?
- Allow to fully disable cache
- Do not perform typecheck if files are not changed since last typecheck? (how?)
