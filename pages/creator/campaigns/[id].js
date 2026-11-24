import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useWallet } from "use-wallet";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import web3 from "../../../smart-contract/web3";
import factory from "../../../smart-contract/factory";
import chainConfig, { isBlockchainConfigured } from "../../../lib/blockchainConfig";
import { connectInjectedWallet } from "../../../lib/wallet";
import { authFetch } from "../../../lib/authContext";
import RequireAuth from "../../../components/RequireAuth";

const statusColor = {
  draft: "gray",
  pending_review: "blue",
  needs_info: "yellow",
  approved: "green",
  rejected: "red",
  published: "teal",
};

function formatWei(wei) {
  try {
    return (Number(wei || "0") / 1e18).toFixed(4);
  } catch {
    return "0";
  }
}

function CreatorCampaignDetailContent() {
  const router = useRouter();
  const id = router.query.id;
  const toast = useToast();
  const wallet = useWallet();
  const [campaign, setCampaign] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [donations, setDonations] = useState([]);
  const [reviewEvents, setReviewEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [edit, setEdit] = useState({
    name: "",
    description: "",
    imageUrl: "",
    target: "",
    minimumContribution: "",
    category: "general",
    beneficiaryType: "general",
    beneficiaryCount: "1",
    location: "",
    urgencyLevel: "normal",
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    const response = await authFetch(`/api/creator/campaigns/${id}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not load campaign.");
      setLoading(false);
      return;
    }
    setCampaign(data.campaign);
    setDocuments(data.documents || []);
    setDonations(data.donations || []);
    setReviewEvents(data.reviewEvents || []);
    setEdit({
      name: data.campaign.name || "",
      description: data.campaign.description || "",
      imageUrl: data.campaign.imageUrl || "",
      target: (Number(data.campaign.targetWei || "0") / 1e18).toString(),
      minimumContribution: (Number(data.campaign.minimumContributionWei || "0") / 1e18).toString(),
      category: data.campaign.category || "general",
      beneficiaryType: data.campaign.beneficiaryType || "general",
      beneficiaryCount: String(data.campaign.beneficiaryCount || 1),
      location: data.campaign.location || "",
      urgencyLevel: data.campaign.urgencyLevel || "normal",
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const editable = campaign && ["draft", "needs_info", "rejected"].includes(campaign.status);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const response = await authFetch(`/api/creator/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        description: edit.description,
        imageUrl: edit.imageUrl,
        targetWei: String(Number(edit.target || "0") * 1e18),
        minimumContributionWei: String(Number(edit.minimumContribution || "0") * 1e18),
        category: edit.category,
        beneficiaryType: edit.beneficiaryType,
        beneficiaryCount: Number(edit.beneficiaryCount) || 1,
        location: edit.location,
        urgencyLevel: edit.urgencyLevel,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not save campaign.");
      return;
    }
    setCampaign(data.campaign);
    toast({ title: "Draft saved", status: "success", duration: 3000, isClosable: true });
  };

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    for (const file of files) {
      const formData = new FormData();
      formData.append("document", file);
      const response = await authFetch(`/api/creator/campaigns/${id}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Upload failed.");
        break;
      }
      setDocuments((current) => [data.document, ...current]);
    }
    setUploading(false);
    event.target.value = "";
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    setError("");
    const response = await authFetch(`/api/creator/campaigns/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(data.error || "Could not submit campaign.");
      return;
    }
    setCampaign(data.campaign);
    toast({ title: "Submitted for review", status: "success", duration: 4000, isClosable: true });
  };

  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    setError("");
    try {
      await connectInjectedWallet(wallet);
    } catch (walletError) {
      setError(walletError.message);
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleEstimateGas = async () => {
    setError("");
    if (!wallet.account) {
      setError("Connect your wallet first.");
      return;
    }
    if (!isBlockchainConfigured || !factory) {
      setError("Blockchain settings are not complete.");
      return;
    }
    if (Number(wallet.chainId) !== chainConfig.chainId) {
      setError(`Switch your wallet to ${chainConfig.chainName} before estimating gas.`);
      return;
    }
    try {
      const gas = await factory.methods
        .createCampaign(
          campaign.minimumContributionWei,
          campaign.name,
          campaign.description,
          campaign.imageUrl || "",
          campaign.targetWei
        )
        .estimateGas({ from: wallet.account });
      const gasPrice = await web3.eth.getGasPrice();
      const fee = BigInt(gas) * BigInt(gasPrice);
      const balance = await web3.eth.getBalance(wallet.account);
      setEstimate({ gas, gasPrice, fee: fee.toString(), balance: balance.toString() });
    } catch (estimateError) {
      setError(estimateError.message || "Gas estimation failed.");
    }
  };

  const handlePublish = async () => {
    if (!campaign || campaign.status !== "approved") return;
    if (!wallet.account) {
      setError("Connect your wallet first.");
      return;
    }
    if (!estimate) {
      setError("Estimate the network fee before publishing.");
      return;
    }
    if (BigInt(estimate.balance) < BigInt(estimate.fee)) {
      setError("Your wallet does not have enough Sepolia ETH to pay the network fee.");
      return;
    }

    setPublishing(true);
    setError("");
    try {
      const receipt = await factory.methods
        .createCampaign(
          campaign.minimumContributionWei,
          campaign.name,
          campaign.description,
          campaign.imageUrl || "",
          campaign.targetWei
        )
        .send({
          from: wallet.account,
          gas: estimate.gas,
          gasPrice: estimate.gasPrice,
        });

      const contractAddress = receipt.events?.CampaignCreated?.returnValues?.campaign;
      if (!contractAddress) {
        throw new Error("Campaign was created, but the contract address could not be read from the transaction.");
      }

      const response = await authFetch(`/api/creator/campaigns/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          transactionHash: receipt.transactionHash,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record publication.");

      setCampaign(data.campaign);
      toast({
        title: "Campaign published on Sepolia",
        description: `Transaction: ${receipt.transactionHash}`,
        status: "success",
        duration: 6000,
        isClosable: true,
      });
    } catch (publishError) {
      setError(publishError.message || "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Container maxW="4xl" py={12} mt={{ base: "80px", md: "80px" }}>
        <Alert status="error"><AlertIcon /><AlertDescription>{error || "Campaign not found."}</AlertDescription></Alert>
      </Container>
    );
  }

  const wrongNetwork = wallet.status === "connected" && Number(wallet.chainId) !== chainConfig.chainId;

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      <Head><title>{campaign.name} | Creator</title></Head>
      <Container maxW="7xl" py={{ base: 8, md: 12 }} mt={{ base: "80px", md: "80px" }}>
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" wrap="wrap">
            <Heading as="h1" size="xl">{campaign.name}</Heading>
            <Badge colorScheme={statusColor[campaign.status] || "gray"} fontSize="md">{campaign.status}</Badge>
          </HStack>

          {error ? (
            <Alert status="error"><AlertIcon /><AlertDescription>{error}</AlertDescription></Alert>
          ) : null}
          {campaign.reviewNotes ? (
            <Alert status={campaign.status === "rejected" ? "error" : "info"}>
              <AlertIcon />
              <AlertDescription>{campaign.reviewNotes}</AlertDescription>
            </Alert>
          ) : null}
          {campaign.rejectionReason ? (
            <Alert status="error"><AlertIcon /><AlertDescription>{campaign.rejectionReason}</AlertDescription></Alert>
          ) : null}

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
              <Heading size="md" mb={4}>Campaign details</Heading>
              {editable ? (
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>Name</FormLabel>
                    <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Image URL</FormLabel>
                    <Input value={edit.imageUrl} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} />
                  </FormControl>
                  <HStack>
                    <FormControl>
                      <FormLabel>Minimum contribution (ETH)</FormLabel>
                      <Input type="number" step="any" value={edit.minimumContribution} onChange={(e) => setEdit({ ...edit, minimumContribution: e.target.value })} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Target (ETH)</FormLabel>
                      <Input type="number" step="any" value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} />
                    </FormControl>
                  </HStack>
                  <HStack>
                    <FormControl>
                      <FormLabel>Category</FormLabel>
                      <Input value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Urgency</FormLabel>
                      <Input value={edit.urgencyLevel} onChange={(e) => setEdit({ ...edit, urgencyLevel: e.target.value })} />
                    </FormControl>
                  </HStack>
                  <Button colorScheme="teal" onClick={handleSave} isLoading={saving}>Save draft</Button>
                </Stack>
              ) : (
                <Stack spacing={3}>
                  <Text><strong>Description:</strong> {campaign.description}</Text>
                  <Text><strong>Target:</strong> {formatWei(campaign.targetWei)} ETH</Text>
                  <Text><strong>Minimum contribution:</strong> {formatWei(campaign.minimumContributionWei)} ETH</Text>
                  <Text><strong>Category:</strong> {campaign.category}</Text>
                  <Text><strong>Urgency:</strong> {campaign.urgencyLevel}</Text>
                  {campaign.imageUrl ? <Image src={campaign.imageUrl} alt={campaign.name} rounded="md" maxH="220px" objectFit="cover" /> : null}
                </Stack>
              )}
            </Box>

            <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
              <Heading size="md" mb={4}>Verification documents</Heading>
              <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")} mb={4}>
                Upload at least 2 documents, such as identity proof, photos, videos, or supporting PDFs, so an admin can verify the campaign remotely.
              </Text>
              {editable ? (
                <FormControl mb={4}>
                  <FormLabel>Upload documents</FormLabel>
                  <Input type="file" multiple accept="image/*,video/*,application/pdf" onChange={handleUpload} isDisabled={uploading} />
                  {uploading ? <Text mt={2}>Uploading...</Text> : null}
                </FormControl>
              ) : null}
              <VStack spacing={3} align="stretch">
                {documents.length === 0 ? (
                  <Text color={useColorModeValue("gray.600", "gray.300")}>No documents uploaded yet.</Text>
                ) : (
                  documents.map((document) => (
                    <Box key={document.id} borderWidth="1px" rounded="md" p={3}>
                      <Text fontWeight="semibold">{document.document_name}</Text>
                      <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
                        {document.document_type} · {document.mime_type} · {Math.round((document.file_size || 0) / 1024)} KB
                      </Text>
                      {document.signedUrl && document.document_type === "image" ? (
                        <Image src={document.signedUrl} alt={document.document_name} mt={2} rounded="md" maxH="180px" objectFit="cover" />
                      ) : null}
                      {document.signedUrl && document.document_type === "video" ? (
                        <Box as="video" src={document.signedUrl} controls mt={2} maxH="220px" w="full" />
                      ) : null}
                      {document.signedUrl && document.document_type === "document" ? (
                        <Button as="a" href={document.signedUrl} target="_blank" size="sm" mt={2} variant="outline">Open PDF</Button>
                      ) : null}
                    </Box>
                  ))
                )}
              </VStack>
            </Box>
          </SimpleGrid>

          <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
            <Heading size="md" mb={4}>Review and publication</Heading>
            <Stack spacing={4}>
              <Text>Status: <Badge colorScheme={statusColor[campaign.status] || "gray"}>{campaign.status}</Badge></Text>
              {campaign.status === "draft" || campaign.status === "needs_info" || campaign.status === "rejected" ? (
                <Button colorScheme="blue" onClick={handleSubmitForReview} isLoading={submitting} isDisabled={documents.length < 2}>
                  Submit for admin review
                </Button>
              ) : null}
              {campaign.status === "approved" ? (
                <VStack align="stretch" spacing={4}>
                  <Alert status="success">
                    <AlertIcon />
                    <AlertDescription>Your campaign is approved. Connect a Sepolia wallet and publish it on-chain. Only this step uses Sepolia gas.</AlertDescription>
                  </Alert>
                  {wallet.status !== "connected" ? (
                    <Button colorScheme="teal" onClick={handleConnectWallet} isLoading={connectingWallet}>Connect Sepolia wallet</Button>
                  ) : (
                    <Stack spacing={3}>
                      <Text>Connected wallet: {wallet.account}</Text>
                      {wrongNetwork ? (
                        <Alert status="warning"><AlertIcon /><AlertDescription>Switch your wallet to {chainConfig.chainName}.</AlertDescription></Alert>
                      ) : null}
                      <Button variant="outline" onClick={handleEstimateGas} isDisabled={wrongNetwork || publishing}>Estimate network fee</Button>
                      {estimate ? (
                        <Stat>
                          <StatLabel>Estimated network fee</StatLabel>
                          <StatNumber>{formatWei(estimate.fee)} ETH</StatNumber>
                          <Text fontSize="sm">Wallet balance: {formatWei(estimate.balance)} ETH</Text>
                          {BigInt(estimate.balance) < BigInt(estimate.fee) ? (
                            <Text color="red.500" fontSize="sm">Insufficient Sepolia ETH. Drafts and review are free; only publication requires gas.</Text>
                          ) : null}
                        </Stat>
                      ) : null}
                      <Button
                        colorScheme="teal"
                        onClick={handlePublish}
                        isLoading={publishing}
                        isDisabled={wrongNetwork || !estimate || BigInt(estimate.balance) < BigInt(estimate.fee)}
                      >
                        Publish on Sepolia
                      </Button>
                    </Stack>
                  )}
                </VStack>
              ) : null}
              {campaign.status === "published" && campaign.contractAddress ? (
                <Button as={NextLink} href={`/campaign/${campaign.contractAddress}`} colorScheme="teal" variant="outline">View public campaign</Button>
              ) : null}
            </Stack>
          </Box>

          <Box bg={useColorModeValue("white", "gray.800")} p={6} rounded="lg" boxShadow="md">
            <Heading size="md" mb={4}>Donations</Heading>
            {donations.length === 0 ? (
              <Text color={useColorModeValue("gray.600", "gray.300")}>No donations recorded yet.</Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {donations.map((donation) => (
                  <HStack key={donation.id} justify="space-between">
                    <Text>{donation.donorName || donation.donorAddress}</Text>
                    <Text>{formatWei(donation.amountWei)} ETH</Text>
                  </HStack>
                ))}
              </VStack>
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

export default function CreatorCampaignDetail() {
  return (
    <RequireAuth role="creator">
      <CreatorCampaignDetailContent />
    </RequireAuth>
  );
}
