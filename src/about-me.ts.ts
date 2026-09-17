const appDiv = document.getElementById('app');

if (appDiv) {
    const heading = document.createElement('h1');
    heading.innerText = "About Me";
    heading.style.color = "#58bcff"; 
    appDiv.appendChild(heading);

    const bio = document.createElement('p');
    bio.innerText = "This project was built on Linux and is now thriving on Windows!";
    appDiv.appendChild(bio);

    console.log("About Me logic loaded.");
}