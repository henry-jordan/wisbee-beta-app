import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js'
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';

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

let chatID = null;
let uid = null;
let canSubmitMessage = false;
let isGeneratingMessage = false;

class ResponseMessageHandler {
    constructor() {
        this.messages = {};
    }
    addMessage(data) {
        const id = data.id;
        this.messages[id] = data.message;
    }
    removeMessage(data) {
        const id = data.id;
        delete this.messages[id];
    }
    updateMessage(data) {
        const id = data.id;

        if(data.message == null) {
            return;
        }

        this.messages[id] += data.message;
        const messageElement = document.getElementById(id);

        if (messageElement) {
            const chatMessageTextElement = messageElement.querySelector('#chatMessageText');
            chatMessageTextElement.textContent += data.message;
        } else {
            console.log('Warning, element does not exist.');
        }
    }
}

class WebsocketHandler {
    constructor() {
        this.websocket = null;
    }
    setEvents() {
        this.websocket.onopen = () => {
            console.log('Websocket connected');
        }

        this.websocket.onclose = () => {
            console.log('Websocket closed');
        }

        this.websocket.onmessage = async (e) => {
            const data = e.data;
            websocketMessageQueue.enqueue(data);
        }
    }
    async initialize() {
        try {
            this.connectWebsocket();
        } catch (error) {
            console.error('Failed to initialize websocket: ', error);
            throw error;
        }
    }
    connectWebsocket() {
        // this.websocket = new WebSocket(`wss://wizbee-beta-api-7305d5ff3578.herokuapp.com/ws`);
        this.websocket = new WebSocket(`ws://0.0.0.0:8000/ws`);

        this.websocket.onopen = () => {
            console.log('Websocket connected');
            this.setEvents();
        };
    
        this.websocket.onerror = (error) => {
            console.error('Websocket error:', error);
            reject(error);
        };
    }
    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(message);
        } else {
            console.error('WebSocket is not open.');
        }
    }
    async checkWebsocket(depth = 0) {
        if (depth >= 5) {
            console.log('Websocket check failed.');
            return false;
        }

        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            try {
                await this.initialize();
            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
            }

            await new Promise(resolve => setTimeout(resolve, 250));
            return await this.checkWebsocket(depth + 1);
        }

        return true;
    }
    async waitForOpenConnection() {
        console.log('Waiting for open websocket connection');
    
        if (!this.websocket || this.websocket.readyState === this.websocket.CLOSED) {
            await this.initialize();
        }
    
        return new Promise((resolve, reject) => {
            const maxAttempts = 30;
            const intervalTime = 200;
    
            let currentAttempt = 0;
            const interval = setInterval(() => {
                if (currentAttempt > maxAttempts) {
                    clearInterval(interval);
                    reject(new Error('Maximum number of attempts exceeded (6000ms)'));
                } else if (this.websocket.readyState === this.websocket.OPEN) {
                    console.log('Websocket promise resolved');
                    clearInterval(interval);
                    resolve();
                }
                currentAttempt++;
            }, intervalTime);
        });
    }
    disconnectWebsocket() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }
}

class WebsocketMessageQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }
    enqueue(message) {
        this.queue.push(message);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    async processQueue() {
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const message = this.queue.shift();
            await receiveMessage(message);
        }
        this.isProcessing = false;
    }
}

const messageHandler = new ResponseMessageHandler();
const websocketHandler = new WebsocketHandler();
const websocketMessageQueue = new WebsocketMessageQueue();

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('User signed in.');

        uid = user.auth.currentUser.uid;
        await loadChat();
    } else {
        console.log('User signed out.');
        window.location.replace('/login');
    }
})

async function loadChat() {
    const userDoc = await doc(db, 'users', uid);
    const userDocSnapshot = await getDoc(userDoc);
    const userData = userDocSnapshot.data();

    if (userData.currentChat) {
        chatID = userData.currentChat;
        await loadMessages(userDoc);
    }

    await loadChatButtons();
    // await websocketHandler.initialize();

    document.getElementById('loadingScreen').remove();
}

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

const logoutButton = document.getElementById('logoutButton');
const debugButton = document.getElementById('debugButton');

const chatListToggle = document.getElementById('chatListToggle');
const sendMessageButton = document.getElementById('sendMessageButton');
const createChatButton = document.getElementById('createChatButton');

const chatListContainer = document.getElementById('chatListContainer');
const chatListButtonContainer = document.getElementById('chatListButtonContainer');

const chatInput = document.getElementById('chatInput');
const chatElement = document.getElementById('chat');
const tempMessageContainer = document.getElementById('tempMessageContainer');
const chatLoadingScreen = document.getElementById('chatLoadingScreen');
const pasteInputNormalizer = document.getElementById('pasteInputNormalizer');

logoutButton.onclick = () => {
    signOut(auth);
}

