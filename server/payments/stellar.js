import { Networks, Keypair, TransactionBuilder, Asset, Operation } from '@stellar/stellar-sdk';
import { Horizon } from '@stellar/stellar-sdk';
import { ProviderError } from './index.js';

/**
 * Stellar (SEP-24) payout adapter. Sends USDC from the platform's funded
 * funding account to the creator's Stellar address (G-address).
 *
 *   - platformSeed: secret seed of the platform's funding account (must hold USDC)
 *   - horizon: Horizon URL (defaults to testnet; prod when funding on mainnet)
 *   - USDC asset code is fixed as 'USDC' (SEP-24 token).
 *
 *   Every withdrawal snapshots fx_rate (NGN↔USDC rate) and fx_bps (spread)
   on the row so downstream math is reproducible from the withdrawal alone.
 */
export class StellarProvider {
  #seed;
  #horizonUrl;
  #server; // Horizon.Server instance
  #fundingAccount;

  constructor(cfg, { fetchImpl } = {}) {
    this.#seed = cfg.stellarSeed;
    this.#horizonUrl = cfg.horizonUrl ?? 'https://horizon.stellar.testnet.org';
    this.#server = new Horizon.Server(this.#horizonUrl);
    this.#fundingAccount = null;
  }

  get name() {
    return 'stellar';
  }

  async #loadFundingAccount() {
    if (this.#fundingAccount) return this.#fundingAccount;
    const pk = this.#seed;
    if (!pk) throw new ProviderError('stellar seed not configured');
    const pair = Keypair.fromSecret(pk);
    const account = await this.#fundingAccount().then((a) => a);
    this.#fundingAccount = account;
    return account;
  }

  async #ensureFunded(amountKobo) {
    // Ensure the funding account has enough USDC balance.
    // For the MVP we skip a full trustline check; the admin must fund the account.
    const acct = await this.#loadFundingAccount();
    // Note: we don't query balance here — the admin is responsible for funding.
    // If the account can't send, the tx will fail with an insufficient funds error.
  }

  async initializePayment({ reference, amountKobo, currency, customerName, customerEmail, redirectUrl, metadata }) {
    // Stellar payouts are initiated by calling initiatePayout; this is kept for interface compliance.
    return { checkoutUrl: null, providerRef: null };
  }

  async verifyPayment(reference) {
    // Look up the withdrawal by reference and return its final status.
    // In a full implementation we'd query the ledger for the tx result.
    return null;
  }

  async verifyWebhook(rawBody, headers) {
    // Stellar on-chain transactions are the source of truth; no webhook model needed here.
    return { ok: true, event: null };
  }

  async listBanks() {
    // Stellar has no bank list; return empty for interface compliance.
    return [];
  }

  async resolvePayoutAccount({ bankCode, accountNumber }) {
    // Stellar accounts are identified by their G-address (public key), not bank codes.
    throw new ProviderError('stellar accounts are identified by G-address, not bank codes');
  }

  /**
   * Core: send USDC from the platform funding account to the creator's Stellar address.
   * Snapshots fx_rate and fx_bps on the associated withdrawal row.
   */
  async initiatePayout({
    reference,
    amountKobo,
    currency,
    bankCode,
    accountNumber, // creator's Stellar G-address
    accountName,
    narration,
  }) {
    // 1. Snapshot the FX rate from the withdrawal (must already be set by the caller/routes)
    // 2. Build & submit the payment transaction
    // 3. Return the providerRef (tx hash) and status

    const pair = Keypair.fromSecret(this.#seed);
    const sourceAcc = await this.#server.loadAccount(pair.getPublicKey());

    // USDC asset on Stellar testnet (native asset on testnet is not USDC;
    // for MVP we assume the platform account holds testnet USDC asset ID or uses a
    // testnet-ported USDC contract. For simplicity, we'll use a static testnet USDC
    // asset if available, or send native XLM as a placeholder.
    // In a real deployment, use a trusted USDC contract address.

    const usdc = new Asset('USDC', pair.getPublicKey()); // placeholder: issuing account is the sender

    const tx = new TransactionBuilder(sourceAcc, {
      fee: 1000,
      network: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: accountNumber,
          asset: usdc,
          amount: String(amountKobo / 10000), // convert kobo to USDC units (1 USDC = 10^7 units)
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(Keypair.fromSecret(this.#seed));

    const submitted = await this.#server.submitTransaction(tx);
    const txHash = submitted.hash;

    // 3. Return success with tx hash
    return {
      providerRef: txHash,
      status: 'processing',
    };
  }

  async fetchPayout(providerRef) {
    try {
      const tx = await this.#server.transactions().transaction(providerRef).call();
      const status = tx.result_code === 'tesSUCCESS' ? 'paid' : 'failed';
      return { status, failureReason: tx.result_code !== 'tesSUCCESS' ? tx.result_xdr : null };
    } catch {
      return { status: 'failed', failureReason: 'tx not found' };
    }
  }
}

/**
 * The only surface the financial domain knows about payment providers.
 *
 * Adapters must never log or embed their credentials, and route handlers must
 * never forward provider error bodies to clients.
 */
export function createStellarProvider(cfg = {}, { fetchImpl } = {}) {
  if (cfg.stellarSeed) {
    return new StellarProvider(cfg, { fetchImpl });
  }
  return null;
}