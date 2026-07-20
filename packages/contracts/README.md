# Pocketlet Soroban Contracts

This workspace contains the Soroban smart contracts for Pocketlet V1.

## Contracts

- `pocketlet_wallet` — the smart wallet contract. It is a `CustomAccountInterface` that stores a passkey-derived Ed25519 owner and a platform recovery admin. It exposes `transfer`, `swap`, and `rotate_owner`.
- `mock_token` — a simple SEP-41-style token used in unit tests.
- `mock_dex` — a minimal DEX used in unit tests and auto-deployed on testnet for swap testing.

## Project Structure

```
packages/contracts
├── Cargo.toml
├── Cargo.lock
├── README.md
└── contracts
    ├── pocketlet_wallet
    │   ├── Cargo.toml
    │   ├── Makefile
    │   └── src
    │       ├── lib.rs
    │       └── test.rs
    ├── mock_token
    │   ├── Cargo.toml
    │   └── src/lib.rs
    └── mock_dex
        ├── Cargo.toml
        └── src/lib.rs
```

## Build

```bash
stellar contract build
```

or from the repository root:

```bash
pnpm run build:contracts
```

Output:

```
target/wasm32v1-none/release/pocketlet_wallet.wasm
target/wasm32v1-none/release/mock_dex.wasm
target/wasm32v1-none/release/mock_token.wasm
```

## Test

```bash
cargo test
```

or from the repository root:

```bash
pnpm run test:contracts
```

## Smart Wallet Contract

### Storage

- `Owner` — a 32-byte Ed25519 public key derived from the user's passkey.
- `RecoveryAdmin` — the platform deployer address, authorized to rotate the owner.

### Functions

- `__constructor(owner_pubkey, recovery_admin)` — initializes the wallet.
- `transfer(token, to, amount)` — transfers `amount` of `token` from the wallet to `to`. Requires custom-account authorization.
- `swap(sell_token, buy_token, sell_amount, min_buy_amount, dex)` — calls `dex.swap(...)` and returns the bought amount. Requires custom-account authorization.
- `rotate_owner(new_owner)` — only callable by the recovery admin.
- `__check_auth(...)` — verifies the authorization payload with the stored owner public key.

### Errors

- `NotInitialized` — wallet has not been initialized.
- `Unauthorized` — authorization failure.
- `InvalidAmount` — amount must be positive.
- `SwapFailed` — swap returned an error.
- `AlreadyInitialized` — constructor called twice.

## Notes

- The target is `wasm32v1-none` and the release profile is optimized for small WASM output.
- `mock_dex` is a placeholder for testnet. In production, `DEX_CONTRACT_ID` should point to a real Stellar DEX/AMM contract.
- The contract uses `require_auth` via the custom-account interface for passkey-based account abstraction.
