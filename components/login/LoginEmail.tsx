import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useState } from 'react';
import {
  ActivityIndicator,
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
import axios from '../../axios.config';
import { loginUser } from '../../redux/slices/authReducer'; // path adjust pண்ணுங்க
import { useAppDispatch } from '../../utils/typedReduxHooks'; // path adjust pண்ணுங்க
import styles from './style';


export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('Team'); // unga flow padi vachikonga
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleSignIn = async () => {
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.post('/', {
        method: 'authUser',
        name: name,
        email_id: email,
        password: password,
      });

      if (data.statusCode === 200) {
        // ✅ username & email Redux + AsyncStorage 
        await dispatch(loginUser({
          username: data.data.firstName,
          email: data.data.email,
        }));

        // success aana mattum next page poganum
        router.push("/home");
      } else {
        // 401, 404 etc - error
        // for test
        router.push("/home");
        setErrorMsg(data.msg || 'Login failed. Please try again.');
      }
    } catch (error: any) {
        router.push("/home");
      console.log("Error code:", error.code);
      console.log("Error message:", error.message);
      console.log("Error response:", error.response);
      console.log("Error request:", error.request);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
        router.push("/home");
      setLoading(false);
    }
  };

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
                source={require('../../assets/images/deep-logo.png')}
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

              {errorMsg ? (
                <Text style={{ color: '#FF6B6B', marginBottom: 10 }}>
                  {errorMsg}
                </Text>
              ) : null}

              <Pressable
                onPress={handleSignIn}
                disabled={loading}
                style={({ pressed }) => [
                  styles.signInButton,
                  pressed && styles.pressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign in</Text>
                )}
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