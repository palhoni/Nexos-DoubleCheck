import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/httpClient';
import type { MyAreaResponse } from './minha-area.types';

export function useMyArea() {
  return useQuery({
    queryKey: ['my-area'],
    queryFn: () => httpClient.get<MyAreaResponse>('/minha-area').then((response) => response.data),
  });
}
