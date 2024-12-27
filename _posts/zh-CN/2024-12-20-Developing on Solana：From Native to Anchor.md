---
layout: post
title: "Developing on Solana：From Native to Anchor"
lang: zh-CN
---

如果你和我一样是一名以太坊开发者，那么在尝试开发 Solana 时，你一定和我当初一样感到困惑。Solana 是如此不同且独特。在这篇文章中，我将向你展示一份精心设计的路线图，帮助你尽快开始在 Solana 上进行开发。

在开始之前，我假设你已经对 Solana 有一些基础知识，包括它的账户模型和程序系统，以及对 Rust 编程语言的基本了解。如果你对这些内容不是很熟悉也没关系，只要有基础理解，这篇文章就足够了。

此外，我假设你使用的是 Linux 系统，并且已经安装了 rust、solana-cli 和 anchor。如果你是 Windows 用户，我强烈推荐使用 WSL2，因为 anchor 对 Windows 的支持不是很好。

<!--more-->

## Hello Solana

对于初学者来说，直接深入一个像 Anchor 这样复杂的框架并不是一个好主意。这就是为什么当程序员尝试进入一个新领域时，我们总是从一个 HelloWorld 示例开始。

**1.创建一个文件夹并使用 cargo 进行初始化**
```sh
cargo init --lib program
```

**2.添加依赖项**
```sh
cd program
cargo add solana-program
```

**3.将以下代码追加到 Cargo.toml 文件中**
```toml
[lib]
name = "say_hello"
crate-type = ["cdylib", "lib"]
```
![](/assets/images/20241220_cargo.toml.png)

**4.将代码添加到 lib.rs 文件**

```rust
use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
};

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    msg!("Hello, World! program_id: {:?}, accounts: {:?}, _instruction_data: {:?}.", program_id, accounts, _instruction_data);
    Ok(())
}
```
如果你对 Rust 不是很熟悉，那也没关系。你只需要知道 process_instruction 是一个函数，它是整个程序的入口点。在这个函数中，我们使用 msg! 宏打印了一条消息。就是这么简单。

**5.编译**
```
cargo build-sbf
```
我们使用 cargo build-sbf 而不是 cargo build，因为 Solana 只接受 BPF 字节码。
你会在 program/target/deploy/ 文件夹中得到你的 .so 文件。

**6.部署**
```sh
solana program deploy ./target/deploy/say_hello.so
```

预期的输出如下：
```
Program Id: H8rJGBMynZQf66koygjyzQ3w3r2E1qukaxhaHXha1PLD

Signature: 5Lm5SEfkeepuS2y3VLJg5LvXk75zMZ2uJa9ksfcNUA14b5FyvgjHCSxWzhu9HT9Xk6SYnJTkPj3ozGm6iCFsAFa9
```

如果你没有更改 Solana CLI 的网络配置，你可能已经连接到了 devnet。你可以通过运行 solana config get 来确认你的网络配置。如果你连接的是 devnet，请记得领取一些测试用的 SOL。

现在我们已经在 Solana 上部署了我们的第一个程序！

与 Solidity 不同，Solana 程序没有构造函数。这意味着当我们在 Solana 上部署程序时，程序内部不会自动执行任何代码。

**7.使用 Node.js 调用 Solana 程序**

创建另一个文件夹，例如 scripts，使用 npm init 初始化该文件夹，然后安装依赖包：
```sh
npm install @solana/web3.js@1 @solana-developers/helpers@2
```
创建一个 .js 文件，例如 invoke.js。
```javascript
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
  } from "@solana/web3.js";
  import { getKeypairFromFile } from "@solana-developers/helpers";
   
  const programId = new PublicKey("H8rJGBMynZQf66koygjyzQ3w3r2E1qukaxhaHXha1PLD");
   
  // Connect to a solana cluster. Either to your local test validator or to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  //const connection = new Connection("https://api.devnet.solana.com", "confirmed");
   
  // We load the keypair that we created in a previous step
  const keyPair = await getKeypairFromFile("~/.config/solana/id.json");
   
  // Every transaction requires a blockhash
  const blockhashInfo = await connection.getLatestBlockhash();
   
  // Create a new transaction
  const tx = new Transaction({
    ...blockhashInfo,
  });
   
  // Add our Hello World instruction
  tx.add(
    new TransactionInstruction({
      programId: programId,
      keys: [],
      data: Buffer.from([]),
    }),
  );
   
  // Sign the transaction with your previously created keypair
  tx.sign(keyPair);
   
  // Send the transaction to the Solana network
  const txHash = await connection.sendRawTransaction(tx.serialize());
   
  console.log("Transaction sent with hash:", txHash);
   
  await connection.confirmTransaction({
    blockhash: blockhashInfo.blockhash,
    lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
    signature: txHash,
  });
   
  console.log(
    `Congratulations! Look at your ‘Hello World' transaction in the Solana Explorer:
    https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
  );
