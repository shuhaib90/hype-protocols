require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isConnected = false;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
    console.log('⚡ [HashApe Supabase] Client configured for:', SUPABASE_URL);
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Initialization error:', err.message);
  }
}

async function checkConnection() {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from('hashape_protocol_state').select('id').limit(1);
    if (!error && data) {
      isConnected = true;
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function loadInitialDataFromSupabase(localDb) {
  if (!supabase) return localDb;
  try {
    const connected = await checkConnection();
    if (!connected) return localDb;

    // 1. Protocol State
    const { data: stateData } = await supabase.from('hashape_protocol_state').select('*').eq('id', 1).single();
    if (stateData) {
      localDb.totalMined = stateData.total_mined ?? localDb.totalMined;
      localDb.maxSupply = stateData.max_supply ?? 10000;
      if (!localDb.treasury) localDb.treasury = {};
      localDb.treasury.claimedMintFeesEth = Number(stateData.claimed_mint_fees_eth || 0);
      localDb.treasury.claimedRigFeesHashApe = Number(stateData.claimed_rig_fees_hashape || 0);
    }

    // 2. Records
    const { data: recordsData } = await supabase.from('hashape_mining_records').select('*').order('solved_at', { ascending: false });
    if (recordsData && recordsData.length > 0) {
      localDb.records = recordsData.map(r => ({
        id: r.id,
        wallet: r.wallet,
        tokenId: r.token_id,
        nonce: r.nonce,
        solvedHash: r.solved_hash,
        difficulty: r.difficulty,
        gpuRenderer: r.gpu_renderer,
        status: r.status,
        epochId: r.epoch_id,
        feeUsd: Number(r.fee_usd),
        feeEth: Number(r.fee_eth),
        txHash: r.tx_hash,
        solvedAt: r.solved_at ? new Date(r.solved_at).getTime() : Date.now(),
        mintedAt: r.minted_at ? new Date(r.minted_at).getTime() : null,
      }));
    }

    // 3. Worker Entitlements
    const { data: workerData } = await supabase.from('hashape_worker_entitlements').select('*');
    if (workerData) {
      localDb.workerEntitlements = {};
      for (const w of workerData) {
        const safeWallet = w.wallet.toLowerCase();
        if (!localDb.workerEntitlements[safeWallet]) localDb.workerEntitlements[safeWallet] = {};
        localDb.workerEntitlements[safeWallet][w.worker_id] = w.is_active;
      }
    }

    // 4. Used Proofs
    const { data: usedData } = await supabase.from('hashape_used_proofs').select('proof_hash');
    if (usedData) {
      localDb.usedProofs = {};
      for (const u of usedData) {
        localDb.usedProofs[u.proof_hash] = true;
      }
    }

    // 5. Epoch Overrides
    const { data: epochData } = await supabase.from('hashape_epoch_overrides').select('*');
    if (epochData) {
      localDb.epochOverrides = {};
      for (const e of epochData) {
        localDb.epochOverrides[e.epoch_id] = {
          mintFeeUsd: Number(e.mint_fee_usd),
          mintFeeEth: Number(e.mint_fee_eth),
          mintFeeApe: Number(e.mint_fee_ape),
          updatedAt: e.updated_at ? new Date(e.updated_at).getTime() : Date.now()
        };
      }
    }

    // 6. Treasury Claims
    const { data: claimsData } = await supabase.from('hashape_treasury_claims').select('*').order('created_at', { ascending: false });
    if (claimsData) {
      if (!localDb.treasury) localDb.treasury = { claimedMintFeesEth: 0, claimedRigFeesHashApe: 0, claims: [] };
      localDb.treasury.claims = claimsData.map(c => ({
        id: c.id,
        type: c.claim_type,
        amount: Number(c.amount),
        currency: c.currency,
        tokenContract: c.token_contract,
        network: c.network,
        recipient: c.recipient,
        txHash: c.tx_hash,
        timestamp: c.created_at ? new Date(c.created_at).getTime() : Date.now()
      }));
    }

    console.log(`⚡ [HashApe Supabase] Loaded ${localDb.records.length} records, total mined: ${localDb.totalMined}`);
    return localDb;
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Error syncing remote state, using local fallback:', err.message);
    return localDb;
  }
}

async function syncRecord(record) {
  if (!supabase) return;
  try {
    const payload = {
      id: record.id,
      wallet: record.wallet,
      token_id: record.tokenId,
      nonce: String(record.nonce),
      solved_hash: record.solvedHash || '',
      difficulty: record.difficulty || 4,
      gpu_renderer: record.gpuRenderer || 'WebGPU Compute Core',
      status: record.status || 'SOLVED',
      epoch_id: record.epochId || 1,
      fee_usd: record.feeUsd || 5.0,
      fee_eth: record.feeEth || 0.0020,
      tx_hash: record.txHash || null,
      solved_at: record.solvedAt ? new Date(record.solvedAt).toISOString() : new Date().toISOString(),
      minted_at: record.mintedAt ? new Date(record.mintedAt).toISOString() : null
    };
    await supabase.from('hashape_mining_records').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Failed to sync record:', err.message);
  }
}

async function syncState(totalMined, claimedMintFeesEth = 0, claimedRigFeesHashApe = 0) {
  if (!supabase) return;
  try {
    await supabase.from('hashape_protocol_state').upsert({
      id: 1,
      total_mined: totalMined,
      max_supply: 10000,
      claimed_mint_fees_eth: claimedMintFeesEth,
      claimed_rig_fees_hashape: claimedRigFeesHashApe,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Failed to sync state:', err.message);
  }
}

async function syncWorkerEntitlement(wallet, workerId, isActive = true) {
  if (!supabase) return;
  try {
    await supabase.from('hashape_worker_entitlements').upsert({
      wallet: wallet.toLowerCase(),
      worker_id: workerId,
      is_active: isActive,
      activated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Failed to sync worker:', err.message);
  }
}

async function syncUsedProof(proofHash) {
  if (!supabase) return;
  try {
    await supabase.from('hashape_used_proofs').upsert({
      proof_hash: proofHash,
      used_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Failed to sync proof:', err.message);
  }
}

async function syncEpochOverride(epochId, mintFeeUsd, mintFeeEth, mintFeeApe) {
  if (!supabase) return;
  try {
    await supabase.from('hashape_epoch_overrides').upsert({
      epoch_id: epochId,
      mint_fee_usd: mintFeeUsd,
      mint_fee_eth: mintFeeEth,
      mint_fee_ape: mintFeeApe,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Failed to sync epoch:', err.message);
  }
}

async function syncTreasuryClaim(claim) {
  if (!supabase) return;
  try {
    await supabase.from('hashape_treasury_claims').upsert({
      id: claim.id,
      claim_type: claim.type,
      amount: claim.amount,
      currency: claim.currency,
      token_contract: claim.tokenContract || null,
      network: claim.network || 'Robinhood EVM L2',
      recipient: claim.recipient,
      tx_hash: claim.txHash,
      created_at: new Date(claim.timestamp || Date.now()).toISOString()
    });
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Failed to sync claim:', err.message);
  }
}

async function resetRemoteState() {
  if (!supabase) return;
  try {
    await supabase.from('hashape_protocol_state').upsert({
      id: 1,
      total_mined: 3,
      max_supply: 10000,
      claimed_mint_fees_eth: 0,
      claimed_rig_fees_hashape: 0,
      updated_at: new Date().toISOString()
    });
    await supabase.from('hashape_mining_records').delete().not('id', 'in', '(mint_genesis_1,mint_genesis_2,mint_genesis_3)');
    await supabase.from('hashape_worker_entitlements').delete().neq('worker_id', 0);
    await supabase.from('hashape_used_proofs').delete().neq('proof_hash', '');
    await supabase.from('hashape_epoch_overrides').delete().neq('epoch_id', 0);
    await supabase.from('hashape_treasury_claims').delete().neq('id', '');
  } catch (err) {
    console.warn('⚠️ [HashApe Supabase] Reset error:', err.message);
  }
}

module.exports = {
  supabase,
  checkConnection,
  loadInitialDataFromSupabase,
  syncRecord,
  syncState,
  syncWorkerEntitlement,
  syncUsedProof,
  syncEpochOverride,
  syncTreasuryClaim,
  resetRemoteState
};
