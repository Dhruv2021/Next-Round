const firebaseConfig = {
  apiKey: "AIzaSyAg5CsFn_OBMPdJqV406Con9sMCf-gC1_s",
  authDomain: "next-round-480ad.firebaseapp.com",
  projectId: "next-round-480ad",
  storageBucket: "next-round-480ad.firebasestorage.app",
  messagingSenderId: "868923490063",
  appId: "1:868923490063:web:323ac81b904aa64650c87a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

function signInWithGoogle() {
  auth.signInWithPopup(provider)
    .then((result) => {
      console.log("Logged in:", result.user.displayName);
    })
    .catch((error) => {
      console.error("Login error:", error.message);
    });
}

function signOut() {
  auth.signOut().then(() => {
    window.location.href = 'home.html';
  });
}

auth.onAuthStateChanged((user) => {
  const navBtn = document.querySelector('.nav-btn');
  if (navBtn) {
    if (user) {
      navBtn.outerHTML = `
        <div class="user-profile" onclick="toggleDropdown()">
          <img class="user-avatar" src="${user.photoURL}" alt="avatar">
          <span class="user-name">${user.displayName.split(' ')[0]}</span>
          <div class="dropdown" id="userDropdown">
            <div class="dropdown-item" onclick="signOut()">Sign Out</div>
          </div>
        </div>
      `;
    } else {
      navBtn.textContent = 'Sign In';
      navBtn.onclick = signInWithGoogle;
    }
  }
});
function toggleDropdown() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-profile')) {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('open');
  }
});