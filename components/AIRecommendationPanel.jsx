import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  Spinner,
  Badge,
  VStack,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import CampaignCard from "./CampaignCard";

const quickQueries = [
  "Children & education",
  "Medical support",
  "Emergency relief",
  "Elderly care",
  "Local community projects",
];

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function findMatchingCampaigns(campaigns, interest) {
  const query = normalizeText(interest);
  if (!query || campaigns.length === 0) return [];

  const terms = query
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .slice(0, 12);

  return campaigns
    .map((campaign) => {
      const haystack = normalizeText(
        [
          campaign.name,
          campaign.description,
          campaign.category,
          campaign.beneficiaryType,
          campaign.location,
          campaign.urgencyLevel,
        ]
          .filter(Boolean)
          .join(" ")
      );
      const score = terms.reduce(
        (sum, term) => sum + (haystack.includes(term) ? 1 : 0),
        0
      );
      return { campaign, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ campaign }) => campaign);
}

function extractNamedCampaigns(text, campaigns) {
  const lower = normalizeText(text);
  return campaigns.filter((campaign) => {
    const campaignName = normalizeText(campaign.name);
    return campaignName.length > 0 && lower.includes(campaignName);
  });
}

export default function AIRecommendationPanel({ initialInterest = "", simpleQuickLinksOnly = false }) {
  const [campaigns, setCampaigns] = useState([]);
  const [interest, setInterest] = useState(initialInterest);
  const [summary, setSummary] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const panelBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.300");

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const response = await fetch("/api/campaign-metadata");
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadCampaigns();
  }, []);

  if (simpleQuickLinksOnly) {
    return (
      <Box bg={panelBg} borderWidth="1px" rounded="xl" p={{ base: 5, md: 8 }} shadow="sm">
        <Stack spacing={6}>
          <Box>
            <Heading size="lg" mb={2}>
              Explore campaigns by cause
            </Heading>
            <Text color={muted} fontSize="md">
              Choose a category to browse recommended campaigns on the dedicated recommendations page.
            </Text>
          </Box>

          <HStack wrap="wrap" spacing={2}>
            {quickQueries.map((query) => (
              <NextLink key={query} href={`/recommendations?interest=${encodeURIComponent(query)}`} passHref>
                <Button as="a" size="md" colorScheme="teal" variant="outline">
                  {query}
                </Button>
              </NextLink>
            ))}
          </HStack>
        </Stack>
      </Box>
    );
  }

  useEffect(() => {
    if (!initialInterest) return;
    setInterest(initialInterest);
  }, [initialInterest]);

  useEffect(() => {
    if (!initialInterest || !campaigns.length) return;
    searchCampaigns(initialInterest);
  }, [initialInterest, campaigns.length]);

  const searchCampaigns = async (query) => {
    if (!query.trim()) return;
    setError("");
    setIsLoading(true);
    setSummary("");
    setRecommended([]);

    try {
      const prompt = `Recommend up to five BetterFund campaigns for a donor interested in "${query}". Use the campaign metadata available and suggest the campaigns that best match the donor's interests. List each campaign name and a short reason why it fits.`;
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Recommendation request failed.");
      }

      setSummary(data.reply || "I could not generate recommendations right now.");
      const named = extractNamedCampaigns(data.reply || "", campaigns);
      const matched = named.length > 0 ? named : findMatchingCampaigns(campaigns, query);
      setRecommended(matched.slice(0, 6));
    } catch (err) {
      setError(err.message || "Something went wrong while generating recommendations.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg={panelBg} borderWidth="1px" rounded="xl" p={{ base: 5, md: 8 }} shadow="sm">
      <Stack spacing={6}>
        <Box>
          <Heading size="lg" mb={2}>
            BetterFund Recommendation Assistant
          </Heading>
          <Text color={muted} fontSize="md">
            Tell the assistant what causes or communities you care about, and it will suggest the most relevant campaigns on BetterFund.
          </Text>
        </Box>

        <Stack spacing={4}>
          <Input
            value={interest}
            onChange={(event) => setInterest(event.target.value)}
            placeholder="e.g. children education, medical aid, disaster relief in India"
            size="lg"
          />
          <Button
            colorScheme="teal"
            size="lg"
            onClick={() => searchCampaigns(interest)}
            isLoading={isLoading}
            isDisabled={!interest.trim()}
          >
            Find recommended campaigns
          </Button>
          <HStack wrap="wrap" spacing={2}>
            {quickQueries.map((query) => (
              <NextLink key={query} href={`/recommendations?interest=${encodeURIComponent(query)}`} passHref>
                <Button as="a" size="sm" variant="outline">
                  {query}
                </Button>
              </NextLink>
            ))}
          </HStack>
        </Stack>

        {error ? (
          <Alert status="error" rounded="lg">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <Box py={8} textAlign="center">
            <Spinner size="lg" />
          </Box>
        ) : null}

        {summary ? (
          <Box bg={useColorModeValue("gray.50", "gray.900")} rounded="lg" p={4}>
            <Text fontWeight="semibold" mb={2}>
              Recommendation summary
            </Text>
            <Text whiteSpace="pre-wrap" color={muted} fontSize="sm">
              {summary}
            </Text>
          </Box>
        ) : null}

        <Box>
          <HStack spacing={2} mb={3} alignItems="center">
            <Heading size="md">Recommended campaigns</Heading>
            <Badge colorScheme="teal">AI-powered</Badge>
          </HStack>
          {recommended.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {recommended.map((campaign) => (
                <CampaignCard
                  key={campaign.id || campaign.contractAddress}
                  id={campaign.contractAddress || campaign.id}
                  name={campaign.name}
                  description={campaign.description}
                  creatorId={campaign.creatorAddress || campaign.creator_address}
                  imageURL={campaign.imageUrl || campaign.image_url}
                  balance={campaign.balance || campaign.targetWei || "0"}
                  target={campaign.targetWei || campaign.target_wei || "0"}
                  ethPrice={0}
                  isDevMode={!campaign.contractAddress}
                  proofCount={campaign.proofCount || 0}
                  donorCount={campaign.donorCount || 0}
                />
              ))}
            </SimpleGrid>
          ) : campaigns.length === 0 && !isLoading ? (
            <Box p={4} rounded="lg" borderWidth="1px" borderColor={useColorModeValue("gray.200", "gray.700")}
              bg={useColorModeValue("gray.50", "gray.900")}
            >
              <Text color={muted}>
                No campaigns are available right now. Please check back later or create a campaign first.
              </Text>
            </Box>
          ) : (
            <Box p={4} rounded="lg" borderWidth="1px" borderColor={useColorModeValue("gray.200", "gray.700")}
              bg={useColorModeValue("gray.50", "gray.900")}
            >
              <Text color={muted}>
                {summary
                  ? "No campaigns matched the recommendation text directly. Please try a different interest or browse all campaigns."
                  : "Enter your interest above to see recommended campaigns."}
              </Text>
            </Box>
          )}
        </Box>

        <Box>
          <Text color={muted} fontSize="sm">
            Note: Recommendations are based on campaign metadata and AI guidance to help you find campaigns aligned with your cause.
          </Text>
          <NextLink href="/" passHref>
            <Button variant="link" colorScheme="teal" mt={2}>
              Browse all campaigns instead
            </Button>
          </NextLink>
        </Box>
      </Stack>
    </Box>
  );
}
