# TypeScript loader for Node.js

- Depends **only** on `typescript` package
- Automatically performs **typecheck** before running (if tsconfig is present)
- Supports `moduleResolution`, `paths`, `tsx`, enums and all other TypeScript features

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

### Configuration

Put `ts-loader` on top of your `tsconfig.json` to configure `ts-loader`:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    // ...
  },
  "ts-loader": {
    "skipCheck": true,
  },
}
```

#### Options

- `skipCheck` - boolean, disables running typecheck before transpilation

### Why

Modern Node.js supports basic TypeScript syntax via type stripping.

The main feature of TypeScript as language is **static analysis** aka _typecheck_.
Without typecheck, this is just transpilation like in Babel.

This loader gives you ability to:

- Use full TypeScript syntax in your project without bundling/transpilation
- Automatically perform typecheck before running (no need to `tsc --noEmit && node ./my-code.ts`)

### Credits

This loader is inspired by brilliant [tsimp](https://github.com/tapjs/tsimp) package

### To Do

- Using `tsgo`
- Allow to fully disable cache
- Do not perform typecheck if files are not changed since last typecheck? (how?)
