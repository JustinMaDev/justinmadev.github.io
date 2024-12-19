---
layout: post
title: "一名以太坊开发者眼中的 Solana"
lang: zh-CN
---

我从 2017 年开始在以太坊平台上开发，不得不说 Solidity 在当时是一个非常出色的设计。它简单的语法使学习变得容易，像 Remix 这样的工具简化了测试和部署。对于更复杂的项目，Truffle 和 Hardhat 等框架也能满足需求。然而，Solidity 并不完美，升级难度大以及有限的处理能力使其不太适合大规模项目。

我从 2023 年开始学习 Solana 开发。Solana 与以太坊有着完全不同的设计，对于一名以太坊开发者来说，学习 Solana 是一个相当有挑战的旅程。在这篇文章中，我们将讨论以太坊与 Solana 之间最显著的区别：账户模型、程序系统以及代币程序。

<!--more-->

## Solana 的账户模型

以太坊采用的是基于账户的设计，分为两种账户类型：外部账户（EOA）和合约账户（CA）。账户的以太余额存储在账户的 `Balance` 字段中，而合约账户还存储合约代码和合约状态。合约账户的地址由部署者的 EOA 和 nonce 计算得出。这也是为什么在以太坊上升级一个合约如此困难的原因。

Solana 的账户模型与以太坊完全不同：

1. 每个账户都有一个程序“所有者”。只有所有者才能修改账户数据或扣除账户中的 lamport 余额。
2. 程序（智能合约）的代码和状态存储在不同的账户中。
3. 数据账户是由程序创建的，用于存储和管理程序状态。

<div style="text-align: center;">
<div style="border: 1px solid black; display: flex; padding: 10px; display: inline-block; border-radius: 10px;">
  <img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/system-account.svg" 
  alt="图片1" style="width: 40%; display: inline-block;">
  <img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/program-account-simple.svg" 
  alt="图片2" style="width: 55%; display: inline-block;">
</div>
<p style="font-size: 14px; color: gray;">钱包账户和简化的程序账户</p>
</div>

当在 Solana 上部署新程序时，实际上会创建三个独立的账户：

1. **程序账户（Program Account）**：代表链上程序的主要账户。
2. **程序可执行数据账户（Program Executable Data Account）**：存储程序的可执行字节码。
3. **缓冲区账户（Buffer Account）**：一个临时账户，用于在程序部署或升级过程中存储字节码。完成后，数据会被转移到程序可执行数据账户，缓冲区账户随之关闭。

<div style="text-align: center;">
<img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/program-account-expanded.svg" 
     alt="系统账户" 
     style="border: 1px solid black; display: block; margin: auto; border-radius: 10px;" />
<p style="font-size: 14px; color: gray;">程序账户</p>
</div>

Solana 的程序是“无状态的”，这意味着程序账户只包含程序的可执行字节码。要存储和修改额外的数据，必须创建新的账户，这些账户通常被称为“数据账户”。

<div style="text-align: center;">
<img src="https://solana-developer-content.vercel.app/assets/docs/core/accounts/data-account.svg" 
     alt="系统账户" 
     style="border: 1px solid black; display: block; margin: auto; border-radius: 10px;" />
<p style="font-size: 14px; color: gray;">数据账户</p>
</div>

链上程序可以由指定为“升级权限”（Upgrade Authority）的账户直接修改，这通常是最初部署程序的账户。这意味着部署者可以在不更改程序地址的情况下升级程序！如果升级权限被撤销并设置为 `None`，程序将变为不可更改。

## 程序系统

如果你读完了上一章，可能已经和我有同样的想法：在 Solana 中，账户并不是一等公民，程序才是一等公民。

在以太坊中，账户是“一等公民”。一个账户存储着以太余额、合约字节码和状态。换句话说，账户是以太坊的一切。

然而，在 Solana 中，情况有所不同。账户只是程序的附属品。所有账户都由系统程序创建，而智能合约只是程序的一种类型。换句话说，在 Solana 中，程序才是一切。

### 什么是程序

程序是包含可执行代码的链上账户。Solana 系统中有许多内置程序，用户也可以在 Solana 上部署自己的程序（智能合约）。

### 内置程序

| **程序名称**              | **用途**                                   |
|--------------------------|--------------------------------------------|
| `System Program`         | 创建账户、分配存储、分配账户所有权和转账 SOL。程序 ID: `11111111111111111111111111111111`                                      |
| `BPF Loader`             | 部署、升级和执行链上的程序。程序 ID: `BPFLoaderUpgradeab1e11111111111111111111111`                           |
| `Stake Program`          | 创建和管理代表验证节点委托的质押和奖励账户。程序 ID: `Stake11111111111111111111111111111111111111`                           |
| `Vote Program`           | 创建和管理跟踪验证节点投票状态和奖励的账户。程序 ID: `Vote111111111111111111111111111111111111111`                           |
| `Config Program`         | 向链上添加配置信息。程序 ID: `Config1111111111111111111111111111111111111` |

Solana 程序库（SPL）是一个链上程序的集合。

| **程序名称**                | **用途**                          |
|----------------------------|-----------------------------------|
| `Token Program`            | 创建和管理符合 SPL 标准的代币。程序 ID: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`                    |
| `Token Swap Program`       | Solana 区块链上类似 Uniswap 的代币交换程序，为代币程序实现多种自动化做市商（AMM）曲线。                                                            |
| `Token Upgrade Program`    | 提供一个无状态协议，用于永久性地将代币从一个铸币（Mint）转换为另一个铸币。                                                              |
| `Name Service Program`     | 一个 SPL 程序，用于发布和管理以下内容的所有权：域名、Solana 公钥、URL、Twitter 账号、IPFS CID 等。                                                 |
| `Feature Proposal Program` | 提供一个流程，通过基于验证者权益权重的社区投票激活 Solana 网络功能。                                                              |
| `Memo Program`             | 一个简单的程序，用于验证 UTF-8 编码字符的字符串，并确认提供的任何账户都是交易的签署者。                                                            |


## 代币程序

在以太坊中，如果你想发行代币，需要部署一个合约，即使这个合约中的 99% 的代码与其他代币合约类似。而在 Solana 中，如果你想发行代币，只需向 `SPL Token Program` 发送一条指令，就可以创建一个新代币。

在以太坊中，用户的代币余额存储在代币合约的 `balanceOf` 映射中。在 Solana 中，用户的代币余额存储在关联代币账户（Associated Token Account）中。如果用户持有两种不同的代币，他们需要两个单独的关联代币账户，每个账户分别管理一种代币的余额。

在以太坊中，升级合约是一个很大的挑战，因为部署新合约会产生一个新合约地址。而在 Solana 中，这个过程要容易得多——升级权限账户可以在不更改程序地址的情况下升级程序。

在以太坊中，数据和代码都存储在合约账户下，除非你使用透明代理（Transparent Proxy）。透明代理使得在以太坊上升级合约成为可能，但这一过程非常复杂，而且你需要对数据布局格外小心。在 Solana 中，数据和代码是分开存储的，这使得升级过程更加简单明了。
