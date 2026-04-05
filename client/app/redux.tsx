import { useRef } from "react";
import {
  combineReducers,
  configureStore,
  isRejectedWithValue,
  Middleware,
} from "@reduxjs/toolkit";
import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  Provider,
} from "react-redux";
import globalReducer from "@/app/state";
import { api, getRtkQueryErrorMessage } from "@/app/state/api";
import { setupListeners } from "@reduxjs/toolkit/query";
import { toast } from "sonner";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

/* REDUX PERSISTENCE */
const createNoopStorage = () => {
  return {
    getItem(_key: any) {
      return Promise.resolve(null);
    },
    setItem(_key: any, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: any) {
      return Promise.resolve();
    },
  };
};

const storage =
  typeof window === "undefined"
    ? createNoopStorage()
    : createWebStorage("local");

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["global"],
};
const rootReducer = combineReducers({
  global: globalReducer,
  [api.reducerPath]: api.reducer,
});

/* REDUX TYPES */
export type RootState = ReturnType<typeof rootReducer>;

const persistedReducer = persistReducer(persistConfig, rootReducer);

const SILENT_ENDPOINTS = ["getMe", "logout"];

const rtkQueryErrorToast: Middleware = () => (next) => (action) => {
  if (!isRejectedWithValue(action)) {
    return next(action);
  }

  // Only mutations: avoids a false "error" toast when a refetch (e.g. after delete) fails while the mutation succeeded.
  if (!String(action.type).includes("executeMutation")) {
    return next(action);
  }

  const endpointName = (action.meta?.arg as { endpointName?: string })
    ?.endpointName;
  if (endpointName && SILENT_ENDPOINTS.includes(endpointName)) {
    return next(action);
  }

  const payload = action.payload as { status?: number } | undefined;
  const message =
    getRtkQueryErrorMessage(action.payload) ||
    (payload?.status === 500
      ? "Something went wrong on the server"
      : "Something went wrong");

  toast.error(message);
  return next(action);
};

/* REDUX STORE */
export const makeStore = () => {
  return configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(api.middleware, rtkQueryErrorToast),
  });
};

/* REDUX TYPES */
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/* PROVIDER */
export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>(undefined);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setupListeners(storeRef.current.dispatch);
  }
  const persistor = persistStore(storeRef.current);

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}
