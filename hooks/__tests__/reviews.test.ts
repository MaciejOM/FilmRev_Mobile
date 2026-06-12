import {
    addFirebaseReview,
    deleteFirebaseReview,
    updateFirebaseReview,
} from "../firebaseDatabase";

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock("../firebaseConfig", () => ({ db: {} }));

const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDeleteDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock("firebase/firestore", () => ({
  addDoc: (...args: any[]) => mockAddDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  doc: jest.fn((_db, col, id) => ({ _col: col, _id: id })),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _type: "serverTimestamp" })),
  arrayRemove: jest.fn((v) => ({ _remove: v })),
  arrayUnion: jest.fn((v) => ({ _union: v })),
}));

const emptyQuerySnapshot = { forEach: jest.fn(), docs: [] };

describe("addFirebaseReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue(emptyQuerySnapshot);
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it("returns { success: true, id } when Firestore write succeeds", async () => {
    mockAddDoc.mockResolvedValue({ id: "rev_001" });

    const result = await addFirebaseReview(
      "movie_1",
      "user1",
      "Janusz",
      null,
      8,
      "Świetny film!",
      [],
    );

    expect(result).toEqual({ success: true, id: "rev_001" });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it("returns { success: false, error } when Firestore throws", async () => {
    mockAddDoc.mockRejectedValue(new Error("permission-denied"));

    const result = await addFirebaseReview(
      "movie_1",
      "user1",
      "Janusz",
      null,
      8,
      "...",
      [],
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("permission-denied");
  });
});

describe("deleteFirebaseReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDocs.mockResolvedValue(emptyQuerySnapshot);
  });

  it("deletes the document and returns { success: true }", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ movieId: "movie_1", ocena: 8, userId: "user1" }),
    });

    const result = await deleteFirebaseReview("rev_001");

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it("returns { success: true } even when review doc does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await deleteFirebaseReview("rev_ghost");

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });
});

describe("updateFirebaseReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDocs.mockResolvedValue(emptyQuerySnapshot);
  });

  it("calls updateDoc with new content and marks isEdited=true", async () => {
    const result = await updateFirebaseReview(
      "rev_001",
      "movie_1",
      9,
      "Zaktualizowana recenzja",
      ["rewelacja"],
    );

    expect(result).toEqual({ success: true });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ocena: 9,
        tresc: "Zaktualizowana recenzja",
        tags: ["rewelacja"],
        isEdited: true,
      }),
    );
  });
});
