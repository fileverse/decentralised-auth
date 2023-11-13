const hre = require("hardhat");
const ucans = require('@ucans/ucans');

async function deployContract() {
  const Credentials = await hre.ethers.getContractFactory("Credentials");
  const credentials = await Credentials.deploy();
  await credentials.deployed();
  console.log(`Contract deployed to ${credentials.address}`);
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
  console.log('token: ', token);
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
  const crendentialsInstance = await deployContract();
  const contractAddress = crendentialsInstance.address;
  // generated on service - one time setup
  const serviceKeyPair = await generateServiceKeyPair();
  const serviceDID = await serviceKeyPair.did();
  // generated on frontend
  const clientKeyPair = await generateClientKeyPair();
  const signer = await getRandomSigner();
  await setClientCredentialsToSmartContract({ contract: crendentialsInstance, did: clientKeyPair.did(), signer });
  const clientToken = await generateClientToken({
    clientKeyPair,
    serviceDID: serviceDID,
    contractAddress,
  });
  const clientDid = await getClientDid({ contract: crendentialsInstance, signerAddress: signer.address });
  const isValid = await verifyClientToken({
    contractAddress,
    token: clientToken,
    serviceDID: serviceDID,
    clientDid,
  });
  console.log(isValid);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
