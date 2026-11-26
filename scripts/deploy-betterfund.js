const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

function getEnvPath() {
  const envPath = path.join(process.cwd(), ".env");
  const localEnvPath = path.join(process.cwd(), ".env.local");

  if (fs.existsSync(localEnvPath)) return localEnvPath;
  return envPath;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account configured. Set DEPLOYER_PRIVATE_KEY in .env or .env.local."
    );
  }

  const platformAdmin =
    process.env.PLATFORM_ADMIN_ADDRESS ||
    process.env.NEXT_PUBLIC_OWNER_ADDRESS ||
    deployer.address;

  if (!ethers.utils.isAddress(platformAdmin)) {
    throw new Error(
      "PLATFORM_ADMIN_ADDRESS / NEXT_PUBLIC_OWNER_ADDRESS must be a valid Ethereum address."
    );
  }

  console.log(`Deploying CampaignFactory`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Platform admin: ${platformAdmin}`);

  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy(platformAdmin);
  await factory.deployed();

  console.log(`CampaignFactory deployed: ${factory.address}`);

  const envPath = getEnvPath();
  const currentEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  const nextEnv = currentEnv.match(/^NEXT_PUBLIC_FACTORY_ADDRESS=/m)
    ? currentEnv.replace(
        /^NEXT_PUBLIC_FACTORY_ADDRESS=.*/m,
        `NEXT_PUBLIC_FACTORY_ADDRESS=${factory.address}`
      )
    : `${currentEnv.trimEnd()}\nNEXT_PUBLIC_FACTORY_ADDRESS=${factory.address}\n`;

  fs.writeFileSync(envPath, nextEnv);

  const artifactRoot = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "Campaigns.sol"
  );
  const legacyBuildRoot = path.join(process.cwd(), "smart-contract", "build");
  fs.mkdirSync(legacyBuildRoot, { recursive: true });

  for (const contractName of ["CampaignFactory", "Campaign"]) {
    const artifact = JSON.parse(
      fs.readFileSync(path.join(artifactRoot, `${contractName}.json`), "utf8")
    );

    fs.writeFileSync(
      path.join(legacyBuildRoot, `${contractName}.json`),
      JSON.stringify(
        {
          interface: JSON.stringify(artifact.abi),
          bytecode: artifact.bytecode,
        },
        null,
        2
      )
    );
  }

  console.log(`${path.basename(envPath)} updated with NEXT_PUBLIC_FACTORY_ADDRESS`);
  console.log("Frontend ABI files refreshed in smart-contract/build");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
