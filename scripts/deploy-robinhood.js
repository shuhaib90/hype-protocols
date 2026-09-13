/**
 * Deploy ApeSyndicate HashApes NFT Mining Contract to Robinhood EVM Layer 2
 * 
 * Usage:
 *   ROBINHOOD_RPC_URL="<rpc_url>" PRIVATE_KEY="<private_key>" node scripts/deploy-robinhood.js
 * 
 * Or create a .env file with:
 *   ROBINHOOD_RPC_URL=...
 *   PRIVATE_KEY=...
 *   BASE_URI=...
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING APESYNDICATE TO ROBINHOOD EVM LAYER 2');
  console.log('====================================================\n');

  const rpcUrl = process.env.ROBINHOOD_RPC_URL || process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const baseUri = process.env.BASE_URI || 'https://endpoint.4everland.co/hashape/metadata/';
  const contractUri = process.env.CONTRACT_URI || 'https://endpoint.4everland.co/hashape/storefront.json';
  const rigTokenAddress = process.env.RIG_TOKEN_ADDRESS || process.env.HYPE_TOKEN_ADDRESS || '0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc';

  if (!rpcUrl) {
    console.error('❌ Error: ROBINHOOD_RPC_URL is required.');
    console.log('\nPlease provide the RPC URL for Robinhood EVM Layer 2:');
    console.log('Example: ROBINHOOD_RPC_URL="https://..." PRIVATE_KEY="0x..." node scripts/deploy-robinhood.js\n');
    process.exit(1);
  }

  if (!privateKey) {
    console.error('❌ Error: PRIVATE_KEY is required for the deployer wallet.');
    console.log('\nPlease provide your deployer private key:');
    console.log('Example: ROBINHOOD_RPC_URL="https://..." PRIVATE_KEY="0x..." node scripts/deploy-robinhood.js\n');
    process.exit(1);
  }

  console.log(`📡 Connecting to Robinhood L2 RPC: ${rpcUrl}`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    const network = await provider.getNetwork();
    console.log(`🌐 Connected to Network: Chain ID ${network.chainId.toString()}`);
  } catch (err) {
    console.error('❌ Failed to connect to RPC provider:', err.message);
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`👛 Deployer Address: ${wallet.address}`);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} ETH / Gas Token\n`);

  if (balance === 0n) {
    console.error('❌ Insufficient balance for deployment gas.');
    process.exit(1);
  }

  // Load contract artifact
  const artifactPath = path.join(__dirname, '..', 'contracts', 'HypeVMNFTMining.json');
  if (!fs.existsSync(artifactPath)) {
    console.log('Artifact not found, compiling contracts first...');
    require('./compile-contracts.js');
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log('⏳ Submitting deployment transaction...');
  console.log(`   Initial Base URI: ${baseUri}`);
  console.log(`   Contract Storefront URI: ${contractUri}`);
  console.log(`   Worker Rig Token Address: ${rigTokenAddress}`);

  const contract = await factory.deploy(rigTokenAddress, baseUri, contractUri);
  console.log(`📝 Deployment Tx Hash: ${contract.deploymentTransaction().hash}`);
  console.log('⏳ Waiting for block confirmation on Robinhood L2...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('\n====================================================');
  console.log(`🎉 CONTRACT SUCCESSFULLY DEPLOYED TO ROBINHOOD L2!`);
  console.log(`📍 Deployed Contract Address: ${contractAddress}`);
  console.log(`🔗 Transaction Hash: ${contract.deploymentTransaction().hash}`);
  console.log('====================================================\n');

  // Save deployment info
  const deployInfo = {
    network: 'Robinhood EVM Layer 2',
    contractAddress,
    txHash: contract.deploymentTransaction().hash,
    deployer: wallet.address,
    baseUri,
    deployedAt: new Date().toISOString()
  };

  const outputPath = path.join(__dirname, '..', 'data', 'deployed-contract.json');
  fs.writeFileSync(outputPath, JSON.stringify(deployInfo, null, 2));
  console.log(`✅ Deployment info saved to: data/deployed-contract.json`);
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
