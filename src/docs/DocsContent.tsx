import React, { useState } from 'react';
import {
  BookOpen,
  Cpu,
  Users,
  Coins,
  Activity,
  ShieldCheck,
  Sparkles,
  Layers,
  ShoppingBag,
  Lock,
  FileCode2,
  HelpCircle,
  Zap,
} from 'lucide-react';

export const DocsContent: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const navItems = [
    { id: 'overview', title: '01. Overview', icon: BookOpen },
    { id: 'how-it-works', title: '02. How Mining Works', icon: Zap },
    { id: 'workers', title: '03. Mining Workers', icon: Users },
    { id: 'hype-token', title: '04. HashApe ($HASHAPE) Activation', icon: Coins },
    { id: 'difficulty', title: '05. Difficulty', icon: Activity },
    { id: 'verification', title: '06. Proof Verification', icon: ShieldCheck },
    { id: 'minting', title: '07. NFT Minting', icon: Sparkles },
    { id: 'metadata', title: '08. NFT Metadata', icon: ShoppingBag },
    { id: 'supply', title: '09. Supply', icon: Layers },
    { id: 'security', title: '10. Security', icon: Lock },
    { id: 'webgpu', title: '11. WebGPU', icon: Cpu },
    { id: 'contract', title: '12. Smart Contract', icon: FileCode2 },
    { id: 'faq', title: '13. FAQ', icon: HelpCircle },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 paper-chassis p-4 bg-[#eee2ca] shadow-[4px_4px_0px_#24140a]">
            <div className="text-[10px] font-display font-bold text-[#d83a2a] uppercase tracking-wider mb-3 px-2">
              [ PROTOCOL DISPATCH ]
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs transition-all text-left border-2 ${
                      isActive
                        ? 'bg-[#d83a2a] text-white border-[#24140a] font-display font-bold text-[10px] shadow-[2px_2px_0px_#24140a]'
                        : 'text-[#6b5443] hover:text-[#24140a] hover:bg-[#fdfbf7] border-transparent font-mono font-bold'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="lg:col-span-3">
          <article className="paper-chassis paper-docs p-6 sm:p-10 text-[#24140a] font-mono text-sm leading-relaxed space-y-8 bg-[#fdfbf7] shadow-[4px_4px_0px_#24140a]">
            {/* 01. Overview */}
            {activeSection === 'overview' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-mint uppercase font-bold">
                  <BookOpen className="w-4 h-4" />
                  <span>Topic 01 // Overview</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  HashApe Proof-of-Work NFT Mining Protocol
                </h1>
                <p>
                  <strong>HashApe NFT Mining</strong> is a fair-launch, proof-of-work-based NFT distribution system on Robinhood EVM L2.
                  Public users cannot directly call a standard public mint function to purchase an NFT with capital alone.
                  Instead, every participant must compute a valid cryptographic Proof-of-Work solution using their in-browser GPU.
                </p>
                <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs text-cyber-mint">
                  Maximum Hard Cap: <strong>10,000 NFTs</strong>. Once all 10,000 tokens are minted, primary mining is permanently terminated on-chain.
                </div>
                <h2 className="text-lg font-display font-bold text-white pt-4">Core Principles</h2>
                <ul className="list-disc pl-5 space-y-2 text-cyber-dim">
                  <li><strong>Hardware Proof-of-Work:</strong> The browser detects and engages WebGPU compute pipelines to execute billions of arithmetic Keccak-256 cycles.</li>
                  <li><strong>Untrusted Frontend:</strong> Client-reported hashrates and success flags are never trusted. The smart contract independently verifies all cryptographic proofs.</li>
                  <li><strong>Separation of Mining & Minting:</strong> Finding a solution yields a cryptographically verifiable mint entitlement. The user then submits the transaction to pay the native mint fee and mint the token.</li>
                  <li><strong>No Auto-Minting:</strong> Users maintain full sovereignty over their wallet keys and initiate mint transactions on demand.</li>
                </ul>
              </section>
            )}

            {/* 02. How Mining Works */}
            {activeSection === 'how-it-works' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Zap className="w-4 h-4" />
                  <span>Topic 02 // Architecture</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  How Mining Works: End-to-End Workflow
                </h1>
                <p>
                  The mining lifecycle transitions through sequential states between the client GPU, the authoritative session engine, and the HashApe smart contract.
                </p>

                {/* ASCII Sequence Diagram */}
                <div className="p-4 bg-[#060d24] border border-cyber-borderSubtle rounded-lg font-mono text-xs overflow-x-auto text-cyber-code">
                  <pre>{`
  USER WALLET             WEBGPU ENGINE           AUTHORITATIVE VERIFIER      SMART CONTRACT
      │                        │                            │                       │
      │── 1. Connect Wallet ──>│                            │                       │
      │                        │── 2. Request Challenge ───>│                       │
      │                        │<─ 3. Session & Target ─────│                       │
      │                        │                            │                       │
      │                        │── 4. WebGPU Shaders Loop   │                       │
      │                        │   [Searches Nonces]        │                       │
      │                        │                            │                       │
      │                        │── 5. Valid Proof Found ───>│                       │
      │                        │<─ 6. Mint Entitlement ─────│                       │
      │                        │                            │                       │
      │<─ 7. MINING COMPLETE ──│                            │                       │
      │                        │                            │                       │
      │── 8. Call mintWithMiningProof(nonce, challenge) ───────────────────────────>│
      │      [Pays Native ETH Mint Fee (Epoch-scaled)]    │                       │
      │                                                     │   9. Verify Proof:    │
      │                                                     │   hash < Target &     │
      │                                                     │   usedProofs == false │
      │                                                     │                       │
      │<─ 10. Transfer ERC-721 Token #XXXX ─────────────────────────────────────────│
                  `}</pre>
                </div>

                <ol className="list-decimal pl-5 space-y-2 text-cyber-dim">
                  <li><strong>Connect Wallet:</strong> User binds their Web3 address to initialize session parameters.</li>
                  <li><strong>Request Session:</strong> Verifier issues an expiring challenge bound to the user's address, collection ID, and current difficulty.</li>
                  <li><strong>Compute in WebGPU:</strong> Up to 5 parallel workers search isolated partitions of the nonce space.</li>
                  <li><strong>Proof Discovery:</strong> When any worker discovers a nonce yielding a hash beneath the target, all other workers stop immediately.</li>
                  <li><strong>On-Chain Mint:</strong> The miner calls the smart contract, paying the native ETH fee (Epoch-scaled, starting at $5 ETH / 0.0020 ETH). The contract validates the math and mints the token.</li>
                </ol>
              </section>
            )}

            {/* 03. 5-Worker System */}
            {activeSection === 'workers' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Users className="w-4 h-4" />
                  <span>Topic 03 // Workers</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  The Five-Worker System & Nonce Partitioning
                </h1>
                <p>
                  Each user can operate up to <strong>5 simultaneous mining workers</strong>. To ensure optimal hardware efficiency, workers never search overlapping nonce spaces.
                </p>

                <h2 className="text-lg font-display font-bold text-white pt-2">Disjoint Nonce Partitions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-cyber-borderSubtle text-xs font-mono">
                    <thead>
                      <tr className="bg-cyber-surface text-white">
                        <th className="p-3 border border-cyber-borderSubtle text-left">Worker</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Status</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Assigned Nonce Range</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Activation Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">Worker #1</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-mint">FREE (Default)</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0000000000 … 0x00ffffffff</code></td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-mint">0 HASHAPE</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">Worker #2</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-dim">HASHAPE Activated</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0100000000 … 0x01ffffffff</code></td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">100 HASHAPE</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">Worker #3</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-dim">HASHAPE Activated</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0200000000 … 0x02ffffffff</code></td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">200 HASHAPE</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">Worker #4</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-dim">HASHAPE Activated</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0300000000 … 0x03ffffffff</code></td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">300 HASHAPE</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">Worker #5</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-dim">HASHAPE Activated</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0400000000 … 0x04ffffffff</code></td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">500 HASHAPE</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs">
                  <strong className="text-white">Crucial Protocol Rule:</strong> Operating 5 workers does <em>not</em> entitle the miner to 5 NFTs. There is strictly <strong>one NFT mint entitlement per valid proof</strong>. 5 workers simply evaluate nonces 5 times faster.
                </div>
              </section>
            )}

            {/* 04. HashApe ($HASHAPE) Worker Activation */}
            {activeSection === 'hype-token' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Coins className="w-4 h-4" />
                  <span>Topic 04 // Token Economics</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  HashApe ($HASHAPE) Worker Activation
                </h1>
                <p>
                  To prevent Sybil flooding and incentivize the HashApe ecosystem, additional workers (Workers 2 to 5) require activation via the native <strong>HashApe ($HASHAPE) token</strong>.
                </p>

                <div className="p-3.5 bg-[#eee2ca] border-2 border-[#24140a] font-mono text-xs shadow-[2px_2px_0px_#24140a]">
                  <div className="text-[10px] font-display font-bold text-[#d83a2a] uppercase mb-1">
                    [ OFFICIAL RIG ACTIVATION TOKEN CONTRACT ]
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-[#24140a] font-bold bg-[#fdfbf7] p-1.5 border border-[#24140a] break-all select-all text-xs">
                      0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc
                    </code>
                    <span className="text-[10px] font-bold text-[#2e7d32] bg-[#fdfbf7] px-2 py-0.5 border border-[#24140a]">
                      ROBINHOOD EVM L2
                    </span>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-cyber-surface rounded-lg border border-cyber-borderSubtle">
                    <span className="text-cyber-blue font-bold block mb-1">1. Token Check:</span>
                    The UI and contract query the user's ERC-20 HashApe ($HASHAPE) balance.
                  </div>
                  <div className="p-3 bg-cyber-surface rounded-lg border border-cyber-borderSubtle">
                    <span className="text-cyber-blue font-bold block mb-1">2. Approval & Transfer:</span>
                    The user approves and transfers the configured fee to the contract treasury.
                  </div>
                  <div className="p-3 bg-cyber-surface rounded-lg border border-cyber-borderSubtle">
                    <span className="text-cyber-blue font-bold block mb-1">3. Entitlement Recorded:</span>
                    The contract records <code>workerEntitled[user][workerId] = true</code> permanently.
                  </div>
                </div>
                <p className="text-xs text-cyber-muted">
                  Note: Worker activation fees are separate from the network NFT mint fee. Worker fees expand mining capacity; the mint fee covers settlement.
                </p>
              </section>
            )}

            {/* 05. Dynamic Difficulty */}
            {activeSection === 'difficulty' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Activity className="w-4 h-4" />
                  <span>Topic 05 // Pacing</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  Dynamic Difficulty Scaling by Remaining Supply
                </h1>
                <p>
                  To simulate the halving dynamics of Bitcoin and fair-launch protocols like HashCats, mining difficulty scales deterministically as the remaining supply of NFTs contracts.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-cyber-borderSubtle text-xs font-mono">
                    <thead>
                      <tr className="bg-cyber-surface text-white">
                        <th className="p-3 border border-cyber-borderSubtle text-left">Remaining Supply</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Difficulty Band</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Target Hex Bound</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Est. Nonces</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle">10,000 → 7,500</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-mint font-bold">EASY</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x000ffff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~4,096</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle">7,499 → 5,000</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">MEDIUM</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0007fff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~8,192</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle">4,999 → 2,500</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-purple font-bold">HARD</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0003fff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~16,384</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle">2,499 → 1,000</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-amber font-bold">VERY HARD</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0001fff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~32,768</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle">999 → 100</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-red font-bold">EXTREME</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x00007ff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~524,288</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle">99 → 1</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-red font-extrabold">MAXIMUM</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x00000ff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~16,777,216</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h2 className="text-lg font-display font-bold text-white pt-6">
                  Per-Wallet Quota (5 NFTs Max) & Sequential Escalation Ladder
                </h2>
                <p>
                  To prevent whale concentration and reward dedicated compute power, each wallet address is strictly capped at a <strong>maximum of 5 NFTs</strong>.
                  Furthermore, difficulty escalates sequentially with each individual NFT minted by that wallet:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-cyber-borderSubtle text-xs font-mono">
                    <thead>
                      <tr className="bg-cyber-surface text-white">
                        <th className="p-3 border border-cyber-borderSubtle text-left">Wallet Mint #</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Difficulty Tier</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Target Hex Bound</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Avg. Nonces</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">GPU Requirement</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">NFT 1/5</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white font-bold">HARD</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0003ffff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~65,536</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue">WebGPU Core</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">NFT 2/5</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white font-bold">HARDER</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x0001ffff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~131,072</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue">WebGPU Core</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">NFT 3/5</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white font-bold">VERY HARD</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x00007fff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~524,288</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue">Multi-Worker WebGPU</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">NFT 4/5</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white font-bold">EXTREME</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x00003fff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~1,048,576</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue">Multi-Worker WebGPU</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">NFT 5/5</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white font-bold">LEGENDARY</td>
                        <td className="p-3 border border-cyber-borderSubtle"><code>0x00000fff...</code></td>
                        <td className="p-3 border border-cyber-borderSubtle">~4,194,304</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue">Full 5-Worker GPU Array</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-[#0b1a3d] border-2 border-cyber-border text-xs font-mono text-cyber-blue">
                  <strong>Quota Enforcement:</strong> After minting 5 NFTs, smart contract and backend validation strictly locks further mining session creation and mint transactions for that wallet address.
                </div>

                <h2 className="text-lg font-display font-bold text-white pt-6">
                  Authoritative 10-Epoch Progressive Difficulty & Escalating Mint Fee Schedule
                </h2>
                <p>
                  To combine fair-launch hardware mining with sustainable protocol economic incentives, the 10,000 collection is partitioned into <strong>10 sequential epochs</strong>.
                  Tokens in earlier epochs are minted with lower mint fees (starting at $5 ETH in Epoch 1 for Tokens #1–#10), while subsequent epochs require escalating mint fees (increasing to $7 ETH for Epoch 2, and scaling upwards) alongside escalating mining difficulty.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-cyber-borderSubtle text-xs font-mono">
                    <thead>
                      <tr className="bg-cyber-surface text-white">
                        <th className="p-3 border border-cyber-borderSubtle text-left">Epoch #</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Token Range</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Epoch Supply</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Mint Fee (USD / ETH)</th>
                        <th className="p-3 border border-cyber-borderSubtle text-left">Mining Difficulty</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-[#00ff88]/5">
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-mint font-bold">Epoch 1</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #1 → #10</td>
                        <td className="p-3 border border-cyber-borderSubtle">10 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$5.00 ETH (0.0020 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">HARD (Baseline)</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-cyber-blue font-bold">Epoch 2</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #11 → #30</td>
                        <td className="p-3 border border-cyber-borderSubtle">20 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$7.00 ETH (0.0028 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">HARDER</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 3</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #31 → #70</td>
                        <td className="p-3 border border-cyber-borderSubtle">40 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$10.00 ETH (0.0040 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">VERY HARD</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 4</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #71 → #150</td>
                        <td className="p-3 border border-cyber-borderSubtle">80 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$14.00 ETH (0.0056 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">VERY HARD+</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 5</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #151 → #300</td>
                        <td className="p-3 border border-cyber-borderSubtle">150 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$18.00 ETH (0.0072 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">EXTREME</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 6</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #301 → #600</td>
                        <td className="p-3 border border-cyber-borderSubtle">300 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$22.00 ETH (0.0088 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">EXTREME+</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 7</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #601 → #1,200</td>
                        <td className="p-3 border border-cyber-borderSubtle">600 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$26.00 ETH (0.0104 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">LEGENDARY</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 8</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #1,201 → #2,500</td>
                        <td className="p-3 border border-cyber-borderSubtle">1,300 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$30.00 ETH (0.0120 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">LEGENDARY+</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 9</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #2,501 → #5,000</td>
                        <td className="p-3 border border-cyber-borderSubtle">2,500 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$35.00 ETH (0.0140 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">MYTHIC</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-cyber-borderSubtle text-purple-300 font-bold">Epoch 10</td>
                        <td className="p-3 border border-cyber-borderSubtle text-white">Tokens #5,001 → #10,000</td>
                        <td className="p-3 border border-cyber-borderSubtle">5,000 NFTs</td>
                        <td className="p-3 border border-cyber-borderSubtle text-yellow-300 font-bold">$40.00 ETH (0.0160 ETH)</td>
                        <td className="p-3 border border-cyber-borderSubtle text-cyan-300 font-bold">OMEGA MAXIMUM</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 06. Proof Verification */}
            {activeSection === 'verification' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Topic 06 // Cryptography</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  Cryptographic Proof Verification
                </h1>
                <p>
                  The HypeVM Proof-of-Work equation is deterministic, non-malleable, and independently verifiable on any EVM node:
                </p>
                <div className="p-4 bg-[#060d24] border border-cyber-borderSubtle rounded-lg font-mono text-sm text-cyber-code">
                  <code>digest = keccak256(abi.encodePacked(challenge, minerAddress, nonce))</code>
                  <div className="mt-2 text-cyber-mint">
                    <code>require(uint256(digest) &lt; targetDifficulty, "Invalid Proof");</code>
                  </div>
                </div>
                <h2 className="text-lg font-display font-bold text-white pt-2">Anti-Cheat Enforcement</h2>
                <ul className="list-disc pl-5 space-y-2 text-cyber-dim">
                  <li><strong>Address Binding:</strong> Nonce solutions are cryptographically bound to the miner's address. If an adversary attempts to steal a solution broadcast in the mempool, the hash evaluated against their address will yield an entirely invalid digest.</li>
                  <li><strong>Replay Protection:</strong> Once submitted, <code>usedProofs[digest] = true</code> prevents duplicate mints with the same solution.</li>
                  <li><strong>Challenge Rotation:</strong> Each block mint rotates the current challenge hash using previous proof data and block randomness.</li>
                </ul>
              </section>
            )}

            {/* 07. NFT Minting */}
            {activeSection === 'minting' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Topic 07 // Minting</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  NFT Minting Settlement Flow
                </h1>
                <p>
                  Solving the mining challenge does not trigger an unconsented automatic mint transaction.
                  Once the WebGPU engine proves a valid nonce, the UI presents the <strong>MINING COMPLETE</strong> receipt and allows the user to manually trigger the mint transaction.
                </p>
                <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs space-y-2">
                  <div className="text-white font-bold">Parameters required by `mintWithMiningProof`:</div>
                  <div>• <code>nonce</code>: uint256 solution discovered by WebGPU</div>
                  <div>• <code>challenge</code>: bytes32 challenge hash currently active</div>
                  <div>• <code>msg.value</code>: native ETH fee (Epoch-scaled, starting at $5 ETH / 0.0020 ETH)</div>
                </div>
              </section>
            )}

            {/* 08. NFT Metadata */}
            {activeSection === 'metadata' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Topic 08 // NFT Metadata</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  NFT Metadata & Self-Hosted Storage Architecture
                </h1>
                <p>
                  Every HashApe NFT is accompanied by rich, deterministic metadata and full-resolution graphics hosted permanently on the protocol's dedicated web storage.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs space-y-2">
                    <span className="text-white font-bold block">Metadata Schema</span>
                    <ul className="list-disc pl-4 space-y-1 text-cyber-dim">
                      <li><code>name</code>: "Lomarka the Voyager" (Unique per Ape)</li>
                      <li><code>description</code>: "hashape #00001: Lomarka the Voyager. A detailed pixel-art ape..."</li>
                      <li><code>image</code>: Permanent link to 1024x1024 artwork</li>
                      <li><code>attributes</code>: 11 traits (Background, Backdrop Style, Fur, Skin, Outfit, Outfit Color, Expression, Headwear, Eyewear, Lens Color, Accessory)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs space-y-2">
                    <span className="text-white font-bold block">Self-Hosted Endpoints</span>
                    <ul className="list-disc pl-4 space-y-1 text-cyber-dim">
                      <li>Metadata: <code>/metadata/:id.json</code></li>
                      <li>Images: <code>/images/:id.png</code></li>
                      <li>Storefront: <code>/storefront.json</code></li>
                      <li>Storage: 10,000 local JSON & PNG assets with zero IPFS gateway lag</li>
                    </ul>
                  </div>
                </div>

                <h2 className="text-lg font-display font-bold text-white pt-2">Secondary Market Indexing & ERC-2981 Royalties</h2>
                <p>
                  Major secondary marketplaces such as OpenSea index token metadata directly from the smart contract's <code>tokenURI(tokenId)</code> function.
                  The contract implements the universal <strong>ERC-2981 Royalty Standard</strong>:
                </p>
                <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs space-y-1">
                  <div>Enforced Creator Royalty: <strong className="text-cyber-mint">5.0% (500 Basis Points)</strong></div>
                  <div>Royalty Receiver Wallet: <code className="text-white">0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C</code></div>
                  <div>Secondary Trading: Automatically applies 5% creator fee across compliant EVM marketplaces</div>
                </div>
              </section>
            )}

            {/* 09. Supply */}
            {activeSection === 'supply' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Layers className="w-4 h-4" />
                  <span>Topic 09 // Supply</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  10,000 Maximum Supply & Final Race Conditions
                </h1>
                <p>
                  The HashApe collection features a strict, immutably enforced hard cap of <strong>10,000 NFTs</strong>.
                  There are no team reserves, pre-mints, or inflationary mechanics.
                </p>

                <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs space-y-2">
                  <h3 className="text-white font-bold">The Final NFT Race Condition</h3>
                  <p className="text-cyber-dim">
                    When total mined reaches 9,999, hundreds of miners around the world may find a valid cryptographic proof for Token #10,000 at nearly the exact same second.
                    The frontend is never the authoritative arbiter of who wins the final token.
                  </p>
                  <div className="p-3 bg-cyber-red/10 border border-cyber-red/30 rounded-lg text-white font-mono">
                    <code>require(totalMined &lt; MAX_SUPPLY, "NFT ALREADY CLAIMED: 10,000 Sold Out");</code>
                  </div>
                  <p className="text-cyber-dim">
                    The EVM blockchain processes transactions sequentially. The first valid transaction to be mined into a block successfully claims Token #10,000.
                    Any subsequent transactions in that block or future blocks will immediately revert with <strong>NFT ALREADY CLAIMED</strong>.
                    No duplicated tokens can ever be minted, and primary mining is closed permanently.
                  </p>
                </div>
              </section>
            )}

            {/* 10. Security */}
            {activeSection === 'security' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Lock className="w-4 h-4" />
                  <span>Topic 10 // Security</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  Security Architecture & Threat Mitigation: Anti-Race Condition & Mempool Security
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <span className="text-cyber-blue font-bold block mb-1">Untrusted Client Model</span>
                    Modifying JavaScript variables, spoofing WebGPU status, or falsifying hashrates has zero impact on minting. The smart contract mathematically re-executes Keccak-256 on the submitted nonce.
                  </div>
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <span className="text-cyber-blue font-bold block mb-1">Mempool Front-Running Shield</span>
                    Because <code>msg.sender</code> is hashed into the proof digest (<code>keccak256(challenge, miner, nonce)</code>), another wallet cannot copy the nonce from the public mempool. An attacker's address would produce an entirely invalid digest.
                  </div>
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <span className="text-cyber-blue font-bold block mb-1">Replay Protection</span>
                    All submitted digests are permanently recorded in <code>usedProofs[digest] = true</code>, rendering previously discovered nonces obsolete and unredeemable.
                  </div>
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <span className="text-cyber-blue font-bold block mb-1">Challenge Rotation</span>
                    Every minted block rotates the active cryptographic challenge hash using the prior proof, block timestamp, and prevrandao randomness.
                  </div>
                </div>
              </section>
            )}

            {/* 11. WebGPU */}
            {activeSection === 'webgpu' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Topic 11 // WebGPU</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  WebGPU Architecture & Compute Pipeline
                </h1>
                <p>
                  WebGPU provides direct, low-level access to the graphics card compute pipeline using <strong>WGSL (WebGPU Shading Language)</strong>.
                  Unlike older WebGL fragment shader workarounds, WebGPU compute shaders execute general-purpose parallel arithmetic across hundreds of SIMD execution units simultaneously.
                </p>

                <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs space-y-2">
                  <h4 className="text-white font-bold">Partitioned Search Spaces Across 5 Workers</h4>
                  <p className="text-cyber-dim">
                    When multiple workers are active, the compute pipeline segments the uint256 search space into disjoint ranges (Range A through Range E).
                    This ensures 0% redundant hashing across concurrent worker threads, achieving near-linear scaling of effective hashrate.
                  </p>
                  <p className="text-cyber-dim">
                    If WebGPU is unsupported or disabled, the application provides an automatic fallback to WebGL / multi-threaded CPU workers to ensure universal compatibility.
                  </p>
                </div>

                <div className="p-4 bg-cyber-surface border border-cyber-borderSubtle rounded-xl font-mono text-xs space-y-2">
                  <h4 className="text-white font-bold">HashCats Inspiration & Technical Comparison</h4>
                  <p className="text-cyber-dim">
                    Inspired by the cryptographic proof-of-work mechanics pioneered by HashCats, HashApe adopts GPU-driven proof generation while tailoring execution for Robinhood EVM L2's ultra-fast consensus, native ETH mint fees, and up to 5 concurrent WebGPU compute workers with disjoint nonce partitions.
                  </p>
                </div>
              </section>
            )}

            {/* 12. Smart Contract */}
            {activeSection === 'contract' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <FileCode2 className="w-4 h-4" />
                  <span>Topic 12 // Smart Contract</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  HashApeNFTMining.sol Specification
                </h1>
                <p>
                  The protocol is governed by an immutable, verified smart contract deployed on Robinhood Chain Mainnet (Chain ID 4663) at <code className="text-cyber-blue font-bold">0x7D959C29aa1098d93b307Ca40bEEEc0bF7bbfF85</code>. Direct mint functions are disabled; tokens can only be minted by presenting a valid Keccak-256 proof.
                </p>
                <div className="bg-[#060d24] p-4 rounded-xl border border-cyber-borderSubtle font-mono text-xs overflow-x-auto text-cyber-dim">
                  <pre>{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HashApeNFTMining {
    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public mintFee = 0.0020 ether; // Native ETH starting fee, escalates by epoch
    address public constant CREATOR_ADMIN_WALLET = 0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C;
    bool public miningPaused;
    
    function mintWithMiningProof(uint256 nonce, bytes32 challenge) external payable returns (uint256);
    function activateWorker(uint8 workerIndex) external;
    function getCurrentDifficultyTarget() public view returns (uint256);
    function setMiningPaused(bool _paused) external;
    function setFeeRecipient(address _feeRecipient) external;
    function claimNativeMintFees() external;
    function claimTokenActivationFees() external;
    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address, uint256);
}
                  `}</pre>
                </div>
              </section>
            )}

            {/* 13. FAQ */}
            {activeSection === 'faq' && (
              <section className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyber-blue uppercase font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <span>Topic 13 // FAQ</span>
                </div>
                <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                  Frequently Asked Questions
                </h1>
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <h3 className="text-white font-bold mb-1">Does mining cost gas or native tokens?</h3>
                    <p className="text-cyber-dim">No. The mining computation occurs 100% off-chain inside your browser GPU. You only pay network gas and the native ETH mint fee ($5 ETH / 0.0020 ETH, escalating by epoch) when submitting the on-chain mint transaction after finding a valid proof.</p>
                  </div>
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <h3 className="text-white font-bold mb-1">What currency is used for gas and mint fees?</h3>
                    <p className="text-cyber-dim">Mint fees and network gas are settled strictly in native ETH on Robinhood EVM L2. Worker rig activations (Workers 2–5) utilize HashApe ($HASHAPE) tokens at contract 0x30E55c3cfB2BBe5d0B07051e0B15c8a532c45ecc.</p>
                  </div>
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <h3 className="text-white font-bold mb-1">Can I mine on multiple workers?</h3>
                    <p className="text-cyber-dim">Yes! Miner 01 is 100% free for all connected wallets. Additional workers (Miner 02 to Miner 05) can be activated using HashApe ($HASHAPE) tokens to divide the cryptographic search space and increase your total hashrate.</p>
                  </div>
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <h3 className="text-white font-bold mb-1">What happens if two miners solve the final NFT simultaneously?</h3>
                    <p className="text-cyber-dim">The smart contract verifies the first transaction mined into a block to claim Token #10,000. All subsequent transactions revert safely with "NFT ALREADY CLAIMED", preventing over-minting.</p>
                  </div>
                  <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-borderSubtle">
                    <h3 className="text-white font-bold mb-1">How does OpenSea index the collection?</h3>
                    <p className="text-cyber-dim">OpenSea and secondary marketplaces query tokenURI directly from our contract, fetching self-hosted JSON metadata and PNG images from our durable storage, with an enforced 5% ERC-2981 royalty directed to 0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C.</p>
                  </div>
                </div>
              </section>
            )}
          </article>
        </div>
      </div>
    </div>
  );
};
