import styles from './styles.scss?inline';
import template from './template.html?raw';

class ImageDataExtractor extends HTMLElement {
    private dropzone!: HTMLDivElement;
    private input!: HTMLInputElement;
    private preview!: HTMLImageElement;
    private errorDisplay!: HTMLParagraphElement;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
    }

    private render() {
        const style = document.createElement('style');
        style.textContent = styles;

        // Create template container
        const templateContainer = document.createElement('div');
        templateContainer.innerHTML = template;

        // Get references to elements
        const content = templateContainer.firstElementChild!;
        this.dropzone = content.querySelector('.image-data-extractor__dropzone')!;
        this.input = content.querySelector('.image-data-extractor__input')!;
        this.preview = content.querySelector('.image-data-extractor__image')!;
        this.errorDisplay = content.querySelector('.image-data-extractor__error')!;

        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(content);
    }

    private setupListeners() {
        this.dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropzone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropzone.addEventListener('click', this.handleClick.bind(this));
        this.input.addEventListener('change', this.handleFileInput.bind(this));
    }

    private handleDragOver(e: DragEvent) {
        e.preventDefault();
        this.dropzone.classList.add('image-data-extractor__dropzone--active');
    }

    private handleDragLeave(e: DragEvent) {
        e.preventDefault();
        this.dropzone.classList.remove('image-data-extractor__dropzone--active');
    }

    private handleDrop(e: DragEvent) {
        e.preventDefault();
        this.dropzone.classList.remove('image-data-extractor__dropzone--active');

        const file = e.dataTransfer?.files[0];
        if (file) {
            this.validateAndProcessFile(file);
        }
    }

    private handleClick() {
        this.input.click();
    }

    private handleFileInput(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            this.validateAndProcessFile(file);
        }
    }

    private validateAndProcessFile(file: File) {
        if (!file.type.startsWith('image/')) {
            this.showError('Only image files can be uploaded.');
            return false;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            this.showPreview(reader.result as string);
            this.clearError();
            this.dispatchEvent(new CustomEvent('image-selected', {
                detail: { file, dataUrl: reader.result }
            }));
        };
        reader.readAsDataURL(file);
        return true;
    }

    private showPreview(dataUrl: string) {
        this.preview.src = dataUrl;
        this.preview.style.display = 'block';
        this.dropzone.querySelector('.image-data-extractor__placeholder')?.classList.add('image-data-extractor__placeholder--hidden');
    }

    private showError(message: string) {
        this.errorDisplay.textContent = message;
    }

    private clearError() {
        this.errorDisplay.textContent = '';
    }
}

customElements.define('image-data-extractor', ImageDataExtractor);