const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const serviceAccount = require("./firebase-service-account.json");

let firebaseApp;

const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;

  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
  });

  console.log("⚡ Firebase Admin initialized");
  return firebaseApp;
};

// We export the initialization function and a getter helper for messaging
module.exports = {
  getFirebaseApp,
  admin: {
    messaging: () => getMessaging(getFirebaseApp()),
  },
};
