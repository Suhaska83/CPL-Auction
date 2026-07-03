import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isFirebaseConfigured, onAuth } from "@/firebase";
import { ref, onValue } from "firebase/database";
import { getFirebase } from "@/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminNodeExists, setAdminNodeExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const { db } = getFirebase();

    // Watch the /admins node so the UI can offer a "claim admin" bootstrap
    const adminsRef = ref(db, "admins");
    const unsubAdmins = onValue(adminsRef, (snap) => {
      setAdminNodeExists(snap.exists());
    });

    let unsubUser: (() => void) | null = null;
    if (user) {
      const uref = ref(db, `admins/${user.uid}`);
      unsubUser = onValue(uref, (snap) => {
        setIsAdmin(!!snap.val());
      });
    } else {
      setIsAdmin(false);
    }
    return () => {
      unsubAdmins();
      unsubUser?.();
    };
  }, [user]);

  return { user, loading, isAdmin, adminNodeExists };
}
