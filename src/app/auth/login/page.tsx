"use client";

import { useEffect } from "react";

// Page intermédiaire ouverte par Office.js displayDialogAsync
// Redirige vers Azure AD avec le bon callbackUrl
const AuthLoginPage = () => {
  useEffect(() => {
    const callbackUrl = `${window.location.origin}/auth/success`;
    window.location.href = `/api/auth/signin/azure-ad?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Redirection vers Microsoft...</p>
    </div>
  );
};

export default AuthLoginPage;
