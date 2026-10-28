import i18n from "i18next";
import axios from "../axios.config";

/** One cart line = one audiobook rental. */
export type CartItem = {
  id: string; // cart line id
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  price: number; // rental price in ₹
  rentalDays: number; // how long the rental lasts after payment
};

function fail(e: any, errorKey: string): never {
  if (e?.code === "ECONNABORTED") throw new Error(i18n.t("cart.errors.timeout"));
  if (e?.response || e?.request) throw new Error(i18n.t(errorKey));
  throw e; // our own readable Error from `call`
}

/** `user_id` + `language_code` are added by the axios interceptor. */
async function call(body: Record<string, unknown>, errorKey: string) {
  try {
    const { data } = await axios.post("/", body);
    if (data.statusCode !== 200) {
      throw new Error(data.msg || i18n.t(errorKey));
    }
    return data;
  } catch (e) {
    return fail(e, errorKey);
  }
}

export async function fetchCart(): Promise<CartItem[]> {
  const data = await call({ method: "getCart" }, "cart.errors.load");
  return ((data.items ?? []) as any[]).map((i) => ({
    id: String(i.cart_id ?? i.id),
    bookId: String(i.book_id),
    title: String(i.title),
    author: String(i.author ?? ""),
    coverUrl: String(i.cover_url ?? ""),
    price: Number(i.price),
    rentalDays: Number(i.rental_days) || 0,
  }));
}

/**
 * Call this from your book page's "Rent" button. The backend should reply
 * with statusCode 409 + msg if the book is already in the cart / already rented.
 */
export async function addToCart(bookId: string | number, rentalDays?: number) {
  await call(
    { method: "addToCart", book_id: bookId, ...(rentalDays ? { rental_days: rentalDays } : {}) },
    "cart.errors.add"
  );
}

export async function removeCartItem(id: string) {
  await call({ method: "removeCartItem", cart_id: id }, "cart.errors.remove");
}