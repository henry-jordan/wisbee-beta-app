const startConnectionButton = document.getElementById('startConnectionButton');
const endConnectionButton = document.getElementById('endConnectionButton');

const connectionURLSelectionProduction = document.getElementById('connectionURLSelectionProduction');
const connectionURLSelectionTesting = document.getElementById('connectionURLSelectionTesting');

const inputForm = document.getElementById('inputForm');
const inputFormTextInput = document.getElementById('inputFormTextInput');

const apiResponse = document.getElementById('apiResponse');
const pageFeedback = document.getElementById('pageFeedback');

let connectionURL = null
let websocket = null;
const clientID = Date.now();

inputFormTextInput.value = '';

connectionURLSelectionProduction.onclick = () => {
    
    connectionURL = 'production';
    connectionURLSelectionProduction.classList.add('selected');
    connectionURLSelectionTesting.classList.remove('selected');

    if (websocket) {
        websocket.close();
        createWebsocket();
    }
}

connectionURLSelectionTesting.onclick = () => {
    
    connectionURL = 'testing';
    connectionURLSelectionTesting.classList.add('selected');
    connectionURLSelectionProduction.classList.remove('selected');

    if (websocket) {
        websocket.close();
        createWebsocket();
    }
}

startConnectionButton.onclick = () => {
    createWebsocket();
}

endConnectionButton.onclick = () => {
    if (websocket) {
        websocket.close();
    }
    else {
        setPageFeedback('Websocket is not open.');
    }
}

async function setPageFeedback(text) {
    pageFeedback.innerText = text;

    await new Promise(resolve => setTimeout(resolve, 5000));

    if (pageFeedback.innerText == text) {
        pageFeedback.innerText = '';
    }
}

inputForm.onsubmit = (e) => {
    e.preventDefault();

    const input = inputFormTextInput.value;
    inputFormTextInput.value = '';

    if (websocket) {
        setPageFeedback('Sent message to API.');

        const messages = [
            {role: 'user', content: input}
        ]
        websocket.send(JSON.stringify(messages));
    } else {
        setPageFeedback('Websocket not open.');
    }
}

async function testAPI() {
    await fetch('https://wizbee-beta-api-7305d5ff3578.herokuapp.com/', {mode: "no-cors"})
        .then(response => {
            if (!response.ok) {
                setPageFeedback('API failed to respond to test.');
            }
            setPageFeedback(`API responded successfully to test.`);
        })
        .catch(error => {
            setPageFeedback(`Error experienced while testing API: ${error.message}`);
        })
}

testAPI();

function createWebsocket() {
    if (connectionURL) {
        console.log('creating websocket');
        if (connectionURL == 'testing') {
            websocket = new WebSocket(`ws://0.0.0.0:8000/ws`);

        } else if (connectionURL == 'production') {
            websocket = new WebSocket(`wss://wizbee-beta-api-7305d5ff3578.herokuapp.com/ws`);

        } else {
            setPageFeedback ('Invalid connectionURL.');
            return;
        }
        
        websocket.onopen = (e) => {
            console.log('opening websocket');
            websocket = e.target;

            setPageFeedback('Websocket connection open.');
    
            startConnectionButton.classList.add('selected');
            endConnectionButton.classList.remove('selected');
        }
    
        websocket.onmessage = (e) => {
            const data = e.data;
            
            setPageFeedback('Message received from API.');
            receiveMessage(data);
        }
    
        websocket.onclose = () => {
            console.log('closing websocket');
            endConnectionButton.classList.add('selected');
            startConnectionButton.classList.remove('selected');
    
            setPageFeedback('Websocket closed.');
    
            websocket = null;
        }
    } else {
        setPageFeedback('No  connectionURL.')
    }
}

function receiveMessage(data) {
    const dataObject = JSON.parse(data);

    if (dataObject.special == 'timeout') {
        const elementHTML = `<p style="margin: 0px; color:red;">Connection timed out.</p>`;
        apiResponse.insertAdjacentHTML('beforeend', elementHTML);
    }

    const messageElement = document.getElementById(`message-${dataObject.id}`);
    if (messageElement) {
        messageElement.innerText += dataObject.message;

        setPageFeedback(`Received message update: ${dataObject.message}`)
    } else {
        const elementHTML = `<p id="message-${dataObject.id}" style="margin: 0px;">${dataObject.message}</p>`;
        apiResponse.insertAdjacentHTML('beforeend', elementHTML);

        setPageFeedback(`Received new message: ${dataObject.message}`)
    }
}