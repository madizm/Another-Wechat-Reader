import { create } from "zustand";
import { StoreApi, UseBoundStore } from "zustand";
import { persist } from "zustand/middleware";

interface ClientState {
  selectedBookId: string;
  selectedReviewId: string;
  needLogin: boolean;

  setSelectedBookId: (bookId: string) => void;
  setSelectedReviewId: (reviewId: string) => void;
  setNeedLogin: (needLogin: boolean) => void;
}
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
  }

  return store;
};

const store = create<ClientState>()((set) => ({
  selectedBookId: "",
  selectedReviewId: "",
  needLogin: false,

  setSelectedBookId: (bookId) => set({ selectedBookId: bookId }),
  setSelectedReviewId: (reviewId) => set({ selectedReviewId: reviewId }),
  setNeedLogin: (needLogin) => set({ needLogin }),
}));

export const useStore = createSelectors(store);

// store.subscribe(() => console.log(useStore.getState()));
