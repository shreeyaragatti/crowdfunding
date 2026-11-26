import { useEffect } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Spinner,
} from "@chakra-ui/react";
import { useAuth } from "../lib/authContext";

export default function RequireAuth({ role, children }) {
  const router = useRouter();
  const { loading, session, profile, profileError, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`);
      return;
    }
    if (role && profile && profile.role !== role) {
      router.replace(profile.role === "admin" ? "/admin" : "/creator");
    }
  }, [loading, session, profile, role, router]);

  if (loading || !session) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center" px={4}>
        <Alert status="error" rounded="md" maxW="lg" alignItems="start">
          <AlertIcon mt={1} />
          <AlertDescription flex="1">
            {profileError || "Your account profile could not be loaded."}
          </AlertDescription>
          <Button size="sm" ml={4} onClick={() => signOut()}>
            Sign out
          </Button>
        </Alert>
      </Box>
    );
  }

  if (role && profile.role !== role) {
    return null;
  }

  return children;
}