debugButton.onclick = () => {
    window.open('/websocketDebug', '_blank')
}

chatInput.onblur = () => {
    if (!chatInput.innerText.trim()) {
        chatInput.innerText = '';
    }
}

chatInput.addEventListener('input', async (e) => {
    if (chatInput.innerText.trim()) {
        sendMessageButton.disabled = false;
        canSubmitMessage = true;
    } else {
        sendMessageButton.disabled = true;
        canSubmitMessage = false;
    }
})
chatInput.onkeydown = async (e) => {
    if (e.key === 'Enter' && e.target.id == 'chatInput') {
        if (!e.shiftKey && canSubmitMessage && !isGeneratingMessage) {
            e.preventDefault();
            chatInput.innerText = chatInput.innerText.trim();
            await sendMessageEvent();
        }
    }
}

chatInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand("insertHTML", false, text);
})

sendMessageButton.onclick = async () => {
    if (canSubmitMessage && !isGeneratingMessage) {
        await sendMessageEvent();
    }
}

async function sendMessageEvent() {
    const id = Math.floor(Date.now() * Math.random());

    const data = {
        id: id,
        sender: 'user',
        text: chatInput.innerText.trim(),
    }

    chatInput.innerHTML = '';
    disableInputs();

    await submitMessage(data);
}

function disableInputs() {
    const sendMessageArrow = document.getElementById('sendMessageArrow')
    const sendMessageSpinner = document.getElementById('sendMessageSpinner');

    sendMessageArrow.style.display = "none";
    sendMessageSpinner.style.display = "block";

    canSubmitMessage = false;
    isGeneratingMessage = true;

    const chatListButtons = document.querySelectorAll('.chatListButton');
    chatListButtons.forEach((button) => {
        button.disabled = true;
    })
    createChatButton.disabled = true;
    sendMessageButton.disabled = true;
}

function enableInputs() {
    const sendMessageArrow = document.getElementById('sendMessageArrow');
    const sendMessageSpinner = document.getElementById('sendMessageSpinner');

    sendMessageSpinner.style.display = "none";
    sendMessageArrow.style.display = "block";

    canSubmitMessage = true;
    isGeneratingMessage = false;

    const chatListButtons = document.querySelectorAll('.chatListButton');
    chatListButtons.forEach((button) => {
        button.disabled = false;
    });
    createChatButton.disabled = false;
}

createChatButton.onclick = async () => {
    await createChat();
}

chatListToggle.onclick = () => {
    const icon = document.getElementById('chatListToggleIcon');
    if (icon.classList.contains('rotate180')) {
        icon.classList.remove('rotate180');
        icon.classList.add('rotate360');

        chatListContainer.classList.remove('chatListOpen');
        chatListContainer.classList.add('chatListClose');
    } else {
        icon.classList.remove('rotate360');
        icon.classList.add('rotate180');
        
        chatListContainer.classList.remove('chatListClose');
        chatListContainer.classList.add('chatListOpen');
    }
}

async function sendMessages(type='chat') {
    if (!websocketHandler.websocket || websocketHandler.websocket.readyState !== WebSocket.OPEN) {
        await websocketHandler.waitForOpenConnection();
    }
    try {
        const chatRef = doc(db, 'users', uid, 'chats', chatID);
        const messagesQuery = query(
            collection(chatRef, 'messages'),
            orderBy('index', 'asc'),
            limit(25)
        );

        const messagesSnapshot = await getDocs(messagesQuery);

        const messages = [];
        messagesSnapshot.forEach((message) => {
            const data = message.data();
            if (data.sender == 'agent') {
                messages.push({ role: 'assistant', content: data.text });
            } else {
                messages.push({ role: 'user', content: data.text });
            }
        });

        console.log('Sending message to API.');
        const websocketMessage = {
            type: type,
            data: messages,
        }

        websocketHandler.sendMessage(JSON.stringify(websocketMessage));

    } catch (error) {
        console.error('Error sending messages:', error);
    }
}

async function receiveMessage(data) {
    const dataJSON = JSON.parse(data);

    if (dataJSON.special) {
        if (dataJSON.special === 'complete') {
            await submitAgentMessage(dataJSON.id);
            messageHandler.removeMessage({ id: dataJSON.id });

            enableInputs();
            return;

        } else if (dataJSON.special === 'create') {
            const messageData = {
                id: dataJSON.id,
                sender: 'agent',
                text: dataJSON.message,
            }
            messageHandler.addMessage({id: dataJSON.id, message: dataJSON.message});
            await createMessage(messageData);
            return;

        } else if (dataJSON.special === 'title') {
            console.log('test')

            const title = dataJSON.message;

            const button = document.getElementById(`chatListButton-${chatID}`);
            button.querySelector('p').innerText = title;

            const chatHeaderTitle = document.getElementById('chatHeaderTitle')
            chatHeaderTitle.innerText = title;

            const chatRef = doc(db, 'users', uid, 'chats', chatID);
            await updateDoc(chatRef, {name: title});

            return;
        }
    }
    messageHandler.updateMessage({ id: dataJSON.id, message: dataJSON.message });
}

