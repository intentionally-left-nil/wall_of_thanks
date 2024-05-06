export default class LetterboxElement extends HTMLElement {
  removeTimer: number | null;
  constructor() {
    super();
    this.removeTimer = null;
    const node = document.getElementById('letterbox-template');
    if (node == null || !(node instanceof HTMLTemplateElement)) {
      throw new Error('letterbox-template not found');
    }
    const template: HTMLTemplateElement = node;
    this.attachShadow({ mode: 'open' }).appendChild(
      template.content.cloneNode(true)
    );
  }

  connectedCallback() {
    this.shadowRoot!.querySelector('slot')?.addEventListener(
      'slotchange',
      this.onSlotChange.bind(this)
    );
  }

  onSlotChange(e: Event) {
    console.log('Slot changed', e);
    if (!this.removeTimer) {
      this.removeTimer = window.setTimeout(
        this.removeExcessChildren.bind(this),
        3000
      );
    }
  }

  removeExcessChildren() {
    this.removeTimer = null;
    const root = this.shadowRoot!.querySelector('#root') as HTMLElement | null;
    const slot = this.shadowRoot!.querySelector(
      'slot'
    ) as HTMLSlotElement | null;
    if (!root || !slot) {
      return;
    }

    const children = slot.assignedElements();

    while (children.length > 1 && root.scrollHeight > root.offsetHeight) {
      const lastChild: HTMLElement = children.pop() as HTMLElement;
      if (lastChild.offsetTop > root.offsetHeight) {
        lastChild.remove();
      } else {
        lastChild!.classList.add('fade-out');
        lastChild!.addEventListener('animationend', () => lastChild?.remove());
        break;
      }
    }
  }
}
