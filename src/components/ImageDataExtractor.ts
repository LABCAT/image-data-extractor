import styles from './styles.scss?inline';
import template from './template.html?raw';

class ImageDataExtractor extends HTMLElement {
    private dropzone!: HTMLDivElement;
    private input!: HTMLInputElement;
    private preview!: HTMLImageElement;
    private errorDisplay!: HTMLParagraphElement;
    private controls!: HTMLDivElement;
    private radiusInput!: HTMLInputElement;
    private processButton!: HTMLButtonElement;

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
        this.controls = content.querySelector('.image-data-extractor__controls')!;
        this.radiusInput = content.querySelector('.image-data-extractor__radius')!;
        this.processButton = content.querySelector('.image-data-extractor__process')!;

        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(content);
    }

    private setupListeners() {
        this.dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropzone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropzone.addEventListener('click', this.handleClick.bind(this));
        this.input.addEventListener('change', this.handleFileInput.bind(this));
        this.processButton.addEventListener('click', this.handleProcess.bind(this));
        this.radiusInput.addEventListener('input', this.handleRadiusChange.bind(this));
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

    private handleRadiusChange(e: Event) {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (value < 1) this.radiusInput.value = '1';
        if (value > 20) this.radiusInput.value = '20';
    }

    private async handleProcess() {
        const radius = parseInt(this.radiusInput.value);
        if (isNaN(radius) || radius < 1 || radius > 20) {
            this.showError('Please enter a valid radius between 1 and 20.');
            return;
        }

        this.processButton.disabled = true;

        try {
            this.dispatchEvent(new CustomEvent('process-image', {
                detail: {
                    radius,
                    image: this.preview.src
                }
            }));
        } catch (error) {
            this.showError('Error processing image');
        } finally {
            this.processButton.disabled = false;
        }
    }

    private showPreview(dataUrl: string) {
        this.preview.src = dataUrl;
        this.preview.style.display = 'block';
        this.controls.style.display = 'block';
        this.dropzone.querySelector('.image-data-extractor__placeholder')
            ?.classList.add('image-data-extractor__placeholder--hidden');
    }

    private showError(message: string) {
        this.errorDisplay.textContent = message;
    }

    private clearError() {
        this.errorDisplay.textContent = '';
    }
}

customElements.define('image-data-extractor', ImageDataExtractor);