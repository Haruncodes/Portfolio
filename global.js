console.log('IT’S ALIVE!');

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`
);


const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/Portfolio/";         // My GitHub repo name

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/Haruncodes', title: 'GitHub' }
];


function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

const navLinks = $$("nav a");
const currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);

currentLink?.classList.add("current");

let nav = document.createElement('nav');
document.body.prepend(nav);
  
for (let p of pages) {
    let url = p.url;
    let title = p.title;
  
    url = !url.startsWith('http') ? BASE_PATH + url : url;
  
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
  
    if (a.host === location.host && a.pathname === location.pathname) {
      a.classList.add('current');
    }
  
    if (a.host !== location.host) {
      a.target = '_blank';
    }
  
    nav.append(a);
  }

  const select = document.querySelector('.color-scheme select');

  function setColorScheme(value) {
    document.documentElement.style.setProperty("color-scheme", value);
  }
    if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
    select.value = localStorage.colorScheme;
  }
    select.addEventListener("input", (event) => {
    const value = event.target.value;
    setColorScheme(value);
    localStorage.colorScheme = value;
    console.log("color scheme changed to", value);
  });

  export async function fetchJSON(url) {
    try {
      const response = await fetch(url); 
      if (!response.ok) {                
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      const data = await response.json(); 
      return data;
    } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
    }
  }
  export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = '';
    for (const project of projects) {
      const article = document.createElement('article');
      article.innerHTML = `
        <${headingLevel}>${project.title}</${headingLevel}>
        <img src="${project.image}" alt="${project.title}">
        <p>${project.description}</p>
      `;
      containerElement.appendChild(article);
    }
  }
  export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);

  }