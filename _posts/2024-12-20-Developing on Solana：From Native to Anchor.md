---
layout: post
title: "Developing on Solana：From Native to Anchor"
---

If you are also an Ethereum developer like me, you must have been as confused as I was when trying to develop on Solana. Solana is so different and unique. In this post, I will show you a well-designed roadmap that will guide you to start developing on Solana as quickly as possible. 

Before getting started, I assume that you already have some basic knowledge about Solana, including its account model and program system, as well as a basic understanding of the Rust programming language. It's totally fine if you're not deeply familiar with these topics, basic knowledge is sufficient for this post.

Moreover, I assume that you are using a Linux system and have already installed `rust`, `solana-cli`, `node.js` and `anchor`. If you are a Windows user, I highly recommend using WSL2, as `anchor` does not provide good support for Windows.

<!--more-->

## Hello Solana

For a beginner, diving into a complex framework like anchor is not a good idea. That's why we always start with a HelloWorld example when a programmer tries to enter a new field.

**1.Create a folder and initialize it with `cargo`**
```sh
cargo init --lib program
```

**2.Add dependency for your project**
```sh
cd program
cargo add solana-program
```

**3.Append the following code to Cargo.toml**
```toml
[lib]
name = "say_hello"
crate-type = ["cdylib", "lib"]
```
![](/assets/images/20241220_cargo.toml.png)

**4.Add Rust code to the lib.rs file**

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
If you are not very good at Rust, that's OK. Just know that `process_instruction` is a function, and this function serves as the entry point of the entire program. In this function, we print a message using the msg! macro. That's all.

**5.Compile**
```
cargo build-sbf
```
We use `cargo build-sbf` instead of `cargo build` because Solana only accept BPF bytecode.  
You will get your .so file in `program/target/deploy/` folder.

**6.Deploy**
```sh
solana program deploy ./target/deploy/say_hello.so
```

The expected output is as follows:
```
Program Id: H8rJGBMynZQf66koygjyzQ3w3r2E1qukaxhaHXha1PLD

Signature: 5Lm5SEfkeepuS2y3VLJg5LvXk75zMZ2uJa9ksfcNUA14b5FyvgjHCSxWzhu9HT9Xk6SYnJTkPj3ozGm6iCFsAFa9
```

If you didn't change the network configuration of the Solana CLI, you are probably connected to the devnet. You can confirm your network configuration using `solana config get`. If you are connected to the devnet, just remember to get some SOL for testing.

Now we have deployed our first program on Solana!

Unlike Solidity, Solana programs do not have a constructor. This means that when we deploy a program on Solana, no code is executed automatically within our program.

**7.Invoke the program with node.js**

Create another folder, for example, `scripts`, initialize this folder with `npm init` then install dependency packages:
```sh
npm install @solana/web3.js@1 @solana-developers/helpers@2
```
Create a .js file, for example, invoke.js.

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
Do NOT foget to replace the programId with yours.
Then we can invoke the Solana program with invoke.js:
```sh
node ./invoke.js
```
The output should be like this:
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

And we can track this transaction with solana explorer:
![](/assets/images/20241220_invoke.png)

That's it! We have already successfully invoked out program on Solana!

## Create a token with native program
Now that we already know how to deploy and invoke a program on Solana, it's time to create our own token on Solana!

A token should support minting, transferring, and retrieving the balance of an account. Let's do it.

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
Compile above code with `cargo build-sbf` then deploy the .so archive with `solana program deploy ./target/deploy/your_archive_name.so`.
The next is client application for this program:

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
Run the JavaScript file with `node ./<your_js_file_name>.js`, and replace the programId and test accounts with your own values before running. Based on the test code, the final balances of the two accounts are 66 and 34.

![](/assets/images/20241220_balance.png)

Upon reviewing the Rust program and the Node.js client code, you may notice that the implementation is quite tedious, even for a simple token.

The complexities we need to handle in Rust (program):

1. The program is essentially an instruction processor. If we want to support multiple instructions, we need to use enums and handle them with switch or match statements.
2. Unlike Solidity's mappings, Solana programs store data like balances in individual accounts. We must manage these accounts manually, including creating accounts, saving data, and reading data from them.
3. When saving and reading data, we need to manually handle serialization and deserialization in both Rust and Node.js. We have to get involved into the detail of (de)serialization.
4. We need to verify the account authority and status using multiple guard clauses.

The complexities we need to handle in Node.js (client):

1. Serializing instructions data manually and carfully, beave me, it's a disastor
2. Managing every account involved in an instruction, including PDAs (Program Derived Accounts), It is crucial to maintain consistent account order between the JavaScript (JS) and Rust code to ensure correct functionality and avoid mismatches.
3. Update the programID manually, While not inherently complex, it can be tedious and repetitive to manage.

**That's WHY we need Anchor**

## Create a token with Anchor framework

Let's see the impliment of this token using Anchor Framework:
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
If you are not familiar with Rust, there will be some diffcult understanding the code above. 

### Understanding Key Attributes in the Anchor Framework
The Anchor framework simplifies Solana smart contract development by introducing attributes that automate common tasks and reduce boilerplate code. In this post, we’ll dive into three essential attributes in Anchor: `#[program]`, `#[instruction]`, and `#[account]`.

1. `#[program]`: Defining the Program Logic.
The `#[program]` attribute is used to define the entry point of your Solana program. It marks a module containing all program instructions. Each function within this module represents an instruction that clients can call.
Functions within the module automatically receive a deserialized Accounts context and instruction data.Anchor generates boilerplate code for instruction dispatch, argument deserialization, and account validation.

2. `#[instruction]`: Custom Instruction Data Deserialization.
The `#[instruction]` attribute is used when you need to deserialize instruction data into custom arguments outside the standard Anchor flow. It allows you to define how incoming data should be parsed. `#[instruction]` specify the instruction parameters in a separate function, then Anchor (de)serialize these parameters and makes them available in the context.

3. `#[account]`: Account Validation and Initialization.
The `#[account]` attribute is the cornerstone of account management in Anchor. It simplifies the handling of accounts by providing a declarative way to validate and initialize them. This attribute enforces constraints, such as ownership and data layout, and aautomates account initialization with parameters like init, init_if_needed, and payer. More over, it alse supports token account management through sub-attributes like associated_token.

### Anchor IDL: Bridging Rust Programs and JavaScript Clients
One of Anchor's most powerful features is its ability to generate an IDL (Interface Definition Language) file. Like the abi file in Solana, This JSON file describes your program's instructions, accounts, and data structures in a way that can be easily consumed by JavaScript (or other language) clients.

Benefits of IDL:
- Seamless Client Integration: The IDL serves as a bridge, enabling tools like @coral-xyz/anchor to interact with your Rust program without requiring manual encoding/decoding of instructions.
- Automatic Type Safety: Clients can use the IDL to ensure they pass the correct arguments and accounts when invoking instructions.

With IDL, we can invoke our program using NodeJs like this:

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

Anchor empowers developers to write Solana smart contracts with greater simplicity, clarity, and efficiency. By abstracting away repetitive and error-prone tasks, it allows developers to focus on building innovative decentralized applications while maintaining high code quality and reliability.

Whether you’re a beginner or an experienced blockchain developer, Anchor provides the tools you need to succeed in Solana program development.