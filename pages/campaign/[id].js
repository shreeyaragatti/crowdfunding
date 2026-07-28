import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "use-wallet";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useWindowSize } from "react-use";
import {
  getETHPrice,
  getETHPriceInUSD,
  getWEIPriceInUSD,
} from "../../lib/getETHPrice";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  CloseButton,
  Container,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Image,
  Input,
  InputGroup,
  InputRightAddon,
  Link,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon, ExternalLinkIcon, InfoIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import Confetti from "react-confetti";

import web3 from "../../smart-contract/web3";
import Campaign from "../../smart-contract/campaign";
import { getAddressExplorerUrl, isBlockchainConfigured } from "../../lib/blockchainConfig";
import supabaseAdmin from "../../lib/supabaseAdmin";
import {
  serializeCampaign,
  serializeDonation,
  serializeProof,
} from "../../lib/campaignSerializers";
import { useDevMode } from "../../lib/devModeContext";
import { connectInjectedWallet } from "../../lib/wallet";
import CampaignAssistant from "../../components/CampaignAssistant";

const zeroSummary = {
  minimumContribution: "0",
  balance: "0",
  requestsCount: "0",
  approversCount: "0",
  manager: "",
  name: "Campaign unavailable",
  description: "",
  image: "",
  target: "0",
};

const isEthereumAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value || "");

const sumWei = (rows) =>
  (rows || []).reduce((total, row) => total + BigInt(row.amount_wei || "0"), BigInt(0)).toString();

async function getSupabaseCampaign(campaignId) {
  if (!supabaseAdmin) return null;

  // First try to find by contract_address (for blockchain campaigns)
  const { data: byAddress, error: addressError } = await supabaseAdmin
    .from("campaign_metadata")
    .select("*")
    .eq("contract_address", campaignId)
    .maybeSingle();

  if (byAddress) return byAddress;
  if (addressError && addressError.code !== "PGRST116") throw addressError;

  // Try to find by ID (UUID for dev mode campaigns)
  const { data: byId, error: idError } = await supabaseAdmin
    .from("campaign_metadata")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (idError && idError.code !== "PGRST116") throw idError;
  return byId;
}

