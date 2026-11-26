const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deployFactory(admin) {
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  const factory = await CampaignFactory.deploy(admin);
  await factory.deployed();
  return factory;
}

async function createCampaign(factory, creator, overrides = {}) {
  await factory.connect(creator).createCampaign(
    overrides.minimum || ethers.utils.parseEther("0.01"),
    overrides.name || "Medical Fund",
    overrides.description || "Raising funds transparently",
    overrides.image || "https://example.com/image.png",
    overrides.target || ethers.utils.parseEther("1")
  );

  const campaigns = await factory.getDeployedCampaigns();
  return ethers.getContractAt("Campaign", campaigns[campaigns.length - 1]);
}

async function expectRevert(promise, expectedMessage) {
  try {
    await promise;
  } catch (error) {
    expect(error.message || String(error)).to.include(expectedMessage);
    return;
  }

  throw new Error(`Expected transaction to revert with "${expectedMessage}"`);
}

describe("CampaignFactory", function () {
  it("deploys a campaign and returns it from the factory", async function () {
    const [creator, admin] = await ethers.getSigners();
    const factory = await deployFactory(admin.address);
    const campaign = await createCampaign(factory, creator);

    const summary = await campaign.getSummary();

    expect(summary[0].eq(ethers.utils.parseEther("0.01"))).to.equal(true);
    expect(summary[4]).to.equal(creator.address);
    expect(summary[5]).to.equal("Medical Fund");
    expect(summary[8].eq(ethers.utils.parseEther("1"))).to.equal(true);
    expect(await campaign.platformAdmin()).to.equal(admin.address);
  });
});

describe("Campaign", function () {
  it("accepts contributions at or above the minimum", async function () {
    const [creator, contributor, admin] = await ethers.getSigners();
    const factory = await deployFactory(admin.address);
    const campaign = await createCampaign(factory, creator);

    await campaign.connect(contributor).contribute({
      value: ethers.utils.parseEther("0.01"),
    });

    await expectRevert(
      campaign.connect(contributor).contribute({
        value: ethers.utils.parseEther("0.001"),
      }),
      "Contribution must meet the minimum"
    );

    expect((await campaign.approversCount()).eq(1)).to.equal(true);
  });

  it("only lets the platform admin approve withdrawal requests", async function () {
    const [creator, contributor, admin, outsider] = await ethers.getSigners();
    const factory = await deployFactory(admin.address);
    const campaign = await createCampaign(factory, creator);

    await campaign.connect(contributor).contribute({
      value: ethers.utils.parseEther("0.2"),
    });

    await campaign
      .connect(creator)
      .createRequest(
        "Buy books",
        ethers.utils.parseEther("0.1"),
        contributor.address
      );

    await expectRevert(
      campaign.connect(outsider).approveRequestAsAdmin(0),
      "Only the platform admin can approve"
    );

    await campaign.connect(admin).approveRequestAsAdmin(0);

    expect(await campaign.adminApproved(0)).to.equal(true);
  });

  it("lets the creator finalize after admin approval", async function () {
    const [creator, contributor, admin, recipient] = await ethers.getSigners();
    const factory = await deployFactory(admin.address);
    const campaign = await createCampaign(factory, creator);

    await campaign.connect(contributor).contribute({
      value: ethers.utils.parseEther("0.2"),
    });

    await campaign
      .connect(creator)
      .createRequest(
        "Buy books",
        ethers.utils.parseEther("0.1"),
        recipient.address
      );
    await campaign.connect(admin).approveRequestAsAdmin(0);

    const campaignBalanceBefore = await ethers.provider.getBalance(
      campaign.address
    );
    const recipientBalanceBefore = await ethers.provider.getBalance(
      recipient.address
    );

    await campaign.connect(creator).finalizeRequest(0);

    const campaignBalanceAfter = await ethers.provider.getBalance(
      campaign.address
    );
    const recipientBalanceAfter = await ethers.provider.getBalance(
      recipient.address
    );

    expect(
      campaignBalanceAfter.eq(
        campaignBalanceBefore.sub(ethers.utils.parseEther("0.1"))
      )
    ).to.equal(true);
    expect(
      recipientBalanceAfter.eq(
        recipientBalanceBefore.add(ethers.utils.parseEther("0.1"))
      )
    ).to.equal(true);
  });

  it("blocks finalization when the admin rejects the request", async function () {
    const [creator, contributor, admin, recipient] = await ethers.getSigners();
    const factory = await deployFactory(admin.address);
    const campaign = await createCampaign(factory, creator);

    await campaign.connect(contributor).contribute({
      value: ethers.utils.parseEther("0.2"),
    });

    await campaign
      .connect(creator)
      .createRequest(
        "Buy books",
        ethers.utils.parseEther("0.1"),
        recipient.address
      );

    await campaign.connect(admin).rejectRequestAsAdmin(0);

    await expectRevert(
      campaign.connect(creator).finalizeRequest(0),
      "Admin approval required"
    );
  });

  it("only lets the campaign manager create withdrawal requests", async function () {
    const [creator, contributor, admin] = await ethers.getSigners();
    const factory = await deployFactory(admin.address);
    const campaign = await createCampaign(factory, creator);

    await campaign.connect(contributor).contribute({
      value: ethers.utils.parseEther("0.2"),
    });

    await expectRevert(
      campaign
        .connect(contributor)
        .createRequest(
          "Unauthorized",
          ethers.utils.parseEther("0.1"),
          contributor.address
        ),
      "Only the campaign manager can do this"
    );
  });
});
