import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  useColorModeValue,
  useBreakpointValue,
  Container,
  Heading,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  useToast,
} from "@chakra-ui/react";
import { useWallet } from "use-wallet";

import NextLink from "next/link";
// import DarkModeSwitch from "./DarkModeSwitch";
import { ChevronDownIcon, HamburgerIcon } from "@chakra-ui/icons";
import chainConfig, { isBlockchainConfigured } from "../lib/blockchainConfig";
import {
  connectInjectedWallet,
  disconnectWallet,
  shortAddress,
  switchToConfiguredNetwork,
} from "../lib/wallet";

export default function NavBar() {
  const wallet = useWallet();
  const toast = useToast();
  const connectedToWrongNetwork =
    wallet.status === "connected" &&
    wallet.chainId &&
    Number(wallet.chainId) !== chainConfig.chainId;

  const handleSwitchNetwork = async () => {
    try {
      await switchToConfiguredNetwork();
    } catch (error) {
      toast({
        title: "Network switch failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

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

  const walletMenuLabel = connectedToWrongNetwork
    ? "Wrong Network"
    : shortAddress(wallet.account);

  return (
    <Box>
      <Flex
        color={useColorModeValue("gray.600", "white")}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={"solid"}
        borderColor={useColorModeValue("gray.200", "gray.900")}
        align={"center"}
        pos="fixed"
        top="0"
        w={"full"}
        minH={"60px"}
        boxShadow={"sm"}
        zIndex="999"
        justify={"center"}
        css={{
          backdropFilter: "saturate(180%) blur(5px)",
          backgroundColor: useColorModeValue(
            "rgba(8, 69, 76, 0.8)",
            "rgba(248, 252, 252, 0.8)"
          ),
        }}
      >
        <Container as={Flex} maxW={"7xl"} align={"center"}>
          <Flex flex={{ base: 1 }} justify="start" ml={{ base: -2, md: 0 }}>
            <Heading
              textAlign="left"
              fontFamily={"heading"}
              color={useColorModeValue("teal.900", "white")}
              as="h2"
              size="lg"
            >
              <Box>
                <NextLink href="/">BetterFund</NextLink>
              </Box>
            </Heading>
          </Flex>
          <Stack
            flex={{ base: 1, md: 0 }}
            justify={"flex-end"}
            direction={"row"}
            spacing={6}
            display={{ base: "none", md: "flex" }}
          >
            <Button
              fontSize={"md"}
              fontWeight={600}
              variant={"link"}
              display={{ base: "none", md: "inline-flex" }}
            >
              <NextLink href="/campaign/new">Create Campaign</NextLink>
            </Button>
            <Button
              fontSize={"md"}
              fontWeight={600}
              variant={"link"}
              display={{ base: "none", md: "inline-flex" }}
            >
              <NextLink href="/recommendations">Recommendations</NextLink>
            </Button>
            <Button
              fontSize={"md"}
              fontWeight={600}
              variant={"link"}
              display={{ base: "none", md: "inline-flex" }}
            >
              <NextLink href="/#howitworks"> How it Works</NextLink>
            </Button>

            {wallet.status === "connected" ? (
              <Menu>
                <MenuButton
                  as={Button}
                  colorScheme={connectedToWrongNetwork ? "red" : "teal"}
                  variant={connectedToWrongNetwork ? "solid" : "outline"}
                  rightIcon={<ChevronDownIcon />}
                >
                  {walletMenuLabel}
                </MenuButton>
                <MenuList>
                  <MenuItem isDisabled>{shortAddress(wallet.account, 10, 8)}</MenuItem>
                  {connectedToWrongNetwork ? (
                    <MenuItem onClick={handleSwitchNetwork}>
                      Switch to {chainConfig.chainName}
                    </MenuItem>
                  ) : null}
                  <MenuItem onClick={() => disconnectWallet(wallet)}>
                    {" "}
                    Disconnect Wallet{" "}
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <div>
                <Button
                  display={{ base: "none", md: "inline-flex" }}
                  fontSize={"md"}
                  fontWeight={600}
                  color={"white"}
                  bg={"teal.400"}
                  href={"#"}
                  _hover={{
                    bg: "teal.300",
                  }}
                  onClick={handleConnectWallet}
                >
                  Connect Wallet{" "}
                </Button>
              </div>
            )}

            {!isBlockchainConfigured ? (
              <Badge colorScheme="yellow" alignSelf="center">
                Setup Needed
              </Badge>
            ) : null}
            {/* <DarkModeSwitch /> */}
          </Stack>

          <Flex display={{ base: "flex", md: "none" }}>
            {/* <DarkModeSwitch /> */}
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Open navigation"
                icon={<HamburgerIcon />}
                variant="ghost"
                ml={2}
              />
              <MenuList>
                <NextLink href="/campaign/new" passHref>
                  <MenuItem as="a">Create Campaign</MenuItem>
                </NextLink>
                <NextLink href="/#howitworks" passHref>
                  <MenuItem as="a">How it Works</MenuItem>
                </NextLink>
                {wallet.status === "connected" ? (
                  <>
                    {connectedToWrongNetwork ? (
                      <MenuItem onClick={handleSwitchNetwork}>
                        Switch to {chainConfig.chainName}
                      </MenuItem>
                    ) : null}
                    <MenuItem onClick={() => disconnectWallet(wallet)}>
                      Disconnect Wallet
                    </MenuItem>
                  </>
                ) : (
                  <MenuItem onClick={handleConnectWallet}>
                    Connect Wallet
                  </MenuItem>
                )}
              </MenuList>
            </Menu>
          </Flex>
        </Container>
      </Flex>
    </Box>
  );
}
