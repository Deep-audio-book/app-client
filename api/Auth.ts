import axios from "../axios.config";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  mobile: string; // digits only, e.g. "7896547850"
  countryCode: number; // e.g. 91
};

// Assumed to match what `authUser` returns. If your `signup` response is
// different (or has no `data`), the sign-up route falls back to the sign-in screen.
export type RegisterResponse = {
  userId: number; // must match UserData.userId in authReducer
  firstName: string;
  email: string;
};

export async function registerUser({
  name,
  email,
  password,
  mobile,
  countryCode,
}: RegisterInput): Promise<RegisterResponse | null> {
  try {
    const { data } = await axios.post("/", {
      method: "signup",
      name,
      email_id: email,
      password,
      mobile,
      country_code: countryCode,
    });

    if (data.statusCode !== 200 && data.statusCode !== 201) {
      throw new Error(data.msg || "Sign up failed. Please try again.");
    }
    return (data.data as RegisterResponse) ?? null;
  } catch (e: any) {
    if (e?.code === "ECONNABORTED") {
      throw new Error("Request timed out. Check your connection and try again.");
    }
    if (e?.response || e?.request) {
      throw new Error("Something went wrong. Please try again.");
    }
    throw e; // our own readable Error from above
  }
}