```
不要忘记将 programId 替换为你的程序 ID。
然后我们可以使用 invoke.js 调用 Solana 程序：
```sh
node ./invoke.js
```
输出应如下所示：
```
(node:630) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///mnt/d/code/test/hello_solana/say_hello/scripts/test.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /mnt/d/code/test/hello_solana/say_hello/scripts/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:630) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
Transaction sent with hash: k5yg4WzUnHjmX7B2VxLEbUYMY5k2dgrUy4oGmzCEX6LGKzr4EatmdXd26c3hkB1nhFoFa4cv5PkHrhMzV3xB16a
Congratulations! Look at your ‘Hello World' transaction in the Solana Explorer:
    https://explorer.solana.com/tx/k5yg4WzUnHjmX7B2VxLEbUYMY5k2dgrUy4oGmzCEX6LGKzr4EatmdXd26c3hkB1nhFoFa4cv5PkHrhMzV3xB16a?cluster=devnet
```

我们可以使用 Solana Explorer 跟踪此交易：
![](/assets/images/20241220_invoke.png)

就是这样！我们已经成功调用了我们在 Solana 上的程序！

## 使用原生程序创建代币

现在我们已经了解了如何在 Solana 上部署和调用程序，是时候在 Solana 上创建我们自己的代币了！

一个代币应该支持铸造（minting）、转账（transferring）以及查询账户余额（retrieving the balance）。让我们开始！

```rust
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
  account_info::{next_account_info, AccountInfo},
  entrypoint,
  entrypoint::ProgramResult,
  msg,
  program_error::ProgramError,
  pubkey::Pubkey,
  system_instruction,
  sysvar::rent::Rent,
  program::invoke_signed,
  borsh1::try_from_slice_unchecked,
};

