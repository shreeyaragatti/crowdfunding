import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import NextLink from "next/link";
import { useWallet } from "use-wallet";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Link,
  Spacer,
  Spinner,
  Stack,
  Table,
  TableCaption,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  ArrowBackIcon,
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
} from "@chakra-ui/icons";
import web3 from "../../../../smart-contract/web3";
import Campaign from "../../../../smart-contract/campaign";
import { getAddressExplorerUrl } from "../../../../lib/blockchainConfig";
import { getETHPrice, getWEIPriceInUSD } from "../../../../lib/getETHPrice";
import {
  getCampaignWithdrawalData,
  getRequestStatus,
} from "../../../../lib/withdrawalRequests";
import { getPublishedCampaignByAddress } from "../../../../lib/publishedCampaigns";
import supabaseAdmin from "../../../../lib/supabaseAdmin";
import { connectInjectedWallet } from "../../../../lib/wallet";

export async function getServerSideProps({ params }) {
  const campaignId = params.id;
  const publishedCampaign = await getPublishedCampaignByAddress(
    campaignId
  ).catch(() => null);

  if (supabaseAdmin && !publishedCampaign) {
    return { notFound: true };
  }

  const ETHPrice = await getETHPrice().catch(() => 0);

  return {
    props: {
      campaignId,
      ETHPrice,
    },
  };
}

const statusColor = {
  completed: "green",
  approved: "teal",
  pending: "yellow",
  rejected: "red",
};

const statusLabel = {
  completed: "Completed",
  approved: "Approved by admin",
  pending: "Pending admin approval",
  rejected: "Rejected by admin",
};

