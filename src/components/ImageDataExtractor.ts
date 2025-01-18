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
    private progressBar!: HTMLDivElement;
    private progressFill!: HTMLDivElement;
    private progressText!: HTMLDivElement;
    private outputSection!: HTMLDivElement;
    private filenameDisplay!: HTMLParagraphElement;
    private downloadButton!: HTMLButtonElement;
    private currentImageName: string = '';

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
        this.progressBar = content.querySelector('.image-data-extractor__progress')!;
        this.progressFill = content.querySelector('.image-data-extractor__progress-fill')!;
        this.progressText = content.querySelector('.image-data-extractor__progress-text')!;
        this.outputSection = content.querySelector('.image-data-extractor__output')!;
        this.filenameDisplay = content.querySelector('.image-data-extractor__filename')!;
        this.downloadButton = content.querySelector('.image-data-extractor__download')!;

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
        this.downloadButton.addEventListener('click', this.handleDownload.bind(this));
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
        this.progressBar.style.display = 'block';
        this.updateProgress(0);

        try {
            // Create canvas and load image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = this.preview.src;
            });

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Create worker
            const worker = new Worker(new URL('./worker.ts', import.meta.url), {
                type: 'module'
            });

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Process data using worker
            const result = await new Promise((resolve, reject) => {
                worker.onmessage = (e) => {
                    const { type, data, progress } = e.data;

                    if (type === 'progress') {
                        this.updateProgress(progress!);
                    } else if (type === 'complete') {
                        resolve(data);
                    }
                };

                worker.onerror = reject;

                worker.postMessage({
                    imageData,
                    radius,
                    width: canvas.width,
                    height: canvas.height
                }, [imageData.data.buffer]);
            });

            // Create output data with metadata
            const outputData = {
                imageData: result,
                metadata: {
                    width: img.width,
                    height: img.height,
                    samplingRadius: radius
                }
            };

            this.showOutput(outputData);  // Make sure output is fully shown

            // Dispatch completion event
            this.dispatchEvent(new CustomEvent('process-complete', {
                detail: outputData
            }));

            // Hide progress and enable button
            setTimeout(() => {
                this.progressBar.style.display = 'none';
                this.processButton.disabled = false;
                // Terminate worker only after everything else is done
                worker.terminate();
            }, 300);

        } catch (error) {
            console.error('Processing error:', error);
            this.showError('Error processing image');
            this.progressBar.style.display = 'none';
            this.processButton.disabled = false;
        }
    }

    private handleDownload() {
        const jsonString = this.downloadButton.getAttribute('data-json');
        const filename = this.downloadButton.getAttribute('data-filename');
        if (!jsonString || !filename) return;

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private validateAndProcessFile(file: File) {
        if (!file.type.startsWith('image/')) {
            this.showError('Only image files can be uploaded.');
            return false;
        }

        // Store the filename without extension
        this.currentImageName = file.name.replace(/\.[^/.]+$/, '');

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

    private updateProgress(percent: number) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `Processing: ${percent.toFixed(1)}%`;
    }

    private showPreview(dataUrl: string) {
        this.preview.src = dataUrl;
        this.preview.style.display = 'block';
        this.controls.style.display = 'block';
        this.dropzone.querySelector('.image-data-extractor__placeholder')
            ?.classList.add('image-data-extractor__placeholder--hidden');
    }

    private showOutput(data: any) {
        const filename = `${this.currentImageName}-data.json`;

        // Show filename and output section
        this.filenameDisplay.textContent = filename;
        this.outputSection.style.display = 'block';

        // Store data for download
        this.downloadButton.setAttribute('data-json', JSON.stringify(data));
        this.downloadButton.setAttribute('data-filename', filename);
    }

    private showError(message: string) {
        this.errorDisplay.textContent = message;
    }

    private clearError() {
        this.errorDisplay.textContent = '';
    }
}

customElements.define('image-data-extractor', ImageDataExtractor);