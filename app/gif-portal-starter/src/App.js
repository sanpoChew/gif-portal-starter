import { useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";

import twitterLogo from "./assets/twitter-logo.svg";
import kp from "./keypair.json";
import idl from "./idl.json";
import "./App.css";

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");

          /*
           * The solana object gives us a function that will allow us to connect
           * directly with the user's wallet!
           */
          const { publicKey } = await solana.connect({ onlyIfTrusted: true });
          console.log("Connected with Public Key:", publicKey.toString());

          setWalletAddress(publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!");
      return;
    }
    setInputValue("");
    console.log("Gif link:", inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue);

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error);
    }
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "Created a new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Got the account", account);
      setGifList(
        account.gifList.map((gifListItem) => ({
          ...gifListItem,
          userAddress: new PublicKey(account.gifList[0].userAddress).toString(),
        }))
      );
    } catch (error) {
      console.log("Error in getGifList: ", error);
      setGifList(null);
    }
  };

  const upvoteGif = async (gifIndex) => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    await program.rpc.upvoteGif(gifIndex, {
      accounts: {
        baseAccount: baseAccount.publicKey,
      },
    });
    await getGifList();
  };

  const downvoteGif = async (gifIndex) => {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    await program.rpc.downvoteGif(gifIndex, {
      accounts: {
        baseAccount: baseAccount.publicKey,
      },
    });
    await getGifList();
  };

  const tipUser = async (userAddress) => {
    const provider = getProvider();

    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: new PublicKey(walletAddress),
        toPubkey: new PublicKey(userAddress),
        lamports: web3.LAMPORTS_PER_SOL / 100,
      })
    );

    const signature = await provider.send(transaction);

    console.log("Transaction Signature", signature);
  };

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");

      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress ? (
            <button
              className="cta-button connect-wallet-button"
              onClick={connectWallet}
            >
              Connect to Wallet
            </button>
          ) : gifList === null ? (
            <div className="connected-container">
              <button
                className="cta-button submit-gif-button"
                onClick={createGifAccount}
              >
                Do One-Time Initialization For GIF Program Account
              </button>
            </div>
          ) : (
            <div className="connected-container">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendGif();
                }}
              >
                <input
                  type="text"
                  placeholder="Enter gif link!"
                  value={inputValue}
                  onChange={({ target }) => setInputValue(target.value)}
                />
                <button type="submit" className="cta-button submit-gif-button">
                  Submit
                </button>
              </form>
              <div className="gif-grid">
                {gifList.map((item, index) => (
                  <div className="gif-item" key={index}>
                    <img src={item.gifLink} />
                    <div>
                      <button onClick={() => upvoteGif(index)}>UP</button>
                      <span>{item.score}</span>
                      <button onClick={() => downvoteGif(index)}>DOWN</button>
                    </div>
                    <div>
                      <span>{item.userAddress}</span>
                      <button onClick={() => tipUser(item.userAddress)}>
                        TIP
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
