const hre = require("hardhat");
const ucans = require('@ucans/ucans');

async function deployContract() {
  const Credentials = await hre.ethers.getContractFactory("Credentials");
  const credentials = await Credentials.deploy();
  await credentials.deployed();
  return credentials;
}

async function getRandomSigner() {
  const signers = await hre.ethers.getSigners()
  return signers[2];
}


async function generateServiceKeyPair() {
  const keypair = await ucans.EdKeypair.create();
  return keypair;
}

async function generateClientKeyPair() {
  const keypair = await ucans.EdKeypair.create();
  return keypair;
}

async function generateClientToken({ contractAddress, clientKeyPair, serviceDID }) {
  const ucan = await ucans.build({
    audience: serviceDID, // recipient DID
    issuer: clientKeyPair, // signing key
    capabilities: [{
      with: { scheme: "work", hierPart: contractAddress.toLowerCase() },
      can: { namespace: "file", segments: ["CREATE"] },
    }],
  });
  const token = ucans.encode(ucan); // base64 jwt-formatted auth token
  return token;
}

async function setClientCredentialsToSmartContract({ contract, signer, did }) {
  const data = await contract.connect(signer).setCredential(did);
  return data;
}

async function getClientDid({ contract, signerAddress }) {
  const data = await contract.credentials(signerAddress);
  return data;
}

async function verifyClientToken({ clientDid, serviceDID, contractAddress, token }) {
  // verify an invocation of a UCAN on another machine (in this example a service)
  const result = await ucans.verify(token, {
    audience: serviceDID,
    requiredCapabilities: [
      {
        capability: {
          with: { scheme: "work", hierPart: contractAddress.toLowerCase() },
          can: { namespace: "file", segments: ["CREATE"] },
        },
        rootIssuer: clientDid, // check against a known owner of the boris@fission.codes email address
      },
    ],
  });
  return result.ok;
}

async function main() {
  console.log('-----------------------START----------------------------', '\n\n');  
  console.log('---------------------------------------------------------', '\n\n');  
  console.log('>>>> Server side setup of UCANs: START', '\n');
  // Setup Steps - START
  const crendentialsInstance = await deployContract();
  const contractAddress = crendentialsInstance.address;
  console.log('Deployed Repository Smart Contract at: ', contractAddress, '\n');

  const serviceKeyPair = await generateServiceKeyPair();
  const serviceDID = await serviceKeyPair.did();
  console.log('Generated Server identity using the ucans: ', serviceDID, '\n');

  console.log('>>>> Server side setup of UCANs: END', '\n');
  // Setup Steps - DONE
  console.log('---------------------------------------------------------', '\n\n');  

  // Setup Step on Client Side - START
  console.log('>>>> Client side setup of UCANs: START', '\n');  
  const signer = await getRandomSigner();
  console.log('User\'s Wallet Address (can be any type of wallet - multisigs / smart wallets): ', signer.address, '\n');

  console.log('Generating client identity for the user!', '\n');
  const clientKeyPair = await generateClientKeyPair();
  const clientDID = await clientKeyPair.did();
  console.log('Generated client identity using the ucans: ', clientDID, '\n');

  console.log('Setting clientDID to the smart contract for the user!', '\n');
  await setClientCredentialsToSmartContract({ contract: crendentialsInstance, did: clientDID, signer });
  console.log('Set clientDID to the smart contract for the user!', '\n');
  console.log('>>>> Client side setup of UCANs: END', '\n');
  // Setup Step on Client Side - END
  console.log('---------------------------------------------------------', '\n\n');  

  // Generation Step on Client Side - START
  console.log('>>>> Client side generation of UCANs: START', '\n');
  console.log('Generating a valid token for the user to interact with backend!', '\n');
  const clientToken = await generateClientToken({
    clientKeyPair,
    serviceDID,
    contractAddress,
  });
  console.log('Token Generated: ', clientToken, '\n');
  console.log('>>>> Client side generation of UCANs: END', '\n');
  // Generation Step on Client Side - END

  console.log('---------------------------------------------------------', '\n\n');  

  console.log('>>>> Server side verification of UCANs: START', '\n');

  console.log('Getting clientDID from the smart contract for the user address!', '\n');
  const clientDid = await getClientDid({ contract: crendentialsInstance, signerAddress: signer.address });
  console.log('Got clientDID from the smart contract for the user address: ', clientDid, '\n');

  console.log('Verifying Client Token for the user address!', '\n');
  const isValid = await verifyClientToken({
    contractAddress,
    token: clientToken,
    serviceDID: serviceDID,
    clientDid,
  });
  console.log('Verified Client Token for the user address with status: ', isValid ? 'Valid': 'InValid', '\n');
  console.log('>>>> Server side verification of UCANs: END', '\n');
  console.log('---------------------------------------------------------', '\n\n');  
  console.log('-----------------------END----------------------------', '\n\n');  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


// Add a sequence diagram with flow details
// Why is there a user wallet - not clear in the flow 
// What is there server setup - not clear in the flow 
 