// File: pages/src/wkg-display.mjs
import * as common from '/pages/src/common.mjs';

// Settings variables
let wkgThreshold1;
let wkgThreshold2;
let fontSize;
let textColor;
let solidBackground;
let backgroundColor;
let backgroundAlpha;
let fontScale;
let imageSource1;
let imageUrl1;
let imageWidth1;
let localImageData1;
let imageSource2;
let imageUrl2;
let imageWidth2;
let localImageData2;
let animation1;
let animation2;

// Default settings
common.settingsStore.setDefault({
    wkgThreshold1: 4.0,
    wkgThreshold2: 5.0,
    fontSize: 24,
    textColor: '#ffffff',
    solidBackground: false,
    backgroundColor: '#00ff00',
    backgroundAlpha: 100,
    fontScale: 1,
    // First threshold image settings
    imageSource1: 'default',
    imageUrl1: '',
    imageWidth1: 200,
    localImageData1: '',
    animation1: 'float',

    // Second threshold image settings
    imageSource2: 'default',
    imageUrl2: '',
    imageWidth2: 200,
    localImageData2: '',
    animation2: 'float'
});

// Load settings into variables
function loadSettings() {
    const settings = common.settingsStore.get();
    wkgThreshold1 = settings.wkgThreshold1;
    wkgThreshold2 = settings.wkgThreshold2;
    fontSize = settings.fontSize;
    textColor = settings.textColor;
    solidBackground = settings.solidBackground;
    backgroundColor = settings.backgroundColor;
    backgroundAlpha = settings.backgroundAlpha;
    fontScale = settings.fontScale;
    imageSource1 = settings.imageSource1;
    imageUrl1 = settings.imageUrl1;
    imageWidth1 = settings.imageWidth1;
    localImageData1 = settings.localImageData1;
    imageSource2 = settings.imageSource2;
    imageUrl2 = settings.imageUrl2;
    imageWidth2 = settings.imageWidth2;
    localImageData2 = settings.localImageData2;
    animation1 = settings.animation1;
    animation2 = settings.animation2;
}

// Main window initialization
export async function main() {
    common.initInteractionListeners();
    common.subscribe('athlete/watching', updateMetrics);
    common.settingsStore.addEventListener('changed', onSettingsChanged);
    loadSettings();
    updateBackground();
    updateImages();
    render();
}

// Settings window initialization
export async function settingsMain() {
    await common.initInteractionListeners();
    
    // Get the form
    const form = document.getElementById('options');
    if (!form) return;

    // Load current settings
    loadSettings();
    
    // Initialize form handler
    const updateForm = await common.initSettingsForm('form');

    // Add direct form change handler
    form.addEventListener('input', (ev) => {
        const element = ev.target;
        if (element.name) {
            let value = element.type === 'checkbox' ? element.checked : element.value;
            if (element.type === 'number') {
                value = Number(value);
            }
            common.settingsStore.set(element.name, value);
        }
    });

    // Set up image handlers
    setupImageInputs(1);
    setupImageInputs(2);
    
    // Initial update
    updateForm();
}

function setupImageInputs(thresholdNum) {
    // File input handler
    const fileInput = document.querySelector(`input[name="localImage${thresholdNum}"]`);
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files?.length) {
                try {
                    const dataUrl = await handleFileSelect(e.target.files[0]);
                    common.settingsStore.set(`localImageData${thresholdNum}`, dataUrl);
                    updatePreview(dataUrl, thresholdNum);
                } catch (err) {
                    console.error(`Error loading image ${thresholdNum}:`, err);
                    showPreviewError('Error loading file', thresholdNum);
                }
            }
        });
    }

    // URL input handler
    const urlInput = document.querySelector(`input[name="imageUrl${thresholdNum}"]`);
    if (urlInput) {
        let debounceTimer;
        urlInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const url = e.target.value.trim();
                if (url) {
                    updatePreview(url, thresholdNum);
                    common.settingsStore.set(`imageUrl${thresholdNum}`, url);
                }
            }, 500);
        });
    }

    // Source selection handler
    const sourceSelect = document.querySelector(`select[name="imageSource${thresholdNum}"]`);
    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            common.settingsStore.set(`imageSource${thresholdNum}`, value);
            
            const imageUrl = thresholdNum === 1 ? imageUrl1 : imageUrl2;
            const localImageData = thresholdNum === 1 ? localImageData1 : localImageData2;
            
            if (value === 'url' && imageUrl) {
                updatePreview(imageUrl, thresholdNum);
            } else if (value === 'local' && localImageData) {
                updatePreview(localImageData, thresholdNum);
            } else if (value === 'default') {
                updatePreview('../images/costcoguy.png', thresholdNum);
            }
        });
    }

    // Initialize preview based on current settings
    const currentSource = thresholdNum === 1 ? imageSource1 : imageSource2;
    const currentUrl = thresholdNum === 1 ? imageUrl1 : imageUrl2;
    const currentLocalData = thresholdNum === 1 ? localImageData1 : localImageData2;
    
    if (currentSource === 'url' && currentUrl) {
        updatePreview(currentUrl, thresholdNum);
    } else if (currentSource === 'local' && currentLocalData) {
        updatePreview(currentLocalData, thresholdNum);
    } else if (currentSource === 'default') {
        updatePreview('../images/costcoguy.png', thresholdNum);
    }
}

async function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be smaller than 5MB');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsDataURL(file);
    });
}

