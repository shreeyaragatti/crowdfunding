import React, { useState } from "react";
import Head from "next/head";
import { useAsync } from "react-use";
import { useRouter } from "next/router";
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
  Select,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getETHPrice, getETHPriceInUSD } from "../../lib/getETHPrice";
import { authFetch } from "../../lib/authContext";
import RequireAuth from "../../components/RequireAuth";

function NewCampaignForm() {
  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors },
  } = useForm({ mode: "onChange" });
  const imageFileField = register("imageFile");
  const router = useRouter();
  const [error, setError] = useState("");
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

  const uploadCampaignImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await authFetch("/api/campaign-image", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Campaign image upload failed.");
      }

      return result.publicUrl;
    } catch (err) {
      console.error("Image upload error:", err);
      throw err;
    }
  };

  async function onSubmit(data) {
    try {
      setError("");

      const imageFile = data.imageFile && data.imageFile[0];
      let imageUrl = null;
      if (imageFile) {
        try {
          imageUrl = await uploadCampaignImage(imageFile);
        } catch (err) {
          setError(`Image upload failed: ${err.message}`);
          throw err;
        }
      } else if (data.imageUrl) {
        imageUrl = data.imageUrl;
      }

      if (!imageUrl) {
        setError("Please upload an image or provide an image URL.");
        throw new Error("Upload a campaign image or paste an image URL.");
      }

      const minimumContributionWei = data.minimumContribution
        ? String(Number(data.minimumContribution) * 1e18)
        : "0";
      const targetWei = data.target ? String(Number(data.target) * 1e18) : "0";

      const response = await authFetch("/api/creator/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.campaignName,
          description: data.description,
          imageUrl,
          minimumContributionWei,
          targetWei,
          category: data.category || "general",
          beneficiaryType: data.beneficiaryType || "general",
          beneficiaryCount: parseInt(data.beneficiaryCount) || 1,
          location: data.location || null,
          urgencyLevel: data.urgencyLevel || "normal",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Campaign draft could not be saved.");
      }

      toast({
        title: "Campaign draft saved",
        description:
          "Your campaign is now a draft. Upload verification documents and submit it for admin review. No Sepolia transaction has been sent yet.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      router.push(`/creator/campaigns/${result.campaign.id}`);
    } catch (err) {
      setError(err.message);
      console.log(err);
    }
  }

  const panelBg = useColorModeValue("white", "gray.700");

  return (
    <div>
      <Head>
        <title>New Campaign Draft</title>
        <meta name="description" content="Create a new campaign draft" />
        <link rel="icon" href="/logo.svg" />
      </Head>
      <main>
        <Stack spacing={8} mx={"auto"} maxW={"2xl"} py={12} px={6} mt={{ base: "80px", md: "80px" }}>
          <Text fontSize={"lg"} color={"teal.400"}>
            <ArrowBackIcon mr={2} />
            <NextLink href="/creator"><a> Back to dashboard</a></NextLink>
          </Text>
          <Stack>
            <Heading fontSize={"4xl"}>Create a Campaign Draft</Heading>
            <Text color={useColorModeValue("gray.600", "gray.300")}>
              Drafts are free. Your campaign is reviewed by an admin before any Sepolia transaction is required.
            </Text>
          </Stack>
          <Alert status="info" rounded="md">
            <AlertIcon />
            <AlertDescription>
              No blockchain transaction is sent now. Sepolia gas is only used after admin approval, when you publish the campaign.
            </AlertDescription>
          </Alert>
          <Box rounded={"lg"} bg={panelBg} boxShadow={"lg"} p={8}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={4}>
                <FormControl id="minimumContribution">
                  <FormLabel>Minimum Contribution Amount</FormLabel>
                  <InputGroup>
                    <Input
                      type="number"
                      step="any"
                      {...register("minimumContribution", { required: true })}
                      isDisabled={isSubmitting}
                      onChange={(e) => setMinContriInUSD(Math.abs(e.target.value))}
                    />
                    <InputRightAddon children="ETH" />
                  </InputGroup>
                  {minContriInUSD ? (
                    <FormHelperText>~$ {getETHPriceInUSD(ETHPrice, minContriInUSD)}</FormHelperText>
                  ) : null}
                </FormControl>
                <FormControl id="campaignName">
                  <FormLabel>Campaign Name</FormLabel>
                  <Input {...register("campaignName", { required: true })} isDisabled={isSubmitting} />
                </FormControl>
                <FormControl id="category">
                  <FormLabel>Campaign Category</FormLabel>
                  <Select {...register("category")} isDisabled={isSubmitting} placeholder="Select a category (optional)">
                    <option value="education">Education</option>
                    <option value="medical">Medical Support</option>
                    <option value="emergency">Emergency Relief</option>
                    <option value="community">Community Development</option>
                    <option value="disaster">Disaster Relief</option>
                    <option value="other">Other</option>
                  </Select>
                </FormControl>
                <FormControl id="beneficiaryType">
                  <FormLabel>Who will benefit?</FormLabel>
                  <Select {...register("beneficiaryType")} isDisabled={isSubmitting} placeholder="Select beneficiary type (optional)">
                    <option value="students">Students</option>
                    <option value="elders">Elders</option>
                    <option value="children">Children</option>
                    <option value="families">Families</option>
                    <option value="disabled">Disabled/PWD</option>
                    <option value="underprivileged">Underprivileged</option>
                    <option value="community">Community</option>
                  </Select>
                </FormControl>
                <FormControl id="beneficiaryCount">
                  <FormLabel>Estimated Number of Beneficiaries</FormLabel>
                  <Input type="number" min="1" {...register("beneficiaryCount")} isDisabled={isSubmitting} placeholder="e.g., 50" />
                </FormControl>
                <FormControl id="location">
                  <FormLabel>Location/Region</FormLabel>
                  <Input {...register("location")} isDisabled={isSubmitting} placeholder="e.g., Kerala, Mumbai" />
                </FormControl>
                <FormControl id="urgencyLevel">
                  <FormLabel>Urgency Level</FormLabel>
                  <Select {...register("urgencyLevel")} isDisabled={isSubmitting} placeholder="Select urgency level (optional)">
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </Select>
                </FormControl>
                <FormControl id="description">
                  <FormLabel>Campaign Description</FormLabel>
                  <Textarea {...register("description", { required: true })} isDisabled={isSubmitting} />
                </FormControl>
                <FormControl id="imageUrl">
                  <FormLabel>Campaign Image *</FormLabel>
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
                  {selectedImageName ? <FormHelperText>{selectedImageName}</FormHelperText> : null}
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Selected campaign image preview" mt={3} rounded="md" maxH="220px" objectFit="cover" />
                  ) : null}
                  <FormHelperText>Upload an image, or paste an image URL below (at least one required)</FormHelperText>
                  <Input {...register("imageUrl")} isDisabled={isSubmitting} type="url" mt={2} placeholder="Or paste an image URL..." />
                </FormControl>
                <FormControl id="target">
                  <FormLabel>Target Amount</FormLabel>
                  <InputGroup>
                    <Input
                      type="number"
                      step="any"
                      {...register("target", { required: true })}
                      isDisabled={isSubmitting}
                      onChange={(e) => setTargetInUSD(Math.abs(e.target.value))}
                    />
                    <InputRightAddon children="ETH" />
                  </InputGroup>
                  {targetInUSD ? <FormHelperText>~$ {getETHPriceInUSD(ETHPrice, targetInUSD)}</FormHelperText> : null}
                </FormControl>

                {error ? (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertDescription mr={2}>{error}</AlertDescription>
                  </Alert>
                ) : null}
                {errors.minimumContribution || errors.campaignName || errors.description || errors.target ? (
                  <Alert status="error">
                    <AlertIcon />
                    <AlertDescription mr={2}>Campaign name, description, minimum contribution, and target are required</AlertDescription>
                  </Alert>
                ) : null}
                <Stack spacing={10}>
                  <Button bg={"teal.400"} color={"white"} _hover={{ bg: "teal.500" }} isLoading={isSubmitting} type="submit">
                    Save draft
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Box>
        </Stack>
      </main>
    </div>
  );
}

export default function NewCampaign() {
  return (
    <RequireAuth role="creator">
      <NewCampaignForm />
    </RequireAuth>
  );
}
