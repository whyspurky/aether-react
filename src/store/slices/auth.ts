export interface AuthSlice {
  auth: {
    // свой client_id, пустая строка значит встроенный
    clientId: string;
  };
  setAuthClientId: (clientId: string) => void;
}

export const initialAuthState = {
  clientId: '',
};

export const createAuthSlice = (set: any) => ({
  auth: initialAuthState,

  setAuthClientId: (clientId: string) =>
    set((s: any) => ({ auth: { ...s.auth, clientId } })),
});
