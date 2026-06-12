import { AppColors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { memo } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DEFAULT_BIO = "Brak opisu";

interface ProfileHeaderProps {
  user: any;
  reviewCount: number;
  pickImage: () => void;
  isEditingBio: boolean;
  setIsEditingBio: (val: boolean) => void;
  editBioText: string;
  setEditBioText: (val: string) => void;
  handleSaveBio: () => void;
  isReadOnly?: boolean;
}

const ProfileHeader = ({
  user,
  reviewCount,
  pickImage,
  isEditingBio,
  setIsEditingBio,
  editBioText,
  setEditBioText,
  handleSaveBio,
  isReadOnly = false,
}: ProfileHeaderProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.topProfileSection}>
        <TouchableOpacity
          onPress={isReadOnly ? undefined : pickImage}
          style={styles.avatarContainer}
          disabled={isReadOnly}
        >
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatarImage}
              transition={200}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarPlaceholderText}>
              {user.nazwa_uzytkownika?.charAt(0).toUpperCase() || "?"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{reviewCount}</Text>
            <Text style={styles.statLabel}>Recenzje</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user.data_dolaczenia}</Text>
            <Text style={styles.statLabel}>Dołączono</Text>
          </View>
        </View>
      </View>

      <View style={styles.bioContainer}>
        {isEditingBio && !isReadOnly ? (
          <View>
            <TextInput
              style={styles.bioInput}
              multiline
              value={editBioText}
              onChangeText={setEditBioText}
              placeholder="Napisz coś o sobie..."
              placeholderTextColor={AppColors.textGray}
              maxLength={128}
              autoFocus
            />
            {128 - editBioText.length <= 30 && (
              <Text style={styles.charCount}>
                Pozostało znaków: {128 - editBioText.length}
              </Text>
            )}
            <View style={styles.bioActions}>
              <TouchableOpacity onPress={() => setIsEditingBio(false)}>
                <Text style={styles.bioCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveBio}>
                <Text style={styles.bioSaveText}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            disabled={isReadOnly}
            onPress={() => {
              setEditBioText(user.opis || DEFAULT_BIO);
              setIsEditingBio(true);
            }}
          >
            <Text style={styles.bioText}>{user.opis || DEFAULT_BIO}</Text>
            {!isReadOnly && (
              <Text style={styles.editBioHint}>
                <MaterialIcons
                  name="edit"
                  size={14}
                  color={AppColors.textGray}
                />{" "}
                Edytuj opis
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default memo(ProfileHeader);

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  topProfileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#3a3c4f",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: AppColors.primary,
    overflow: "hidden",
    marginRight: 20,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarPlaceholderText: { fontSize: 36, color: "white", fontWeight: "bold" },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBox: { alignItems: "center" },
  statNumber: { color: "white", fontSize: 20, fontWeight: "bold" },
  statLabel: { color: AppColors.textGray, fontSize: 13, marginTop: 2 },
  bioContainer: { marginTop: 5 },
  usernameText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  bioText: { color: "#ddd", fontSize: 14, lineHeight: 20 },
  editBioHint: {
    color: AppColors.textGray,
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  bioInput: {
    backgroundColor: "#3a3c4f",
    color: "white",
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#555",
  },
  charCount: {
    color: AppColors.textGray,
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  bioActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 15,
  },
  bioCancelText: {
    color: AppColors.textGray,
    fontSize: 14,
    fontWeight: "bold",
    padding: 5,
  },
  bioSaveText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: "bold",
    padding: 5,
  },
});