#[derive(BorshSerialize, BorshDeserialize, Debug) ]
pub struct TokenMint {
  pub is_initialized: bool,
  pub total_supply: u64,
  pub mint_authority: Pubkey,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TokenAccount {
  pub is_initialized: bool,
  pub owner: Pubkey,
  pub balance: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum TokenInstruction {
  InitializeMint,
  Mint { amount: u64 },
  Transfer { amount: u64 },
  Balance,
}

entrypoint!(process_instruction);

pub fn process_instruction(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  instruction_data: &[u8],
) -> ProgramResult {
  let instruction = TokenInstruction::try_from_slice(instruction_data)
      .map_err(|_| ProgramError::InvalidInstructionData)?;

  match instruction {
    TokenInstruction::InitializeMint => {
      initialize_mint(program_id, accounts)
    },
    TokenInstruction::Mint { amount } => {
      mint_tokens(program_id, accounts, amount)
    },
    TokenInstruction::Transfer { amount } => {
      transfer_tokens(program_id, accounts, amount)
    },
    TokenInstruction::Balance => {
      get_balance(program_id, accounts)
    }
  }
}

fn initialize_mint(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
) -> ProgramResult {
  let accounts_iter = &mut accounts.iter();
  let mint_account = next_account_info(accounts_iter)?;
  let authority_account = next_account_info(accounts_iter)?;
  let deployer_account = "2FAqSMicn8Wuxe3beYNdqk6ApKrXuhCGyHndQaqCdhzT";

  // authority_account should equal the deployer_account of the program.
  // Just like the OnerOnly modifier in Solidity.
  // But there's no convenient way to get the deployer account directly in Solana program so we have to hardcode it.
  if authority_account.key.to_string() != deployer_account {
    return Err(ProgramError::InvalidAccountData);
  }
  if authority_account.is_signer == false {
    return Err(ProgramError::MissingRequiredSignature);
  }
  if mint_account.data_is_empty() == false {
    return Err(ProgramError::AccountAlreadyInitialized);
  }
  // Solana force to provide every account in the instruction data(accounts array)
  // The invoker of initialize_mint must get the mint account address by calling the find_program_address method with same seeds
  let (mint_account_addr, bump_seed) = Pubkey::find_program_address(&[b"mint"], program_id);
  
  if mint_account_addr != *mint_account.key {
    return Err(ProgramError::InvalidAccountData);
  }
  
  // Create the mint account
  let space = std::mem::size_of::<TokenMint>();
  let lamports = Rent::default().minimum_balance(space);
  invoke_signed(
      &system_instruction::create_account(
        authority_account.key,
          mint_account.key,
          lamports,
          space as u64,
          program_id,
      ),
      &[authority_account.clone(), mint_account.clone()],
      &[&[&b"mint"[..], &[bump_seed]]],
  )?;

  // Initialize the mint account data
  let mint_account_data = TokenMint {
      is_initialized: true,
      total_supply : 0,
      mint_authority: *authority_account.key,
  };
  // Serialize and save the mint data to mint account
  mint_account_data.serialize(&mut &mut mint_account.data.borrow_mut()[..])?;

  msg!("Mint account created and initialized successfully. size: {}, data: {:?}", space, mint_account.data);
  Ok(())
}

fn mint_tokens(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  amount: u64,
) -> ProgramResult {
  let accounts_iter = &mut accounts.iter();
  let mint_account = next_account_info(accounts_iter)?;
  let destination_wallet_account = next_account_info(accounts_iter)?;
  let destination_token_account = next_account_info(accounts_iter)?;
  let authority_account = next_account_info(accounts_iter)?;
  // Only the mint_authority can mint tokens
  if authority_account.is_signer == false {
    return Err(ProgramError::MissingRequiredSignature);
  }
  if mint_account.data_is_empty() {
    return Err(ProgramError::UninitializedAccount);
  }
  let mut mint_data: TokenMint = try_from_slice_unchecked::<TokenMint>(&mint_account.data.borrow())?;
  if mint_data.mint_authority != *authority_account.key {
    return Err(ProgramError::MissingRequiredSignature);
  }
  // If the destination_token_account is not initialized, create and initialize it
  if destination_token_account.data_is_empty() {
    let (token_account_addr, bump_seed) = Pubkey::find_program_address(
      &[mint_account.key.as_ref(), destination_wallet_account.key.as_ref()],
      program_id,
    );
    if token_account_addr != *destination_token_account.key {
      return Err(ProgramError::InvalidAccountData);
    }
    let space = std::mem::size_of::<TokenAccount>();
    let lamports = Rent::default().minimum_balance(space);
    invoke_signed(
      &system_instruction::create_account(
        authority_account.key,
        destination_token_account.key,
        lamports,
        space as u64,
        program_id,
      ),
      &[authority_account.clone(), destination_token_account.clone()],
      &[&[&mint_account.key.to_bytes(), &destination_wallet_account.key.to_bytes(), &[bump_seed]]],
    )?;
    let token_account_data = TokenAccount {
      is_initialized: true,
      owner: *destination_wallet_account.key,
      balance: 0,
    };
    token_account_data.serialize(&mut &mut destination_token_account.data.borrow_mut()[..])?;
  }
  let mut token_account_data = try_from_slice_unchecked::<TokenAccount>(&destination_token_account.data.borrow())?;
  token_account_data.balance += amount;
  mint_data.total_supply += amount;
  token_account_data.serialize(&mut &mut destination_token_account.data.borrow_mut()[..])?;
  mint_data.serialize(&mut &mut mint_account.data.borrow_mut()[..])?;
  msg!("Tokens minted successfully.");
  Ok(())
}

fn transfer_tokens(
  program_id: &Pubkey,
  accounts: &[AccountInfo],
  amount: u64,
) -> ProgramResult {
  let accounts_iter = &mut accounts.iter();
  let mint_account = next_account_info(accounts_iter)?;
  let source_wallet_account = next_account_info(accounts_iter)?;
  let source_token_account = next_account_info(accounts_iter)?;
  let destination_wallet_account = next_account_info(accounts_iter)?;
  let destination_token_account = next_account_info(accounts_iter)?;

  if source_wallet_account.is_signer == false {
    return Err(ProgramError::MissingRequiredSignature);
  }
  if mint_account.data_is_empty() {
    return Err(ProgramError::UninitializedAccount);
  }
  if source_token_account.data_is_empty() {
    return Err(ProgramError::InvalidAccountData);
  }
  let mut source_data = try_from_slice_unchecked::<TokenAccount>(&source_token_account.data.borrow())?;
  if source_data.balance < amount {
    return Err(ProgramError::InsufficientFunds);
  }

  // If the destination_token_account is not initialized, create and initialize it
  if destination_token_account.data_is_empty() {
    let (destination_token_account_addr, bump_seed) = Pubkey::find_program_address(
      &[mint_account.key.as_ref(), destination_wallet_account.key.as_ref()],
      program_id,
    );
    if destination_token_account_addr != *destination_token_account.key {
      return Err(ProgramError::InvalidAccountData);
    }
    let space = std::mem::size_of::<TokenAccount>();
    let lamports = Rent::default().minimum_balance(space);
    invoke_signed(
      &system_instruction::create_account(
        source_wallet_account.key,
        destination_token_account.key,
        lamports,
        space as u64,
        program_id,
      ),
      &[source_wallet_account.clone(), destination_token_account.clone()],
      &[&[&mint_account.key.to_bytes(), &destination_wallet_account.key.to_bytes(), &[bump_seed]]],
    )?;
    let destination_data = TokenAccount {
      is_initialized: true,
      owner: *destination_wallet_account.key,
      balance: 0,
    };
    destination_data.serialize(&mut &mut destination_token_account.data.borrow_mut()[..])?;
  }

  let mut destination_data = try_from_slice_unchecked::<TokenAccount>(&destination_token_account.data.borrow())?;
  source_data.balance -= amount;
  destination_data.balance += amount;

  source_data.serialize(&mut &mut source_token_account.data.borrow_mut()[..])?;
  destination_data.serialize(&mut &mut destination_token_account.data.borrow_mut()[..])?;

  msg!("Tokens transferred successfully.");
  Ok(())
}

fn get_balance(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
  let accounts_iter = &mut accounts.iter();
  let token_account = next_account_info(accounts_iter)?;

  // If the token_account is not initialized, that means user never holds this token
  if token_account.data_is_empty() {
    msg!("Balance: 0");
    return Ok(());
  }
  let account_data = try_from_slice_unchecked::<TokenAccount>(&token_account.data.borrow())?;
  msg!("Balance: {}", account_data.balance);

  Ok(())
}
```
使用 `cargo build-sbf` 编译上述代码，然后使用 `solana program deploy ./target/deploy/your_archive_name.so` 部署 .so 文件。  
接下来是该程序的客户端应用程序：

```javascript
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  Enum
} from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import * as borsh from 'borsh';

// Main program ID of your deployed program
const programId = new PublicKey("8CcL7wFG1CCEsTryfViVPergpki7JKcUSXhQ8NeZqNE2");
const [mintAccountAddress, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("mint")],
  programId
);
console.log("Mint account:", mintAccountAddress.toBase58());

