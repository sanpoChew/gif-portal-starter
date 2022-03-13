const anchor = require("@project-serum/anchor");
const { expect } = require("chai");
const { SystemProgram } = anchor.web3;

const main = async () => {
  console.log("🚀 Starting test...");

  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GifPortalStarter;
  const baseAccount = anchor.web3.Keypair.generate();

  let tx = await program.rpc.startStuffOff({
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    },
    signers: [baseAccount],
  });
  console.log("📝 Your transaction signature", tx);

  let account = await program.account.baseAccount.fetch(baseAccount.publicKey);

  expect(account.totalGifs.toString()).to.equal("0");

  const gifLink =
    "https://media3.giphy.com/media/L71a8LW2UrKwPaWNYM/giphy.gif?cid=ecf05e47rr9qizx2msjucl1xyvuu47d7kf25tqt2lvo024uo&rid=giphy.gif&ct=g";

  // You'll need to now pass a GIF link to the function! You'll also need to pass in the user submitting the GIF!
  await program.rpc.addGif(gifLink, {
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
    },
  });

  // Call the account.
  account = await program.account.baseAccount.fetch(baseAccount.publicKey);

  expect(account.totalGifs.toString()).to.equal("1");

  expect(account.gifList.length).to.equal(1);

  expect(account.gifList[0].gifLink).to.equal(gifLink);
  expect(account.gifList[0].userAddress.toString()).to.equal(
    provider.wallet.publicKey.toString()
  );
  expect(account.gifList[0].score).to.equal(0);

  await program.rpc.upvoteGif(0, {
    accounts: {
      baseAccount: baseAccount.publicKey,
    },
  });

  // Call the account.
  account = await program.account.baseAccount.fetch(baseAccount.publicKey);

  expect(account.gifList[0].score).to.equal(1);

  await program.rpc.downvoteGif(0, {
    accounts: {
      baseAccount: baseAccount.publicKey,
    },
  });

  // Call the account.
  account = await program.account.baseAccount.fetch(baseAccount.publicKey);

  expect(account.gifList[0].score).to.equal(0);

  await program.rpc.downvoteGif(0, {
    accounts: {
      baseAccount: baseAccount.publicKey,
    },
  });

  // Call the account.
  account = await program.account.baseAccount.fetch(baseAccount.publicKey);

  expect(account.gifList[0].score).to.equal(0);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();
