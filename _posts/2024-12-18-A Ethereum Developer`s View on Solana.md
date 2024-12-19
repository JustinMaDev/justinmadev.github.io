---
layout: post
title: "A Ethereum Developer's View on Solana"
---

I started developing on the Ethereum platform in 2017, and I have to say that Solidity was an extraordinary design for its time. Its simple syntax makes it easy to learn, and tools like Remix simplify testing and deployment. For more complex projects, frameworks like Truffle and Hardhat can satisfy your requirements. However, Solidity is far from perfect. The challenges of upgradeability and its limited processing capability make Solidity less suitable for large-scale projects.

I started learning Solana development in 2023. Solana has a completely different design compared to Ethereum. It has been quite a challenging journey for an Ethereum developer to learn Solana. In this post, we will discuss the most significant differences between Ethereum and Solana: the account model, the program system, and the token program.

<!--more-->

## The Solana Account Model
Ethereum is an account-centric design with two types of accounts: external owned accounts (EOA) and contract accounts (CA). The balance of ether was stored in the Balance feild of accounts, and contract accounts also stored contract code and contract statement. The address of a contract account was calculated by the deployer's EOA and the nonce. That's why it's so difficult to upgrade a contract on Ethereum.

Solana account model is totally different compare to Ethereum.

1. Every account has a program "owner". Only the owner can modify its data or deduct its lamport balance.
2. The code of programs (smart contracts) and the state of programs are stored in differnet accounts.
3. Data accounts are created by programs to store and manage program state.

<div style="text-align: center;">
<div style="border: 1px solid black; display: flex; padding: 10px; display: inline-block; border-radius: 10px;">
  <img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/system-account.svg" 
  alt="Image 1" style="width: 40%; display: inline-block;">
  <img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/program-account-simple.svg" 
  alt="Image 2" style="width: 55%; display: inline-block;">
</div>
<p style="font-size: 14px; color: gray;">Wallet Account and Simplified Program Account</p>
</div>

When new programs are deployed on Solana, technically three separate accounts are created:

1. Program Account: The main account representing an on-chain program.
2. Program Executable Data Account: An account that contains the executable byte code of the program.
3. Buffer Account: A temporary account that stores byte code while a program is being actively deployed or upgraded. Once the process is complete, the data is transferred to the Program Executable Data Account and the buffer account is closed.

<div style="text-align: center;">
<img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/program-account-expanded.svg" 
     alt="System Account" 
     style="border: 1px solid black; display: block; margin: auto; border-radius: 10px;" />
<p style="font-size: 14px; color: gray;">Program Account</p>
</div>

Solana programs are "stateless", meaning that program accounts only contain the program's executable byte code. To store and modify additional data, new accounts must be created. These accounts are commonly referred to as “data accounts”.

<div style="text-align: center;">
<img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/data-account.svg" 
     alt="System Account" 
     style="border: 1px solid black; display: block; margin: auto; border-radius: 10px;" />
<p style="font-size: 14px; color: gray;">Data Account</p>
</div>

On-chain programs can be directly modified by an account designated as the "upgrade authority", which is typically the account that originally deployed the program. That means, the deployer can upgrade the program without changing the address of the program! If the upgrade authority is revoked and set to None, the program becomes immutable and can no longer be updated.

## The Program System

If you finished the previous chapter, you might already share the same thought I had: in Solana, the account is not a first-class object, the program is.

In Ethereum, the account is a first-class object. An account stores the ether balance, the contract bytecode, and the state. In other words, accounts are everything in Ethereum.

However, in Solana, things are different. Accounts are merely accessories to programs. All accounts are created by the system program, and smart contracts are just one type of program. In other words, programs are everything in Solana.

**What is program**

Programs are on-chain accounts that contain executable code. Solana system has a lot of native programs, and the user can also deploy their own program(smart contract) on Solana.

**Native Programs**

| **Program Name**           | **Purpose**                                   |
|----------------------------|-----------------------------------------------|
| `System Program*`          | Creates accounts, allocates storage, assign accounts to owning programs, and transfers SOL. Program id: 11111111111111111111111111111111                                 |
| `BPF Loader Programs`      | Deploys, upgrades, and executes programs on the chain. Program id: BPFLoaderUpgradeab1e11111111111111111111111                                  |
| `Stake Program`            | Create and manage accounts representing stake and rewards for delegations to validators. Program id: Stake11111111111111111111111111111111111111                      |
| `Vote Program`             | Create and manage accounts that track validator voting state and rewards. Program id: Vote111111111111111111111111111111111111111                                  |
| `Config Program`           | Add configuration data to the chain. Program id: Config1111111111111111111111111111111111111                                  |

**Solana Program Library (SPL)**

The Solana Program Library (SPL) is a collection of on-chain programs.

| **Program Name**           | **Purpose**                                   |
| `Token Program`            | Creates and manages SPL standard tokens. program id: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA                                  |
| `Token Swap Program`       | A Uniswap-like exchange for the Token program on the Solana blockchain, implementing multiple automated market maker (AMM) curves.                                |
| `Token Upgrade Program `   | The Token Upgrade Program provides a stateless protocol for permanently converting tokens from one mint to another.                                                    |
| `Name Service Program`     | A SPL program for issuing and managing ownership of: domain names, Solana Pubkeys, URLs, Twitter handles, ipfs cid's etc..                                            |
| `Feature Proposal Program` | The Feature Proposal Program provides a workflow for activation of Solana network features through community vote based on validator stake weight.                      |
| `Memo Program`             | The Memo program is a simple program that validates a string of UTF-8 encoded characters and verifies that any accounts provided are signers of the transaction.          |

## Token Program

In Ethereum, if you want to issue a token, you need to deploy a contract, even though 99% of the code in this contract is similar to other token contracts. In Solana, if you want to issue a token, you only need to send an instruction to the `SPL Token Program`, and a new token will be created.

In Ethereum, a user's token balance is stored in the balanceOf mapping within the token contract. In Solana, a user's token balance is stored in an Associated Token Account. If a user holds two different tokens, they must have two separate Associated Token Accounts, one for each token, to receive and manage their balances.

In Ethereum, upgrading a contract is a significant challenge because deploying a new contract results in a new contract address. In contrast, Solana makes this process much easier—the upgrade authority account can upgrade the program without changing its address.

In Ethereum, both data and code are stored under the contract account unless you use the Transparent Proxy. The Transparent Proxy makes it possible to upgrade a contract in Ethereum, but the process is complex, and you need to be very careful about the data layout. In Solana, data and code are stored separately, which makes the upgrade process more straightforward.