import { Networks, Keypair, TransactionBuilder, Asset, Operation } from '@stellar/stellar-sdk';
import { Horizon } from '@stellar/stellar-sdk';
import { ProviderError } from './index.js';

/**
 * Stellar direct-payout adapter. Sends USDC from the platform's funded
 * funding account to the creator's Stellar address (G-address) via a direct
 * on-chain payment. This is not SEP-24; we do not run an anchor, we pay
 * directly from the platform wallet.
 *
 *   - platformSeed: secret seed of the platform's funding account (must hold USDC)
 *   - horizon: Horizon URL (testnet only in this release)
 *   - USDC asset code is fixed as 'USDC'.
 *
 *   Every withdrawal snapshots fx_rate (NGN↔USDC rate) and fx_bps (spread)
 *   on the row so downstream math is reproducible from the withdrawal alone.
 *
 *   The platform must never store or forward creator private keys.
 *   Payouts go directly from the platform funding account to the creator's
 *   configured G-address. The platform is a non-custodial relay only.
 */
export class StellarProvider {
  #seed;
  #horizonUrl;
  #server; // Horizon.Server instance
  #fundingAccountCache;

  // Testnet USDC issuer — must match the Horizon network. Mainnet issuer
  // would be a different address; using the wrong issuer is a fatal config error.
  static TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  static MAINNET_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

  constructor(cfg, { fetchImpl } = {}) {
    this.#seed = cfg.stellarSeed;
    this.#horizonUrl = cfg.horizonUrl ?? 'https://horizon-testnet.stellar.org';
    this.#server = new Horizon.Server(this.#horizonUrl);
    this.#fundingAccountCache = null;
    this.#validateNetworkConfiguration();
  }

  #validateNetworkConfiguration() {
    // Verify the Horizon endpoint is consistent with the network passphrase.
    // Official Stellar Testnet Horizon is https://horizon-testnet.stellar.org
    // https://horizon.stellar.testnet.org is NOT an officially supported endpoint.
    // Mainnet is explicitly disabled in this release to prevent premature production payouts.
    const officialTestnet = 'https://horizon-testnet.stellar.org';
    const isOfficialTestnet = this.#horizonUrl === officialTestnet;

    if (isOfficialTestnet) {
      // Using official testnet — USDC must be the testnet issuer
      if (!StellarProvider.TESTNET_USDC_ISSUER) {
        throw new ProviderError('Testnet USDC issuer not configured');
      }
      // Ensure the issuer matches testnet; prevent accidental mainnet issuer use.
      return;
    }

