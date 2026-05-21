import { Platform, StyleSheet } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: { text: '#11181C', background: '#fff', tint: tintColorLight, icon: '#687076', tabIconDefault: '#687076', tabIconSelected: tintColorLight },
  dark: { text: '#ECEDEE', background: '#151718', tint: tintColorDark, icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: tintColorDark },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", serif: "Georgia, 'Times New Roman', serif", rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif", mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
});

// Kolory aplikacji
export const AppColors = {
    background: '#27282e', 
    headerBackground: '#121212',
    primary: '#a83350', 
    buttonPrimary: '#a83350',
    buttonDanger: '#cc002c',
    textWhite: '#ffffff',
    textGray: '#aaaaaa',
    inputBackground: '#ffffff',
};

// Stylizacja globalna dla wszystkich ekranów (Jeśli elementy się pokrywają)
export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: AppColors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    authContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    header: {
        width: '100%',
        height: 100,
        backgroundColor: AppColors.headerBackground,
        justifyContent: 'flex-end',
        paddingBottom: 15,
    },
    headerText: {
        fontWeight: 'bold',
        marginLeft: 20,
        fontSize: 24,
        color: AppColors.textWhite,
    },
    input: {
        height: 50,
        width: '100%',
        backgroundColor: AppColors.inputBackground,
        borderRadius: 5,
        paddingHorizontal: 15,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        width: '100%',
        backgroundColor: AppColors.buttonPrimary,
        paddingVertical: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDanger: {
        width: '100%',
        backgroundColor: AppColors.buttonDanger,
        paddingVertical: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: AppColors.textWhite,
        fontSize: 18,
        fontWeight: 'bold',
    },
    filmBanner: {
        width: 130,
        marginRight: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    filmImage: { 
        width: '100%', 
        height: 195,
        borderRadius: 8
    },
    emptyText: {
        color: AppColors.textGray,
        textAlign: 'center',
        marginTop: 10,
        fontSize: 16,
    },
    loadingText: {
        color: AppColors.textWhite,
        marginTop: 10,
    }
});