async function main() {
  // Setup connection and accounts
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  // We load the keypair from local file
  const payer = await getKeypairFromFile("~/.config/solana/id.json");

  console.log("Initialize mint account...");
  {
    // Generate new keypairs to create a data account used for storing the total supply stuff, aka mint account
    const instructionData = Buffer.alloc(1);
    instructionData.writeUInt8(0, 0);
    console.log("Init Mint Instruction data:", instructionData);
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: mintAccountAddress, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: true, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: instructionData,
      })
    );
    
    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }

  console.log("Minting tokens...");
  {
    // Generate new keypairs to create a data account used for storing the balance of current user, aka token account
    // If a user holds 100 kinds of tokens, then he has 100 token accounts  
    const destinationWalletAddress = new PublicKey("2FAqSMicn8Wuxe3beYNdqk6ApKrXuhCGyHndQaqCdhzT");
    const [destinationTokenAddress, bump] = PublicKey.findProgramAddressSync(
      [mintAccountAddress.toBuffer(), destinationWalletAddress.toBuffer()],
      programId
    );
    console.log("Destination token account:", destinationTokenAddress.toBase58());
    const instructionData = Buffer.alloc(1 + 8);
    instructionData.writeUInt8(1, 0);
    instructionData.writeBigUInt64LE(BigInt(100), 1);
    console.log("Mint Instruction data", instructionData);
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: mintAccountAddress, isSigner: false, isWritable: true },
          { pubkey: destinationWalletAddress, isSigner: false, isWritable: false },
          { pubkey: destinationTokenAddress, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: true, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: instructionData,
      })
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }

  console.log("Transferring tokens...");
  {
    const instructionData = Buffer.alloc(1 + 8);
    instructionData.writeUInt8(2, 0);
    instructionData.writeBigUInt64LE(BigInt(34), 1);
    console.log("Transfer Instruction data", instructionData);

    const sourceWalletAddress = new PublicKey("2FAqSMicn8Wuxe3beYNdqk6ApKrXuhCGyHndQaqCdhzT");
    const [sourceTokenAddress, bump_source] = PublicKey.findProgramAddressSync(
      [mintAccountAddress.toBuffer(), sourceWalletAddress.toBuffer()],
      programId
    );

    const destinationWalletAddress= new PublicKey("3VW79TUVeb5wpC8NhqrqyuUekdJyncfEfoxeMwqJuJyb");
    const [destinationTokenAddress, bump_dest] = PublicKey.findProgramAddressSync(
      [mintAccountAddress.toBuffer(), destinationWalletAddress.toBuffer()],
      programId
    );
    console.log("Source token account:", sourceTokenAddress.toBase58());
    console.log("Destination token account:", destinationTokenAddress.toBase58());

    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: mintAccountAddress, isSigner: false, isWritable: true },
          { pubkey: sourceWalletAddress, isSigner: true, isWritable: false },
          { pubkey: sourceTokenAddress, isSigner: false, isWritable: true },
          { pubkey: destinationWalletAddress, isSigner: false, isWritable: false },
          { pubkey: destinationTokenAddress, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: instructionData,
      })
    );

    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }

  console.log("Getting balance...");
  {
    const instructionData = Buffer.alloc(1);
    instructionData.writeUInt8(3, 0);
    const walletAddressA = new PublicKey("2FAqSMicn8Wuxe3beYNdqk6ApKrXuhCGyHndQaqCdhzT");
    const [tokenAddressA, bump_a] = PublicKey.findProgramAddressSync(
      [mintAccountAddress.toBuffer(), walletAddressA.toBuffer()],
      programId
    );

    const walletAddressB = new PublicKey("3VW79TUVeb5wpC8NhqrqyuUekdJyncfEfoxeMwqJuJyb");
    const [tokenAddressB, bump_b] = PublicKey.findProgramAddressSync(
      [mintAccountAddress.toBuffer(), walletAddressB.toBuffer()],
      programId
    ); 
    const transaction = new Transaction();
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: tokenAddressA, isSigner: false, isWritable: false }],
        programId: programId,
        data: instructionData,
      })
    );
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: tokenAddressB, isSigner: false, isWritable: false }],
        programId: programId,
        data: instructionData,
      })
    );
    const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log("Balance transaction signature:", signature);
  }
}