async function createMessage(data) {
    const messageDocument = await fetchHTML(`main/${data.sender}Message`);

    if (messageDocument) {
        tempMessageContainer.insertAdjacentHTML('beforeend', messageDocument);

        const messageElement = tempMessageContainer.querySelector(`.${data.sender}Message`);
        messageElement.id = data.id;

        const textElement = messageElement.querySelector('#chatMessageText')
        textElement.innerText += data.text;

        if (data.sender == 'user') {
            messageElement.querySelector('#editMessageButton').onclick = async () => {
                await editMessage(data.id);
            }
        } else {
            messageElement.querySelector('#copyMessageButton').onclick = async () => {
                await copyMessage(data.id);
            }
        }
        chatElement.insertAdjacentElement('beforeend', messageElement);
    }

    const chatScroll = document.getElementById('chatScroll');
    chatScroll.scrollTop = chatScroll.scrollHeight;
}

async function loadMessages() {
    chatLoadingScreen.style.display = 'flex';

    const userDoc = doc(db, 'users', uid);
    const chats = collection(userDoc, 'chats');

    const chatReference = doc(chats, chatID);
    const chatSnapshot = await getDoc(chatReference)

    const chatData = chatSnapshot.data();
    if (chatData.name) {
        document.getElementById('chatHeaderTitle').innerText = chatData.name;
    } else {
        document.getElementById('chatHeaderTitle').innerText = '';
    }

    const messagesReference = collection(chatReference, 'messages');

    const messagesQuery = await query(messagesReference, orderBy('index'));
    const messagesSnapshot = await getDocs(messagesQuery);

    for (const messageDoc of messagesSnapshot.docs) {
        const data = messageDoc.data();
        await createMessage(data);
    }

    chatLoadingScreen.style.display = 'none';
}

async function loadChatButtons() {
    const userDoc = doc(db, 'users', uid);
    const chats = collection(userDoc, 'chats');

    const chatsQuery = await query(chats, orderBy('index'));
    const chatsSnapshot = await getDocs(chatsQuery);

    chatsSnapshot.forEach((chat) => {
        const data = chat.data();

        if (data.name) {
            createChatListButton(chat.id, data.name);
        } else {
            createChatListButton(chat.id);
        }
    })

    const button = document.getElementById(`chatListButton-${chatID}`);
    if (button) {
        button.classList.toggle('selected');
    }
}

function createChatListButton(id, name='Untitled chat') {
    const chatListButtonHTML = `<button class="chatListButton" id="chatListButton-${id}"><p id="chatListButtonText" style="display: inline-block; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0px; font-size: small; text-align: left;">${name}</p></button>`;
    chatListButtonContainer.insertAdjacentHTML('afterbegin', chatListButtonHTML);

    const chatListDivider = document.getElementById('chatListDivider');
    chatListDivider.style.visibility = 'visible';

    const button = document.getElementById(`chatListButton-${id}`)
    button.onclick = async () => {
        await switchChat(id, button);
    }

    return button;
}

async function submitAgentMessage(id) {
    const userDoc = doc(db, 'users', uid);
    const chats = collection(userDoc, 'chats');
    const chatReference = doc(chats, chatID);
    const messagesReference = collection(chatReference, 'messages');

    const messagesSnapshot = await getDocs(messagesReference);
    const messagesLength = messagesSnapshot.size;

    const data = {
        id: id,
        index: messagesLength,
        sender: 'agent',
        text: messageHandler.messages[id],
    }

    await addDoc(messagesReference, data);
}

async function submitMessage(data) {
    document.getElementById('sendMessageArrow').display = 'none';
    document.getElementById('sendMessageSpinner').display = 'block';
    chatInput.disabled = true;

    await websocketHandler.waitForOpenConnection();

    console.log('Submitting message.');

    const userDoc = doc(db, 'users', uid);
    const chats = collection(userDoc, 'chats');

    let chatReference;

    if (chatID) {
        chatReference = doc(chats, chatID);

    } else {
        const chatsSnapshot = await getDocs(chats);
        const chatsLength = chatsSnapshot.size;

        chatReference = await addDoc(chats, {index: chatsLength});
    }

    const messagesReference = collection(chatReference, 'messages');

    const messagesSnapshot = await getDocs(messagesReference);
    const messagesLength = messagesSnapshot.size;

    data.index = messagesLength;

    await addDoc(messagesReference, data);

    let newChat;

    if (!chatID) {
        newChat = true;
        const chatReferenceSnapshot = await getDoc(chatReference);
        chatID = chatReferenceSnapshot.id;

        const button = createChatListButton(chatID);
        highlightCurrentChatButton(button);
    }

    document.getElementById('sendMessageArrow').display = 'block';
    document.getElementById('sendMessageSpinner').display = 'none';
    chatInput.disabled = false;

    await createMessage(data);
    await updateDoc(userDoc, {currentChat: chatID});

    await sendMessages()

    if (newChat) {
        await sendMessages('title');
    }
}

