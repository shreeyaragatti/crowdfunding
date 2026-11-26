import Campaign from "../smart-contract/campaign";

export function normalizeRequest(index, raw) {
  return {
    index,
    description: raw?.description ?? raw?.[0] ?? "",
    value: String(raw?.value ?? raw?.[1] ?? "0"),
    recipient: raw?.recipient ?? raw?.[2] ?? "",
    complete: Boolean(raw?.complete ?? raw?.[3]),
    approvalCount: Number(raw?.approvalCount ?? raw?.[4] ?? 0),
  };
}

export async function getCampaignWithdrawalData(campaignAddress) {
  const campaign = Campaign(campaignAddress);

  const [summary, requestCountRaw] = await Promise.all([
    campaign.methods.getSummary().call(),
    campaign.methods.getRequestsCount().call(),
  ]);

  const requestCount = Number(requestCountRaw);
  const rawRequests = await Promise.all(
    Array.from({ length: requestCount }, (_, index) =>
      campaign.methods.requests(index).call()
    )
  );

  const requests = rawRequests.map((raw, index) =>
    normalizeRequest(index, raw)
  );

  let platformAdmin = null;
  try {
    platformAdmin = await campaign.methods.platformAdmin().call();
  } catch (error) {
    // Older campaigns do not expose a platform admin.
    platformAdmin = null;
  }

  if (!platformAdmin) {
    return {
      campaignAddress,
      platformAdmin: null,
      manager: summary[4],
      balance: String(summary[1]),
      approversCount: Number(summary[3]),
      name: summary[5],
      requests: requests.map((request) => ({
        ...request,
        adminApproved: false,
        adminRejected: false,
      })),
      legacy: true,
    };
  }

  const requestsWithAdminStatus = await Promise.all(
    requests.map(async (request) => {
      const [approved, rejected] = await Promise.all([
        campaign.methods
          .adminApproved(request.index)
          .call()
          .catch(() => false),
        campaign.methods
          .adminRejected(request.index)
          .call()
          .catch(() => false),
      ]);

      return {
        ...request,
        adminApproved: Boolean(approved),
        adminRejected: Boolean(rejected),
      };
    })
  );

  return {
    campaignAddress,
    platformAdmin,
    manager: summary[4],
    balance: String(summary[1]),
    approversCount: Number(summary[3]),
    name: summary[5],
    requests: requestsWithAdminStatus,
    legacy: false,
  };
}

export function getRequestStatus(request) {
  if (request.complete) return "completed";
  if (request.adminRejected) return "rejected";
  if (request.adminApproved) return "approved";
  return "pending";
}
