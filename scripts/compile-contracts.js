const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.join(__dirname, '..', 'contracts', 'HypeVMNFTMining.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'HypeVMNFTMining.sol': {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

console.log('Compiling contracts/HypeVMNFTMining.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  for (const error of output.errors) {
    if (error.severity === 'error') {
      hasError = true;
      console.error(error.formattedMessage);
    } else {
      console.warn(error.formattedMessage);
    }
  }
  if (hasError) {
    process.exit(1);
  }
}

const contract = output.contracts['HypeVMNFTMining.sol']['HypeVMNFTMining'];
const artifact = {
  contractName: 'HypeVMNFTMining',
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object
};

const artifactPath = path.join(__dirname, '..', 'contracts', 'HypeVMNFTMining.json');
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

console.log(`✅ Compilation successful! Artifact saved to: contracts/HypeVMNFTMining.json`);
console.log(`Bytecode size: ${artifact.bytecode.length / 2} bytes`);
