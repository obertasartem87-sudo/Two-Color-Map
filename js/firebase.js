/* Firebase Auth + Firestore. Встав свій конфіг із Firebase Console (Project settings → Your apps → Web).
   Ці ключі публічні за дизайном; безпеку забезпечують firebase/firestore.rules. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  appId: "YOUR_APP_ID"
};

const enabled = !firebaseConfig.apiKey.startsWith("YOUR_");
const cloud = window.TCMCloud = { enabled, user: null, username: null };

if (enabled) {
  const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
  cloud.signUp = async (email, pass, username) => {
    username = username.trim();
    if (username.length < 3 || username.length > 20) throw new Error("Нікнейм має містити 3–20 символів.");
    const c = await createUserWithEmailAndPassword(auth, email, pass);
    cloud.username = username;
    await setDoc(doc(db, "users", c.user.uid), { username, levelsCompleted: 0, stars: 0, progress: {} });
    await cloud.sync();
  };
  cloud.signIn = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
  cloud.signOut = () => signOut(auth);
  cloud.sync = async () => {
    if (!cloud.user) return;
    const t = window.TCM.totals(), data = { username: cloud.username, levelsCompleted: t.levels, stars: t.stars, progress: window.TCM.progress };
    if (t.best) data.bestTimeMs = t.best;
    await setDoc(doc(db, "users", cloud.user.uid), data, { merge: true });
  };
  cloud.fetchLeaderboard = async type => {
    const f = { progress: ["levelsCompleted", "desc"], stars: ["stars", "desc"], speed: ["bestTimeMs", "asc"], tournament: ["tournamentRating", "desc"] }[type];
    const snap = await getDocs(query(collection(db, "users"), orderBy(f[0], f[1]), limit(20)));
    return snap.docs.map(d => ({ username: d.data().username, value: d.data()[f[0]] })).filter(r => r.value > 0);
  };
  onAuthStateChanged(auth, async u => {
    cloud.user = u; cloud.username = null;
    if (u) {
      const s = await getDoc(doc(db, "users", u.uid));
      if (s.exists()) { cloud.username = s.data().username; window.TCM.mergeProgress(s.data().progress); }
      await cloud.sync();
    }
    window.dispatchEvent(new Event("tcm:auth"));
  });
}
window.dispatchEvent(new Event("tcm:cloud-ready"));
