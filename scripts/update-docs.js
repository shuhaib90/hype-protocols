const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/docs/DocsContent.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(/04\. HYPE Worker Activation/g, '04. APEBROKER Worker Activation');
content = content.replace(/HYPE Token Worker Activation/g, 'APEBROKER Token Worker Activation');
content = content.replace(/HypeVM Proof-of-Work NFT Mining Protocol/g, 'ApeSyndicate Proof-of-Work NFT Mining Protocol');
content = content.replace(/<strong>HypeVM NFT Mining<\/strong>/g, '<strong>ApeSyndicate NFT Mining</strong>');
content = content.replace(/the HypeVM smart contract/g, 'the ApeSyndicate smart contract');
content = content.replace(/\[Pays 0\.05 \$HYPE Mint Fee\]/g, '[Pays 0.05 $APEBROKER Mint Fee]');
content = content.replace(/0\.05 \$HYPE fee/g, '0.05 $APEBROKER fee');
content = content.replace(/0\.05 HYPE mint fee/g, '0.05 APEBROKER mint fee');
content = content.replace(/HYPE Activated/g, 'APEBROKER Activated');
content = content.replace(/0 HYPE/g, '0 APEBROKER');
content = content.replace(/100 HYPE/g, '100 APEBROKER');
content = content.replace(/200 HYPE/g, '200 APEBROKER');
content = content.replace(/300 HYPE/g, '300 APEBROKER');
content = content.replace(/500 HYPE/g, '500 APEBROKER');
content = content.replace(/native <strong>HYPE token<\/strong>/g, 'native <strong>APEBROKER token</strong>');
content = content.replace(/ERC-20 HYPE balance/g, 'ERC-20 APEBROKER balance');
content = content.replace(/HypeVM adopts GPU-driven/g, 'ApeSyndicate adopts GPU-driven');
content = content.replace(/native \$HYPE gas economics/g, 'native $APEBROKER gas economics');
content = content.replace(/HypeVMNFTMining\.sol Specification/g, 'ApeSyndicateNFTMining.sol Specification');
content = content.replace(/\/\/ 0\.05 \$HYPE native token/g, '// 0.05 $APEBROKER native token');
content = content.replace(/native \$HYPE as its Layer-1 gas currency/g, 'native $APEBROKER as its Layer-1 gas currency');
content = content.replace(/settled strictly in \$HYPE/g, 'settled strictly in $APEBROKER');
content = content.replace(/activated using HYPE tokens/g, 'activated using APEBROKER tokens');
content = content.replace(/the HypeVM ecosystem/g, 'the ApeSyndicate ecosystem');
content = content.replace(/#056644/g, '#1a7a08');
content = content.replace(/rgba\(13,242,164,/g, 'rgba(57,255,20,');
content = content.replace(/bg-\[#000000\]\/80/g, 'bg-[#060d24]/90');
content = content.replace(/bg-\[#03060c\]/g, 'bg-[#060d24]');

fs.writeFileSync(targetFile, content, 'utf8');
console.log('DocsContent.tsx updated successfully');
