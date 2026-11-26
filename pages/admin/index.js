import { useEffect, useState } from "react";
import Head from "next/head";
import { Box, Button, Container, Heading, HStack, SimpleGrid, Spinner, Stat, StatLabel, StatNumber, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue, Badge, VStack } from "@chakra-ui/react";
import NextLink from "next/link";
import { authFetch } from "../../lib/authContext";
import RequireAuth from "../../components/RequireAuth";

function formatWei(wei) {
  try {
    return (Number(wei || "0") / 1e18).toFixed(4);
  } catch {
    return "0";
  }
}

const statusColor = {
  draft: "gray",
  pending_review: "blue",
  needs_info: "yellow",
  approved: "green",
  rejected: "red",
  published: "teal",
};

function AdminDashboardContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const panelBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.300");

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await authFetch("/api/admin/overview");
      const result = await response.json();
      if (!active) return;
      if (!response.ok) {
        setError(result.error || "Could not load admin dashboard.");
        setLoading(false);
        return;
      }
      setData(result);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  const stats = data?.stats || {};

  return (
    <Box minH="100vh" bg={pageBg}>
      <Head><title>Admin Dashboard | BetterFund</title></Head>
      <Container maxW="7xl" py={{ base: 8, md: 12 }} mt={{ base: "80px", md: "80px" }}>
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="xl">Admin Dashboard</Heading>
          {error ? <Text color="red.500">{error}</Text> : null}

          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Creators</StatLabel><StatNumber>{stats.creators || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Campaigns</StatLabel><StatNumber>{stats.campaigns || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Drafts</StatLabel><StatNumber>{stats.drafts || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Pending review</StatLabel><StatNumber>{stats.pendingReview || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Needs info</StatLabel><StatNumber>{stats.needsInfo || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Approved</StatLabel><StatNumber>{stats.approved || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Published</StatLabel><StatNumber>{stats.published || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Donations</StatLabel><StatNumber>{stats.totalDonations || 0}</StatNumber></Stat>
            <Stat bg={panelBg} p={4} rounded="lg" boxShadow="sm"><StatLabel>Raised (ETH)</StatLabel><StatNumber>{formatWei(stats.totalRaisedWei)}</StatNumber></Stat>
          </SimpleGrid>

          <Box bg={panelBg} rounded="lg" boxShadow="md" overflowX="auto">
            <Heading size="md" p={4}>Campaigns and review status</Heading>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Campaign</Th>
                  <Th>Creator</Th>
                  <Th>Status</Th>
                  <Th>Docs</Th>
                  <Th>Raised</Th>
                  <Th>Donors</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(data?.campaigns || []).map((campaign) => (
                  <Tr key={campaign.id}>
                    <Td>
                      <Text fontWeight="semibold">{campaign.name}</Text>
                      <Text fontSize="sm" color={muted}>{campaign.category}</Text>
                    </Td>
                    <Td>
                      <Text>{campaign.creatorName}</Text>
                      <Text fontSize="sm" color={muted}>{campaign.creatorEmail}</Text>
                    </Td>
                    <Td><Badge colorScheme={statusColor[campaign.status] || "gray"}>{campaign.status}</Badge></Td>
                    <Td>{campaign.documentCount}</Td>
                    <Td>{formatWei(campaign.donationTotalWei)} ETH</Td>
                    <Td>{campaign.donorCount}</Td>
                    <Td>
                      <NextLink href={`/admin/campaigns/${campaign.id}`} passHref>
                        <Button as="a" size="sm" colorScheme="teal" variant="outline">Review</Button>
                      </NextLink>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Box bg={panelBg} rounded="lg" boxShadow="md" overflowX="auto">
            <Heading size="md" p={4}>Creators</Heading>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Wallet</Th>
                  <Th>Campaigns</Th>
                  <Th>Joined</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(data?.creators || []).map((creator) => (
                  <Tr key={creator.id}>
                    <Td>{creator.fullName}</Td>
                    <Td>{creator.email}</Td>
                    <Td>{creator.walletAddress || "-"}</Td>
                    <Td>{creator.campaignCount}</Td>
                    <Td>{new Date(creator.createdAt).toLocaleDateString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Box bg={panelBg} rounded="lg" boxShadow="md" overflowX="auto">
            <Heading size="md" p={4}>Donations by campaign</Heading>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Campaign</Th>
                  <Th>Donor</Th>
                  <Th>Amount (ETH)</Th>
                  <Th>Source</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(data?.donations || []).map((donation) => (
                  <Tr key={donation.id}>
                    <Td>{donation.campaignName}</Td>
                    <Td>{donation.donorName || donation.donorAddress}</Td>
                    <Td>{formatWei(donation.amountWei)}</Td>
                    <Td>{donation.source}</Td>
                    <Td>{new Date(donation.createdAt).toLocaleString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default function AdminDashboard() {
  return (
    <RequireAuth role="admin">
      <AdminDashboardContent />
    </RequireAuth>
  );
}
