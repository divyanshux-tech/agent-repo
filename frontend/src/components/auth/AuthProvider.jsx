import React, { createContext, useContext } from 'react';
import { ClerkProvider, useUser, useAuth } from '@clerk/clerk-react';

const AuthContext = createContext(null);

const ClerkAuthWrapper = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  return (
    <AuthContext.Provider value={{ user, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

const MockAuthWrapper = ({ children }) => {
  const mockContext = {
    user: {
      id: "mock_local_user_123",
      primaryEmailAddress: { emailAddress: "mock_local_user@gmail.com" },
      fullName: "Local Developer"
    },
    getToken: async () => "mock_token"
  };
  
  return (
    <AuthContext.Provider value={mockContext}>
      {children}
    </AuthContext.Provider>
  );
};

export const SmartAuthProvider = ({ children }) => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        <ClerkAuthWrapper>
          {children}
        </ClerkAuthWrapper>
      </ClerkProvider>
    );
  }

  console.warn("No VITE_CLERK_PUBLISHABLE_KEY found. Using MockAuthWrapper for local dev.");
  return (
    <MockAuthWrapper>
      {children}
    </MockAuthWrapper>
  );
};

export const useSmartAuth = () => useContext(AuthContext);
