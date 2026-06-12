import { useGlobalMedia } from "./MediaContext";

export const useTV = () => {
  const { Tv, isLoading, error } = useGlobalMedia();
  return { Tv, isLoading, error };
};
