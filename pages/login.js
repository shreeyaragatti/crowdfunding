import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Box, Button, Container, FormControl, FormLabel, Heading, Input, Stack, Text, useColorModeValue } from "@chakra-ui/react";
import { useAuth } from "../lib/authContext";
import supabase from "../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }
    await refreshProfile();
    const token = data.session?.access_token;
    let role = "creator";
    if (token) {
      const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      const profileData = await response.json();
      role = profileData.profile?.role || role;
    }
    router.push(role === "admin" ? "/admin" : "/creator");
    setLoading(false);
  };

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      <Head><title>Login | BetterFund</title></Head>
      <Container maxW="md" py={{ base: 12, md: 20 }} mt={{ base: "80px", md: "80px" }}>
        <Stack spacing={6}>
          <Heading as="h1" size="xl">Sign in</Heading>
          <Text color={useColorModeValue("gray.600", "gray.300")}>Use your creator or admin account.</Text>
          {error ? <Text color="red.500">{error}</Text> : null}
          <Box as="form" onSubmit={handleLogin} bg={useColorModeValue("white", "gray.800")} p={8} rounded="lg" boxShadow="md">
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormControl>
              <Button colorScheme="teal" type="submit" isLoading={loading}>Sign in</Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
