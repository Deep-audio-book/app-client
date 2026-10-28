import { useRouter } from "expo-router";
import React from "react";
import { Alert } from "react-native";

import { registerUser } from "../api/Auth";
import { loginUser } from "../redux/slices/authReducer";
import { useAppDispatch } from "../utils/typedReduxHooks";

import SignUpScreen from "../components/login/SignUpScreen";


export default function SignUp() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  return (
    <SignUpScreen
      onSubmit={async (values) => {
        const user = await registerUser(values); // throws a readable message on failure

        // Backend didn't return the user -> let them sign in manually.
        if (user?.userId == null) {
          Alert.alert("Account created", "Sign in to start listening.");
          router.replace("/sign-in");
          return;
        }

        // Same call your sign-in screen makes, so they land logged in.
        await dispatch(
          loginUser({
            username: user.firstName ?? values.name,
            email: user.email ?? values.email,
            userId: user.userId,
          })
        );
        router.replace("/home");
      }}
      onSignIn={() => router.replace("/sign-in")}
    />
  );
}