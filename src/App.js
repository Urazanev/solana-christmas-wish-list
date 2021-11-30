import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import React, { useEffect, useState, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';
import kp from './keypair.json'
import idl from './idl.json';

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram } = web3;

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const isNilOrEmpty = (value) => {
  return value === '' || value.replace(/\s/g, '').length === 0;
}
const AddWishItem = ({ addWish }) => {
  const [inputValue, setInputValue] = useState('');

  const onSubmitHandler = useCallback((event) => {
    event.preventDefault();
    if (!isNilOrEmpty(inputValue)) {
      addWish(inputValue);
      setInputValue('');
    }
  }, [addWish, inputValue]);


  return (
      <form
          onSubmit={onSubmitHandler}
      >
        <input
            type="text"
            placeholder="what do you wish?"
            value={inputValue}
            onChange={(e) => setInputValue(e?.target.value) }
        />
        <button type="submit" className="cta-button submit-wish-button">Submit</button>
      </form>
  );
}
const WishList = ({ wishList }) => (
    <>
      <p className="sub-text">
        My wish list:
      </p>
      <div className="row wish-list">
        <div className="col col-centered">
          <ul>
            {wishList.map(wishListItem => (
                <li key={wishListItem}>🎁 {wishListItem}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
);

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [wishList, setWishList] = useState([]);
  const getWishList = useCallback( async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      console.log(account)
      setWishList(account?.wishList?.map( ({ wish }) => wish));

    } catch (error) {
      console.log("Error in getWishList: ", error)
      setWishList(null);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      getWishList()
    }
  }, [walletAddress, getWishList]);

  const createWishListAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getWishList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana?.isPhantom) {
        console.log('Phantom wallet found!');
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
        );
        setWalletAddress(response.publicKey.toString());
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
        connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }
  const sendWishToSolana = async (inputValue) => {
    if (inputValue.length === 0) {
      return
    }
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addWish(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      await getWishList();
    } catch (error) {
      console.log("Error sending you wish:", error)
    }
  };
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const addWish = (wish) => {
    sendWishToSolana(wish);
    //setWishList([wish, ...wishList]);
  };

  const renderNotConnectedContainer = (
      <button
          className="cta-button connect-wallet-button"
          onClick={connectWallet}
      >
        Connect to Wallet
      </button>
  );
  const renderInitButton = (
      <div className="connected-container">
        <button className="cta-button submit-wish-button" onClick={createWishListAccount}>
          Do One-Time Initialization For Christmas wish list Program Account
        </button>
      </div>
  );
  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🎄 Christmas wish list 🎄</p>
          {wishList !== null && walletAddress && (
              <>
                <AddWishItem
                    addWish={addWish}
                />
                {wishList && <WishList
                    wishList={wishList}
                />}
              </>)
          }
          {wishList === null ? renderInitButton : !walletAddress && renderNotConnectedContainer}
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