function generateDummyMessage() {
    const dummyMessageArray = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Pulvinar elementum integer enim neque volutpat. Orci ac auctor augue mauris augue neque gravida in. Ipsum faucibus vitae aliquet nec ullamcorper sit. Pharetra magna ac placerat vestibulum lectus mauris ultrices. Semper quis lectus nulla at volutpat diam. Sed vulputate odio ut enim blandit volutpat maecenas. Gravida arcu ac tortor dignissim convallis aenean et tortor at. Sit amet est placerat in egestas erat. Massa tempor nec feugiat nisl. Sed tempus urna et pharetra pharetra. Eleifend quam adipiscing vitae proin sagittis nisl rhoncus mattis.',
        'Non tellus orci ac auctor augue mauris augue neque gravida. Aenean et tortor at risus viverra adipiscing at in. Dolor sed viverra ipsum nunc aliquet bibendum. Orci dapibus ultrices in iaculis. Blandit libero volutpat sed cras ornare arcu dui. Et netus et malesuada fames ac turpis egestas. Curabitur gravida arcu ac tortor. At lectus urna duis convallis convallis. Neque viverra justo nec ultrices dui sapien eget. Vitae proin sagittis nisl rhoncus mattis rhoncus. Vel elit scelerisque mauris pellentesque pulvinar pellentesque habitant morbi tristique.',
        'In nibh mauris cursus mattis molestie a iaculis at erat. Egestas erat imperdiet sed euismod nisi porta. Est ultricies integer quis auctor. Fermentum posuere urna nec tincidunt praesent semper. Senectus et netus et malesuada fames ac turpis egestas. Augue interdum velit euismod in pellentesque. Laoreet id donec ultrices tincidunt arcu non. Pulvinar pellentesque habitant morbi tristique. Arcu odio ut sem nulla pharetra diam. Suscipit tellus mauris a diam maecenas. Eu ultrices vitae auctor eu. Neque egestas congue quisque egestas diam in arcu cursus euismod. Nibh tellus molestie nunc non blandit massa. Gravida neque convallis a cras semper. Gravida in fermentum et sollicitudin ac.',
        'Lectus mauris ultrices eros in cursus turpis massa tincidunt dui. Laoreet suspendisse interdum consectetur libero id faucibus nisl tincidunt. Nunc sed blandit libero volutpat sed cras ornare. Aliquet enim tortor at auctor urna nunc id cursus metus. Habitant morbi tristique senectus et netus et malesuada fames. Sed nisi lacus sed viverra. Vitae ultricies leo integer malesuada nunc vel. Proin sagittis nisl rhoncus mattis rhoncus urna neque viverra justo. Arcu odio ut sem nulla pharetra diam sit.',
        'Tortor id aliquet lectus proin nibh nisl condimentum id venenatis. Feugiat pretium nibh ipsum consequat nisl vel pretium. Etiam non quam lacus suspendisse faucibus interdum posuere. Lacus vestibulum sed arcu non odio euismod. A arcu cursus vitae congue mauris. Sed ullamcorper morbi tincidunt ornare massa eget. Dolor purus non enim praesent. Id faucibus nisl tincidunt eget nullam non. Amet mattis vulputate enim nulla aliquet. Viverra ipsum nunc aliquet bibendum enim facilisis gravida neque. Sapien faucibus et molestie ac feugiat sed lectus.'
    ]

    return dummyMessageArray[Math.floor(Math.random()*dummyMessageArray.length)];
}

async function typewriterEffect(element, text) {
    for (let char of text) {
        element.textContent += char;
        await sleep(50);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function switchChat(id, button) {
    if (id == chatID) {
        return;
    }
    
    const userDoc = await doc(db, 'users', uid);
    await updateDoc(userDoc, {currentChat: id});
    
    chatID = id;
    chatElement.innerHTML = '';
    
    highlightCurrentChatButton(button);
    await loadMessages();
}

function highlightCurrentChatButton(button) {
    const children = chatListButtonContainer.querySelectorAll('*');

    children.forEach((child) => {
        child.classList.remove('selected');
    })

    if (button) {
        button.classList.add('selected');
    }
}

async function createChat() {        
    chatID = null;
    chatElement.innerHTML = '';

    highlightCurrentChatButton(null);

    document.getElementById('chatHeaderTitle').innerText = '';
}

async function copyMessage(id) {}
async function editMessage(id) {}