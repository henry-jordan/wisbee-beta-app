const enterButton = document.getElementById('enterButton');
// const infoButton = document.getElementById('infoButton');
const infoContainer = document.getElementById('infoContainer')

let infoOpen = false;

// infoButton.onclick = async () => {
//     if (!infoOpen) {
//         infoButton.classList.add('selected');

//         infoContainer.classList.add('infoContainerFadeIn');
//         infoContainer.classList.remove('infoContainerFadeOut');
//         infoOpen = true;
//     } else {
//         infoButton.classList.remove('selected');

//         infoContainer.classList.remove('infoContainerFadeIn');
//         infoContainer.classList.add('infoContainerFadeOut');
//         infoOpen = false;
//     }
// }

enterButton.onclick = () => {
    window.location.assign('/login')
}