import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Button,
  IconButton,
  Input,
  Text,
  VStack,
  HStack,
  useColorModeValue,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { ChatIcon, CloseIcon, ArrowRightIcon } from "@chakra-ui/icons";

const initialMessages = [
  {
    role: "assistant",
    text: "Hi! I'm your BetterFund assistant. Ask me anything about campaigns, donation safety, or proof updates.",
  },
];

export default function FloatingChatWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const panelBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.800", "gray.100");

  useEffect(() => {
    setMounted(true);
  }, []);

  const sendMessage = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setError("");
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The assistant could not respond.");
      }
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply || "I couldn't generate a reply." }]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  if (open) {
    return createPortal(
      <Box
        position="fixed"
        bottom="24px"
        right="24px"
        zIndex={9999}
        w={{ base: "calc(100vw - 32px)", md: "360px" }}
        maxW="100%"
      >
        <Box
          bg={panelBg}
          borderWidth="1px"
          borderColor={borderColor}
          rounded="3xl"
          shadow="xl"
          overflow="hidden"
          maxH="80vh"
        >
          <Box p={4} bg={useColorModeValue("gray.50", "gray.900")}> 
            <HStack justify="space-between">
              <VStack align="flex-start" spacing={0}>
                <Text fontWeight="bold">BetterFund Assistant</Text>
                <Badge colorScheme="teal" variant="subtle">
                  Chatbot
                </Badge>
              </VStack>
              <IconButton
                icon={<CloseIcon />}
                aria-label="Close chat"
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
              />
            </HStack>
          </Box>

          <Box p={4} height="360px" overflowY="auto" bg={panelBg}>
            <VStack spacing={3} align="stretch">
              {messages.map((message, index) => (
                <Box
                  key={`${message.role}-${index}`}
                  alignSelf={message.role === "user" ? "flex-end" : "flex-start"}
                  bg={message.role === "user" ? useColorModeValue("teal.50", "teal.900") : useColorModeValue("gray.100", "gray.700")}
                  color={textColor}
                  rounded="2xl"
                  p={3}
                  maxW="100%"
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {message.text}
                  </Text>
                </Box>
              ))}
              {isLoading ? (
                <HStack justify="center" py={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Thinking...</Text>
                </HStack>
              ) : null}
            </VStack>
          </Box>

          <Box p={4} bg={useColorModeValue("gray.50", "gray.900")}> 
            {error ? (
              <Text color="red.500" fontSize="sm" mb={2}>
                {error}
              </Text>
            ) : null}
            <HStack spacing={2}>
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask the assistant..."
                size="sm"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
              <Button
                colorScheme="teal"
                size="sm"
                onClick={sendMessage}
                isLoading={isLoading}
              >
                <ArrowRightIcon />
              </Button>
            </HStack>
          </Box>
        </Box>
      </Box>,
      document.body
    );
  }

  return createPortal(
    <IconButton
      position="fixed"
      bottom="24px"
      right="24px"
      zIndex={9999}
      icon={<ChatIcon />}
      aria-label="Open assistant chat"
      colorScheme="teal"
      size="lg"
      boxShadow="lg"
      onClick={() => setOpen(true)}
    />,
    document.body
  );
}
