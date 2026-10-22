import { useQuery, useMutation, useQueryClient, type Query } from '@tanstack/react-query';
import { negotiationsApi } from '@/api/client';
import type { NegotiationSummary, NegotiationDetail } from '@/types';

export function useNegotiations(archived = false, search?: string) {
  return useQuery<NegotiationSummary[]>({
    queryKey: ['negotiations', { archived, search }],
    queryFn: async () => {
      const res = await negotiationsApi.list(archived, search);
      return res.data;
    },
    staleTime: 5000,
  });
}

export function useNegotiation(
  id: number,
  options?: {
    refetchInterval?: number | false | ((query: Query<NegotiationDetail, Error>) => number | false);
  }
) {
  return useQuery<NegotiationDetail>({
    queryKey: ['negotiation', id],
    queryFn: async () => {
      const res = await negotiationsApi.get(id);
      return res.data;
    },
    enabled: !isNaN(id) && id > 0,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateNegotiation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      scenario_type: string;
      mode: string;
      config: object;
      max_rounds: number;
    }) => {
      const res = await negotiationsApi.create(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    },
  });
}

export function useUpdateNegotiation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; is_archived?: boolean } }) => {
      const res = await negotiationsApi.update(id, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      queryClient.invalidateQueries({ queryKey: ['negotiation', variables.id] });
    },
  });
}

export function useDeleteNegotiation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await negotiationsApi.delete(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    },
  });
}

export function useStartNegotiation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await negotiationsApi.start(id);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', id] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    },
  });
}

export function usePauseNegotiation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await negotiationsApi.pause(id);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', id] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    },
  });
}

export function useEndNegotiation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await negotiationsApi.end(id);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', id] });
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    },
  });
}

export function useSubmitOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      offerData,
      message,
    }: {
      id: number;
      offerData: object;
      message?: string;
    }) => {
      const res = await negotiationsApi.submitOffer(id, offerData, message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', variables.id] });
    },
  });
}
