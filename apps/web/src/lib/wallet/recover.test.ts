import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rotateWalletOwner } from './recover';

const VALID_PUBLIC_KEY = 'GATVJDFPIPADU74ALX4344HEQQZ2LGMNWABPXBOWYMVXM37KMTTUALTU';
const VALID_SECRET_KEY = 'SBI2ATXEXZNK7L53NN4AWQMVCZB2HVULL3LKM7FYVZWL25IUHJOE65YS';

declare global {
  var __mockStellarServer: {
    simulateTransaction: ReturnType<typeof vi.fn>;
    sendTransaction: ReturnType<typeof vi.fn>;
    getTransaction: ReturnType<typeof vi.fn>;
    getAccount: ReturnType<typeof vi.fn>;
    requestAirdrop: ReturnType<typeof vi.fn>;
  };
}

vi.mock('@stellar/stellar-sdk', async () => {
  const actual = await vi.importActual<typeof import('@stellar/stellar-sdk')>(
    '@stellar/stellar-sdk'
  );

  const mockTransaction = {
    sign: vi.fn(),
  };
  const mockAssembleTransaction = {
    build: vi.fn().mockReturnValue(mockTransaction),
  };
  const mockServer = {
    simulateTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getAccount: vi.fn(),
    requestAirdrop: vi.fn(),
  };
  globalThis.__mockStellarServer = mockServer;

  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      assembleTransaction: vi.fn().mockReturnValue(mockAssembleTransaction),
      Api: {
        ...actual.rpc.Api,
        isSimulationError: vi.fn().mockImplementation((sim) => Boolean(sim.error)),
        isSimulationSuccess: vi.fn().mockImplementation((sim) => !sim.error),
      },
      Server: vi.fn().mockImplementation(function () {
        return mockServer;
      }),
    },
  };
});

vi.mock('./deploy', async () => {
  const actual = await vi.importActual<typeof import('./deploy')>('./deploy');
  return {
    ...actual,
    getPlatformKeypair: vi.fn().mockReturnValue({
      publicKey: () => VALID_PUBLIC_KEY,
      secret: () => VALID_SECRET_KEY,
      sign: vi.fn().mockReturnValue(Buffer.alloc(64)),
    }),
    fundAccount: vi.fn().mockResolvedValue(undefined),
    pollTransaction: vi.fn().mockImplementation(async (server, hash) => {
      await server.getTransaction(hash);
      return { status: 'SUCCESS' };
    }),
  };
});

describe('rotateWalletOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org';
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
    process.env.PLATFORM_SECRET_KEY = VALID_SECRET_KEY;

    globalThis.__mockStellarServer.getAccount.mockResolvedValue({
      sequenceNumber: () => '0',
      accountId: () => VALID_PUBLIC_KEY,
      incrementSequenceNumber: vi.fn(),
    });
    globalThis.__mockStellarServer.simulateTransaction.mockResolvedValue({
      latestLedger: 12345,
      result: { auth: [] },
    });
    globalThis.__mockStellarServer.sendTransaction.mockResolvedValue({ hash: 'txhash123' });
    globalThis.__mockStellarServer.getTransaction.mockResolvedValue({ status: 'SUCCESS' });
  });

  afterEach(() => {
    delete process.env.PLATFORM_SECRET_KEY;
    delete process.env.POCKETLET_DATA_DIR;
  });

  it('returns the transaction hash on success', async () => {
    const newOwnerPublicKey = Buffer.alloc(32, 0xab);
    const result = await rotateWalletOwner(
      'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
      newOwnerPublicKey
    );
    expect(result.hash).toBe('txhash123');
    expect(globalThis.__mockStellarServer.simulateTransaction).toHaveBeenCalled();
    expect(globalThis.__mockStellarServer.sendTransaction).toHaveBeenCalled();
  });

  it('throws when simulation returns an error', async () => {
    globalThis.__mockStellarServer.simulateTransaction.mockResolvedValue({
      error: 'simulation failed',
    });
    await expect(
      rotateWalletOwner(
        'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        Buffer.alloc(32)
      )
    ).rejects.toThrow('Simulation failed');
  });
});
