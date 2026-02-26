"use client";

import { useEffect, useState } from "react";

// Page de retour après connexion OAuth réussie
// Récupère un JWT puis l'envoie au taskpane parent via Office.js messageParent
const AuthSuccessPage = () => {
  const [status, setStatus] = useState("Connexion réussie, récupération du token...");

  useEffect(() => {
    const init = async () => {
      // Récupérer le JWT custom (les cookies fonctionnent dans la popup)
      const res = await fetch("/api/auth/token");
      if (!res.ok) {
        setStatus("Erreur lors de la récupération du token.");
        return;
      }
      const { token } = await res.json();

      // Charger Office.js et envoyer le token au taskpane
      const script = document.createElement("script");
      script.src = "https://appsforoffice.microsoft.com/lib/1/hosted/office.js";
      script.onerror = () => {
        setStatus("Erreur de chargement Office.js. Fermez cette fenêtre manuellement.");
      };
      script.onload = () => {
        Office.onReady(() => {
          try {
            Office.context.ui.messageParent(
              JSON.stringify({ type: "auth_complete", token })
            );
            setStatus("Fermeture en cours...");
          } catch {
            // Fallback : messageParent non disponible (Desktop Windows)
            // Stocker le token pour que le taskpane puisse le récupérer
            try {
              localStorage.setItem("auth_token_transfer", token);
            } catch {
              // localStorage peut ne pas être disponible
            }
            setStatus("Connexion réussie ! Vous pouvez fermer cette fenêtre.");
          }
        });
      };
      document.head.appendChild(script);
    };

    init();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  );
};

export default AuthSuccessPage;