export default function Requests({ campaignId, ETHPrice }) {
  const wallet = useWallet();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [connecting, setConnecting] = useState(false);
  const muted = useColorModeValue("gray.500", "gray.200");
  const headingColor = useColorModeValue("gray.800", "white");
  const noRequestsMuted = useColorModeValue("gray.600", "gray.300");
  const panelBg = useColorModeValue("white", "gray.800");
  const successColor = useColorModeValue("green.600", "green.300");
  const warningColor = useColorModeValue("red.600", "red.300");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getCampaignWithdrawalData(campaignId);
      setData(result);
    } catch (loadError) {
      setError(
        loadError.message ||
          "Withdrawal requests could not be loaded from the configured Ethereum network."
      );
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaignId) load();
  }, [campaignId, load]);

  const isConnected = wallet.status === "connected" && Boolean(wallet.account);
  const isManager =
    isConnected &&
    data?.manager &&
    wallet.account.toLowerCase() === data.manager.toLowerCase();
  const isPlatformAdmin =
    isConnected &&
    data?.platformAdmin &&
    wallet.account.toLowerCase() === data.platformAdmin.toLowerCase();

  const handleConnect = async () => {
    setConnecting(true);
    setActionError("");
    try {
      await connectInjectedWallet(wallet);
    } catch (connectError) {
      setActionError(connectError.message);
    } finally {
      setConnecting(false);
    }
  };

  const sendTransaction = async (index, action) => {
    if (!isConnected) {
      setActionError("Connect your wallet first.");
      return;
    }

    setActionLoading(`${index}:${action}`);
    setActionError("");
    try {
      const campaign = Campaign(campaignId);
      let method;

      if (action === "approve") {
        method = campaign.methods.approveRequestAsAdmin(index);
      } else if (action === "reject") {
        method = campaign.methods.rejectRequestAsAdmin(index);
      } else if (action === "finalize") {
        method = campaign.methods.finalizeRequest(index);
      } else if (action === "legacyApprove") {
        method = campaign.methods.approveRequest(index);
      } else {
        throw new Error("Unsupported withdrawal action.");
      }

      await method.send({ from: wallet.account });
      await load();
    } catch (transactionError) {
      setActionError(transactionError.message || "Transaction failed.");
    } finally {
      setActionLoading("");
    }
  };

  const renderActions = (request) => {
    if (request.complete) {
      return (
        <HStack color={successColor} spacing={1}>
          <CheckCircleIcon />
          <Text fontSize="sm">Funds released</Text>
        </HStack>
      );
    }

    if (data?.legacy) {
      const readyToFinalize =
        request.approvalCount > (data.approversCount || 0) / 2;

      return (
        <HStack spacing={2}>
          <Button
            size="sm"
            colorScheme="yellow"
            variant="outline"
            onClick={() => sendTransaction(request.index, "legacyApprove")}
            isLoading={actionLoading === `${request.index}:legacyApprove`}
            isDisabled={
              !isConnected || request.approvalCount >= data.approversCount
            }
          >
            Approve
          </Button>
          <Button
            size="sm"
            colorScheme="green"
            variant="outline"
            onClick={() => sendTransaction(request.index, "finalize")}
            isLoading={actionLoading === `${request.index}:finalize`}
            isDisabled={!isManager || !readyToFinalize}
          >
            Finalize
          </Button>
        </HStack>
      );
    }

    if (request.adminRejected) {
      return (
        <HStack color={warningColor} spacing={1}>
          <WarningIcon />
          <Text fontSize="sm">Rejected by admin</Text>
        </HStack>
      );
    }

    if (isPlatformAdmin) {
      return (
        <HStack spacing={2}>
          <Button
            size="sm"
            colorScheme="green"
            onClick={() => sendTransaction(request.index, "approve")}
            isLoading={actionLoading === `${request.index}:approve`}
            isDisabled={request.adminApproved}
          >
            Approve
          </Button>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => sendTransaction(request.index, "reject")}
            isLoading={actionLoading === `${request.index}:reject`}
            isDisabled={request.adminApproved}
          >
            Reject
          </Button>
        </HStack>
      );
    }

    if (isManager && request.adminApproved) {
      return (
        <Button
          size="sm"
          colorScheme="green"
          onClick={() => sendTransaction(request.index, "finalize")}
          isLoading={actionLoading === `${request.index}:finalize`}
        >
          Withdraw funds
        </Button>
      );
    }

    return (
      <Text fontSize="sm" color={muted}>
        {request.adminApproved
          ? "Approved. The campaign creator can withdraw."
          : "Waiting for platform admin approval."}
      </Text>
    );
  };

  return (
    <Box minH="100vh">
      <Head>
        <title>Campaign Withdrawal Requests</title>
        <meta name="description" content="Create and approve withdrawal requests" />
        <link rel="icon" href="/logo.svg" />
      </Head>

      <main>
        <Container px={{ base: "4", md: "12" }} maxW="7xl" py={8}>
          <Flex flexDirection={{ base: "column", md: "row" }} align="center">
            <Text fontSize="lg" color="teal.400">
              <ArrowBackIcon mr={2} />
              <NextLink href={`/campaign/${campaignId}`}>
                Back to Campaign
              </NextLink>
            </Text>
            <Spacer />
            <Box textAlign={{ base: "left", md: "right" }}>
              <Text as="span" color={muted}>
                Campaign balance:{" "}
              </Text>
              <Text as="span" fontWeight="bold" fontSize="lg">
                {data
                  ? `${web3.utils.fromWei(data.balance || "0", "ether")} ETH`
                  : "-"}
              </Text>
              {data ? (
                <Text fontSize="sm" color={muted}>
                  ~${getWEIPriceInUSD(ETHPrice, data.balance || "0")}
                </Text>
              ) : null}
            </Box>
          </Flex>

          {!isConnected ? (
            <Alert status="info" my={4} rounded="md">
              <AlertIcon />
              <AlertDescription flex="1">
                Connect the wallet that will approve or withdraw funds.
              </AlertDescription>
              <Button
                size="sm"
                colorScheme="teal"
                onClick={handleConnect}
                isLoading={connecting}
              >
                Connect wallet
              </Button>
            </Alert>
          ) : null}

          {isConnected && data?.platformAdmin && !isPlatformAdmin && !isManager ? (
            <Alert status="warning" my={4} rounded="md">
              <AlertIcon />
              <AlertDescription>
                This wallet cannot act on these requests. The platform admin
                wallet is {data.platformAdmin}.
              </AlertDescription>
            </Alert>
          ) : null}

          {isConnected && isPlatformAdmin ? (
            <Alert status="success" my={4} rounded="md">
              <AlertIcon />
              <AlertDescription>
                You are connected as the platform admin. Approve or reject
                withdrawal requests below.
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert status="warning" my={4} rounded="md">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {actionError ? (
            <Alert status="error" my={4} rounded="md">
              <AlertIcon />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <Flex justify="center" py={16}>
              <Spinner size="xl" />
            </Flex>
          ) : data ? (
            <>
              <Flex
                flexDirection={{ base: "column", lg: "row" }}
                py={4}
                gap={3}
                align={{ base: "stretch", lg: "center" }}
              >
                <Heading
                  fontFamily="heading"
                  color={headingColor}
                  as="h1"
                  size="lg"
                >
                  Withdrawal Requests for {data.name}
                </Heading>
                <Spacer />
                {isManager ? (
                  <NextLink href={`/campaign/${campaignId}/requests/new`} passHref>
                    <Button as="a" colorScheme="teal">Add Withdrawal Request</Button>
                  </NextLink>
                ) : null}
              </Flex>

              {data.legacy ? (
                <Alert status="info" my={4} rounded="md">
                  <AlertIcon />
                  <AlertDescription>
                    This campaign uses the original supporter-approval flow.
                    New campaigns use platform-admin approval.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert status="info" my={4} rounded="md">
                  <AlertIcon />
                  <AlertDescription>
                    Workflow: the campaign creator submits a request, the
                    platform admin approves it, then the creator withdraws the
                    funds.
                  </AlertDescription>
                </Alert>
              )}

              {data.requests.length === 0 ? (
                <Box
                  bg={panelBg}
                  borderWidth="1px"
                  rounded="lg"
                  p={10}
                  textAlign="center"
                >
                  <Stack align="center" spacing={4}>
                    <InfoIcon boxSize={8} color="teal.400" />
                    <Heading as="h2" size="md" color={headingColor}>
                      No withdrawal requests yet
                    </Heading>
                    <Text color={noRequestsMuted} maxW="xl">
                      {isManager
                        ? "Create a withdrawal request for the amount you need. The platform admin must approve it before you can withdraw."
                        : "Only the campaign creator can create withdrawal requests."}
                    </Text>
                    {isManager ? (
                      <NextLink href={`/campaign/${campaignId}/requests/new`} passHref>
                        <Button as="a" colorScheme="teal">Create Withdrawal Request</Button>
                      </NextLink>
                    ) : null}
                  </Stack>
                </Box>
              ) : (
                <Box overflowX="auto" bg={panelBg} rounded="lg" p={2}>
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>ID</Th>
                        <Th w="28%">Description</Th>
                        <Th isNumeric>Amount</Th>
                        <Th>Recipient</Th>
                        <Th>Supporter approvals</Th>
                        <Th>Admin status</Th>
                        <Th>Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.requests.map((request) => {
                        const status = getRequestStatus(request);
                        return (
                          <Tr key={request.index}>
                            <Td>{request.index}</Td>
                            <Td>{request.description}</Td>
                            <Td isNumeric>
                              {web3.utils.fromWei(request.value, "ether")} ETH
                              <Text fontSize="xs" color={muted}>
                                ${getWEIPriceInUSD(ETHPrice, request.value)}
                              </Text>
                            </Td>
                            <Td>
                              <Tooltip label={request.recipient}>
                                <Link
                                  color="teal.500"
                                  href={getAddressExplorerUrl(request.recipient)}
                                  isExternal
                                >
                                  {request.recipient
                                    ? `${request.recipient.substr(0, 10)}...`
                                    : "-"}
                                </Link>
                              </Tooltip>
                            </Td>
                            <Td>
                              {request.approvalCount}
                              {data.legacy
                                ? `/${data.approversCount}`
                                : ""}
                            </Td>
                            <Td>
                              <Badge colorScheme={statusColor[status]}>
                                {statusLabel[status]}
                              </Badge>
                            </Td>
                            <Td>{renderActions(request)}</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                    <TableCaption textAlign="left" ml="-2">
                      Found {data.requests.length} request
                      {data.requests.length === 1 ? "" : "s"}
                    </TableCaption>
                  </Table>
                </Box>
              )}
            </>
          ) : null}
        </Container>
      </main>
    </Box>
  );
}