async function getSupabaseChildren(campaignId) {
  if (!supabaseAdmin) return { donations: [], proofs: [] };

  // For donations and proofs, we need to use campaign_address from the campaign record
  // or the campaignId itself if it's a UUID
  const [donationsResult, proofsResult] = await Promise.all([
    supabaseAdmin
      .from("campaign_donations")
      .select("*")
      .eq("campaign_address", campaignId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("campaign_proofs")
      .select("*")
      .eq("campaign_address", campaignId)
      .order("created_at", { ascending: false }),
  ]);

  if (donationsResult.error) throw donationsResult.error;
  if (proofsResult.error) throw proofsResult.error;

  return {
    donations: donationsResult.data || [],
    proofs: proofsResult.data || [],
  };
}

export async function getServerSideProps({ params }) {
  const campaignId = params.id;
  const ETHPrice = await getETHPrice().catch(() => 0);
  const supabaseCampaign = await getSupabaseCampaign(campaignId).catch(() => null);
  const children = await getSupabaseChildren(campaignId).catch(() => ({
    donations: [],
    proofs: [],
  }));

  // Determine the effective campaign address for blockchain operations
  const effectiveAddress = supabaseCampaign?.contract_address || campaignId;

  if (isBlockchainConfigured && isEthereumAddress(effectiveAddress)) {
    try {
      const campaign = Campaign(effectiveAddress);
      const summary = await campaign.methods.getSummary().call();

      return {
        props: {
          id: campaignId,
          effectiveAddress,
          minimumContribution: summary[0],
          balance: summary[1],
          requestsCount: summary[2],
          approversCount: summary[3],
          manager: summary[4],
          name: summary[5] || supabaseCampaign?.name || "",
          description: summary[6] || supabaseCampaign?.description || "",
          image: summary[7] || supabaseCampaign?.image_url || "",
          target: summary[8],
          ETHPrice,
          loadError: "",
          isSupabaseCampaign: Boolean(supabaseCampaign),
          initialDonations: children.donations.map(serializeDonation),
          initialProofs: children.proofs.map(serializeProof),
        },
      };
    } catch (error) {
      console.log("Blockchain campaign load failed:", error.message);
    }
  }

  if (supabaseCampaign) {
    const donatedWei = sumWei(children.donations);

    return {
      props: {
        id: campaignId,
        effectiveAddress: campaignId,
        minimumContribution: supabaseCampaign.minimum_contribution_wei,
        balance: donatedWei,
        requestsCount: "0",
        approversCount: String(children.donations.length),
        manager: supabaseCampaign.creator_address,
        name: supabaseCampaign.name,
        description: supabaseCampaign.description,
        image: supabaseCampaign.image_url,
        target: supabaseCampaign.target_wei,
        ETHPrice,
        loadError: "",
        isSupabaseCampaign: true,
        initialDonations: children.donations.map(serializeDonation),
        initialProofs: children.proofs.map(serializeProof),
      },
    };
  }

  return {
    props: {
      id: campaignId,
      effectiveAddress: campaignId,
      ...zeroSummary,
      ETHPrice,
      loadError:
        "This campaign could not be loaded from Supabase or the configured Ethereum network.",
      isSupabaseCampaign: false,
      initialDonations: [],
      initialProofs: [],
    },
  };
}

function StatsCard({ title, stat, info }) {
  return (
    <Stat px={{ base: 3, md: 4 }} py={4} borderWidth="1px" rounded="lg">
      <Tooltip
        label={info}
        bg={useColorModeValue("white", "gray.700")}
        placement="top"
        color={useColorModeValue("gray.800", "white")}
      >
        <Box>
          <StatLabel fontWeight="medium">{title}</StatLabel>
          <StatNumber fontSize="md" wordBreak="break-word">
            {stat}
          </StatNumber>
        </Box>
      </Tooltip>
    </Stat>
  );
}

function ProofTimeline({ proofs }) {
  const muted = useColorModeValue("gray.600", "gray.300");

  if (!proofs.length) {
    return (
      <Text color={muted}>
        No proof updates yet. Campaign owners or supporters can add progress evidence below.
      </Text>
    );
  }

  return (
    <Stack spacing={4}>
      {proofs.map((proof) => (
        <Box key={proof.id} borderWidth="1px" rounded="lg" p={4}>
          <Flex justify="space-between" gap={3} wrap="wrap">
            <Heading as="h3" size="sm">
              {proof.title}
            </Heading>
            <Text fontSize="sm" color={muted}>
              {new Date(proof.createdAt).toLocaleString()}
            </Text>
          </Flex>
          <Text mt={2}>{proof.description}</Text>
          {proof.proofUrl ? (
            <Link color="teal.500" href={proof.proofUrl} isExternal mt={2} display="inline-block">
              View proof <ExternalLinkIcon mx="2px" />
            </Link>
          ) : null}
          {proof.uploaderAddress ? (
            <Text color={muted} fontSize="sm" mt={2}>
              Uploaded by {proof.uploaderAddress}
            </Text>
          ) : null}
        </Box>
      ))}
    </Stack>
  );
}

export default function CampaignSingle(props) {
  const {
    id,
    effectiveAddress,
    minimumContribution,
    balance,
    requestsCount,
    approversCount,
    manager,
    name,
    description,
    image,
    target,
    ETHPrice,
    loadError,
    isSupabaseCampaign,
    initialDonations,
    initialProofs,
  } = props;
  const donationForm = useForm({ mode: "onChange" });
  const proofForm = useForm({ mode: "onChange" });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [proofError, setProofError] = useState("");
  const [amountInUSD, setAmountInUSD] = useState();
  const [donations, setDonations] = useState(initialDonations || []);
  const [proofs, setProofs] = useState(initialProofs || []);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const wallet = useWallet();
  const router = useRouter();
  const toast = useToast();
  const { width, height } = useWindowSize();
  const { devMode } = useDevMode();
  const proofFileField = proofForm.register("proofFile");
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const panelBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.300");
  const progressValue = useMemo(() => {
    const targetEth = Number(web3.utils.fromWei(target || "0", "ether"));
    const balanceEth = Number(web3.utils.fromWei(displayBalance || "0", "ether"));
    if (!targetEth) return 0;
    return Math.min(100, (balanceEth / targetEth) * 100);
  }, [displayBalance, target]);

  useEffect(() => {
    setDonations(initialDonations || []);
    setProofs(initialProofs || []);
    setDisplayBalance(balance);
  }, [effectiveAddress]);

  async function refreshSupabaseChildren() {
    const [donationResponse, proofResponse] = await Promise.all([
      fetch(`/api/campaign-donations?campaignAddress=${encodeURIComponent(effectiveAddress)}`),
      fetch(`/api/campaign-proofs?campaignAddress=${encodeURIComponent(effectiveAddress)}`),
    ]);
    const donationData = await donationResponse.json();
    const proofData = await proofResponse.json();

    if (donationResponse.ok) {
      setDonations(donationData.donations || []);
      const nextBalance = (donationData.donations || [])
        .reduce((total, donation) => total + BigInt(donation.amountWei || "0"), BigInt(0))
        .toString();
      if (isSupabaseCampaign || devMode) setDisplayBalance(nextBalance);
    }

    if (proofResponse.ok) {
      setProofs(proofData.proofs || []);
    }
  }

  async function onDonate(data) {
    try {
      setError("");
      const amountWei = web3.utils.toWei(data.value, "ether");
      const accounts = await web3.eth.getAccounts().catch(() => []);
      const donorAddress =
        accounts[0] || `dev-donor-${Date.now().toString(36)}`;

      if (devMode || isSupabaseCampaign) {
        await saveDonation({
          amountWei,
          donorAddress,
          donorName: data.donorName,
          message: data.message,
          transactionHash: "dev-mode",
          source: "dev",
        });
      } else {
        const campaign = Campaign(effectiveAddress);
        const receipt = await campaign.methods.contibute().send({
          from: accounts[0],
          value: amountWei,
        });

        await saveDonation({
          amountWei,
          donorAddress,
          donorName: data.donorName,
          message: data.message,
          transactionHash: receipt.transactionHash,
          source: "blockchain",
        });

        router.replace(`/campaign/${id}`);
      }

      donationForm.reset();
      setAmountInUSD(null);
      setIsSubmitted(true);
      await refreshSupabaseChildren();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveDonation(payload) {
    const response = await fetch("/api/campaign-donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignAddress: effectiveAddress, ...payload }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Donation could not be saved.");
    }
  }

  async function onProofSubmit(data) {
    try {
      setProofError("");
      const accounts = await web3.eth.getAccounts().catch(() => []);
      const formData = new FormData();
      formData.append("campaignAddress", effectiveAddress);
      formData.append("uploaderAddress", accounts[0] || data.uploaderAddress || "anonymous");
      formData.append("title", data.title);
      formData.append("description", data.proofDescription);

      const file = data.proofFile && data.proofFile[0];
      if (file) formData.append("proof", file);

      const response = await fetch("/api/campaign-proofs", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Proof could not be saved.");
      }

      proofForm.reset();
      toast({
        title: "Proof update saved",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      await refreshSupabaseChildren();
    } catch (err) {
      setProofError(err.message);
    }
  }

  const handleConnectWallet = async () => {
    try {
      await connectInjectedWallet(wallet);
    } catch (err) {
      toast({
        title: "Wallet connection failed",
        description: err.message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    }
  };

  return (
    <Box bg={pageBg} minH="100vh">
      <Head>
        <title>{name} | BetterFund</title>
        <meta name="description" content={description || "Campaign details"} />
        <link rel="icon" href="/logo.svg" />
      </Head>
      {isSubmitted ? <Confetti width={width} height={height} recycle={false} /> : null}
      <main>
        <Container maxW="7xl" py={{ base: 8, md: 12 }} mt={{ base: "80px", md: "80px" }}>
          <Text fontSize="lg" color="teal.500" mb={5}>
            <ArrowBackIcon mr={2} />
            <NextLink href="/">Back to Home</NextLink>
          </Text>

          {loadError ? (
            <Alert status="warning" rounded="md">
              <AlertIcon />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}

          {isSubmitted ? (
            <Alert status="success" mb={5} rounded="md">
              <AlertIcon />
              <AlertDescription>Thank you. Your donation has been recorded.</AlertDescription>
              <CloseButton
                position="absolute"
                right="8px"
                top="8px"
                onClick={() => setIsSubmitted(false)}
              />
            </Alert>
          ) : null}

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
            <Stack spacing={5}>
              <Box overflow="hidden" rounded="lg" borderWidth="1px" bg={panelBg}>
                {image ? (
                  <Image src={image} alt={name} w="full" h={{ base: "240px", md: "360px" }} objectFit="cover" />
                ) : null}
              </Box>

              <Box>
                <Flex align="center" gap={3} wrap="wrap">
                  <Heading as="h1" size="2xl">
                    {name}
                  </Heading>
                  {isSupabaseCampaign ? <Badge colorScheme="teal">Supabase backed</Badge> : null}
                  {devMode ? <Badge colorScheme="yellow">Dev mode</Badge> : null}
                </Flex>
                <Text color={muted} fontSize="lg" mt={4}>
                  {description}
                </Text>
                {isEthereumAddress(effectiveAddress) ? (
                  <Link color="teal.500" href={getAddressExplorerUrl(effectiveAddress)} isExternal mt={3} display="inline-block">
                    View on Block Explorer <ExternalLinkIcon mx="2px" />
                  </Link>
                ) : null}
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StatsCard
                  title="Minimum Contribution"
                  stat={`${web3.utils.fromWei(minimumContribution || "0", "ether")} ETH`}
                  info="Minimum donation needed to become an approver on blockchain campaigns."
                />
                <StatsCard
                  title="Campaign Creator"
                  stat={manager || "Unknown"}
                  info="The address submitted when this campaign was created."
                />
                <StatsCard
                  title="Withdrawal Requests"
                  stat={requestsCount}
                  info="Blockchain withdrawal requests for this campaign."
                />
                <StatsCard
                  title="Recorded Donors"
                  stat={donations.length || approversCount}
                  info="Donations recorded in Supabase for transparency."
                />
              </SimpleGrid>

              <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5}>
                <Heading as="h2" size="md" mb={3}>
                  Proof and progress
                </Heading>
                <ProofTimeline proofs={proofs} />
              </Box>
            </Stack>

            <Stack spacing={5}>
              <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5}>
                <Stat>
                  <StatLabel fontWeight="medium">
                    Campaign Balance
                    <Tooltip label="Supabase-backed campaigns use recorded donations in dev mode.">
                      <InfoIcon ml={2} />
                    </Tooltip>
                  </StatLabel>
                  <StatNumber fontSize="3xl">
                    {web3.utils.fromWei(displayBalance || "0", "ether")} ETH
                  </StatNumber>
                  <Text color={muted}>
                    Target {web3.utils.fromWei(target || "0", "ether")} ETH ($
                    {getWEIPriceInUSD(ETHPrice, target || "0")})
                  </Text>
                  <Box mt={4} h="10px" bg={useColorModeValue("gray.100", "gray.700")} rounded="full" overflow="hidden">
                    <Box h="full" w={`${progressValue}%`} bg="teal.400" />
                  </Box>
                </Stat>
              </Box>

              <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5}>
                <Heading as="h2" size="md" mb={4}>
                  Donate
                </Heading>
                <form onSubmit={donationForm.handleSubmit(onDonate)}>
                  <Stack spacing={4}>
                    <FormControl id="value" isRequired>
                      <FormLabel>Amount</FormLabel>
                      <InputGroup>
                        <Input
                          {...donationForm.register("value", { required: true })}
                          type="number"
                          isDisabled={donationForm.formState.isSubmitting}
                          onChange={(event) => setAmountInUSD(Math.abs(event.target.value))}
                          step="any"
                          min="0"
                        />
                        <InputRightAddon children="ETH" />
                      </InputGroup>
                      {amountInUSD ? (
                        <FormHelperText>~$ {getETHPriceInUSD(ETHPrice, amountInUSD)}</FormHelperText>
                      ) : null}
                    </FormControl>
                    <FormControl id="donorName">
                      <FormLabel>Name</FormLabel>
                      <Input {...donationForm.register("donorName")} placeholder="Optional" />
                    </FormControl>
                    <FormControl id="message">
                      <FormLabel>Message</FormLabel>
                      <Textarea {...donationForm.register("message")} placeholder="Optional note for the campaign" />
                    </FormControl>

                    {error ? (
                      <Alert status="error" rounded="md">
                        <AlertIcon />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : null}

                    {wallet.status === "connected" || devMode || isSupabaseCampaign ? (
                      <Button
                        colorScheme="teal"
                        isLoading={donationForm.formState.isSubmitting}
                        isDisabled={!amountInUSD}
                        type="submit"
                      >
                        Donate
                      </Button>
                    ) : (
                      <Stack>
                        <Button colorScheme="teal" onClick={handleConnectWallet}>
                          Connect Wallet
                        </Button>
                        <Alert status="warning" rounded="md">
                          <AlertIcon />
                          <AlertDescription>Connect a wallet or enable dev mode to donate.</AlertDescription>
                        </Alert>
                      </Stack>
                    )}
                  </Stack>
                </form>
              </Box>

              <CampaignAssistant campaignAddress={effectiveAddress} />

              <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5}>
                <Heading as="h2" size="md" mb={4}>
                  Upload proof update
                </Heading>
                <form onSubmit={proofForm.handleSubmit(onProofSubmit)}>
                  <Stack spacing={4}>
                    <FormControl id="title" isRequired>
                      <FormLabel>Title</FormLabel>
                      <Input {...proofForm.register("title", { required: true })} placeholder="Medicine purchased, school fees paid..." />
                    </FormControl>
                    <FormControl id="proofDescription" isRequired>
                      <FormLabel>Progress details</FormLabel>
                      <Textarea
                        {...proofForm.register("proofDescription", { required: true })}
                        placeholder="Describe what changed and how donations were used."
                      />
                    </FormControl>
                    <FormControl id="uploaderAddress">
                      <FormLabel>Uploader address</FormLabel>
                      <Input {...proofForm.register("uploaderAddress")} placeholder="Optional if wallet is not connected" />
                    </FormControl>
                    <FormControl id="proofFile">
                      <FormLabel>Proof file</FormLabel>
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                        name={proofFileField.name}
                        ref={proofFileField.ref}
                        onBlur={proofFileField.onBlur}
                        onChange={proofFileField.onChange}
                        pt={1}
                      />
                      <FormHelperText>Upload an image or PDF. A written update is also saved.</FormHelperText>
                    </FormControl>
                    {proofError ? (
                      <Alert status="error" rounded="md">
                        <AlertIcon />
                        <AlertDescription>{proofError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button colorScheme="teal" variant="outline" type="submit" isLoading={proofForm.formState.isSubmitting}>
                      Save proof update
                    </Button>
                  </Stack>
                </form>
              </Box>

              <CampaignAssistant campaignAddress={effectiveAddress} />

              <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5}>
                <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                  <Box>
                    <Heading as="h2" size="md">
                      Withdrawal requests
                    </Heading>
                    <Text color={muted} fontSize="sm">
                      Blockchain campaigns can create and approve withdrawal requests.
                    </Text>
                  </Box>
                  <NextLink href={`/campaign/${effectiveAddress}/requests`}>
                    <Button colorScheme="teal" variant="outline">
                      View requests
                    </Button>
                  </NextLink>
                </Flex>
              </Box>
            </Stack>
          </SimpleGrid>

          <Divider my={8} />

          <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5}>
            <Heading as="h2" size="md" mb={4}>
              Recent donations
            </Heading>
            {donations.length ? (
              <Stack spacing={3}>
                {donations.slice(0, 8).map((donation) => (
                  <Flex key={donation.id} justify="space-between" gap={3} wrap="wrap">
                    <Text>
                      <strong>{donation.donorName || donation.donorAddress}</strong>
                      {donation.message ? `: ${donation.message}` : ""}
                    </Text>
                    <Text color={muted}>
                      {web3.utils.fromWei(donation.amountWei || "0", "ether")} ETH
                    </Text>
                  </Flex>
                ))}
              </Stack>
            ) : (
              <Text color={muted}>No donations have been recorded in Supabase yet.</Text>
            )}
          </Box>
        </Container>
      </main>
    </Box>
  );
}