function updatePreview(imageUrl, thresholdNum) {
    const preview = document.getElementById(`image-preview${thresholdNum}`);
    if (!preview) return;

    clearPreviewError(thresholdNum);
    
    if (!imageUrl) {
        preview.style.display = 'none';
        return;
    }

    const img = new Image();
    img.onload = () => {
        preview.src = imageUrl;
        preview.style.display = 'block';
    };
    
    img.onerror = () => {
        preview.style.display = 'none';
        showPreviewError('Error loading image', thresholdNum);
    };
    
    try {
        img.src = imageUrl;
    } catch (err) {
        preview.style.display = 'none';
        showPreviewError('Invalid image URL', thresholdNum);
    }
}

function showPreviewError(message, thresholdNum) {
    const errorDiv = document.getElementById(`preview-error${thresholdNum}`);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }
}

function clearPreviewError(thresholdNum) {
    const errorDiv = document.getElementById(`preview-error${thresholdNum}`);
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
    }
}

function onSettingsChanged(ev) {
    const changed = ev.data.changed;
    const settings = common.settingsStore.get();

    // Update any changed settings
    if (changed.has('wkgThreshold1')) wkgThreshold1 = settings.wkgThreshold1;
    if (changed.has('wkgThreshold2')) wkgThreshold2 = settings.wkgThreshold2;
    if (changed.has('fontSize')) fontSize = settings.fontSize;
    if (changed.has('textColor')) textColor = settings.textColor;
    if (changed.has('solidBackground')) solidBackground = settings.solidBackground;
    if (changed.has('backgroundColor')) backgroundColor = settings.backgroundColor;
    if (changed.has('backgroundAlpha')) backgroundAlpha = settings.backgroundAlpha;
    if (changed.has('fontScale')) fontScale = settings.fontScale;
    if (changed.has('imageSource1')) imageSource1 = settings.imageSource1;
    if (changed.has('imageUrl1')) imageUrl1 = settings.imageUrl1;
    if (changed.has('imageWidth1')) imageWidth1 = settings.imageWidth1;
    if (changed.has('localImageData1')) localImageData1 = settings.localImageData1;
    if (changed.has('imageSource2')) imageSource2 = settings.imageSource2;
    if (changed.has('imageUrl2')) imageUrl2 = settings.imageUrl2;
    if (changed.has('imageWidth2')) imageWidth2 = settings.imageWidth2;
    if (changed.has('localImageData2')) localImageData2 = settings.localImageData2;
    if (changed.has('animation1')) animation1 = settings.animation1;
    if (changed.has('animation2')) animation2 = settings.animation2;

    if (changed.has('solidBackground') || 
        changed.has('backgroundColor') || 
        changed.has('backgroundAlpha')) {
        updateBackground();
    }
    
    updateImages();
    render();
}

function updateBackground() {
    if (solidBackground) {
        const alpha = Math.round(backgroundAlpha || 100).toString(16).padStart(2, '0');
        document.documentElement.style.setProperty('--background', 
            `${backgroundColor}${alpha}`);
    } else {
        document.documentElement.style.setProperty('--background', 'transparent');
    }
    
    // Pass current values to setBackground
    common.setBackground({
        solidBackground,
        backgroundColor,
        backgroundAlpha
    });
}

function updateImages() {
    updateImage(1);
    updateImage(2);
}

function updateImage(thresholdNum) {
    const imgEl = document.getElementById(`costco-guy${thresholdNum}`);
    if (!imgEl) return;

    // Use local variables for current values
    const width = thresholdNum === 1 ? imageWidth1 : imageWidth2;
    const source = thresholdNum === 1 ? imageSource1 : imageSource2;
    const url = thresholdNum === 1 ? imageUrl1 : imageUrl2;
    const localData = thresholdNum === 1 ? localImageData1 : localImageData2;

    // Set width directly
    imgEl.style.width = `${width}px`;

    // Update source based on type
    switch (source) {
        case 'url':
            if (url) {
                imgEl.src = url;
            }
            break;
        case 'local':
            if (localData) {
                imgEl.src = localData;
            }
            break;
        default:
            imgEl.src = './images/costcoguy.png';
    }
}

function render() {
    const display = document.getElementById('wkg-display');
    if (!display) return;

    display.style.fontSize = `${fontSize * (fontScale || 1)}px`;
    
    if (textColor && textColor !== '#ffffff') {
        display.style.color = textColor;
    } else {
        display.style.color = '';
    }
}

function updateMetrics(info) {
    if (!info?.state?.power) return;

    const wkg = info.state.power / (info.athlete?.weight || 75);
    
    const displayEl = document.getElementById('wkg-display');
    if (displayEl) {
        displayEl.textContent = `${wkg.toFixed(1)} W/kg`;
    }

    // First threshold image
    const imgEl1 = document.getElementById('costco-guy1');
    if (imgEl1) {
        // Remove any existing animation classes
        imgEl1.classList.remove('anim-float', 'anim-pulse', 'anim-shake', 'anim-spin', 'anim-bounce');
        // Add new animation class if showing
        if (wkg > wkgThreshold1 && wkg <= wkgThreshold2) {
            imgEl1.classList.add('show');
            imgEl1.classList.add(`anim-${animation1}`);
        } else {
            imgEl1.classList.remove('show');
        }
    }

    // Second threshold image
    const imgEl2 = document.getElementById('costco-guy2');
    if (imgEl2) {
        // Remove any existing animation classes
        imgEl2.classList.remove('anim-float', 'anim-pulse', 'anim-shake', 'anim-spin', 'anim-bounce');
        // Add new animation class if showing
        if (wkg > wkgThreshold2) {
            imgEl2.classList.add('show');
            imgEl2.classList.add(`anim-${animation2}`);
        } else {
            imgEl2.classList.remove('show');
        }
    }
}