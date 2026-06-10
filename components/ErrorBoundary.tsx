import { AppColors } from "@/constants/theme";
import React, { Component, ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled render errors anywhere in the subtree and shows a
 * user-friendly recovery screen instead of a blank crash.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Coś poszło nie tak</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Wystąpił nieoczekiwany błąd renderowania."}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
