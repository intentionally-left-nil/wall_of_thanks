const templates: { [key: string]: HTMLTemplateElement } = {};

function loadTemplate(element: HTMLElement, template: string, id: string) {
  let node: HTMLTemplateElement;
  if (templates[id]) {
    node = templates[id];
  } else {
    node = document.createElement('template');
    node.innerHTML = template;
    templates[id] = node;
  }
  element
    .attachShadow({ mode: 'open' })
    .appendChild(node.content.cloneNode(true));
}

function isAdmin(): boolean {
  return localStorage.getItem('token') != null;
}

function getAdminToken(): string | null {
  return localStorage.getItem('token');
}

export { loadTemplate, isAdmin, getAdminToken };
