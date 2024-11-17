import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

class BatchTransfer {
  private connection: Connection;
  private payer: Keypair;

  constructor(endpoint: string, payerKeypair: Keypair) {
    this.connection = new Connection(endpoint, "confirmed");
    this.payer = payerKeypair;
  }

  async constructBatchTransaction(
    recipients: Array<{ address: string; amount: number }>
  ): Promise<Transaction> {
    const instructions = recipients.map((recipient) =>
      SystemProgram.transfer({
        fromPubkey: this.payer.publicKey,
        toPubkey: new PublicKey(recipient.address),
        lamports: recipient.amount * LAMPORTS_PER_SOL,
      })
    );

    const transaction = new Transaction();
    const blockhash = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.feePayer = this.payer.publicKey;

    instructions.forEach((instruction) => transaction.add(instruction));

    return transaction;
  }

  async signAndBroadcastTransaction(transaction: Transaction): Promise<string> {
    return sendAndConfirmTransaction(this.connection, transaction, [
      this.payer,
    ]);
  }

  async sendBatchTransfer(
    recipients: Array<{ address: string; amount: number }>
  ): Promise<string> {
    const transaction = await this.constructBatchTransaction(recipients);
    return this.signAndBroadcastTransaction(transaction);
  }
}

async function main() {
  const privateKeyString = "XXX";

  const decodedPrivateKey = bs58.decode(privateKeyString);
  const PAYER_KEYPAIR = Keypair.fromSecretKey(decodedPrivateKey);
  const endpoint = "https://api.devnet.solana.com";

  console.log("Payer Public Key:", PAYER_KEYPAIR.publicKey.toString());

  const connection = new Connection(endpoint, "confirmed");
  const balance = await connection.getBalance(PAYER_KEYPAIR.publicKey);
  console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  const batchTransfer = new BatchTransfer(endpoint, PAYER_KEYPAIR);

  const recipients = [
    { address: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK", amount: 0.1 },
    { address: "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK", amount: 0.2 },
  ];

  console.log("\nPreparing to send transactions...");
  console.log(
    "Recipients:",
    recipients.map((r) => `${r.address} (${r.amount} SOL)`).join("\n")
  );

  try {
    const transaction = await batchTransfer.constructBatchTransaction(
      recipients
    );
    console.log(
      `Constructed batch transaction with ${recipients.length} transfers`
    );

    const signature = await batchTransfer.signAndBroadcastTransaction(
      transaction
    );
    console.log("\nTransaction successful!");
    console.log("Transaction signature:", signature);

    const finalBalance = await connection.getBalance(PAYER_KEYPAIR.publicKey);
    console.log(`\nFinal balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    console.error("\nError during transfer:", error);
  }
}

main().catch(console.error);
