import Head from "next/head";
import { useEffect, useState } from "react";
import NextLink from "next/link";
import styles from "../styles/Home.module.css";
import { getETHPrice, getWEIPriceInUSD } from "../lib/getETHPrice";
import {
  Heading,
  useBreakpointValue,
  useColorModeValue,
  Text,
  Button,
  Flex,
  Container,
  SimpleGrid,
  Box,
  Divider,
  Skeleton,
  Img,
  Icon,
  chakra,
  Tooltip,
  Link,
  SkeletonCircle,
  HStack,
  Stack,
  Progress,
  Alert,
  AlertIcon,
  AlertDescription,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";

import factory from "../smart-contract/factory";
import web3 from "../smart-contract/web3";
import Campaign from "../smart-contract/campaign";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { FaHandshake } from "react-icons/fa";
import { FcShare, FcDonate, FcMoneyTransfer } from "react-icons/fc";
import { isBlockchainConfigured } from "../lib/blockchainConfig";
import ProjectSetupStatus from "../components/ProjectSetupStatus";
import { useDevMode } from "../lib/devModeContext";
import AIRecommendationPanel from "../components/AIRecommendationPanel";
import CampaignCard from "../components/CampaignCard";

export async function getServerSideProps(context) {
  try {
    if (!isBlockchainConfigured || !factory) {
      throw new Error("Blockchain environment is not configured.");
    }

    const campaigns = await factory.methods.getDeployedCampaigns().call();

    return {
      props: { campaigns, loadError: "" },
    };
  } catch (error) {
    return {
      props: {
        campaigns: [],
        loadError:
          "Blockchain settings are not complete yet. Add RPC and factory contract values to .env or .env.local after deployment.",
      },
    };
  }
}

const Feature = ({ title, text, icon }) => {
  const bgColor = useColorModeValue("gray.100", "gray.700");
  const textColor = useColorModeValue("gray.500", "gray.200");

  return (
    <Stack>
      <Flex
        w={16}
        h={16}
        align={"center"}
        justify={"center"}
        color={"white"}
        rounded={"full"}
        bg={bgColor}
        mb={1}
      >
        {icon}
      </Flex>
      <Text fontWeight={600}>{title}</Text>
      <Text color={textColor}>{text}</Text>
    </Stack>
  );
};

// Use the new CampaignCard component
// Inline wrapper to maintain backwards compatibility with calling code
function CampaignCardWrapper({
  name,
  description,
  creatorId,
  imageURL,
  id,
  balance,
  target,
  ethPrice,
  isDevMode = false,
  proofCount = 0,
  donorCount = 0,
}) {
  return (
    <CampaignCard
      id={id}
      name={name}
      description={description}
      creatorId={creatorId}
      imageURL={imageURL}
      balance={balance}
      target={target}
      ethPrice={ethPrice}
      isDevMode={isDevMode}
      proofCount={proofCount}
      donorCount={donorCount}
    />
  );
}

export default function Home({ campaigns, loadError }) {
  const [campaignList, setCampaignList] = useState([]);
  const [devCampaigns, setDevCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignError, setCampaignError] = useState(loadError || "");
  const [ethPrice, updateEthPrice] = useState(null);
  const { devMode, toggleDevMode, isLoading: isDevModeLoading } = useDevMode();
  
  // Move all hooks to top level to ensure consistent order
  const headingTextAlign = useBreakpointValue({ base: "left" });
  const headingColor = useColorModeValue("gray.800", "white");
  const devModeBg = useColorModeValue("gray.50", "gray.700");
  const devModeTextColor = useColorModeValue("gray.600", "gray.300");
  const emptyStateBg = useColorModeValue("gray.600", "gray.300");

  async function getEthMarketPrice() {
    const ETHPrice = await getETHPrice();
    updateEthPrice(ETHPrice);
  }

  async function fetchDevCampaigns() {
    try {
      const response = await fetch("/api/campaign-metadata");
      if (response.ok) {
        const data = await response.json();
        setDevCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.log("Could not fetch dev campaigns:", err.message);
    }
  }

  async function getSummary() {
    try {
      setCampaignError("");
      const summary = await Promise.all(
        campaigns.map((campaign, i) =>
          Campaign(campaigns[i]).methods.getSummary().call()
        )
      );
      console.log("summary ", summary);
      setCampaignList(summary);

      return summary;
    } catch (e) {
      console.log(e);
      setCampaignError("Campaign details could not be loaded right now.");
    } finally {
      setIsLoadingCampaigns(false);
    }
  }

  useEffect(() => {
    getEthMarketPrice();
    fetchDevCampaigns();

    if (campaigns.length > 0) {
      getSummary();
    } else {
      setIsLoadingCampaigns(false);
    }
  }, []);

  return (
    <div>
      <Head>
        <title>BetterFund</title>
        <meta
          name="description"
          content="Transparent crowdfunding for real-world impact"
        />
        <link rel="icon" href="/logo.svg" />
      </Head>
      <main className={styles.main}>
        <Container py={{ base: "16", md: "24" }} maxW={"7xl"} mt={{ base: "60px", md: "80px" }}>
          <ProjectSetupStatus />
          <Stack spacing={{ base: 10, md: 14 }}>
            <Box maxW={{ base: "100%", md: "2xl" }}>
              <Heading
                textAlign={headingTextAlign}
                fontFamily={"heading"}
                color={headingColor}
                as="h1"
                fontSize={{ base: "4xl", md: "5xl" }}
                lineHeight={1.05}
              >
                Transparent crowdfunding for real-world impact.
              </Heading>
              <Text fontSize={{ base: "lg", md: "xl" }} color={useColorModeValue("gray.600", "gray.300")} mt={5}>
                Discover and support campaigns with proof-backed transparency, trusted donor guidance, and a simple way to launch your own fundraiser.
              </Text>

              <HStack spacing={4} mt={8} wrap="wrap">
                <NextLink href="/campaign/new" passHref>
                  <Button as="a" colorScheme="teal" size="lg">
                    Create Campaign
                  </Button>
                </NextLink>
                <NextLink href="/recommendations" passHref>
                  <Button as="a" variant="outline" size="lg">
                    Browse Recommendations
                  </Button>
                </NextLink>
              </HStack>
            </Box>

            {!isDevModeLoading && (
              <Box p={6} bg={devModeBg} rounded="3xl" borderWidth="1px">
                <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "flex-start", md: "center" }}>
                  <Box>
                    <Text fontSize="sm" color={devModeTextColor}>
                      Development mode is enabled. You can create campaigns and save proof updates without using blockchain transactions.
                    </Text>
                  </Box>
                  <FormControl display="flex" alignItems="center" mt={{ base: 4, md: 0 }}>
                    <FormLabel mb={0} fontWeight="600">
                      Dev mode
                    </FormLabel>
                    <Switch
                      isChecked={devMode}
                      onChange={(e) => toggleDevMode(e.target.checked)}
                      ml={4}
                      colorScheme="teal"
                    />
                  </FormControl>
                </Flex>
              </Box>
            )}
          </Stack>
        </Container>
        <Container py={{ base: "4", md: "6" }} maxW={"7xl"}>
          <AIRecommendationPanel simpleQuickLinksOnly />
        </Container>
        <Container py={{ base: "4", md: "12" }} maxW={"7xl"}>
          <HStack spacing={2}>
            {/* <SkeletonCircle size="4" /> */}
            <Heading as="h2" size="lg">
              Open Campaigns
            </Heading>
          </HStack>

          <Divider marginTop="4" />

          {campaignError ? (
            <Alert status="warning" mt={6} rounded="md">
              <AlertIcon />
              <AlertDescription>{campaignError}</AlertDescription>
            </Alert>
          ) : null}

          {isLoadingCampaigns ? (
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} py={8}>
              <Skeleton height="25rem" />
              <Skeleton height="25rem" />
              <Skeleton height="25rem" />
            </SimpleGrid>
          ) : campaignList.length > 0 || devCampaigns.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} py={8}>
              {/* Blockchain Campaigns */}
              {campaignList.map((el, i) => {
                return (
                  <div key={`blockchain-${i}`}>
                    <CampaignCardWrapper
                      name={el[5]}
                      description={el[6]}
                      creatorId={el[4]}
                      imageURL={el[7]}
                      id={campaigns[i]}
                      target={el[8]}
                      balance={el[1]}
                      ethPrice={ethPrice}
                      isDevMode={false}
                    />
                  </div>
                );
              })}
              {/* Dev Mode Campaigns */}
              {devCampaigns.map((campaign, i) => {
                // Use campaign ID for dev campaigns, contract address for blockchain campaigns
                const campaignPath = campaign.id || campaign.contractAddress;
                return (
                  <div key={`devmode-${i}`}>
                    <CampaignCardWrapper
                      id={campaignPath}
                      name={campaign.name}
                      description={campaign.description}
                      creatorId={campaign.creatorAddress?.slice(0, 8)}
                      imageURL={campaign.imageUrl}
                      balance="0"
                      target={campaign.targetWei}
                      ethPrice={ethPrice}
                      isDevMode={true}
                    />
                  </div>
                );
              })}
            </SimpleGrid>
          ) : (
            <Box
              py={12}
              textAlign="center"
              color={emptyStateBg}
            >
              <Heading as="h3" size="md" mb={2}>
                No campaigns found
              </Heading>
              <Text>
                Create the first campaign or connect to the network where your
                contracts are deployed.
              </Text>
            </Box>
          )}
        </Container>
        <Container py={{ base: "4", md: "12" }} maxW={"7xl"} id="howitworks">
          <HStack spacing={2}>
            {/* <SkeletonCircle size="4" /> */}
            <Heading as="h2" size="lg">
              How BetterFund Works
            </Heading>
          </HStack>
          <Divider marginTop="4" />
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} py={8}>
            <Feature
              icon={<Icon as={FcDonate} w={10} h={10} />}
              title={"Create a Campaign for Fundraising"}
              text={
                "Add the cause, target, image, and minimum contribution in a few minutes."
              }
            />
            <Feature
              icon={<Icon as={FcShare} w={10} h={10} />}
              title={"Share your Campaign"}
              text={
                "Share the campaign with supporters and keep the page updated with proof and progress."
              }
            />
            <Feature
              icon={<Icon as={FcMoneyTransfer} w={10} h={10} />}
              title={"Request and Withdraw Funds"}
              text={
                "Donors can review donation progress, proof updates, and withdrawal requests before supporting."
              }
            />
          </SimpleGrid>
          <Heading as="h2" size="lg" mt="8">
            For any queries raise an issue on{" "}
            <Link
              color="teal.500"
              href="https://github.com/shreeyaragatti/crowdfunding/issues"
              isExternal
            >
              the Github Repo <ExternalLinkIcon mx="2px" />
            </Link>{" "}
          </Heading>
          <Divider marginTop="4" />
        </Container>
      </main>
    </div>
  );
}
