import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/config';
import { getUserByEmail } from '@/lib/auth/store';
import {
  fundAccount,
  getPlatformKeypair,
  RPC_URL,
  NETWORK_PASSPHRASE,
} from '@/lib/wallet/deploy';
import { getXlmContractId, getUsdcContractId } from '@/lib/wallet/assets';
import { Contract, Address, rpc, TransactionBuilder } from '@stellar/stellar-sdk';

function i128ToString(value: { hi: () => { toBigInt: () => bigint }; lo: () => { toBigInt: () => bigint } }): string {
  const hi = value.hi().toBigInt();
  const lo = value.lo().toBigInt();
  return ((hi << 64n) + lo).toString();
}

async function readContractBalance(
  server: rpc.Server,
  tokenContractId: string,
  holderAddress: string
): Promise<string> {
  const deployer = getPlatformKeypair();
  await fundAccount(deployer.publicKey());
  const account = await server.getAccount(deployer.publicKey());

  const tokenContract = new Contract(tokenContractId);
  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(tokenContract.call('balance', new Address(holderAddress).toScVal()))
    .setTimeout(0)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Balance simulation failed: ${sim.error}`);
  }
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    throw new Error('Balance simulation returned no result');
  }
  return i128ToString(sim.result.retval.i128());
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByEmail(session.email);
  if (!user || !user.contractId) {
    return NextResponse.json({ error: 'Wallet not deployed' }, { status: 404 });
  }

  const server = new rpc.Server(RPC_URL);
  try {
    const xlmBalance = await readContractBalance(server, getXlmContractId(), user.contractId);
    const usdcBalance = await readContractBalance(server, getUsdcContractId(), user.contractId);

    return NextResponse.json({
      xlm: xlmBalance,
      usdc: usdcBalance,
      contractId: user.contractId,
      stellarAddress: user.stellarAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Balance lookup failed';
    console.error('Balance lookup failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
