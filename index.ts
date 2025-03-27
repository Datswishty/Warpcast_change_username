import {
    makeUserNameProofClaim,
    Eip712Signer,
    EthersEip712Signer,
} from "@farcaster/hub-nodejs";
import { ethers } from "ethers";
import { config } from "dotenv";

// Load environment variables
config();

// Get values from environment variables
const privateKeyOrSecretPhrase = process.env.PRIVATE_KEY;
if (!privateKeyOrSecretPhrase) {
    throw new Error("PRIVATE_KEY environment variable is required");
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

const currentUsername = process.env.CURRENT_USERNAME;
if (!currentUsername) {
    throw new Error("CURRENT_USERNAME environment variable is required");
}

const newUsername = process.env.NEW_USERNAME;
if (!newUsername) {
    throw new Error("NEW_USERNAME environment variable is required");
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
//   "name": "%YOUR_NEW_NAME%",
//   "owner": "%YOUR_WALLET_ADDRESS%",
//   "signature": "%SINGATURE}",
//   "from": 0,
//   "to": %YOUR_FID_FROM_STEP_ONE%,
//   "timestamp": %TIMESTAMP%,
//   "fid": %YOUR_FID_FROM_STEP_ONE%}'

let responseCreate = await fetch("https://fnames.farcaster.xyz/transfers", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        name: newUsername,
        owner: wallet.address,
        signature: signatureToRegister.signature,
        from: 0,
        to: fid,
        timestamp: signatureToRegister.timestamp,
        fid: fid,
    }),
});

if (!responseCreate.ok) {
    throw new Error("Failed to create username");
}

console.log(`Username ${newUsername} attached to FID ${fid}`);

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
