import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAbYxoZla7vnqG2S3oXdy51Tz2hLonHFAc",
    authDomain: "wizbee-ibpp.firebaseapp.com",
    projectId: "wizbee-ibpp",
    storageBucket: "wizbee-ibpp.appspot.com",
    messagingSenderId: "156040168285",
    appId: "1:156040168285:web:2eb04a07fd33f248295eb4",
    measurementId: "G-8PZF2QYB4Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let keyId = '';
let authAction = null;

const accessKeyContainer = document.getElementById('accessKeyContainer');
const accessKeyForm = document.getElementById('accessKeyForm');
const accessKeyInput = document.getElementById('accessKeyInput');
const pageFeedbackContainer = document.getElementById('pageFeedbackContainer');
const pageFeedback = document.getElementById('pageFeedback');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const { uid, email } = user;
        const userDocRef = doc(db, 'users', uid);

        try {
            const docSnap = await getDoc(userDocRef);
      
            if (docSnap.exists()) {
            } else {
              const userData = {
                email: email,
              };
      
              await setDoc(userDocRef, userData);
            }
          } catch (error) {
            console.error('Error checking or storing user data:', error);
          }

        window.location.replace('/chat')
    }
})

async function fetchHTML(file) {
    const path = `../pages/insertedElements/${file}.html`;

    return await fetch (path)
        .then(function(response) {
            return response.text()
        })
        .catch(function(error) {
            console.error('Error fetching HTML:', error);
        });
}

accessKeyForm.onsubmit = async (e) => {
    e.preventDefault();

    const key = accessKeyInput.value;
    accessKeyInput.value = '';

    const querySnapshot = await getDocs(collection(db, 'accessKeys'));
    for (const doc of querySnapshot.docs) {
        const data = doc.data();
        try {
            if (data.key == key) {
                console.log('test');
                await openAuthOption();
                return;
            }
        } catch (e) {
            console.log(`${e} error while searching key snapshot: ${e.message}`);
        }
    }
    pageFeedbackContainer.style.display = 'flex'
    pageFeedback.innerText = 'Invalid key.';
}

async function openAuthOption() {
    const formDocument = await fetchHTML('auth/authOption');
    const mainElement = document.querySelector('main');

    if (formDocument) {
        pageFeedbackContainer.style.display = 'none';

        mainElement.removeChild(accessKeyContainer);
        pageFeedbackContainer.insertAdjacentHTML('beforebegin', formDocument);

        const authOptionLogin = document.getElementById('authOptionLogin');
        const authOptionSignup = document.getElementById('authOptionSignup');

        authOptionLogin.onclick = async () => {await openAuthForm('Login')};
        authOptionSignup.onclick = async () => {await openAuthForm('Sign up')};

    } else {
        console.log(`Login form document invalid: ${formDocument}`);
    }
}

async function openAuthForm(option) {
    const formDocument = await fetchHTML('auth/authForm');
    const mainElement = document.querySelector('main');

    if (formDocument) {
        pageFeedbackContainer.style.display = 'none';

        mainElement.removeChild(document.getElementById('authOptionContainer'));
        pageFeedbackContainer.insertAdjacentHTML('beforebegin', formDocument);

        const authTitle = document.getElementById('authTitle');
        authTitle.innerText = option;
        authAction = option;

        const authActionSwitch = document.getElementById('authActionSwitch');
        authActionSwitch.querySelector('#authActionSwitchText').innerText = option == 'Login' ? 'Sign up' : 'Login';
        authActionSwitch.onclick = () => {authActionSwitchEvent()}

        const authForm = document.getElementById('authForm');
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            await authFormEvent();
        }

    } else {
        console.log(`Auth form document invalid: ${formDocument}`);
    }
}

async function authFormEvent() {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');

    const email = emailInput.value;
    const password = passwordInput.value;

    emailInput.value = '';
    passwordInput.value = '';

    if (authAction == 'Sign up') {
        await signup(email, password);
        return;
    }
    await login(email, password);
}

async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // window.location.replace('/home')
        })
        .catch((e) => {
            pageFeedbackContainer.style.display = 'flex';
            pageFeedback.innerText = 'Invalid authentication credentials.';
        })
}

async function signup(email ,password) {
    await createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // window.location.replace('/home')
        })
        .catch((e) => {
            pageFeedbackContainer.style.display = 'flex';
            pageFeedback.innerText = 'Invalid authentication credentials.';
        })
}

function authActionSwitchEvent() {
    const authActionSwitch = document.getElementById('authActionSwitch');
    authActionSwitch.querySelector('#authActionSwitchText').innerText = authAction;

    authAction = authAction == 'Login' ? 'Sign up' : 'Login'; // Flips auth action
    
    document.getElementById('authTitle').innerText = authAction;

    pageFeedbackContainer.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
}