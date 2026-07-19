import {
  Address,
  Keypair,
  Networks,
  Operation,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

const WASM_PATH = join(
  process.cwd(),
  '..',
  '..',
  'packages',
  'contracts',
  'target',
  'wasm32v1-none',
  'release',
  'pocketlet_wallet.wasm'
);

/**
 * Returns the platform deployer keypair.
 *
 * The deployer account pays the Stellar network fees and rent to upload the
 * wallet WASM and create each user's smart-wallet contract instance. It is
 * also stored as the wallet's `recovery_admin`, allowing the platform to
 * rotate a lost owner public key after email verification.
 *
 * In production, `PLATFORM_SECRET_KEY` must be set to a funded, persistent
 * account. In testnet mode, if it is missing, a random keypair is generated
 * and funded automatically so the app works out of the box.
 */
export function getPlatformKeypair(): Keypair {
  const secret = process.env.PLATFORM_SECRET_KEY;
  if (secret) {
    return Keypair.fromSecret(secret);
  }
  const kp = Keypair.random();
  console.warn(
    'PLATFORM_SECRET_KEY is not set. A new deployer keypair has been generated for testnet only.'
  );
  console.warn('Save this secret:', kp.secret());
  return kp;
}

export async function fundAccount(publicKey: string): Promise<void> {
  try {
    const server = new rpc.Server(RPC_URL);
    await server.requestAirdrop(publicKey);
  } catch (err) {
    // Friendbot may return a 200 even if already funded; ignore errors in testnet mode.
    console.log('Friendbot funding attempt:', err);
  }
}

export function loadWalletWasm(): Buffer {
  return readFileSync(WASM_PATH);
}

export function computeWasmHash(wasm: Buffer): Buffer {
  return createHash('sha256').update(wasm).digest();
}

export async function ensureWasmUploaded(server: rpc.Server, deployer: Keypair): Promise<Buffer> {
  const wasm = loadWalletWasm();
  const wasmHash = computeWasmHash(wasm);

  try {
    await server.getContractWasmByHash(wasmHash.toString('hex'));
    return wasmHash;
  } catch {
    // Wasm not on chain yet; upload it.
  }

  const account = await server.getAccount(deployer.publicKey());
  const uploadOp = Operation.uploadContractWasm({ wasm, source: deployer.publicKey() });
  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);
  const result = await server.sendTransaction(prepared);
  const txResponse = await pollTransaction(server, result.hash);
  if (!txResponse.returnValue) {
    throw new Error('Wasm upload did not return a value');
  }
  // Return value is the wasm hash bytes.
  const returnedHash = txResponse.returnValue.bytes();
  return Buffer.from(returnedHash);
}

async function pollTransaction(
  server: rpc.Server,
  hash: string,
  attempts = 20
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  for (let i = 0; i < attempts; i++) {
    const tx = await server.getTransaction(hash);
    if (tx.status === 'SUCCESS') {
      return tx as rpc.Api.GetSuccessfulTransactionResponse;
    }
    if (tx.status === 'FAILED') {
      throw new Error(`Transaction failed: ${tx.resultXdr}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Transaction polling timed out');
}

export async function deployWallet(
  server: rpc.Server,
  deployer: Keypair,
  ownerPublicKey: Buffer
): Promise<string> {
  const wasmHash = await ensureWasmUploaded(server, deployer);

  const account = await server.getAccount(deployer.publicKey());
  const recoveryAdmin = new Address(deployer.publicKey());

  const deployOp = Operation.createCustomContract({
    wasmHash,
    address: new Address(deployer.publicKey()),
    constructorArgs: [xdr.ScVal.scvBytes(ownerPublicKey), recoveryAdmin.toScVal()],
  });

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(deployOp)
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);
  const result = await server.sendTransaction(prepared);
  const txResponse = await pollTransaction(server, result.hash);

  if (!txResponse.returnValue) {
    throw new Error('Wallet deployment did not return a contract address');
  }
  const contractAddress = Address.fromScVal(txResponse.returnValue).toString();
  return contractAddress;
}

