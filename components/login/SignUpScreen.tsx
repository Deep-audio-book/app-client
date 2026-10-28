import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../ui/theme";

const c = theme.colors;

/* ------------------------------------------------------------------ */
/*  Field                                                              */
/* ------------------------------------------------------------------ */
type FieldProps = TextInputProps & {
  label: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputRef?: React.RefObject<TextInput | null>;
};

function Field({ label, left, right, containerStyle, inputRef, style, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        {left}
        <TextInput
          ref={inputRef}
          style={[styles.input, style]}
          placeholderTextColor="#6B6B6B"
          selectionColor={c.accent}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */
export type SignUpValues = {
  name: string;
  email: string;
  password: string;
  mobile: string;
  countryCode: number;
};

type Props = {
  /** Throw an Error(message) to show it under the form. */
  onSubmit: (values: SignUpValues) => Promise<void>;
  onSignIn: () => void;
};

export default function SignUpScreen({ onSubmit, onSignIn }: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("91");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    if (!name.trim()) return "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email address.";
    if (!/^\d{1,4}$/.test(countryCode)) return "Enter a valid country code.";
    if (!/^\d{6,15}$/.test(mobile)) return "Enter a valid mobile number.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords don't match.";
    return null;
  };

  const submit = async () => {
    if (loading) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        mobile,
        countryCode: Number(countryCode),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[c.backgroundTop, c.background]}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 28,
            paddingTop: insets.top + 56,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          }}
        >
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Listen to audiobooks and watch video titles anywhere.
          </Text>

          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <Field
            label="Email"
            inputRef={emailRef}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => mobileRef.current?.focus()}
          />
          <View style={styles.row}>
            <Field
              label="Code"
              containerStyle={styles.codeField}
              value={countryCode}
              onChangeText={(t) => setCountryCode(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              left={<Text style={styles.prefix}>+</Text>}
            />
            <Field
              label="Mobile number"
              containerStyle={styles.mobileField}
              inputRef={mobileRef}
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 15))}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>
          <Field
            label="Password"
            inputRef={passwordRef}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            right={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={c.textSecondary}
                />
              </Pressable>
            }
          />
          <Field
            label="Confirm password"
            inputRef={confirmRef}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator color={c.onAccent} />
            ) : (
              <Text style={styles.primaryText}>Sign up</Text>
            )}
          </Pressable>

          <Pressable
            onPress={onSignIn}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Already have an account? Sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: c.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 32,
    fontSize: 15,
    lineHeight: 22,
    color: c.textSecondary,
    textAlign: "center",
  },

  field: { marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  codeField: { width: 96 },
  mobileField: { flex: 1 },
  prefix: { marginRight: 2, fontSize: 16, color: c.textSecondary },
  label: { marginBottom: 8, fontSize: 15, fontWeight: "500", color: c.textPrimary },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  inputFocused: { borderColor: c.accent },
  input: { flex: 1, height: "100%", fontSize: 16, color: c.textPrimary },

  error: { marginBottom: 4, fontSize: 14, lineHeight: 20, color: c.error },

  primaryBtn: {
    marginTop: 16,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 18, fontWeight: "600", color: c.onAccent },
  secondaryBtn: {
    marginTop: 14,
    height: 50,
    borderRadius: 25,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 15, fontWeight: "500", color: c.textPrimary },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});