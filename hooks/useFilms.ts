import { useGlobalMedia } from "./MediaContext";

export const useFilms = () => {
  const { film, isLoading, error } = useGlobalMedia();
  return { film, isLoading, error };
};
