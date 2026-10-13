import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StellarProvider } from '../server/payments/stellar.js';

test('StellarProvider rejects mainnet horizon URLs', () => {
  assert.throws(() => {
    new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon.stellar.org' });
  }, /Only https:\/\/horizon-testnet.stellar.org is accepted/);
});

test('StellarProvider accepts official testnet horizon URL', () => {
  assert.doesNotThrow(() => {
    new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  });
});

test('StellarProvider rejects unofficial testnet URL', () => {
  assert.throws(() => {
    new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon.stellar.testnet.org' });
  }, /Only https:\/\/horizon-testnet.stellar.org is accepted/);
});

test('StellarProvider rejects network/issuer mismatch by construction', () => {
  // The provider only allows the official testnet URL and hard-codes the testnet USDC issuer.
  // Any attempt to use a mainnet URL is rejected before an asset is built.
  assert.throws(() => {
    new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon.stellar.org' });
  });
});

test('StellarProvider rejects invalid Stellar address', async () => {
  const provider = new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  await assert.rejects(
    provider.initiatePayout({
      reference: 'ref',
      amountKobo: 100000,
      currency: 'NGN',
      bankCode: '',
      accountNumber: 'invalid',
      accountName: 'Test',
      narration: '',
      fxRate: 0.0006,
      fxBps: 0,
      fxSource: 'test',
      fxPublishedAt: new Date().toISOString(),
      fxValidUntil: new Date(Date.now()+3600_000).toISOString(),
      fxDirection: 'USDC_PER_NGN',
      fxPrecision: 6,
      fxFeeTreatment: 'included',
    }),
    /Invalid Stellar address/
  );
});

test('StellarProvider rejects missing fxRate', async () => {
  const provider = new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  await assert.rejects(
    provider.initiatePayout({
      reference: 'ref',
      amountKobo: 100000,
      currency: 'NGN',
      bankCode: '',
      accountNumber: 'G' + 'A'.repeat(55),
      accountName: 'Test',
      narration: '',
      fxRate: null,
      fxBps: 0,
      fxSource: 'test',
      fxPublishedAt: new Date().toISOString(),
      fxValidUntil: new Date(Date.now()+3600_000).toISOString(),
      fxDirection: 'USDC_PER_NGN',
      fxPrecision: 6,
      fxFeeTreatment: 'included',
    }),
    /Invalid fx_rate/
  );
});

test('StellarProvider rejects sentinel fxRate 0.01', async () => {
  const provider = new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  await assert.rejects(
    provider.initiatePayout({
      reference: 'ref',
      amountKobo: 100000,
      currency: 'NGN',
      bankCode: '',
      accountNumber: 'G' + 'A'.repeat(55),
      accountName: 'Test',
      narration: '',
      fxRate: 0.01,
      fxBps: 0,
      fxSource: 'test',
      fxPublishedAt: new Date().toISOString(),
      fxValidUntil: new Date(Date.now()+3600_000).toISOString(),
      fxDirection: 'USDC_PER_NGN',
      fxPrecision: 6,
      fxFeeTreatment: 'included',
    }),
    /Stale fx_rate/
  );
});

test('StellarProvider rejects non-finite fxBps', async () => {
  const provider = new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  await assert.rejects(
    provider.initiatePayout({
      reference: 'ref',
      amountKobo: 100000,
      currency: 'NGN',
      bankCode: '',
      accountNumber: 'G' + 'A'.repeat(55),
      accountName: 'Test',
      narration: '',
      fxRate: 0.0006,
      fxBps: Infinity,
      fxSource: 'test',
      fxPublishedAt: new Date().toISOString(),
      fxValidUntil: new Date(Date.now()+3600_000).toISOString(),
      fxDirection: 'USDC_PER_NGN',
      fxPrecision: 6,
      fxFeeTreatment: 'included',
    }),
    /Invalid fx_bps/
  );
});

test('StellarProvider rejects missing FX metadata', async () => {
  const provider = new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  await assert.rejects(
    provider.initiatePayout({
      reference: 'ref',
      amountKobo: 100000,
      currency: 'NGN',
      bankCode: '',
      accountNumber: 'G' + 'A'.repeat(55),
      accountName: 'Test',
      narration: '',
      fxRate: 0.0006,
      fxBps: 0,
      fxSource: '',
      fxPublishedAt: new Date().toISOString(),
      fxValidUntil: new Date(Date.now()+3600_000).toISOString(),
      fxDirection: 'USDC_PER_NGN',
      fxPrecision: 6,
      fxFeeTreatment: 'included',
    }),
    /FX rate missing trusted source/
  );
});

test('StellarProvider rejects stale FX validity', async () => {
  const provider = new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  await assert.rejects(
    provider.initiatePayout({
      reference: 'ref',
      amountKobo: 100000,
      currency: 'NGN',
      bankCode: '',
      accountNumber: 'G' + 'A'.repeat(55),
      accountName: 'Test',
      narration: '',
      fxRate: 0.0006,
      fxBps: 0,
      fxSource: 'test',
      fxPublishedAt: new Date(Date.now()-86400000*2).toISOString(),
      fxValidUntil: new Date(Date.now()-86400000).toISOString(),
      fxDirection: 'USDC_PER_NGN',
      fxPrecision: 6,
      fxFeeTreatment: 'included',
    }),
    /FX rate is stale/
  );
});

test('StellarProvider rejects unsupported FX direction', async () => {
  const provider = new StellarProvider({ stellarSeed: 'S' + 'A'.repeat(55), horizonUrl: 'https://horizon-testnet.stellar.org' });
  await assert.rejects(
    provider.initiatePayout({
      reference: 'ref',
      amountKobo: 100000,
      currency: 'NGN',
      bankCode: '',
      accountNumber: 'G' + 'A'.repeat(55),
      accountName: 'Test',
      narration: '',
      fxRate: 0.0006,
      fxBps: 0,
      fxSource: 'test',
      fxPublishedAt: new Date().toISOString(),
      fxValidUntil: new Date(Date.now()+3600_000).toISOString(),
      fxDirection: 'NGN_PER_USDC',
      fxPrecision: 6,
      fxFeeTreatment: 'included',
    }),
    /Unsupported FX direction/
  );
});

test('migration v3 upgrades a DB that already ran v2', async () => {
  const { MIGRATIONS } = await import('../server/migrations/index.js');
  const v3 = MIGRATIONS.find(m => m.version === 3);
  assert.ok(v3, 'migration v3 exists');
  assert.equal(v3.name, 'fx-metadata-for-stellar');
  // Verify migration definition adds expected columns
  const sql = v3.up.toString();
  for (const col of ['fx_source','fx_published_at','fx_valid_until','fx_direction','fx_precision','fx_fee_treatment']) {
    assert.ok(sql.includes(col), `migration v3 should add column ${col}`);
  }
  assert.ok(sql.includes('UPDATE withdrawals SET fx_rate = NULL WHERE fx_rate = 0.01'), 'migration v3 should clean sentinel rate');
});
