---
layout: post
title: "Developing a DApp on Windows 10 (Part 0):Starting from Scratch"
---

I’ve always been a bit of a latecomer. It wasn’t until the end of December 2017 that I started investing in cryptocurrency and diving deeper into blockchain. Here, I’ll reflect on my journey from a beginner's perspective, sharing what I’ve learned in hopes it may be useful to others.

One of the concepts that initially confused me the most was "mining." We'll break it down by exploring the *What*, *Why*, and *How* of mining. But first, let’s clarify what blockchain and Bitcoin are.

A blockchain closely resembles a **linked list** in data structures—formed by individual nodes, each with a pointer directing to the next node. However, unlike a typical linked list controlled by a single machine, a blockchain is maintained globally by multiple nodes, ensuring that any confirmed block content is immutable—changes are quickly detectable by others. Bitcoin and other digital currencies are specific applications of blockchain technology. But why is blockchain primarily popular in digital currencies and not widely adopted in other fields? The answer lies in its limitations: blockchain’s storage and processing efficiency are low. Digital currency, however, only requires recording account transactions, which use minimal space. These transactions also don’t require alterations. To know an account’s balance, one simply traverses the chain, tallying incoming transactions while deducting outgoing ones, resulting in the final balance.

### What is Mining?

In mining, numerous "computers" worldwide maintain the blockchain, each referred to as a "miner." Mining is the process of these computers competing for the right to record transactions. Suppose Miner A secures this right and records transactions into a block; in return, they receive a reward, such as 12.5 BTC in the case of Bitcoin. In other words, they have "mined" Bitcoin.

### Why is Mining Needed?

When Bitcoin holders transfer funds to one another, these transactions must be recorded in blocks. Mining solves two key problems:

- **Who records transactions**: Mining determines which miner gets the right to record.
- **Reward distribution**: Mining provides incentives for miners to maintain the blockchain.

### How Does Mining Work?

For example, with Ethereum, you’ll need a wallet address (similar to a bank account) to store rewards. You'll also need a machine with a GPU and at least 3GB of VRAM. After downloading the official mining software and configuring the command line, you can start mining by running the program.

Bitcoin can be considered the first generation of blockchain technology, with its primary feature being *non-Turing complete*. Ethereum, as the second generation, provides a Turing-complete platform, allowing scripts (usually written in Solidity) to run, enabling the execution of smart contracts. Theoretically, smart contracts can accomplish any task a general-purpose computer can perform, but with potential efficiency and cost limitations (each line of code execution incurs a fee).

### In Summary

This is a simplified introduction to blockchain concepts and processes. For simplicity, we’ve avoided terms like POW, POS, and mining pools, which can be overwhelming to newcomers.
