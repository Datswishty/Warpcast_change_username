import {
    makeUserNameProofClaim,
    Eip712Signer,
    EthersEip712Signer,
} from "@farcaster/hub-nodejs";
import { ethers } from "ethers";

// User inputs private key or secret phrase
const args = process.argv.slice(2);
const privateKeyOrSecretPhrase = args[0];
if (!privateKeyOrSecretPhrase) {
    throw new Error("Private key or secret phrase is required");
}

let wallet: ethers.Wallet;
if (privateKeyOrSecretPhrase.startsWith("0x")) {
    wallet = new ethers.Wallet(privateKeyOrSecretPhrase);
} else {
    const hdNode = ethers.HDNodeWallet.fromPhrase(privateKeyOrSecretPhrase);
    wallet = new ethers.Wallet(hdNode.privateKey);
}

// Check if the wallet is valid
if (!wallet.address) {
    throw new Error("Invalid wallet");
}

const accountKey: Eip712Signer = new EthersEip712Signer(wallet);

console.log("Wallet address: ", wallet.address);

const currentUsername = args[1];
if (!currentUsername) {
    throw new Error("Current username is required");
}

const newUsername = args[2];
if (!newUsername) {
    throw new Error("New username is required");
}
// Check if new username is already taken
const isNewUsernameTaken = await isUsernameTaken(newUsername);
if (isNewUsernameTaken) {
    throw new Error("New username is already taken");
}

// Get FID from username
const fid = await getFidFromUsername(
    currentUsername,
    wallet.address.toLowerCase()
);

// Unregister username
// curl -X POST 'https://fnames.farcaster.xyz/transfers' \
//   --header 'Content-Type: application/json' \
//   --data-raw '{
//   "name": "%YOUR_CURRENT_NAME%",
//   "owner": "%YOUR_WALLET_ADDRESS%",
//   "signature": "%SINGATURE_FROM_SCRIPT}",
//   "from": %YOUR_FIED_FROM_STEP_ONE%,
//   "to": 0, // 0 - means we delete it
//   "timestamp": %TIMESTAMP_FROM_SCRIPT%,
//   "fid": %YOUR_FIED_FROM_STEP_ONE%}'

const signatureToDelete = await generateSinature(
    fid,
    wallet.address.toLowerCase(),
    currentUsername
);

// Delete username
let response = await fetch("https://fnames.farcaster.xyz/transfers", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        name: currentUsername,
        owner: wallet.address,
        signature: signatureToDelete.signature,
        from: fid,
        to: 0,
        timestamp: signatureToDelete.timestamp,
        fid: fid,
    }),
});

if (!response.ok) {
    throw new Error("Failed to delete username");
}

console.log(`Username ${currentUsername} deleted`);

// Register new username
const signatureToRegister = await generateSinature(
    fid,
    wallet.address.toLowerCase(),
    newUsername
);
// curl -X POST 'https://fnames.farcaster.xyz/transfers' \
//   --header 'Content-Type: application/json' \
//   --data-raw '{
//   "name": "",
//   "owner": "",
//   "signature": "",
//   "from": 0,
//   "to": ,
//   "timestamp": 1743082916,
//   "fid": }'

async function getFidFromUsername(username: string, owner: string) {
    // curl https://fnames.farcaster.xyz/transfers\?name\=vadimurlin
    const response = await fetch(
        `https://fnames.farcaster.xyz/transfers?name=${username}`
    );
    const data = await response.json();
    if (data.owner !== owner) {
        throw new Error(
            `Username should be owned by ${owner}, but it is owned by ${data.owner}`
        );
    }
    return data.to;
}

async function isUsernameTaken(username: string) {
    const response = await fetch(
        `https://fnames.farcaster.xyz/transfers?name=${username}`
    );
    const data = await response.json();
    return data.transfers.length !== 0;
}

async function generateSinature(
    fid: string,
    owner: string,
    currentUsername: string
) {
    const timestamp = Math.floor(Date.now() / 1000);
    const claim = makeUserNameProofClaim({
        name: currentUsername,
        owner: owner as `0x${string}`,
        timestamp: timestamp,
    });

    const signature = (
        await accountKey.signUserNameProofClaim(claim)
    )._unsafeUnwrap();

    return {
        signature: ethers.hexlify(signature),
        timestamp: timestamp,
        fid: fid,
    };
}
