I was surprised this was not a click of a button in the settings, so for anyone stugeling, here is the solution

# 1. Find your fid

First you need to find your internal farcaster id, you can do that by pasting this command to the terminal (please change %YOUR_FARCASTER_USERNAME% to real value)

```
curl https://fnames.farcaster.xyz/transfers?name=%YOUR_FARCASTER_USERNAME% | jq
```

> If you get an error saying you don't have jq, just remove it, it just make output pretty

I will do the process along the way, so now we have my id which is "to" or 899909

```
curl https://fnames.farcaster.xyz/transfers\?name\=jollier | jq
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   453  100   453    0     0   1513      0 --:--:-- --:--:-- --:--:--  1515
{
  "transfers": [
    {
      "id": 712278,
      "timestamp": 1734036876,
      "username": "jollier",
      "owner": "0xdc975a0281ef7476d00bd1e0e3fdfdfc9ddfb306",
      "from": 0,
      "to": 899909, // Here is my id
      "user_signature": "0xb1cec22df751bba8d684cf897cd4ebff1659b3b5368ecee9ea1dd1e08569fb09149cb6504ace8717856d7e425396bb09d1fbf82c1421c3648493cabe053cb1141b",
      "server_signature": "0xd00016d8e0120a6aa0542f972c3b7e5dfc15d0098eb8944099a5d65116e20a16262879b62c81ae19c985a36a7cb0024ab863f9c39ee8412bfff1597ca3309c201b"
    }
  ]
}
```

Not it's time to change it, for that you would need to get private key of the wallet that is part of your FID. For me I went inside warpcaster app on mobile, export wallet (I got seed phrase) import it into safepal (but any non custodial wallet would work) and then got the private key

# 2. Unregister your name

You can have only one name at a time, so before getting a new one you must ~~lose yourself~~ unregister name u had before

```
import {
    makeUserNameProofClaim,
    Eip712Signer,
    EthersEip712Signer,
} from "@farcaster/hub-nodejs";
import { ethers } from "ethers";

const wallet = new ethers.Wallet(
    "%YOUR_PRIVATE_KEY%"
);

const accountKey: Eip712Signer = new EthersEip712Signer(wallet);

let timestamp = Math.floor(Date.now() / 1000);
console.log("Timestamp for registration: ", timestamp);

const claim = makeUserNameProofClaim({
    name: "%YOUR_CURRENT_NAME%",
    owner: wallet.address as `0x${string}`,
    timestamp: timestamp,
});

const signature = (
    await accountKey.signUserNameProofClaim(claim)
)._unsafeUnwrap();

console.log(ethers.hexlify(signature));

```

Then you adjust values in this request 

```

curl -X POST 'https://fnames.farcaster.xyz/transfers' \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "name": "%YOUR_CURRENT_NAME%", 
  "owner": "0xDC975a0281ef7476D00bd1E0E3fDFdFC9ddfB306", 
  "signature": "%SINGATURE_FROM_SCRIPT}",  
  "from": %YOUR_FIED_FROM_STEP_ONE%, 
  "to": 0, // 0 - means we delete it 
  "timestamp": %TIMESTAMP_FROM_SCRIPT%, 
  "fid": %YOUR_FIED_FROM_STEP_ONE%}'

```

# 3. Getting new name

We do the same as above but put the name we want to get , and make "from" = 0 , and "to" our fid (we also must adjust signature)
