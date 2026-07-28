import { useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Spinner,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";

const quickPrompts = [
  "What makes this campaign trustworthy?",
  "How many beneficiaries will this campaign help?",
  "Summarize this campaign's impact.",
  "Is this campaign a safe donation option?",
];

export default function CampaignAssistant({ campaignAddress }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const panelBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.300");

  const askAssistant = async (prompt) => {
    const questionText = (prompt || question).trim();
    if (!questionText) return;

    setError("");
    setIsLoading(true);
    setAnswer("");
    setLastQuery(questionText);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: questionText, campaignAddress }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Assistant failed to respond.");
      }
      setAnswer(data.reply || "The assistant could not generate a recommendation right now.");
      setQuestion("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5} shadow="sm">
      <Stack spacing={4}>
        <Box>
          <HStack align="start" justify="space-between" spacing={4}>
            <Box>
              <Heading size="md">Donation Assistant</Heading>
              <Text color={muted} mt={2} fontSize="sm">
                Ask a question about this campaign and get a calm, helpful recommendation for whether it matches your interests.
              </Text>
            </Box>
            <Badge colorScheme="teal" variant="subtle" py={1}>
              AI Assistant
            </Badge>
          </HStack>
        </Box>

        <Stack spacing={3}>
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask the assistant about proof, impact, safety, or beneficiary needs."
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                askAssistant();
              }
            }}
            size="md"
          />
          <Button
            colorScheme="teal"
            onClick={() => askAssistant()}
            isLoading={isLoading}
          >
            Ask Assistant
          </Button>
        </Stack>

        <HStack spacing={2} flexWrap="wrap">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt}
              size="sm"
              variant="outline"
              onClick={() => askAssistant(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </HStack>

        {error ? (
          <Alert status="error" rounded="lg">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <Box py={6} textAlign="center">
            <Spinner />
          </Box>
        ) : null}

        {answer ? (
          <Box bg={useColorModeValue("gray.50", "gray.900")} rounded="lg" p={4}>
            <Text color={muted} fontSize="xs" mb={2} fontWeight="bold">
              Question: {lastQuery}
            </Text>
            <Text whiteSpace="pre-wrap" lineHeight="tall">
              {answer}
            </Text>
            <Text color={muted} fontSize="sm" mt={3}>
              The assistant uses campaign context and donor guidance to help you decide.
            </Text>
          </Box>
        ) : (
          <Box bg={useColorModeValue("gray.50", "gray.900")} rounded="lg" p={4}>
            <Text color={muted} fontSize="sm">
              Ask about this campaign to get a focused recommendation and context-aware guidance.
            </Text>
          </Box>
        )}

        <Box>
          <Text color={muted} fontSize="sm">
            Want broader recommendations? 
            <NextLink href="/recommendations" passHref>
              <Button as="a" variant="link" colorScheme="teal" size="sm">
                Browse recommended campaigns
              </Button>
            </NextLink>
          </Text>
        </Box>
      </Stack>
    </Box>
  );
}
