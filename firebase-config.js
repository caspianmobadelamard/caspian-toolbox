// firebase-config.js
// تنظیمات Firebase برای sync قیمت‌ها

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkuhTdNakyud5tnV8JSAN_pFIUPRM_ajA",
  authDomain: "caspian-tank-calculator.firebaseapp.com",
  databaseURL: "https://caspian-tank-calculator-default-rtdb.firebaseio.com",
  projectId: "caspian-tank-calculator",
  storageBucket: "caspian-tank-calculator.firebasestorage.app",
  messagingSenderId: "953131912536",
  appId: "1:953131912536:web:59edef8fc3699d6c9f692d",
  measurementId: "G-1CGSTGR4NB"
};

// Firebase SDK URLs
const FIREBASE_SDK = {
  app: "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js",
  database: "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"
};

let firebaseApp = null;
let firebaseDB = null;

async function initFirebase() {
  try {
    const { initializeApp } = await import(FIREBASE_SDK.app);
    const { getDatabase, ref, onValue, set, get } = await import(FIREBASE_SDK.database);

    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firebaseDB = getDatabase(firebaseApp);

    window.FB = { ref, onValue, set, get };
    console.log('✅ Firebase initialized');
    return true;
  } catch (e) {
    console.warn('⚠️ Firebase init failed:', e);
    return false;
  }
}

async function savePricesToFirebase(prices) {
  if (!firebaseDB) return false;
  try {
    const { ref, set } = window.FB;
    const pricesRef = ref(firebaseDB, 'prices');
    await set(pricesRef, prices);
    console.log('✅ Prices saved to Firebase');
    return true;
  } catch (e) {
    console.error('❌ Save to Firebase failed:', e);
    return false;
  }
}

async function loadPricesFromFirebase() {
  if (!firebaseDB) return null;
  try {
    const { ref, get } = window.FB;
    const pricesRef = ref(firebaseDB, 'prices');
    const snapshot = await get(pricesRef);
    if (snapshot.exists()) {
      console.log('✅ Prices loaded from Firebase');
      return snapshot.val();
    }
    return null;
  } catch (e) {
    console.error('❌ Load from Firebase failed:', e);
    return null;
  }
}

function listenToPrices(callback) {
  if (!firebaseDB) return;
  const { ref, onValue } = window.FB;
  const pricesRef = ref(firebaseDB, 'prices');
  onValue(pricesRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
}