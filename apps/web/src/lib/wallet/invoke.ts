import {
  Address,
  Contract,
  Keypair,
  TransactionBuilder,
  rpc,
  xdr,
  hash,
  buildAuthorizationEntryPreimage,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { RPC_URL, NETWORK_PASSPHRASE, getPlatformKeypair, fundAccount, pollTransaction } from './deploy';
import type { User } from '@/lib/auth/store';

const AUTH_ENTRY_VALIDITY_LEDGERS = 12;

/**
 * Extract the address credentials from any address-based Soroban credential.
 *
 * Mirrors the SDK helper of the same name, which is not exported from the
 * public package entrypoint. Returns null for source-account credentials.
 */
function getAddressCredentials(
  credentials: xdr.SorobanCredentials
): xdr.SorobanAddressCredentials | null {
  const switchName = credentials.switch().name;
  if (switchName === 'sorobanCredentialsAddress') {
    return credentials.address();
  }
  if (switchName === 'sorobanCredentialsAddressV2') {
    return credentials.addressV2();
  }
  if (switchName === 'sorobanCredentialsAddressWithDelegates') {
    return credentials.addressWithDelegates().addressCredentials();
  }
  return null;
}

/**
 * Convert a decimal amount string to Stellar base units (7 decimals).
 */
export function amountToBaseUnits(amount: string, decimals = 7): bigint {
  const [integerPart, fractionPart = ''] = amount.split('.');
  const integer = integerPart || '0';
  const fraction = (fractionPart + '0'.repeat(decimals)).slice(0, decimals);
  const scale = BigInt(10 ** decimals);
  return BigInt(integer) * scale + BigInt(fraction);
}

/**
 * Compute the minimum acceptable buy amount given a sell amount and slippage
 * tolerance in basis points (e.g. 100 = 1%).
 */
export function calculateMinBuyAmount(sellAmount: bigint, slippageBps: number): bigint {
  return (sellAmount * BigInt(10_000 - slippageBps)) / 10_000n;
}

/**
 * Build, sign, and submit a wallet contract invocation on behalf of a user.
 *
 * The platform deployer account pays the network fee and rents. The wallet
 * owner secret key (stored server-side) signs the custom-account authorization
 * payload so the contract's `__check_auth` can verify it.
 */
export async function invokeWalletContract(
  user: User,
  method: string,
  args: xdr.ScVal[]
): Promise<{ hash: string; returnValue?: xdr.ScVal }> {
  if (!user.contractId) {
    throw new Error('Wallet not deployed');
  }
  if (!user.ownerSecretKey) {
    throw new Error('Wallet owner key not found');
  }

  const server = new rpc.Server(RPC_URL);
  const deployer = getPlatformKeypair();
  await fundAccount(deployer.publicKey());
  const account = await server.getAccount(deployer.publicKey());

  const walletContract = new Contract(user.contractId);
  const op = walletContract.call(method, ...args);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(0)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    throw new Error('Simulation returned no result');
  }

  const validUntil = sim.latestLedger + AUTH_ENTRY_VALIDITY_LEDGERS;
  const ownerKeypair = Keypair.fromSecret(user.ownerSecretKey);

  const signedAuth = sim.result.auth.map((entry) => {
    const clone = xdr.SorobanAuthorizationEntry.fromXDR(entry.toXDR());
    const addrCreds = getAddressCredentials(clone.credentials());
    if (!addrCreds) {
      return clone;
    }

    const addr = Address.fromScAddress(addrCreds.address()).toString();
    if (addr !== user.contractId) {
      return clone;
    }

    addrCreds.signatureExpirationLedger(validUntil);

    const preimage = buildAuthorizationEntryPreimage(
      clone,
      validUntil,
      NETWORK_PASSPHRASE
    );
    const payload = hash(preimage.toXDR());
    const signature = ownerKeypair.sign(payload);

    addrCreds.signature(xdr.ScVal.scvBytes(Buffer.from(signature)));
    return clone;
  });

  // The invokeHostFunction Operation exposes the auth entries that
  // assembleTransaction will prefer over the simulated ones.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tx.operations[0] as any).auth = signedAuth;

  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(deployer);

  const result = await server.sendTransaction(assembled);
  const txResponse = await pollTransaction(server, result.hash);

  return {
    hash: result.hash,
    returnValue: txResponse.returnValue,
  };
}

export function i128ToBigInt(value: xdr.ScVal): bigint {
  const i128 = value.i128();
  const hi = i128.hi().toBigInt();
  const lo = i128.lo().toBigInt();
  return (hi << 64n) + lo;
}

export function i128ScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: 'i128' });
}

export function addressScVal(value: string): xdr.ScVal {
  return new Address(value).toScVal();
}
