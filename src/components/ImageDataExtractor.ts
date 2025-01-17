class ImageDataExtractor extends HTMLElement {
    private dropzone: HTMLDivElement;
    private input: HTMLInputElement;
    private preview: HTMLImageElement;
    private errorDisplay: HTMLParagraphElement;

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
        style.textContent = this.getStyles();

        this.dropzone = document.createElement('div');
        this.dropzone.className = 'image-data-extractor__dropzone';

        this.input = document.createElement('input');
        this.input.type = 'file';
        this.input.accept = 'image/*';
        this.input.className = 'image-data-extractor__input';

        const placeholder = document.createElement('div');
        placeholder.className = 'image-data-extractor__placeholder';
        placeholder.innerHTML = `
      <svg class="image-data-extractor__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p class="image-data-extractor__text">Drop image here or click to upload</p>
    `;

        this.preview = document.createElement('img');
        this.preview.className = 'image-data-extractor__image';
        this.preview.style.display = 'none';

        this.errorDisplay = document.createElement('p');
        this.errorDisplay.className = 'image-data-extractor__error';

        this.dropzone.appendChild(this.input);
        this.dropzone.appendChild(placeholder);
        this.dropzone.appendChild(this.preview);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-data-extractor';
        wrapper.appendChild(this.dropzone);
        wrapper.appendChild(this.errorDisplay);

        this.shadowRoot?.appendChild(style);
        this.shadowRoot?.appendChild(wrapper);
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
            this.showError('Please upload an image file');
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

    private getStyles(): string {
        return `
      :host {
        --extractor-bg-color: #f8f9fa;
        --extractor-border-color: #dee2e6;
        --extractor-border-active: #4dabf7;
        --extractor-text-color: #495057;
        --extractor-error-color: #fa5252;
        --extractor-padding: 32px;
        --extractor-border-radius: 8px;
        --extractor-font-size: 1rem;
        --extractor-line-height: 1.5;
        --extractor-icon-size: 32px;
        --extractor-transition-duration: 200ms;
        --extractor-min-height: 300px;
        --extractor-preview-max-height: 280px;
      }

      .image-data-extractor {
        display: block;
      }

      .image-data-extractor__dropzone {
        position: relative;
        min-height: var(--extractor-min-height);
        padding: var(--extractor-padding);
        background-color: var(--extractor-bg-color);
        border: 2px dashed var(--extractor-border-color);
        border-radius: var(--extractor-border-radius);
        cursor: pointer;
        transition: border-color var(--extractor-transition-duration) ease;
      }

      .image-data-extractor__dropzone--active {
        border-color: var(--extractor-border-active);
      }

      .image-data-extractor__input {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
      }

      .image-data-extractor__placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--extractor-text-color);
      }

      .image-data-extractor__placeholder--hidden {
        display: none;
      }

      .image-data-extractor__icon {
        width: var(--extractor-icon-size);
        height: var(--extractor-icon-size);
        margin-bottom: 1rem;
      }

      .image-data-extractor__text {
        margin: 0;
        font-size: var(--extractor-font-size);
      }

      .image-data-extractor__image {
        max-width: 100%;
        max-height: var(--extractor-preview-max-height);
        object-fit: contain;
      }

      .image-data-extractor__error {
        margin-top: 0.5rem;
        color: var(--extractor-error-color);
        font-size: var(--extractor-font-size);
      }
    `;
    }
}

customElements.define('image-data-extractor', ImageDataExtractor);