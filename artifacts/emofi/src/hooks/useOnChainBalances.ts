import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, EMO_ABI, EMOFI_TOKEN_ABI, ALL_TOKEN_IDS, TOKEN_NAMES } from "@/lib/contracts";
import { formatEther } from "viem";

export function useEmoBalance(address: `0x${string}` | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.EMOToken,
    abi: EMO_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    raw: data as bigint | undefined,
    formatted: data ? parseFloat(formatEther(data as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—",
    isLoading,
    refetch,
  };
}

export function useAttributeBalances(address: `0x${string}` | undefined) {
  const addresses = address ? ALL_TOKEN_IDS.map(() => address) : [];
  const ids = ALL_TOKEN_IDS;

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.EmoFiToken,
    abi: EMOFI_TOKEN_ABI,
    functionName: "balanceOfBatch",
    args: address ? [addresses as `0x${string}`[], ids] : undefined,
    query: { enabled: !!address },
  });

  const balances: Record<string, bigint> = {};
  if (data) {
    (data as bigint[]).forEach((bal, i) => {
      const name = TOKEN_NAMES[i.toString()];
      if (name) balances[name] = bal;
    });
  }

  return { balances, isLoading, refetch };
}

export function useIsApproved(
  owner: `0x${string}` | undefined,
  operator: `0x${string}`,
) {
  const { data, refetch } = useReadContract({
    address: CONTRACTS.EmoFiToken,
    abi: EMOFI_TOKEN_ABI,
    functionName: "isApprovedForAll",
    args: owner ? [owner, operator] : undefined,
    query: { enabled: !!owner },
  });
  return { isApproved: data as boolean | undefined, refetch };
}

export function useEmoAllowance(
  owner: `0x${string}` | undefined,
  spender: `0x${string}`,
) {
  const { data, refetch } = useReadContract({
    address: CONTRACTS.EMOToken,
    abi: EMO_ABI,
    functionName: "allowance",
    args: owner ? [owner, spender] : undefined,
    query: { enabled: !!owner },
  });
  return { allowance: data as bigint | undefined, refetch };
}