main().catch(console.error);
```
使用 `node ./<your_js_file_name>.js` 运行 JavaScript 文件，在运行之前将 programId 和测试账户替换为你自己的值。根据测试代码，两个账户的最终余额分别为 66 和 34。

![](/assets/images/20241220_balance.png)

在回顾 Rust 程序和 Node.js 客户端代码后，你可能会注意到，即使是一个简单的代币实现，过程也相当繁琐。

在 Rust（程序）中需要处理的复杂性：

1. 程序本质上是一个指令处理器。如果我们想支持多种指令，需要使用枚举（enums），并通过 switch 或 match 语句进行处理。  
2. 与 Solidity 的映射（mappings）不同，Solana 程序将数据（例如余额）存储在单独的账户中。我们必须手动管理这些账户，包括创建账户、保存数据以及从账户中读取数据。  
3. 在保存和读取数据时，我们需要在 Rust 和 Node.js 中手动处理序列化和反序列化，必须深入参与（反）序列化的细节。  
4. 我们需要通过多个条件守卫（guard clauses）手动验证账户的权限和状态。  

在 Node.js（客户端）中需要处理的复杂性：

1. 手动且仔细地序列化指令数据，相信我，这可能会是一场灾难。  
2. 管理指令中涉及的每个账户，包括 PDAs（程序派生账户）。在 JavaScript（JS）代码和 Rust 代码之间保持账户顺序一致至关重要，否则可能导致功能失效或不匹配。  
3. 手动更新 `programID`，虽然本身并不复杂，但管理起来会很枯燥且容易重复劳动。 

**所以我们需要Anchor**

## 使用Anchor框架创建一个token

让我们来看一下使用 Anchor 框架实现这个代币的方式：
```rust
// 1. Import dependencies
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
    metadata::{
        create_metadata_accounts_v3,
        mpl_token_metadata::types::DataV2,
        CreateMetadataAccountsV3, 
        Metadata as Metaplex,
    },
};

