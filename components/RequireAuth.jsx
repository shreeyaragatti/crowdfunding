import { useEffect } from "react";
import { useRouter } from "next/router";
import { Spinner, Box } from "@chakra-ui/react";
import { useAuth } from "../lib/authContext";

export default function RequireAuth({ role, children }) {
  const router = useRouter();
  const { loading, session, profile } = useAuth();

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

  if (loading || !session || !profile) {
    return (
      <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (role && profile.role !== role) {
    return null;
  }

  return children;
}
