import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { authFetch } from "../../../lib/authContext";
import RequireAuth from "../../../components/RequireAuth";

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

function AdminCampaignDetailContent() {
  const router = useRouter();
  const id = router.query.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const response = await authFetch(`/api/admin/campaigns/${id}`);
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Could not load campaign.");
      setLoading(false);
      return;
    }
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const review = async (action) => {
    setActionLoading(action);
    setError("");
    const response = await authFetch(`/api/admin/campaigns/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes }),
    });
    const result = await response.json();
    setActionLoading("");
    if (!response.ok) {
      setError(result.error || "Review action failed.");
      return;
    }
    await load();
    setNotes("");
  };

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!data) {
    return (
      <Container maxW="4xl" py={12} mt={{ base: "80px", md: "80px" }}>
        <Alert status="error"><AlertIcon /><AlertDescription>{error || "Campaign not found."}</AlertDescription></Alert>
      </Container>
    );
  }

  const { campaign, creator, documents, donations, reviewEvents } = data;

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      <Head><title>{campaign.name} | Admin Review</title></Head>
      <Container maxW="7xl" py={{ base: 8, md: 12 }} mt={{ base: "80px", md: "80px" }}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" wrap="wrap">
            <Heading as="h1" size="xl">{campaign.name}</Heading>
            <Badge colorScheme={statusColor[campaign.status] || "gray"} fontSize="md">{campaign.status}</Badge>
          </HStack>

          {error ? (
            <Alert status="error"><AlertIcon /><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
              <Heading size="md" mb={4}>Creator</Heading>
              <Stack spacing={2}>
                <Text><strong>Name:</strong> {creator?.full_name || campaign.creatorName}</Text>
                <Text><strong>Email:</strong> {creator?.email || campaign.creatorEmail}</Text>
                <Text><strong>Wallet:</strong> {creator?.wallet_address || campaign.creatorAddress || "-"}</Text>
                <Text><strong>Joined:</strong> {creator?.created_at ? new Date(creator.created_at).toLocaleString() : "-"}</Text>
              </Stack>
            </Box>

            <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
              <Heading size="md" mb={4}>Campaign details</Heading>
              <Stack spacing={2}>
                <Text><strong>Description:</strong> {campaign.description}</Text>
                <Text><strong>Target:</strong> {formatWei(campaign.targetWei)} ETH</Text>
                <Text><strong>Minimum contribution:</strong> {formatWei(campaign.minimumContributionWei)} ETH</Text>
                <Text><strong>Category:</strong> {campaign.category}</Text>
                <Text><strong>Beneficiary:</strong> {campaign.beneficiaryType} ({campaign.beneficiaryCount})</Text>
                <Text><strong>Location:</strong> {campaign.location || "-"}</Text>
                <Text><strong>Urgency:</strong> {campaign.urgencyLevel}</Text>
                {campaign.imageUrl ? <Image src={campaign.imageUrl} alt={campaign.name} rounded="md" maxH="220px" objectFit="cover" /> : null}
                {campaign.contractAddress ? <Text><strong>Contract:</strong> {campaign.contractAddress}</Text> : null}
                {campaign.transactionHash ? <Text><strong>Transaction:</strong> {campaign.transactionHash}</Text> : null}
              </Stack>
            </Box>
          </SimpleGrid>

          <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
            <Heading size="md" mb={4}>Supporting documents ({documents.length})</Heading>
            {documents.length === 0 ? (
              <Text color={useColorModeValue("gray.600", "gray.300")}>No supporting documents uploaded.</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {documents.map((document) => (
                  <Box key={document.id} borderWidth="1px" rounded="md" p={4}>
                    <Text fontWeight="semibold">{document.document_name}</Text>
                    <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                      {document.document_type} · {document.mime_type} · {Math.round((document.file_size || 0) / 1024)} KB
                    </Text>
                    {document.signedUrl && document.document_type === "image" ? (
                      <Image src={document.signedUrl} alt={document.document_name} mt={3} rounded="md" maxH="260px" objectFit="cover" />
                    ) : null}
                    {document.signedUrl && document.document_type === "video" ? (
                      <Box as="video" src={document.signedUrl} controls mt={3} maxH="260px" w="full" />
                    ) : null}
                    {document.signedUrl && document.document_type === "document" ? (
                      <Button as="a" href={document.signedUrl} target="_blank" size="sm" mt={3} variant="outline">Open document</Button>
                    ) : null}
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </Box>

          <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
            <Heading size="md" mb={4}>Admin review</Heading>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Review notes / rejection reason</FormLabel>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain what is missing, why it is approved, or why it is rejected." />
              </FormControl>
              <HStack wrap="wrap">
                <Button colorScheme="green" onClick={() => review("approve")} isLoading={actionLoading === "approve"} isDisabled={actionLoading !== ""}>Approve</Button>
                <Button colorScheme="yellow" onClick={() => review("request_info")} isLoading={actionLoading === "request_info"} isDisabled={actionLoading !== ""}>Request more info</Button>
                <Button colorScheme="red" onClick={() => review("reject")} isLoading={actionLoading === "reject"} isDisabled={actionLoading !== ""}>Reject</Button>
              </HStack>
              {campaign.reviewNotes ? <Text><strong>Current notes:</strong> {campaign.reviewNotes}</Text> : null}
              {campaign.rejectionReason ? <Text color="red.500"><strong>Rejection reason:</strong> {campaign.rejectionReason}</Text> : null}
            </Stack>
          </Box>

          <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
            <Heading size="md" mb={4}>Donations ({donations.length})</Heading>
            {donations.length === 0 ? (
              <Text color={useColorModeValue("gray.600", "gray.300")}>No donations recorded.</Text>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Donor</Th>
                    <Th>Amount (ETH)</Th>
                    <Th>Source</Th>
                    <Th>Date</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {donations.map((donation) => (
                    <Tr key={donation.id}>
                      <Td>{donation.donorName || donation.donorAddress}</Td>
                      <Td>{formatWei(donation.amountWei)}</Td>
                      <Td>{donation.source}</Td>
                      <Td>{new Date(donation.created_at).toLocaleString()}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>

          <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
            <Heading size="md" mb={4}>Review history</Heading>
            {reviewEvents.length === 0 ? (
              <Text color={useColorModeValue("gray.600", "gray.300")}>No review activity yet.</Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {reviewEvents.map((event) => (
                  <Box key={event.id} borderWidth="1px" rounded="md" p={3}>
                    <HStack justify="space-between">
                      <Text fontWeight="semibold">{event.action}</Text>
                      <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>{new Date(event.created_at).toLocaleString()}</Text>
                    </HStack>
                    {event.notes ? <Text fontSize="sm" mt={1}>{event.notes}</Text> : null}
                  </Box>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default function AdminCampaignDetail() {
  return (
    <RequireAuth role="admin">
      <AdminCampaignDetailContent />
    </RequireAuth>
  );
}