// 2. Declare Program ID (SolPG will automatically update this when you deploy)
declare_id!("3sa7pXhNJLRTrMkwRAF8i4QupD4aKGXfRwQNTNBaw9sr");

// 3. Define the program and instructions
#[program]
mod token_minter {
    use super::*;
    pub fn init_token(ctx: Context<InitToken>, metadata: InitTokenParams) -> Result<()> {
      let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
      let signer = [&seeds[..]];

      let token_data: DataV2 = DataV2 {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
      };

      let metadata_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
          payer: ctx.accounts.payer.to_account_info(),
          update_authority: ctx.accounts.mint.to_account_info(),
          mint: ctx.accounts.mint.to_account_info(),
          metadata: ctx.accounts.metadata.to_account_info(),
          mint_authority: ctx.accounts.mint.to_account_info(),
          system_program: ctx.accounts.system_program.to_account_info(),
          rent: ctx.accounts.rent.to_account_info(),
        },
        &signer
      );

      create_metadata_accounts_v3(
        metadata_ctx,
        token_data,
        false,
        true,
        None,
      )?;

      msg!("Token mint created successfully.");
      Ok(())
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, quantity: u64) -> Result<()> {
      let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
      let signer = [&seeds[..]];

      mint_to(
        CpiContext::new_with_signer(
          ctx.accounts.token_program.to_account_info(),
          MintTo {
            authority: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
          },
          &signer,
        ),
        quantity,
      )?;
      Ok(())
    }
}

// 4. Define the context for each instruction
#[derive(Accounts)]
#[instruction(params: InitTokenParams)]
pub struct InitToken<'info> {
  /// CHECK: New Metaplex Account being created
  #[account(mut)]
  pub metadata: UncheckedAccount<'info>,

  #[account(
      init,
      seeds = [b"mint"],
      bump,
      payer = payer,
      mint::decimals = params.decimals,
      mint::authority = mint,
  )]
  pub mint: Account<'info, Mint>,

  #[account(mut)]
  pub payer: Signer<'info>,
  pub rent: Sysvar<'info, Rent>,
  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub token_metadata_program: Program<'info, Metaplex>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
  #[account(
    mut,
    seeds = [b"mint"],
    bump,
    mint::authority = mint,
  )]
  pub mint: Account<'info, Mint>,

  #[account(
    init_if_needed,
    payer = payer,
    associated_token::mint = mint,
    associated_token::authority = receiver,
  )]
  pub destination: Account<'info, TokenAccount>,

  /// CHECK: The receiver of minted tokens don't need to sign the mint instruction, so wa can airdrop tokens to any account
  pub receiver: UncheckedAccount<'info>, 

  #[account(mut)]
  pub payer: Signer<'info>,
  pub rent: Sysvar<'info, Rent>,
  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
}

// 5. Define the init token params
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}
```

如果你不熟悉 Rust，那么理解上面的代码可能会有些困难。

### 理解 Anchor 框架中的属性
Anchor 框架通过引入属性简化了 Solana 智能合约的开发，自动化了常见任务并减少了样板代码。在这篇文章中，我们将深入介绍 Anchor 中的三个关键属性：`#[program]`、`#[instruction]` 和 `#[account]`。

1. `#[program]`：定义程序逻辑 
   `#[program]` 属性用于定义 Solana 程序的入口点。它标记一个包含所有程序指令的模块。模块中的每个函数代表一个可以由客户端调用的指令。  
   模块中的函数会自动接收反序列化后的 Accounts 上下文和指令数据。Anchor 会生成指令调度、参数反序列化和账户验证的样板代码。

2. `#[instruction]`：自定义指令数据反序列化
   当需要将指令数据反序列化为标准 Anchor 流程外的自定义参数时，可以使用 `#[instruction]` 属性。它允许你定义如何解析传入的数据。通过 `#[instruction]` 在单独的函数中指定指令参数，Anchor 会对这些参数进行（反）序列化并将其提供给上下文使用。

3. `#[account]`：账户验证和初始化 
   该属性是 Anchor 中账户管理的核心。它通过提供一种声明式的方式来验证和初始化账户，从而简化了账户的处理。  
   此属性强制执行约束条件，例如账户的所有权和数据布局，并通过参数（如 `init`、`init_if_needed` 和 `payer`）自动化账户的初始化。此外，它还通过子属性（如 `associated_token`）支持代币账户的管理。

