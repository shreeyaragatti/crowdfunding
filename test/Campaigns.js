const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CampaignFactory", function () {
  it("deploys a campaign and returns it from the factory", async function () {
    const [manager] = await ethers.getSigners();
    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    const factory = await CampaignFactory.deploy();
    await factory.deployed();

    await factory.createCampaign(
      ethers.utils.parseEther("0.01"),
      "Medical Fund",
      "Raising funds transparently",
      "https://example.com/image.png",
      ethers.utils.parseEther("1")
    );

    const campaigns = await factory.getDeployedCampaigns();
    expect(campaigns).to.have.lengthOf(1);

    const campaign = await ethers.getContractAt("Campaign", campaigns[0]);
    const summary = await campaign.getSummary();

    expect(summary[0].eq(ethers.utils.parseEther("0.01"))).to.equal(true);
    expect(summary[4]).to.equal(manager.address);
    expect(summary[5]).to.equal("Medical Fund");
    expect(summary[8].eq(ethers.utils.parseEther("1"))).to.equal(true);
  });
});

describe("Campaign", function () {
  it("accepts contributions and finalizes approved requests", async function () {
    const [manager, contributor, recipient] = await ethers.getSigners();
    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    const factory = await CampaignFactory.deploy();
    await factory.deployed();

    await factory.createCampaign(
      ethers.utils.parseEther("0.01"),
      "Education Fund",
      "Books and fees",
      "https://example.com/education.png",
      ethers.utils.parseEther("1")
    );

    const [campaignAddress] = await factory.getDeployedCampaigns();
    const campaign = await ethers.getContractAt("Campaign", campaignAddress);

    await campaign.connect(contributor).contibute({
      value: ethers.utils.parseEther("0.2"),
    });

    await campaign
      .connect(manager)
      .createRequest(
        "Buy books",
        ethers.utils.parseEther("0.1"),
        recipient.address
      );
    await campaign.connect(contributor).approveRequest(0);

    const campaignBalanceBefore = await ethers.provider.getBalance(
      campaignAddress
    );
    const recipientBalanceBefore = await ethers.provider.getBalance(
      recipient.address
    );

    await campaign.connect(manager).finalizeRequest(0);

    const campaignBalanceAfter = await ethers.provider.getBalance(campaignAddress);
    const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);

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
});
