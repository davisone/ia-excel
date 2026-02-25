"use client";

import { useEffect } from "react";

// Page de retour après connexion OAuth réussie
// Chargée dans le dialog Office.js - envoie un message au taskpane parent puis se ferme
const AuthSuccessPage = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://appsforoffice.microsoft.com/lib/1/hosted/office.js";
    script.onload = () => {
      Office.onReady(() => {
        Office.context.ui.messageParent("auth_complete");
      });
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Connexion réussie, fermeture en cours...</p>
    </div>
  );
};

export default AuthSuccessPage;
