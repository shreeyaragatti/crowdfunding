// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CampaignFactory {
    address[] public deployedCampaigns;

    event CampaignCreated(
        address indexed campaign,
        address indexed creator,
        string name,
        uint256 target
    );

    function createCampaign(
        uint256 minimum,
        string memory name,
        string memory description,
        string memory image,
        uint256 target
    ) public {
        Campaign newCampaign = new Campaign(
            minimum,
            msg.sender,
            name,
            description,
            image,
            target
        );

        deployedCampaigns.push(address(newCampaign));
        emit CampaignCreated(address(newCampaign), msg.sender, name, target);
    }

    function getDeployedCampaigns() public view returns (address[] memory) {
        return deployedCampaigns;
    }
}

contract Campaign {
    struct Request {
        string description;
        uint256 value;
        address payable recipient;
        bool complete;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    Request[] public requests;
    address public manager;
    uint256 public minimunContribution;
    string public CampaignName;
    string public CampaignDescription;
    string public imageUrl;
    uint256 public targetToAchieve;
    address[] public contributers;
    mapping(address => bool) public approvers;
    uint256 public approversCount;

    event ContributionReceived(address indexed contributor, uint256 amount);
    event RequestCreated(
        uint256 indexed requestIndex,
        string description,
        uint256 value,
        address indexed recipient
    );
    event RequestApproved(uint256 indexed requestIndex, address indexed approver);
    event RequestFinalized(uint256 indexed requestIndex, address indexed recipient);

    modifier restricted() {
        require(msg.sender == manager, "Only the campaign manager can do this");
        _;
    }

    constructor(
        uint256 minimun,
        address creator,
        string memory name,
        string memory description,
        string memory image,
        uint256 target
    ) {
        manager = creator;
        minimunContribution = minimun;
        CampaignName = name;
        CampaignDescription = description;
        imageUrl = image;
        targetToAchieve = target;
    }

    function contibute() public payable {
        require(
            msg.value > minimunContribution,
            "Contribution must exceed the minimum"
        );

        if (!approvers[msg.sender]) {
            contributers.push(msg.sender);
            approvers[msg.sender] = true;
            approversCount++;
        }

        emit ContributionReceived(msg.sender, msg.value);
    }

    function createRequest(
        string memory description,
        uint256 value,
        address payable recipient
    ) public restricted {
        uint256 requestIndex = requests.length;
        Request storage newRequest = requests.push();
        newRequest.description = description;
        newRequest.value = value;
        newRequest.recipient = recipient;
        newRequest.complete = false;
        newRequest.approvalCount = 0;

        emit RequestCreated(requestIndex, description, value, recipient);
    }

    function approveRequest(uint256 index) public {
        Request storage request = requests[index];

        require(approvers[msg.sender], "Only contributors can approve");
        require(!request.approvals[msg.sender], "Request already approved");

        request.approvals[msg.sender] = true;
        request.approvalCount++;

        emit RequestApproved(index, msg.sender);
    }

    function finalizeRequest(uint256 index) public restricted {
        Request storage request = requests[index];

        require(
            request.approvalCount > (approversCount / 2),
            "Not enough approvals"
        );
        require(!request.complete, "Request already finalized");
        require(address(this).balance >= request.value, "Insufficient balance");

        request.complete = true;
        request.recipient.transfer(request.value);

        emit RequestFinalized(index, request.recipient);
    }

    function getSummary()
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            address,
            string memory,
            string memory,
            string memory,
            uint256
        )
    {
        return (
            minimunContribution,
            address(this).balance,
            requests.length,
            approversCount,
            manager,
            CampaignName,
            CampaignDescription,
            imageUrl,
            targetToAchieve
        );
    }

    function getRequestsCount() public view returns (uint256) {
        return requests.length;
    }
}
