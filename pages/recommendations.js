import Head from "next/head";
import { useRouter } from "next/router";
import { Box, Container, Heading, Stack, Text, useColorModeValue } from "@chakra-ui/react";
import AIRecommendationPanel from "../components/AIRecommendationPanel";

export default function RecommendationsPage() {
  const router = useRouter();
  const interest = typeof router.query.interest === "string" ? router.query.interest : "";
  const pageBg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box bg={pageBg} minH="100vh">
      <Head>
        <title>Recommended Campaigns | BetterFund</title>
        <meta name="description" content="AI-assisted campaign recommendations for donors." />
      </Head>

      <Container maxW="7xl" py={{ base: 8, md: 12 }} mt={{ base: "80px", md: "80px" }}>
        <Stack spacing={6}>
          <Box>
            <Heading as="h1" size="2xl">
              Recommended campaigns
            </Heading>
            <Text mt={3} color={useColorModeValue("gray.600", "gray.300")} fontSize="lg">
              Get tailored campaign recommendations based on your interests, causes, and preferred impact areas.
            </Text>
          </Box>

          <AIRecommendationPanel initialInterest={interest} />
        </Stack>
      </Container>
    </Box>
  );
}
