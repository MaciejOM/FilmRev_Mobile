import { onAuthStateChanged, User } from "firebase/auth";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth } from "./firebaseConfig";

interface AuthContextType {
  user: User | null;
  isLogged: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Centralny nasłuchiwacz sesji Firebase. Reaguje automatycznie na zalogowanie,
  // wylogowanie i odświeżenie tokenu, dzięki czemu cała aplikacja zawsze zna aktualny
  // stan logowania bez ręcznego przekazywania go między ekranami.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          setIsLogged(true);
        } else {
          setUser(null);
          setIsLogged(false);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Błąd podczas nasłuchiwania stanu autoryzacji:", error);
        setIsLoading(false);
      },
    );

    // Funkcja zwracana z useEffect odpina nasłuchiwacz przy odmontowaniu (sprzątanie).
    return unsubscribe;
  }, []);

  // useMemo daje stabilną referencję obiektu kontekstu, dopóki dane się nie zmienią,
  // co zapobiega niepotrzebnym re-renderom wszystkich komponentów czytających ten kontekst.
  const value = useMemo(
    () => ({ user, isLogged, isLoading }),
    [user, isLogged, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook do szybkiego używania w dowolnym ekranie aplikacji
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth musi być używane wewnątrz AuthProvider");
  }
  return context;
};
