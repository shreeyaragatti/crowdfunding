// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CampaignFactory {
    address[] public deployedCampaigns;
    address public platformAdmin;

    event CampaignCreated(
        address indexed campaign,
        address indexed creator,
        string name,
        uint256 target
    );

    constructor(address admin) {
        require(admin != address(0), "Admin address is required");
        platformAdmin = admin;
    }

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
            target,
            platformAdmin
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
    address public platformAdmin;
    uint256 public minimunContribution;
    string public CampaignName;
    string public CampaignDescription;
    string public imageUrl;
    uint256 public targetToAchieve;
    address[] public contributers;
    mapping(address => bool) public approvers;
    mapping(uint256 => bool) public adminApproved;
    mapping(uint256 => bool) public adminRejected;
    uint256 public approversCount;

    event ContributionReceived(address indexed contributor, uint256 amount);
    event RequestCreated(
        uint256 indexed requestIndex,
        string description,
        uint256 value,
        address indexed recipient
    );
    event RequestApproved(uint256 indexed requestIndex, address indexed approver);
    event RequestAdminApproved(uint256 indexed requestIndex, address indexed admin);
    event RequestAdminRejected(uint256 indexed requestIndex, address indexed admin);
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
        uint256 target,
        address campaignAdmin
    ) {
        require(campaignAdmin != address(0), "Admin address is required");
        manager = creator;
        platformAdmin = campaignAdmin;
        minimunContribution = minimun;
        CampaignName = name;
        CampaignDescription = description;
        imageUrl = image;
        targetToAchieve = target;
    }

    function contribute() public payable {
        _contribute();
    }

    // Kept for backwards compatibility with older frontends.
    function contibute() public payable {
        _contribute();
    }

    function _contribute() internal {
        require(
            msg.value >= minimunContribution,
            "Contribution must meet the minimum"
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
        require(value > 0, "Request value must be positive");
        require(
            value <= address(this).balance,
            "Request exceeds campaign balance"
        );

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
        require(index < requests.length, "Request does not exist");
        Request storage request = requests[index];

        require(approvers[msg.sender], "Only contributors can approve");
        require(!request.complete, "Request already finalized");
        require(!request.approvals[msg.sender], "Request already approved");

        request.approvals[msg.sender] = true;
        request.approvalCount++;

        emit RequestApproved(index, msg.sender);
    }

    function approveRequestAsAdmin(uint256 index) public {
        require(
            msg.sender == platformAdmin,
            "Only the platform admin can approve"
        );
        require(index < requests.length, "Request does not exist");

        Request storage request = requests[index];
        require(!request.complete, "Request already finalized");
        require(!adminRejected[index], "Request was rejected");

        adminApproved[index] = true;

        emit RequestAdminApproved(index, msg.sender);
    }

    function rejectRequestAsAdmin(uint256 index) public {
        require(
            msg.sender == platformAdmin,
            "Only the platform admin can reject"
        );
        require(index < requests.length, "Request does not exist");

        Request storage request = requests[index];
        require(!request.complete, "Request already finalized");
        require(!adminApproved[index], "Request was already approved");

        adminRejected[index] = true;

        emit RequestAdminRejected(index, msg.sender);
    }

    function finalizeRequest(uint256 index) public restricted {
        require(index < requests.length, "Request does not exist");
        Request storage request = requests[index];

        require(adminApproved[index], "Admin approval required");
        require(!adminRejected[index], "Request was rejected by the admin");
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
