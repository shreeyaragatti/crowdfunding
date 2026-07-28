import NextLink from "next/link";
import {
  Box,
  Image,
  Flex,
  Heading,
  Text,
  Progress,
  Icon,
  Tooltip,
  chakra,
  useColorModeValue,
  Badge,
  Stack,
} from "@chakra-ui/react";
import { FaHandshake } from "react-icons/fa";
import web3 from "../smart-contract/web3";
import { getWEIPriceInUSD } from "../lib/getETHPrice";

export default function CampaignCard({
  id,
  name,
  description,
  creatorId,
  imageURL,
  balance,
  target,
  ethPrice,
  isDevMode,
  proofCount,
  donorCount,
}) {
  const bgColor = useColorModeValue("white", "gray.800");
  const badgeBg = isDevMode ? "yellow.400" : "teal.400";
  const badgeText = isDevMode ? "black" : "white";
  const progressColor = isDevMode ? "yellow" : "teal";
  const hoverShadow = useColorModeValue(
    "0px 12px 24px rgba(0, 0, 0, 0.15)",
    "0px 12px 24px rgba(0, 0, 0, 0.5)"
  );
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const balanceEth = web3.utils.fromWei(balance || "0", "ether");
  const targetEth = web3.utils.fromWei(target || "0", "ether");
  const progressPercent = Math.min(100, (Number(balanceEth) / Number(targetEth)) * 100 || 0);
  const balanceUSD = getWEIPriceInUSD(ethPrice, balance || "0");
  const targetUSD = getWEIPriceInUSD(ethPrice, target || "0");

  return (
    <NextLink href={`/campaign/${id}`}>
      <Box
        bg={bgColor}
        maxW={{ md: "sm" }}
        borderWidth="1px"
        borderColor={borderColor}
        rounded="lg"
        shadow="md"
        position="relative"
        overflow="hidden"
        transition="all 0.3s ease"
        _hover={{
          shadow: hoverShadow,
          transform: "translateY(-8px)",
        }}
        cursor="pointer"
      >
        {/* Image Container */}
        <Box height="200px" position="relative" overflow="hidden">
          <Image
            src={imageURL}
            alt={`Picture of ${name}`}
            fallbackSrc="/no-requests.svg"
            objectFit="cover"
            w="full"
            h="full"
            transition="transform 0.3s ease"
            _groupHover={{ transform: "scale(1.05)" }}
          />
          {/* Badge */}
          <Badge
            position="absolute"
            top={3}
            right={3}
            bg={badgeBg}
            color={badgeText}
            px={3}
            py={1}
            rounded="md"
            fontSize="xs"
            fontWeight="bold"
          >
            {isDevMode ? "🔧 Dev Mode" : "📱 Live"}
          </Badge>

          {/* Proof indicator */}
          {proofCount > 0 && (
            <Badge
              position="absolute"
              top={3}
              left={3}
              bg="green.500"
              color="white"
              px={2}
              py={1}
              rounded="md"
              fontSize="xs"
              fontWeight="bold"
            >
              ✓ {proofCount} Proof{proofCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </Box>

        <Box p={5}>
          {/* Header */}
          <Flex justify="space-between" align="start" gap={3} mb={3}>
            <Box>
              <Heading as="h3" size="md" isTruncated>
                {name}
              </Heading>
              <Text color="gray.500" fontSize="sm" isTruncated mt={1}>
                by {creatorId?.slice(0, 8)}...
              </Text>
            </Box>
            <Tooltip label="Contribute to this campaign" bg={useColorModeValue("white", "gray.700")} placement="top">
              <chakra.a display="flex">
                <Icon as={FaHandshake} h={6} w={6} color={progressColor + ".400"} flexShrink={0} />
              </chakra.a>
            </Tooltip>
          </Flex>

          {/* Description */}
          <Text fontSize="sm" color="gray.600" noOfLines={2} mb={4}>
            {description}
          </Text>

          {/* Stats */}
          <Stack spacing={2} mb={4}>
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" fontWeight="bold">
                Raised
              </Text>
              <Text fontSize="sm" color="gray.600">
                Target
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontSize="lg" fontWeight="bold">
                  {balanceEth}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  ${balanceUSD}
                </Text>
              </Box>
              <Box textAlign="right">
                <Text fontSize="lg" fontWeight="bold">
                  {targetEth} ETH
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="normal">
                  ${targetUSD}
                </Text>
              </Box>
            </Flex>
          </Stack>

          {/* Progress Bar */}
          <Box mb={3}>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="xs" fontWeight="bold">
                Progress
              </Text>
              <Text fontSize="xs" fontWeight="bold" color={progressColor + ".500"}>
                {progressPercent.toFixed(0)}%
              </Text>
            </Flex>
            <Progress value={progressPercent} colorScheme={progressColor} size="sm" rounded="full" />
          </Box>

          {/* Donors info */}
          {donorCount > 0 && (
            <Text fontSize="xs" color="gray.600" textAlign="center">
              {donorCount} donor{donorCount !== 1 ? "s" : ""}
            </Text>
          )}
        </Box>
      </Box>
    </NextLink>
  );
}
