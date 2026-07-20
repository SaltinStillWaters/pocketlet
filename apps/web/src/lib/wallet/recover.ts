import {
  Contract,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import {
  RPC_URL,
  NETWORK_PASSPHRASE,
  getPlatformKeypair,
  fundAccount,
  pollTransaction,
} from './deploy';

/**
 * Rotate the owner of a smart wallet contract to a new Ed25519 public key.
 *
 * The platform deployer account is the wallet's `recovery_admin`; it signs and
 * pays for the `rotate_owner` invocation. No signature from the previous owner
 * is required.
 */
export async function rotateWalletOwner(
  contractId: string,
  newOwnerPublicKey: Buffer
): Promise<{ hash: string }> {
  const server = new rpc.Server(RPC_URL);
  const deployer = getPlatformKeypair();
  await fundAccount(deployer.publicKey());
  const account = await server.getAccount(deployer.publicKey());

  const walletContract = new Contract(contractId);
  const op = walletContract.call('rotate_owner', xdr.ScVal.scvBytes(newOwnerPublicKey));

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

  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(deployer);

  const result = await server.sendTransaction(assembled);
  await pollTransaction(server, result.hash);

  return { hash: result.hash };
}
