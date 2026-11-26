import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Box, Button, Container, Heading, HStack, SimpleGrid, Stat, StatLabel, StatNumber, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue, Badge, VStack } from "@chakra-ui/react";
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

function CreatorDashboardContent() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const muted = useColorModeValue("gray.600", "gray.300");

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await authFetch("/api/creator/campaigns");
      const data = await response.json();
      if (!active) return;
      if (!response.ok) {
        setError(data.error || "Could not load campaigns.");
        setLoading(false);
        return;
      }
      setCampaigns(data.campaigns || []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const stats = {
    total: campaigns.length,
    drafts: campaigns.filter((c) => c.status === "draft").length,
    inReview: campaigns.filter((c) => c.status === "pending_review").length,
    approved: campaigns.filter((c) => c.status === "approved").length,
    published: campaigns.filter((c) => c.status === "published").length,
    totalRaised: campaigns.reduce((sum, c) => sum + Number(c.donationTotalWei || "0"), 0),
    totalDonors: campaigns.reduce((sum, c) => sum + (c.donorCount || 0), 0),
  };

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      <Head><title>Creator Dashboard | BetterFund</title></Head>
      <Container maxW="7xl" py={{ base: 8, md: 12 }} mt={{ base: "80px", md: "80px" }}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" wrap="wrap">
            <Heading as="h1" size="xl">Creator Dashboard</Heading>
            <NextLink href="/campaign/new" passHref>
              <Button as="a" colorScheme="teal">Create campaign draft</Button>
            </NextLink>
          </HStack>
          {error ? <Text color="red.500">{error}</Text> : null}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat bg={useColorModeValue("white", "gray.800")} p={4} rounded="lg" boxShadow="sm"><StatLabel>Total campaigns</StatLabel><StatNumber>{stats.total}</StatNumber></Stat>
            <Stat bg={useColorModeValue("white", "gray.800")} p={4} rounded="lg" boxShadow="sm"><StatLabel>Drafts</StatLabel><StatNumber>{stats.drafts}</StatNumber></Stat>
            <Stat bg={useColorModeValue("white", "gray.800")} p={4} rounded="lg" boxShadow="sm"><StatLabel>In review</StatLabel><StatNumber>{stats.inReview}</StatNumber></Stat>
            <Stat bg={useColorModeValue("white", "gray.800")} p={4} rounded="lg" boxShadow="sm"><StatLabel>Published</StatLabel><StatNumber>{stats.published}</StatNumber></Stat>
            <Stat bg={useColorModeValue("white", "gray.800")} p={4} rounded="lg" boxShadow="sm"><StatLabel>Approved</StatLabel><StatNumber>{stats.approved}</StatNumber></Stat>
            <Stat bg={useColorModeValue("white", "gray.800")} p={4} rounded="lg" boxShadow="sm"><StatLabel>Recorded donors</StatLabel><StatNumber>{stats.totalDonors}</StatNumber></Stat>
            <Stat bg={useColorModeValue("white", "gray.800")} p={4} rounded="lg" boxShadow="sm"><StatLabel>Raised (ETH)</StatLabel><StatNumber>{formatWei(stats.totalRaised)}</StatNumber></Stat>
          </SimpleGrid>

          <Box bg={useColorModeValue("white", "gray.800")} rounded="lg" boxShadow="md" overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Campaign</Th>
                  <Th>Status</Th>
                  <Th>Docs</Th>
                  <Th>Raised</Th>
                  <Th>Donors</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr><Td colSpan={6}>Loading...</Td></Tr>
                ) : campaigns.length === 0 ? (
                  <Tr><Td colSpan={6}>No campaigns yet. Create your first draft.</Td></Tr>
                ) : (
                  campaigns.map((campaign) => (
                    <Tr key={campaign.id}>
                      <Td>
                        <Text fontWeight="semibold">{campaign.name}</Text>
                        <Text fontSize="sm" color={muted}>{campaign.category}</Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={statusColor[campaign.status] || "gray"}>{campaign.status}</Badge>
                        {campaign.reviewNotes ? <Text fontSize="xs" mt={1}>{campaign.reviewNotes}</Text> : null}
                        {campaign.rejectionReason ? <Text fontSize="xs" color="red.500" mt={1}>{campaign.rejectionReason}</Text> : null}
                      </Td>
                      <Td>{campaign.documentCount}</Td>
                      <Td>{formatWei(campaign.donationTotalWei)} ETH</Td>
                      <Td>{campaign.donorCount}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <NextLink href={`/creator/campaigns/${campaign.id}`} passHref>
                            <Button as="a" size="sm" variant="outline">Manage</Button>
                          </NextLink>
                          {campaign.status === "published" && campaign.contractAddress ? (
                            <NextLink href={`/campaign/${campaign.contractAddress}`} passHref>
                              <Button as="a" size="sm" colorScheme="teal" variant="ghost">View</Button>
                            </NextLink>
                          ) : null}
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default function CreatorDashboard() {
  return (
    <RequireAuth role="creator">
      <CreatorDashboardContent />
    </RequireAuth>
  );
}
