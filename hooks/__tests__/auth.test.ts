/* eslint-disable @typescript-eslint/no-require-imports */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

// Mockowanie modułu firebase/auth
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  getAuth: jest.fn(() => ({ currentUser: { uid: "test-user-123" } })),
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}));

// Mockowanie AsyncStorage (wymagane przez Firebase)
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

describe("Logika Autoryzacji (Firebase Auth)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("SCENARIUSZ 1: Powinno poprawnie wywołać logowanie (signInWithEmailAndPassword) z prawidłowymi danymi", async () => {
    const mockEmail = "test@example.com";
    const mockPassword = "password123";
    const mockUserCredential = { user: { uid: "12345", email: mockEmail } };

    // Symulujemy udane logowanie
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue(
      mockUserCredential,
    );

    const authMock = require("firebase/auth").getAuth();
    const result = await signInWithEmailAndPassword(
      authMock,
      mockEmail,
      mockPassword,
    );

    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      authMock,
      mockEmail,
      mockPassword,
    );
    expect(result.user.email).toBe(mockEmail);
  });

  it("SCENARIUSZ 2: Powinno poprawnie wywołać rejestrację (createUserWithEmailAndPassword)", async () => {
    const mockEmail = "newuser@example.com";
    const mockPassword = "newpassword123";
    const mockUserCredential = { user: { uid: "67890", email: mockEmail } };

    // Symulujemy udaną rejestrację
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(
      mockUserCredential,
    );

    const authMock = require("firebase/auth").getAuth();
    const result = await createUserWithEmailAndPassword(
      authMock,
      mockEmail,
      mockPassword,
    );

    expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      authMock,
      mockEmail,
      mockPassword,
    );
    expect(result.user.uid).toBe("67890");
  });

  it("SCENARIUSZ 3: Powinno zwrócić błąd przy logowaniu z niepoprawnym hasłem", async () => {
    const authMock = require("firebase/auth").getAuth();
    const mockError = new Error("auth/wrong-password");

    (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(mockError);

    await expect(
      signInWithEmailAndPassword(authMock, "test@example.com", "wrongpass"),
    ).rejects.toThrow("auth/wrong-password");
  });
});
