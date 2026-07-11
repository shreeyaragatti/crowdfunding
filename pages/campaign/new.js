import React, { useState } from "react";
import Head from "next/head";
import { useAsync } from "react-use";
import { useRouter } from "next/router";
import { useWallet } from "use-wallet";
import { useForm } from "react-hook-form";
import {
  Flex,
  Box,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Button,
  Heading,
  Text,
  useColorModeValue,
  InputRightAddon,
  InputGroup,
  Alert,
  AlertIcon,
  AlertDescription,
  FormHelperText,
  Textarea,
  useToast,
  Image,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getETHPrice, getETHPriceInUSD } from "../../lib/getETHPrice";

import factory from "../../smart-contract/factory";
import web3 from "../../smart-contract/web3";
import { isBlockchainConfigured } from "../../lib/blockchainConfig";
import { connectInjectedWallet } from "../../lib/wallet";

export default function NewCampaign() {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors },
  } = useForm({
    mode: "onChange",
  });
  const imageFileField = register("imageFile");
  const router = useRouter();
  const [error, setError] = useState("");
  const wallet = useWallet();
  const toast = useToast();
  const [minContriInUSD, setMinContriInUSD] = useState();
  const [targetInUSD, setTargetInUSD] = useState();
  const [ETHPrice, setETHPrice] = useState(0);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedImageName, setSelectedImageName] = useState("");
  useAsync(async () => {
    try {
      const result = await getETHPrice();
      setETHPrice(result);
    } catch (error) {
      console.log(error);
    }
  }, []);
  const uploadCampaignImage = async (file, creator) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("creator", creator);

    const response = await fetch("/api/campaign-image", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Campaign image upload failed.");
    }

    return result.publicUrl;
  };

  async function onSubmit(data) {
    console.log(
      data.minimumContribution,
      data.campaignName,
      data.description,
      data.target
    );
    try {
      if (!isBlockchainConfigured || !factory) {
        throw new Error(
          "Blockchain settings are not complete. Add RPC and factory contract values to .env or .env.local."
        );
      }

      const accounts = await web3.eth.getAccounts();
      const imageFile = data.imageFile && data.imageFile[0];
      const imageUrl = imageFile
        ? await uploadCampaignImage(imageFile, accounts[0])
        : data.imageUrl;

      if (!imageUrl) {
        throw new Error("Upload a campaign image or paste an image URL.");
      }

      const minimumContributionWei = web3.utils.toWei(
        data.minimumContribution,
        "ether"
      );
      const targetWei = web3.utils.toWei(data.target, "ether");

      const receipt = await factory.methods
        .createCampaign(
          minimumContributionWei,
          data.campaignName,
          data.description,
          imageUrl,
          targetWei
        )
        .send({
          from: accounts[0],
        });

      const contractAddress =
        receipt.events &&
        receipt.events.CampaignCreated &&
        receipt.events.CampaignCreated.returnValues &&
        receipt.events.CampaignCreated.returnValues.campaign;

      await fetch("/api/campaign-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress,
          creatorAddress: accounts[0],
          name: data.campaignName,
          description: data.description,
          imageUrl,
          minimumContributionWei,
          targetWei,
          transactionHash: receipt.transactionHash,
        }),
      });

      router.push("/");
    } catch (err) {
      setError(err.message);
      console.log(err);
    }
  }

  const handleConnectWallet = async () => {
    try {
      await connectInjectedWallet(wallet);
    } catch (error) {
      toast({
        title: "Wallet connection failed",
        description: error.message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    }
  };

  return (
    <div>
      <Head>
        <title>New Campaign</title>
        <meta name="description" content="Create New Campaign" />
        <link rel="icon" href="/logo.svg" />
      </Head>
      <main>
        <Stack spacing={8} mx={"auto"} maxW={"2xl"} py={12} px={6}>
          <Text fontSize={"lg"} color={"teal.400"}>
            <ArrowBackIcon mr={2} />
            <NextLink href="/"> Back to Home</NextLink>
          </Text>
          <Stack>
            <Heading fontSize={"4xl"}>Create a New Campaign 📢</Heading>
          </Stack>
          <Box
            rounded={"lg"}
            bg={useColorModeValue("white", "gray.700")}
            boxShadow={"lg"}
            p={8}
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={4}>
                <FormControl id="minimumContribution">
                  <FormLabel>Minimum Contribution Amount</FormLabel>
                  <InputGroup>
                    {" "}
                    <Input
                      type="number"
                      step="any"
                      {...register("minimumContribution", { required: true })}
                      isDisabled={isSubmitting}
                      onChange={(e) => {
                        setMinContriInUSD(Math.abs(e.target.value));
                      }}
                    />{" "}
                    <InputRightAddon children="ETH" />
                  </InputGroup>
                  {minContriInUSD ? (
                    <FormHelperText>
                      ~$ {getETHPriceInUSD(ETHPrice, minContriInUSD)}
                    </FormHelperText>
                  ) : null}
                </FormControl>
                <FormControl id="campaignName">
                  <FormLabel>Campaign Name</FormLabel>
                  <Input
                    {...register("campaignName", { required: true })}
                    isDisabled={isSubmitting}
                  />
                </FormControl>
                <FormControl id="description">
                  <FormLabel>Campaign Description</FormLabel>
                  <Textarea
                    {...register("description", { required: true })}
                    isDisabled={isSubmitting}
                  />
                </FormControl>
                <FormControl id="imageUrl">
                  <FormLabel>Campaign Image</FormLabel>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    name={imageFileField.name}
                    ref={imageFileField.ref}
                    onBlur={imageFileField.onBlur}
                    isDisabled={isSubmitting}
                    pt={1}
                    onChange={(event) => {
                      imageFileField.onChange(event);
                      const file = event.target.files && event.target.files[0];
                      setSelectedImageName(file ? file.name : "");
                      setImagePreview(file ? URL.createObjectURL(file) : "");
                    }}
                  />
                  {selectedImageName ? (
                    <FormHelperText>{selectedImageName}</FormHelperText>
                  ) : null}
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Selected campaign image preview"
                      mt={3}
                      rounded="md"
                      maxH="220px"
                      objectFit="cover"
                    />
                  ) : null}
                  <FormHelperText>
                    Or paste an image URL if the image is already hosted.
                  </FormHelperText>
                  <Input
                    {...register("imageUrl")}
                    isDisabled={isSubmitting}
                    type="url"
                    mt={2}
                  />
                </FormControl>
                <FormControl id="target">
                  <FormLabel>Target Amount</FormLabel>
                  <InputGroup>
                    <Input
                      type="number"
                      step="any"
                      {...register("target", { required: true })}
                      isDisabled={isSubmitting}
                      onChange={(e) => {
                        setTargetInUSD(Math.abs(e.target.value));
                      }}
                    />
                    <InputRightAddon children="ETH" />
                  </InputGroup>
                  {targetInUSD ? (
                    <FormHelperText>
                      ~$ {getETHPriceInUSD(ETHPrice, targetInUSD)}
                    </FormHelperText>
                  ) : null}
                </FormControl>

                {error ? (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertDescription mr={2}> {error}</AlertDescription>
                  </Alert>
                ) : null}
                {errors.minimumContribution ||
                errors.campaignName ||
                errors.description ||
                errors.target ? (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertDescription mr={2}>
                      Campaign name, description, minimum contribution, and
                      target are required
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Stack spacing={10}>
                  {wallet.status === "connected" ? (
                    <Button
                      bg={"teal.400"}
                      color={"white"}
                      _hover={{
                        bg: "teal.500",
                      }}
                      isLoading={isSubmitting}
                      type="submit"
                    >
                      Create
                    </Button>
                  ) : (
                    <Stack spacing={3}>
                      <Button
                        type="button"
                        color={"white"}
                        bg={"teal.400"}
                        _hover={{
                          bg: "teal.300",
                        }}
                        onClick={handleConnectWallet}
                      >
                        Connect Wallet{" "}
                      </Button>
                      <Alert status="warning">
                        <AlertIcon />
                        <AlertDescription mr={2}>
                          Please Connect Your Wallet First to Create a Campaign
                        </AlertDescription>
                      </Alert>
                    </Stack>
                  )}
                </Stack>
              </Stack>
            </form>
          </Box>
        </Stack>
      </main>
    </div>
  );
}
