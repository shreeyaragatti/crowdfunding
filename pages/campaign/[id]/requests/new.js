import { useEffect, useState } from "react";
import Head from "next/head";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useWallet } from "use-wallet";
import { useForm } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightAddon,
  Spinner,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import web3 from "../../../../smart-contract/web3";
import Campaign from "../../../../smart-contract/campaign";
import { getETHPrice, getETHPriceInUSD } from "../../../../lib/getETHPrice";
import { getCampaignWithdrawalData } from "../../../../lib/withdrawalRequests";
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

export default function NewRequest({ campaignId, ETHPrice }) {
  const router = useRouter();
  const wallet = useWallet();
  const toast = useToast();
  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors },
  } = useForm({ mode: "onChange" });
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [amountInUSD, setAmountInUSD] = useState("");
  const muted = useColorModeValue("gray.600", "gray.300");
  const panelBg = useColorModeValue("white", "gray.700");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const result = await getCampaignWithdrawalData(campaignId);
        if (active) setData(result);
      } catch (loadError) {
        if (active) {
          setError(
            loadError.message ||
              "Could not load the campaign from the configured Ethereum network."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (campaignId) load();
    return () => {
      active = false;
    };
  }, [campaignId]);

  const isConnected = wallet.status === "connected" && Boolean(wallet.account);
  const isManager =
    isConnected &&
    data?.manager &&
    wallet.account.toLowerCase() === data.manager.toLowerCase();

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    try {
      await connectInjectedWallet(wallet);
    } catch (connectError) {
      setError(connectError.message);
    } finally {
      setConnecting(false);
    }
  };

  async function onSubmit(values) {
    setError("");

    if (!isConnected) {
      setError("Connect the campaign creator wallet first.");
      return;
    }
    if (!isManager) {
      setError(
        `Only the campaign creator (${data?.manager || "unknown"}) can create a withdrawal request.`
      );
      return;
    }

    let valueWei;
    try {
      valueWei = web3.utils.toWei(String(values.value || "0"), "ether");
    } catch (conversionError) {
      setError("Enter a valid ETH amount.");
      return;
    }

    if (BigInt(valueWei) <= BigInt(0)) {
      setError("The withdrawal amount must be greater than zero.");
      return;
    }
    if (data?.balance && BigInt(valueWei) > BigInt(data.balance)) {
      setError("The withdrawal amount cannot exceed the campaign balance.");
      return;
    }
    if (!web3.utils.isAddress(String(values.recipient || "").trim())) {
      setError("Enter a valid recipient Ethereum address.");
      return;
    }

    try {
      const campaign = Campaign(campaignId);
      await campaign.methods
        .createRequest(
          String(values.description || "").trim(),
          valueWei,
          String(values.recipient).trim()
        )
        .send({ from: wallet.account });

      toast({
        title: "Withdrawal request submitted",
        description:
          "The platform admin must approve it before the funds can be withdrawn.",
        status: "success",
        duration: 6000,
        isClosable: true,
      });

      router.push(`/campaign/${campaignId}/requests`);
    } catch (transactionError) {
      setError(transactionError.message || "Could not create the request.");
    }
  }

  if (loading) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <div>
      <Head>
        <title>Create a Withdrawal Request</title>
        <meta name="description" content="Create a withdrawal request" />
        <link rel="icon" href="/logo.svg" />
      </Head>
      <main>
        <Stack spacing={8} mx="auto" maxW="2xl" py={12} px={6}>
          <Text fontSize="lg" color="teal.400">
            <ArrowBackIcon mr={2} />
            <NextLink href={`/campaign/${campaignId}/requests`}>
              Back to Requests
            </NextLink>
          </Text>

          <Stack>
            <Heading fontSize="4xl">Create a Withdrawal Request</Heading>
            <Text color={muted}>
              The platform admin must approve this request before you can
              withdraw the funds.
            </Text>
          </Stack>

          {data ? (
            <Alert status="info" rounded="md">
              <AlertIcon />
              <AlertDescription>
                Campaign balance:{" "}
                {web3.utils.fromWei(data.balance || "0", "ether")} ETH. Only the
                campaign creator ({data.manager}) can submit a request.
              </AlertDescription>
            </Alert>
          ) : null}

          {!isConnected ? (
            <Alert status="warning" rounded="md">
              <AlertIcon />
              <AlertDescription flex="1">
                Connect the campaign creator wallet to continue.
              </AlertDescription>
              <Button
                size="sm"
                colorScheme="teal"
                onClick={handleConnect}
                isLoading={connecting}
              >
                Connect Wallet
              </Button>
            </Alert>
          ) : !isManager ? (
            <Alert status="error" rounded="md">
              <AlertIcon />
              <AlertDescription>
                The connected wallet is not the campaign creator. Switch to{" "}
                {data?.manager || "the creator wallet"} to create a request.
              </AlertDescription>
            </Alert>
          ) : null}

          <Box rounded="lg" bg={panelBg} boxShadow="lg" p={8}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={4}>
                <FormControl id="description" isInvalid={Boolean(errors.description)}>
                  <FormLabel>Request Description</FormLabel>
                  <Textarea
                    {...register("description", { required: true })}
                    isDisabled={isSubmitting}
                    placeholder="What will the funds be used for?"
                  />
                  <FormErrorMessage>Describe the withdrawal.</FormErrorMessage>
                </FormControl>

                <FormControl id="value" isInvalid={Boolean(errors.value)}>
                  <FormLabel>Amount in Ether</FormLabel>
                  <InputGroup>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      {...register("value", { required: true })}
                      isDisabled={isSubmitting}
                      onChange={(event) =>
                        setAmountInUSD(Math.abs(event.target.value))
                      }
                    />
                    <InputRightAddon children="ETH" />
                  </InputGroup>
                  {amountInUSD ? (
                    <FormHelperText>
                      ~$ {getETHPriceInUSD(ETHPrice, amountInUSD)}
                    </FormHelperText>
                  ) : null}
                  <FormErrorMessage>Enter a valid amount.</FormErrorMessage>
                </FormControl>

                <FormControl id="recipient" isInvalid={Boolean(errors.recipient)}>
                  <FormLabel>Recipient Ethereum Wallet Address</FormLabel>
                  <Input
                    {...register("recipient", { required: true })}
                    isDisabled={isSubmitting}
                    placeholder="0x..."
                  />
                  <FormHelperText>
                    Funds are sent directly to this address after approval.
                  </FormHelperText>
                  <FormErrorMessage>Enter a recipient address.</FormErrorMessage>
                </FormControl>

                {error ? (
                  <Alert status="error" rounded="md">
                    <AlertIcon />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  bg="teal.400"
                  color="white"
                  _hover={{ bg: "teal.500" }}
                  isLoading={isSubmitting}
                  isDisabled={!isManager}
                >
                  Create Withdrawal Request
                </Button>
              </Stack>
            </form>
          </Box>
        </Stack>
      </main>
    </div>
  );
}
