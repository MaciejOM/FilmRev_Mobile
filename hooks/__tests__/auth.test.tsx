import { act, renderHook, waitFor } from "@testing-library/react-native";
import { onAuthStateChanged } from "firebase/auth";
import React from "react";

import { AuthProvider, useAuth } from "../AuthContext";

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock("../firebaseConfig", () => ({ auth: {} }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  let capturedCallback: ((user: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallback = null;
    (onAuthStateChanged as jest.Mock).mockImplementation(
      (_auth: any, cb: any) => {
        capturedCallback = cb;
        return jest.fn();
      },
    );
  });

  it("starts with isLoading=true and isLogged=false before Firebase responds", async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLogged).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("sets isLogged=true when Firebase resolves with a user", async () => {
    const fakeUser = { uid: "abc123", email: "jan@example.com" };
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      capturedCallback?.(fakeUser);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLogged).toBe(true);
    expect(result.current.user).toEqual(fakeUser);
  });

  it("sets isLogged=false and clears user when Firebase resolves with null", async () => {
    const fakeUser = { uid: "abc123", email: "jan@example.com" };
    const { result } = await renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      capturedCallback?.(fakeUser);
    });
    await waitFor(() => expect(result.current.isLogged).toBe(true));

    await act(async () => {
      capturedCallback?.(null);
    });
    await waitFor(() => expect(result.current.isLogged).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("throws when useAuth is called outside AuthProvider", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    let thrownError: any = null;

    await renderHook(() => {
      try {
        return useAuth();
      } catch (e: any) {
        thrownError = e;
        return null as any;
      }
    });

    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toContain(
      "useAuth musi być używane wewnątrz AuthProvider",
    );
    consoleError.mockRestore();
  });
});
