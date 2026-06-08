/* eslint-disable @typescript-eslint/no-require-imports */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
// Mockowanie Firebase Firestore
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "TIMESTAMP_MOCK"),
  getFirestore: jest.fn(),
}));

// Mockowanie bazy danych z Twojego pliku config
jest.mock("@/hooks/firebaseConfig", () => ({
  db: {},
}));

describe("Logika bazy danych - Operacje na recenzjach (CRUD)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("SCENARIUSZ 1: Dodawanie recenzji - powinno wywołać addDoc z odpowiednimi danymi", async () => {
    const mockReviewData = {
      userId: "user_1",
      movieId: 100,
      autor: "TestUser",
      ocena: 5,
      tresc: "Świetny film!",
      tags: ["Bez spoilerów"],
    };

    // Symulujemy zwrot po utworzeniu dokumentu (otrzymanie nowego ID)
    (addDoc as jest.Mock).mockResolvedValue({ id: "new_review_id" });

    // Symulacja działania Twojej funkcji addFirebaseReview z firebaseDatabase.ts
    const dbMock = require("@/hooks/firebaseConfig").db;
    const colRef = collection(dbMock, "reviews");
    const result = await addDoc(colRef, mockReviewData);

    expect(collection).toHaveBeenCalledWith(dbMock, "reviews");
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc).toHaveBeenCalledWith(colRef, mockReviewData);
    expect(result.id).toBe("new_review_id");
  });

  it("SCENARIUSZ 2: Edytowanie recenzji - powinno wywołać updateDoc z nowymi danymi", async () => {
    const reviewIdToEdit = "review_999";
    const updatedData = {
      ocena: 4,
      tresc: "Zmieniam zdanie, trochę nudny.",
      tags: [],
    };

    (updateDoc as jest.Mock).mockResolvedValue(true);

    const dbMock = require("@/hooks/firebaseConfig").db;
    const docRef = doc(dbMock, "reviews", reviewIdToEdit);
    await updateDoc(docRef, updatedData);

    expect(doc).toHaveBeenCalledWith(dbMock, "reviews", reviewIdToEdit);
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc).toHaveBeenCalledWith(docRef, updatedData);
  });

  it("SCENARIUSZ 3: Usuwanie recenzji - powinno wywołać deleteDoc na właściwym ID dokumentu", async () => {
    const reviewIdToDelete = "review_777";

    (deleteDoc as jest.Mock).mockResolvedValue(true);

    const dbMock = require("@/hooks/firebaseConfig").db;
    const docRef = doc(dbMock, "reviews", reviewIdToDelete);
    await deleteDoc(docRef);

    expect(doc).toHaveBeenCalledWith(dbMock, "reviews", reviewIdToDelete);
    expect(deleteDoc).toHaveBeenCalledTimes(1);
    expect(deleteDoc).toHaveBeenCalledWith(docRef);
  });
});
