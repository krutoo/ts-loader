# TypeScript loader for Node.js

- Depends only on `typescript` package
- Performs typecheck before running
- Supports `paths`
- Supports `tsx`

### Installation

```sh
npm i -D @krutoo/ts-loader typescript
```

### Usage

First you need to declare valid `tsconfig.json` in your project root folder.

Then you can use package like regular ESM loader:

```sh
node --import @krutoo/ts-loader ./my-program.ts
```

### To Do

- Allow missing `tsconfig.json` and skip typecheck if not present?
- Using `tsgo`
