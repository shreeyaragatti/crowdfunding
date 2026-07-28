import { useState, useRef, useEffect } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Text,
  useColorModeValue,
  VStack,
  useBreakpointValue,
  Badge,
  Divider,
  IconButton,
  Tooltip,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { DeleteIcon, CopyIcon, RepeatIcon } from "@chakra-ui/icons";

/**
 * EnhancedAssistant - A comprehensive AI assistant for BetterFund donors
 * 
 * Features:
 * - Campaign-specific or global donor assistance
 * - Conversation history with message management
 * - Category and beneficiary-type aware recommendations
 * - Copy and clear message functionality
 * - Typing indicators for better UX
 */
export default function EnhancedAssistant({ campaignAddress, isDarkMode }) {
  const [message, setMessage] = useState("");
  const [replies, setReplies] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Color scheme
  const panelBg = useColorModeValue("white", "gray.800");
  const replyBg = useColorModeValue("teal.50", "gray.700");
  const userBg = useColorModeValue("blue.50", "blue.900");
  const muted = useColorModeValue("gray.600", "gray.300");
  const successColor = useColorModeValue("green.600", "green.300");
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  // Context-aware starter prompts
  const starterPrompts = campaignAddress
    ? [
        "📊 Tell me about this campaign's progress",
        "✅ What proofs have been shared?",
        "🛡️ Is this a safe campaign to donate to?",
        "💰 How many people will this help?",
      ]
    : [
        "👶 Help me choose a campaign for children",
        "👴 Show me campaigns for elderly care",
        "📚 Which campaigns focus on education?",
        "🚨 What emergency relief campaigns are active?",
        "🏥 Show me medical support campaigns",
        "📍 Find campaigns in my location",
      ];

  const askAssistant = async (prompt) => {
    const question = (prompt || message).trim();
    if (!question) return;

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      // Add user message to conversation immediately
      setReplies((prev) => [
        ...prev,
        { type: "user", text: question, timestamp: new Date() },
      ]);

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, campaignAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Assistant failed to respond.");
      }

      // Add assistant reply
      setReplies((prev) => [
        ...prev,
        {
          type: "assistant",
          text: data.reply,
          timestamp: new Date(),
          configured: data.configured,
        },
      ]);
    } catch (err) {
      setError(err.message);
      // Remove the user message if request failed
      setReplies((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
  };

  const clearConversation = () => {
    setReplies([]);
    setError("");
    setIsClearDialogOpen(false);
  };

  return (
    <Box bg={panelBg} borderWidth="1px" rounded="lg" p={5} shadow="sm">
      <Stack spacing={4}>
        {/* Header with title and controls */}
        <HStack justify="space-between" align="start">
          <Box flex={1}>
            <Text fontWeight="700" fontSize="lg">
              🤖 {campaignAddress ? "Campaign" : "Donor"} Assistant
            </Text>
            <Text color={muted} fontSize="sm">
              {campaignAddress
                ? "Ask about this campaign's progress, impact, and beneficiaries."
                : "Discover campaigns matching your causes and values."}
            </Text>
          </Box>
          <HStack spacing={1}>
            <Tooltip label="Clear conversation" placement="top">
              <IconButton
                icon={<DeleteIcon />}
                size="sm"
                variant="ghost"
                onClick={() => setIsClearDialogOpen(true)}
                isDisabled={replies.length === 0}
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Conversation history */}
        {replies.length > 0 && (
          <VStack
            align="stretch"
            spacing={3}
            bg={useColorModeValue("gray.50", "gray.900")}
            p={4}
            rounded="md"
            maxH="400px"
            overflowY="auto"
            borderLeft="4px solid teal"
          >
            {replies.map((reply, idx) => (
              <Box key={idx}>
                <HStack justify="space-between" align="start" mb={1}>
                  <HStack align="center" spacing={2}>
                    <Text fontSize="xs" fontWeight="bold" color={muted}>
                      {reply.type === "user" ? "👤 You" : "🤖 Assistant"}
                    </Text>
                    {reply.timestamp && (
                      <Text fontSize="xs" color={muted}>
                        {reply.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    )}
                  </HStack>
                  {reply.type === "assistant" && (
                    <Tooltip label="Copy response" placement="top">
                      <IconButton
                        icon={<CopyIcon />}
                        size="xs"
                        variant="ghost"
                        onClick={() => copyMessage(reply.text)}
                      />
                    </Tooltip>
                  )}
                </HStack>
                <Box
                  bg={reply.type === "user" ? userBg : replyBg}
                  p={3}
                  rounded="md"
                  textAlign={reply.type === "user" ? "right" : "left"}
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="1.6">
                    {reply.text}
                  </Text>
                  {reply.type === "assistant" && !reply.configured && (
                    <Text fontSize="xs" color={muted} mt={2} fontStyle="italic">
                      (OpenRouter not configured - using fallback response)
                    </Text>
                  )}
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </VStack>
        )}

        {/* Input area */}
        <HStack spacing={2} align="stretch">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              campaignAddress
                ? "Ask about proofs, donations, beneficiaries..."
                : "Ask about causes, campaigns, impact..."
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                askAssistant();
              }
            }}
            isDisabled={isLoading}
            size={isMobile ? "sm" : "md"}
          />
          <Button
            colorScheme="teal"
            onClick={() => askAssistant()}
            isLoading={isLoading}
            flexShrink={0}
            size={isMobile ? "sm" : "md"}
          >
            {isLoading ? <Spinner size="sm" /> : "Send"}
          </Button>
        </HStack>

        {/* Quick prompts */}
        <VStack align="start" spacing={2}>
          <Text fontSize="xs" fontWeight="bold" color={muted}>
            💡 Suggestions:
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {starterPrompts.map((prompt) => (
              <Button
                key={prompt}
                size="sm"
                variant="outline"
                colorScheme="teal"
                onClick={() => askAssistant(prompt)}
                isDisabled={isLoading}
                fontSize="xs"
              >
                {prompt}
              </Button>
            ))}
          </HStack>
        </VStack>

        {/* Error message */}
        {error && (
          <Alert status="error" rounded="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="500">
                {error}
              </Text>
              <Button
                size="xs"
                colorScheme="red"
                variant="outline"
                onClick={() => setError("")}
              >
                Dismiss
              </Button>
            </VStack>
          </Alert>
        )}

        {/* Info badge */}
        {replies.length > 0 && !isLoading && (
          <Box fontSize="xs" color={muted} textAlign="center">
            <Badge colorScheme="teal" variant="subtle">
              {replies.length} message{replies.length !== 1 ? "s" : ""}
            </Badge>
          </Box>
        )}

        {/* Clear confirmation modal */}
        <Modal isOpen={isClearDialogOpen} onClose={() => setIsClearDialogOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Clear Conversation?</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              All messages will be permanently deleted. This action cannot be undone.
            </ModalBody>
            <ModalFooter>
              <Button
                variant="ghost"
                onClick={() => setIsClearDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button colorScheme="red" onClick={clearConversation} ml={3}>
                Clear
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Stack>
    </Box>
  );
}
