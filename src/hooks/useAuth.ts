import { trpc } from "@/providers/trpc";

export function useAuth() {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { retry: false, staleTime: 5 * 60 * 1000 });

  const login = trpc.auth.login.useMutation({
    onSuccess: (user) => {
      utils.auth.me.setData(undefined, user);
    },
  });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.invalidate();
    },
  });

  return {
    user: me.data ?? null,
    isLoading: me.isLoading,
    isAuthenticated: !!me.data,
    login,
    logout,
  };
}

export type AuthUser = NonNullable<ReturnType<typeof useAuth>["user"]>;