### Anchor IDL：桥接 Rust 程序和 JavaScript 客户端
Anchor 最强大的功能之一是能够生成 IDL（接口定义语言）文件。类似于 Solana 的 abi 文件，这个 JSON 文件描述了程序的指令、账户和数据结构，能够被 JavaScript（或其他语言）客户端轻松使用。

IDL 的优势：
- 无缝的客户端集成：IDL 作为桥梁，使工具（如 `@coral-xyz/anchor`）能够与 Rust 程序交互，而无需手动编码/解码指令。  
- 自动化类型安全：客户端可以使用 IDL 确保在调用指令时传递正确的参数和账户。

借助 IDL，我们可以像这样使用 Node.js 调用我们的程序：

```javascript
mport  { default as anchor } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import token_minter_idl from "../target/idl/token_minter.json" with { type: 'json' };

async function init_token() {
  // 0. Load wallet from local file
  const walletPath = path.resolve(process.env.HOME, ".config/solana/id.json");
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  // 1. Set up the provider
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), {});
  anchor.setProvider(provider);
  console.log("Provider:", provider);

  // 2. Load the program IDL and create a program instance
  const program = new anchor.Program(token_minter_idl, provider);
  const programId = new PublicKey(token_minter_idl.address);
  console.log("Program ID:", programId.toString());
  
  // 3. Find the mint PDA
  const [mintPda, mintBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    programId
  );

  // 4. Find the metadata PDA
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), // Metaplex Metadata Program ID
      mintPda.toBuffer(),
    ],
    new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s") // Metaplex Metadata Program ID
  );
  
  // 5. Define the token parameters
  const initTokenParams = {
    name: "JustinTestToken",
    symbol: "JTT",
    uri: "https://justinmadev.github.io/",
    decimals: 5,
  };

  // 6. Call the init_token method
  try {
    const tx = await program.methods
    .initToken(initTokenParams)
    .accounts({
        metadata: metadataPda,
        mint: mintPda,
        payer: provider.wallet.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        tokenMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
    })
    .signers([])
    .rpc();

    console.log("Transaction successful. Signature:", tx);
    console.log("Mint PDA:", mintPda.toString());
    console.log("Metadata PDA:", metadataPda.toString());
  } catch (err) {
    console.error("Transaction failed:", err);
  }
};

async function mint_token(){
  // 0. Load wallet from local file
  const walletPath = path.resolve(process.env.HOME, ".config/solana/id.json");
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  // 1. Set up the provider
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), {});
  anchor.setProvider(provider);
  console.log("Provider:", provider);

  // 2.  Load the program IDL and create a program instance
  const program = new anchor.Program(token_minter_idl, provider);
  const programId = new PublicKey(token_minter_idl.address);
  console.log("Program ID:", programId.toString());

  // 3. Find the mint PDA
  const [mintPda, mintBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint")],
    programId
  );
  
  const payer = provider.wallet.publicKey;
  // You can use any Solana wallet account as the receiver
  const receiver = new PublicKey("3VW79TUVeb5wpC8NhqrqyuUekdJyncfEfoxeMwqJuJyb");
  const destinationAccount = anchor.utils.token.associatedAddress({
    mint: mintPda,
    owner: receiver,
  });

  console.log("destinationAccount:", destinationAccount.toString());
  console.log("payer:", payer.toString());

  // 4. Define the quantity of tokens to mint
  const quantity = new anchor.BN("100000000"); // 1000 JTT

  try{
    // 5. Call the mint_tokens method
    const tx = await program.methods
      .mintTokens(quantity)
      .accounts({
        mint: mintPda,
        destination: destinationAccount,
        receiver: receiver,
        payer: payer,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId, 
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    console.log("Transaction successful. Signature:", tx);
  } catch (err) {
    console.error("Transaction failed:", err);
  }
}
```

Anchor 使开发者能够以更简单、清晰和高效的方式编写 Solana 智能合约。通过抽象掉重复且容易出错的任务，Anchor 让开发者能够专注于构建创新的去中心化应用，同时保持高代码质量和可靠性。

无论你是初学者还是经验丰富的区块链开发者，Anchor 都为你提供了在 Solana 程序开发中取得成功所需的工具。