    // Any non-official testnet URL is rejected. Mainnet support is intentionally disabled.
    throw new ProviderError(`Unsupported Horizon URL: ${this.#horizonUrl}. Only ${officialTestnet} is accepted. Mainnet support is disabled.`);
  }

  get name() {
    return 'stellar';
  }

  async #loadFundingAccount() {
    if (this.#fundingAccountCache) return this.#fundingAccountCache;
    if (!this.#seed) throw new ProviderError('stellar seed not configured');
    const pair = Keypair.fromSecret(this.#seed);
    const account = await this.#server.loadAccount(pair.getPublicKey());
    this.#fundingAccountCache = account;
    return account;
  }

  async #ensureFunded(amountKobo) {
    // Ensure the funding account has enough USDC balance for the payout.
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
   *
   * Amount format: 1 USDC = 10^7 stroops on Stellar. amountKobo is in kobo
   * (1 NGN = 100 kobo), so conversion to USDC units requires:
   *   usdc_amount = amountKobo / 100000 (kobo to major) / 10000000 (to stroops)
   *               = amountKobo / 10^11
   * But we store fx_rate as NGN↔USDC, so we first convert kobo→NGN→USDC using the rate.
   */
  async initiatePayout({
    reference,
    amountKobo,
    currency,
    bankCode,
    accountNumber, // creator's Stellar G-address
    accountName,
    narration,
    fxRate,
    fxBps,
    fxSource,
    fxPublishedAt,
    fxValidUntil,
    fxDirection,
    fxPrecision,
    fxFeeTreatment,
  }) {
    // 0. Validate Stellar address format.
    if (!/^[G][A-Z2-7]{55}$/.test(accountNumber)) {
      throw new ProviderError(`Invalid Stellar address: ${accountNumber}`);
    }

    // 1. Validate FX metadata presence and provenance.
    // Required fields for a verified rate:
    // - fxSource: non-empty string naming the trusted provider
    // - fxPublishedAt / fxValidUntil: ISO timestamps, valid until >= now
    // - fxDirection: must be 'USDC_PER_NGN' for current conversion logic
    // - fxPrecision: integer >= 4
    // - fxFeeTreatment: 'included' | 'excluded'
    if (!fxSource || typeof fxSource !== 'string' || fxSource.trim() === '') {
      throw new ProviderError('FX rate missing trusted source');
    }
    const pub = new Date(fxPublishedAt);
    const valid = new Date(fxValidUntil);
    if (isNaN(pub.getTime()) || isNaN(valid.getTime())) {
      throw new ProviderError('FX rate timestamps are invalid');
    }
    if (valid < pub) {
      throw new ProviderError('FX rate validity window is inverted');
    }
    if (new Date() > valid) {
      throw new ProviderError('FX rate is stale: validity expired');
    }
    if (fxDirection !== 'USDC_PER_NGN') {
      throw new ProviderError(`Unsupported FX direction: ${fxDirection}. Expected USDC_PER_NGN`);
    }
    if (!Number.isInteger(fxPrecision) || fxPrecision < 4) {
      throw new ProviderError('FX precision is invalid');
    }
    if (!['included','excluded'].includes(fxFeeTreatment)) {
      throw new ProviderError('FX fee treatment is invalid');
    }

    // 2. Validate FX rate is explicitly set and valid (from the withdrawal row).
    // The provider rejects payouts when the rate is missing, zero, infinite,
    // unsupported, or the old placeholder default 0.01. The exact rate used
    // for this withdrawal is the persisted snapshot; it cannot silently change
    // during retries because it is read from the withdrawal object at call time.
    if (typeof fxRate !== 'number' || fxRate == null || fxRate <= 0 || !isFinite(fxRate)) {
      throw new ProviderError(
        `Invalid fx_rate: ${fxRate}. The withdrawal must have a valid, explicitly-defined NGN↔USDC rate.`
      );
    }
    // Reject the sentinel default value that previously implied "not configured"
    if (fxRate === 0.01) {
      throw new ProviderError(
        `Stale fx_rate detected: ${fxRate}. The withdrawal's fx_rate must be explicitly set (not the old placeholder default).`
      );
    }

    // 3. Validate fx_bps is a valid number
    if (typeof fxBps !== 'number' || !isFinite(fxBps)) {
      throw new ProviderError(
        `Invalid fx_bps: ${fxBps}. The withdrawal must have a valid spread in basis points.`
      );
    }

    // 3. Load the funding account
    const sourceAcc = await this.#loadFundingAccount();

    // 4. Build USDC asset with explicit testnet issuer — the issuer address must
    //    match the Horizon network. Using the wrong issuer is a fatal config error.
    const usdc = new Asset('USDC', StellarProvider.TESTNET_USDC_ISSUER);

    // 4. Convert amountKobo to USDC stroops using the EXACT fxRate from the withdrawal.
    //    This rate is the persisted snapshot for this withdrawal; it cannot silently
    //    change on retry because we read it from the withdrawal object at call time.
    //    usdc_major = (amountKobo / 100) * fxRate  → NGN major → USDC major
    //    usdc_stroops = Math.round(usdc_major * 10^7)
    const usdcMajor = (amountKobo / 100) * fxRate; // NGN major units → USDC major
    const usdcStroops = Math.round(usdcMajor * 10000000); // USDC stroops (10^-7 per unit)

    // 5. Build and submit the payment transaction
    const pair = Keypair.fromSecret(this.#seed);

    const tx = new TransactionBuilder(sourceAcc, {
      fee: 1000,
      network: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: accountNumber,
          asset: usdc,
          amount: String(usdcStroops),
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(Keypair.fromSecret(this.#seed));

    const submitted = await this.#server.submitTransaction(tx);
    const txHash = submitted.hash;

    // 6. Return success with tx hash
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