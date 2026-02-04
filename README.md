# TypeScript loader for Node.js

- Depends only on `typescript` package
- Performs typecheck before running
- Supports `paths`, `tsx` and other TypeScript features

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

### To Do

- Using `tsgo`
- Allow missing `tsconfig.json` and skip typecheck if not present?
- Allow to fully disable cache
- Do not perform typecheck if files are not changed since last typecheck? (how?)
