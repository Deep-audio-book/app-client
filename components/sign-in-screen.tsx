import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();


  return (
    <View style={styles.container}>
      <View style={styles.photo} />

      <LinearGradient
        colors={['rgba(0,0,0,0)', '#000000', '#000000']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>

            <View style={styles.spacer} />

            <View style={styles.form}>
              <Image
                source={require('../assets/images/deep-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />

            <Text style={styles.title}>Sign in</Text>

              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#FFFFFF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#FFFFFF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="password"
                  returnKeyType="done"
                />
              </View>

              <Pressable
                onPress={() => router.push("/home")}
                style={({ pressed }) => [
                  styles.signInButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.signInButtonText}>Sign in</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.forgotButton,
                  pressed && styles.pressed,
                ]}
                hitSlop={8}>
                <Text style={styles.forgotText}>
                  Forgot your login or password?
                </Text>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [
                  styles.createAccountButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.createAccountText}>
                  Create account
                </Text>
              </Pressable>

              <Text style={styles.priceText}>
                {/* Free for 3 months, then $12 a month */}
              </Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  flex: {
    flex: 1,
  },

  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '64%',
    backgroundColor: '#2E635B',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingBottom: 24,
  },

  spacer: {
    height: 60,
  },

  form: {
    width: '100%',
    alignItems: 'center',
  },

  logo: {
  width: '100%',
  height: 320,
  alignSelf: 'center',
  marginBottom: 8,
},
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 20,
  },

  field: {
    width: '100%',
    minHeight: 58,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    marginBottom: 14,
  },

  input: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },

  signInButton: {
    width: '100%',
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  signInButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '500',
  },

  forgotButton: {
    marginTop: 16,
    alignItems: 'center',
  },

  forgotText: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  footer: {
    marginTop: 40,
    alignItems: 'center',
  },

  createAccountButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },

  createAccountText: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  priceText: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 10,
    fontSize: 13,
  },

  pressed: {
    opacity: 0.7,
  },
});