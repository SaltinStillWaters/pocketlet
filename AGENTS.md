# Agent Instructions

Read this file and `SPEC.md` before any planning or coding. The repo currently contains only the product spec; the monorepo structure described below is the planned/target layout and may not be scaffolded yet.

## Primary Directives

- **Read `SPEC.md` first.** Every feature must align with the "Invisible Crypto" value proposition (Philippine market, abstracted blockchain, stablecoin settlement).
- **Package manager is `pnpm`.** Do not use `npm`, `yarn`, or `bun`. Use `pnpm install` and `pnpm run <script>`.
- **Verify before assuming structure.** If `pnpm-workspace.yaml`, `apps/`, or `packages/` are missing, scaffold or inspect the repo before applying commands from this file.

## Planned Monorepo Layout

```
/apps/web              Next.js frontend (PWA, App Router)
/packages/contracts    Soroban (Rust) smart contracts
/packages/config       Shared ESLint, TypeScript, Tailwind config
```

Use `pnpm --filter <workspace-name>` to target packages. For example, add a dependency to the web app with `pnpm --filter web add <pkg>`. Verify the workspace name in `pnpm-workspace.yaml` and each package's `package.json` before using filter names.

## Frontend Standards (`/apps/web`)

- TypeScript only. No `any` or `@ts-ignore`.
- Next.js App Router with React Server Components; use Tailwind CSS for styling. Avoid custom CSS files unless there is no Tailwind equivalent.
- Global state goes in Zustand. Keep local UI state in hooks or props.
- Hide blockchain details in normal UI: public keys, gas fees, and crypto jargon should only appear in the "Transaction Details" or "Self-Custody" views.

## Smart Contract Standards (`/packages/contracts`)

- Rust with `soroban-sdk`. Use `require_auth` for account abstraction (email/passkey login), not Ed25519 seed phrases.
- Follow SEP-10 (auth), SEP-24 (on/off-ramp), and SEP-38 (quotes) when integrating off-chain anchors or payment rails.
- Target `wasm32v1-none` and use `stellar contract build` for optimized WASM output.

## Execution Workflow

1. Read `SPEC.md` and this file.
2. State a brief plan before writing large code blocks.
3. Use `pnpm --filter <workspace>` for package-specific installs and scripts.
4. Add tests for critical logic: `cargo test` for Rust, Jest/whatever the project has configured for TypeScript.
5. Verify by running the package's lint, typecheck, and test commands in the intended order.

## Trust

If this file conflicts with the actual repo config, scripts, or lockfiles, trust the executable source and update this file.
