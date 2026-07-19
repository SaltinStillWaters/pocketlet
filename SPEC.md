## 1. Product Overview
A web-based wallet designed for the Philippine market that looks and acts like a traditional e-wallet (e.g., GCash, Maya), but uses the Stellar blockchain as its settlement layer. The wallet abstracts the complexities of crypto (gas fees, complex addresses, key management) while allowing users to benefit from stablecoins (PHPC, USDC), instant global remittances, and zero-fee interoperability via the national QR Ph standard.

### Core Value Proposition
* **Invisible Crypto:** Users hold and spend PHP (via PHPC stablecoin) or USD (via USDC) without realizing they are interacting with a blockchain.
* **Optional Custody:** Users can opt into self-custody (manage their own keys) or abstracted custody (log in via email/passkey via Account Abstraction).
* **Frictionless On/Off Ramps:** Seamless deposit of PHP and direct payment to any local merchant via QR Ph.

---

## 2. Target Audience (V1)
* **Demographic:** Freelancers, gig workers, and early-adopters in the Philippines who receive international payments but need local spending power.
* **Pain Point:** High remittance fees and the friction of converting crypto to PHP to pay for everyday goods.

---

## 3. Core Features (V1 MVP)

### 3.1. Account Creation & Custody (Soroban Powered)
* **Default:** Abstracted Custody. Users sign up with an Email/Password (or Passkey). A Soroban smart contract wallet is deployed on their behalf.
* **Opt-In Self-Custody:** Advanced users can opt to export or manage their own seed phrase.
* **Sponsorship:** The platform covers standard Stellar network fees (which are fractions of a cent) to keep the crypto experience invisible.

### 3.2. Fiat On-Ramp (PHP -> Stablecoin)
* **Mechanism:** Integration with a Stellar Anchor operating in the Philippines (e.g., Coins.ph for PHPC, or PeraHub for USDC).
* **Flow:** User clicks "Deposit" -> Uses local payment methods (InstaPay, GCash, Bank Transfer) -> The Anchor mints PHPC or USDC directly to the user's Stellar wallet address.

### 3.3. Peer-to-Peer (P2P) Transfers & Crypto Swaps
* **P2P:** Users can send PHPC or USDC to other users via phone number, email, or internal username (mapped to Stellar addresses via federated addresses).
* **Swapping:** Users can swap between supported assets (e.g., USDC <-> PHPC <-> XLM) utilizing Stellar's native Decentralized Exchange (DEX).
* **Visibility:** While the "crypto" nature is hidden during everyday use, users have a dedicated "Transaction Details" view where they can see the exact network fee breakdown and on-chain hash for transparency.

### 3.4. Fiat Off-Ramp & Merchant Payments (QR Ph Integration)
* **The "Killer Feature":** Direct integration with **QR Ph**, the Philippine national QR code standard.
* **Flow:** 
    1. User scans a merchant's QR Ph code using the web app's camera interface.
    2. The app parses the EMV standard QR code to get the merchant's receiving details and amount.
    3. The app routes the payment through a Stellar Anchor (like Coins.ph or a PSP integration like Xendit).
    4. The Anchor deducts PHPC from the user's wallet and settles the exact PHP amount to the merchant's traditional bank account via InstaPay/PESONet.

---

## 4. Technical Architecture (V1 Web App)

### Frontend
* **Framework:** React or Next.js (optimized as a Progressive Web App for mobile browser use).
* **State Management:** Zustand or Context API.
* **Wallet Connection:** Stellar Freighter (for self-custody testing) or a custom Soroban SDK implementation for abstracted accounts.

### Blockchain Layer (Stellar / Soroban)
* **Network:** Stellar Mainnet (via Horizon and Soroban RPC).
* **Assets:** 
    * `USDC` (Issued by Centre)
    * `PHPC` (Issued by Coins.ph)
    * `XLM` (For fees/swaps)
* **Smart Contracts (Soroban):**
    * *Account Abstraction Contract:* To handle email-based logins and fee sponsorship.

### Integration Standards (SEPs)
* **SEP-10 (Authentication):** For secure wallet login.
* **SEP-24 (Hosted Deposit/Withdrawal):** For the on-ramp and off-ramp flow with local Anchors.
* **SEP-38 (Quotes):** To get the best exchange rate if a user pays a PHP QR code using USDC balance.

### External APIs
* **QR Ph Parsing:** A library to decode the EMV standard payload of a scanned QR Ph code.
* **Anchor API:** (e.g., Coins.ph API) to route the final fiat settlement to the merchant.

---

## 5. User Journey Flow (Paying a Coffee Shop via QR Ph)

1. User opens the Web App and clicks "Scan to Pay".
2. User scans the coffee shop's Maya/GCash QR Ph standee.
3. App decodes the QR, displaying "Pay 150 PHP to CoffeeWorks".
4. User has 10 USDC in their wallet. App uses SEP-38 to quote the conversion (e.g., 10 USDC = 570 PHP).
5. User confirms. The app atomically:
    * Swaps ~2.63 USDC for 150 PHPC on the DEX.
    * Sends 150 PHPC to the off-ramp Anchor.
    * The Anchor sends 150 real PHP via InstaPay to CoffeeWorks' Maya account.
6. User sees "Payment Successful".
