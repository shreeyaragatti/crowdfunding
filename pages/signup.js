import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Box, Button, Container, FormControl, FormLabel, Heading, Input, Stack, Text, useColorModeValue } from "@chakra-ui/react";
import { authFetch } from "../lib/authContext";
import supabase from "../lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const response = await authFetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error || "Could not create your account.");
      return;
    }

    if (supabase) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setLoading(false);
        setError(signInError.message);
        return;
      }
    }
    router.push("/creator");
    setLoading(false);
  };

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      <Head><title>Create account | BetterFund</title></Head>
      <Container maxW="md" py={{ base: 12, md: 20 }} mt={{ base: "80px", md: "80px" }}>
        <Stack spacing={6}>
          <Heading as="h1" size="xl">Create a creator account</Heading>
          <Text color={useColorModeValue("gray.600", "gray.300")}>Campaigns start as free drafts and are reviewed before publication.</Text>
          {error ? <Text color="red.500">{error}</Text> : null}
          <Box as="form" onSubmit={handleSignup} bg={useColorModeValue("white", "gray.800")} p={8} rounded="lg" boxShadow="md">
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Full name</FormLabel>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormControl>
              <Button colorScheme="teal" type="submit" isLoading={loading}>Create account</Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
