import {
  Alert,
  AlertIcon,
  Box,
  Code,
  HStack,
  List,
  ListIcon,
  ListItem,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import chainConfig, { isBlockchainConfigured } from "../lib/blockchainConfig";
import { isSupabaseConfigured } from "../lib/backendConfig";

const StatusItem = ({ complete, children }) => {
  return (
    <ListItem>
      <HStack spacing={3} align="start">
        <ListIcon
          as={complete ? CheckCircleIcon : WarningIcon}
          color={complete ? "green.400" : "yellow.400"}
          mt={1}
        />
        <Text>{children}</Text>
      </HStack>
    </ListItem>
  );
};

export default function ProjectSetupStatus() {
  if (isBlockchainConfigured && isSupabaseConfigured) return null;

  return (
    <Alert
      status="info"
      variant="subtle"
      rounded="md"
      alignItems="start"
      bg={useColorModeValue("blue.50", "whiteAlpha.100")}
    >
      <AlertIcon mt={1} />
      <Box>
        <Text fontWeight="semibold" mb={2}>
          Project setup is not complete yet
        </Text>
        <List spacing={2} fontSize="sm">
          <StatusItem complete={Boolean(chainConfig.rpcUrl)}>
            RPC URL in <Code>.env.local</Code>
          </StatusItem>
          <StatusItem complete={Boolean(chainConfig.factoryAddress)}>
            Deployed factory contract address in <Code>.env.local</Code>
          </StatusItem>
          <StatusItem complete={isSupabaseConfigured}>
            Supabase URL and anon key in <Code>.env.local</Code>
          </StatusItem>
        </List>
      </Box>
    </Alert>
  );
}
