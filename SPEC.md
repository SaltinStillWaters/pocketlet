## 1. Product Overview
Pocketlet is a web-based wallet designed for the Philippine market that looks and acts like a traditional e-wallet (e.g., GCash, Maya), but uses the Stellar blockchain as its settlement layer. The wallet abstracts the complexities of crypto (gas fees, complex addresses, key management) while allowing users to hold and move stable digital dollars globally.

### Core Value Proposition
* **Invisible Crypto:** Users hold and spend USD (via USDC) without realizing they are interacting with a blockchain.
* **Abstracted Custody:** Users sign up with email and authenticate with a passkey. A Soroban smart contract wallet is deployed on their behalf — no seed phrase required.
* **Global Payments, Local Feel:** Users can receive international payments in USDC and eventually convert to local PHP spending power through planned fiat off-ramps.

---

## 2. Target Audience (V1)
* **Demographic:** Freelancers, gig workers, and early-adopters in the Philippines who receive international payments but need local spending power.
* **Pain Point:** High remittance fees and the friction of converting crypto to PHP to pay for everyday goods.

---

## 3. Core Features (V1 MVP)

### 3.1. Account Creation & Custody (Soroban Powered)
* **Default:** Abstracted Custody. Users sign up with an email and authenticate with a passkey. A Soroban smart contract wallet is deployed on their behalf.
* **Smart Wallet:** One lightweight Soroban smart wallet per user. The passkey acts as the primary signer.
* **Fee Sponsorship:** The platform covers standard Stellar network fees on behalf of the user during sponsored operations. The total cost is recovered transparently through the transaction fee displayed to the user.
* **Self-Custody Export:** Deferred to V2.

### 3.2. Deposits (V1)
* **No Fiat On-Ramp in V1:** Direct PHP-to-USDC on-ramp via a Stellar Anchor is deferred to V2.
* **External Deposit:** Users receive USDC or XLM by sharing their Stellar address or a generated QR code. Funds are received directly into their smart wallet.

### 3.3. Peer-to-Peer (P2P) Transfers
* **Send to Pocketlet Users:** Users can send USDC or XLM to other Pocketlet users by username or phone number. The app resolves the recipient internally.
* **Send to Non-Users:** If the recipient is not a Pocketlet user, the sender can paste a raw Stellar address.
* **Confirmation:** All sends require PIN confirmation.

### 3.4. Crypto Swaps
* **Supported Pair:** Users can swap between **USDC** and **XLM** utilizing Stellar's native Decentralized Exchange (DEX).
* **Quote Display:** The app shows the expected output, price impact, and total fees before confirmation.
* **Confirmation:** All swaps require PIN confirmation.

### 3.5. Transaction Details
* Users have a dedicated "Transaction Details" view where they can see the exact network fee breakdown, DEX swap details (if applicable), and on-chain hash for transparency.

---

## 4. Regulatory & Compliance (V1)
* **Technology Interface:** Pocketlet V1 operates purely as a technology interface. It does not custody user funds in a regulated e-money capacity, does not perform KYC, and does not process fiat.
* **User-Funded Wallets:** Users control their own Soroban smart wallets. The platform never holds pooled user funds.
* **Fiat On/Off-Ramp Delegation:** All fiat on-ramp, off-ramp, KYC, and settlement will be handled by licensed Stellar Anchors or payment service providers in V2.
* **Data Privacy:** User email and phone data is stored in accordance with the Philippine Data Privacy Act (PDPA). No government IDs are collected in V1.

---

## 5. Custody Model
* **Default Model:** Abstracted custody via a Soroban smart wallet controlled by a WebAuthn/Passkey signer.
* **One Wallet Per User:** Each user gets their own smart contract wallet deployment for isolation and simplicity.
* **Recovery:** If a user loses their passkey, they can initiate recovery using their registered email. After a waiting period, they can register a new passkey. If both the passkey and email access are lost, the account is unrecoverable.
* **Self-Custody:** Seed phrase export and full self-custody are deferred to V2.

---

## 6. Fee Structure
* **User-Pays Model:** All transaction-related costs are baked into the transaction and paid by the user.
* **Included Fees:**
    * Stellar network fees for transfers and smart contract invocations.
    * DEX swap spread and slippage for USDC ↔ XLM conversions.
    * Any platform markup, if applicable, shown before confirmation.
* **Fee Display:** Total estimated fees are shown on the confirmation screen before the user approves any payment or swap.
* **Fiat Fees:** Anchor on-ramp and off-ramp fees will be added in V2 and displayed transparently.

---

## 7. Security & Recovery
* **PIN Confirmation:** A PIN is required to confirm all payments and swaps.
* **Passkey Authentication:** Login and sensitive actions are secured via device-bound or synced passkeys.
* **Email Verification:** Email verification is required for account creation and passkey recovery.
* **Lost Passkey Recovery:** Email-based recovery with a waiting period and new passkey registration.
* **Unrecoverable State:** If a user loses both their passkey and email access, the account cannot be recovered.
* **Privacy:** Users can only view their own transaction history and balances.

---

## 8. Technical Architecture (V1 Web App)

### Frontend
* **Framework:** Next.js 14+ with App Router, optimized as a Progressive Web App (PWA) for mobile browsers.
* **Language:** TypeScript only. No `any` or `@ts-ignore`.
* **Styling:** Tailwind CSS.
* **State Management:** Zustand for global state; local UI state in hooks or props.

### Blockchain Layer (Stellar / Soroban)
* **Network:** Stellar Testnet for V1.
* **Assets:**
    * `USDC` (Issued by Circle)
    * `XLM` (Native asset, for fees and swaps)
* **Smart Contracts (Soroban):**
    * *Smart Wallet Contract:* Passkey-controlled wallet supporting transfers and DEX swaps.

### Integration Standards (SEPs)
* **SEP-2 (Federation):** Evaluated for P2P addressing. V1 uses an internal username/phone mapping. SEP-2 may be adopted in a future version if the user base grows and public addressing is needed.

### External APIs
* **Horizon:** For account state, transaction history, and payment submissions.
* **Soroban RPC:** For smart contract simulation and submission.

---

## 9. User Journey Flow (Receiving a Freelance Payment in USDC)

1. User opens the Web App and signs up with email and passkey.
2. A Soroban smart wallet is deployed on their behalf.
3. The user shares their Stellar address or QR code with a client abroad.
4. The client sends USDC to the user's wallet address.
5. The user sees "Received 100 USDC" in their activity feed.
6. The user taps the transaction to see the on-chain hash and network fee details.

---

## 10. Future Versions

Detailed roadmap for V2 and beyond is documented in [`FUTURE_VERSIONS.md`](./FUTURE_VERSIONS.md).

High-level deferred features include:
* PHP stablecoin (PHPC) support
* Fiat on-ramp via licensed Stellar Anchor
* QR Ph merchant scan-and-pay off-ramp
* Self-custody seed export
* SEP-2 federation server
* Mainnet deployment
* Tagalog localization

---

## 11. Open Questions / Notes
* V1 remains on Stellar Testnet. Mainnet readiness and deployment budget will be planned before V2.
* The exact waiting period for passkey recovery will be defined during implementation (recommended: 24-72 hours).
* Passkey credential behavior (device-bound vs. synced via Apple/Google) depends on the user's device and platform.
