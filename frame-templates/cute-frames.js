/**
 * Cute-Frames - Tích hợp khung ảnh dễ thương cho Photo Booth
 */

// Định nghĩa các kiểu khung ảnh
const FRAME_TYPES = {
    VERTICAL_STRIP: 'vertical-strip',
    GRID_2X2: 'grid-2x2',
    HORIZONTAL_DOUBLE: 'horizontal-double',
    SINGLE: 'single'
};

// Thông tin về các khung ảnh
const FRAME_INFO = [
    {
        id: 'pink-vertical-strip',
        name: 'Dải dọc hồng',
        type: FRAME_TYPES.VERTICAL_STRIP,
        previewSrc: 'frame-templates/assets/lace-border.svg',
        slots: 4
    },
    {
        id: 'pink-grid',
        name: 'Lưới hồng 2x2',
        type: FRAME_TYPES.GRID_2X2,
        previewSrc: 'frame-templates/assets/lace-border.svg',
        slots: 4
    },
    {
        id: 'pink-horizontal',
        name: 'Ngang đôi hồng',
        type: FRAME_TYPES.HORIZONTAL_DOUBLE,
        previewSrc: 'frame-templates/assets/lace-border.svg',
        slots: 2
    },
    {
        id: 'pink-single',
        name: 'Đơn hồng',
        type: FRAME_TYPES.SINGLE,
        previewSrc: 'frame-templates/assets/lace-border.svg',
        slots: 1
    }
];

/**
 * Tạo container khung ảnh theo kiểu đã chọn
 * @param {string} frameType - Loại khung ảnh (từ FRAME_TYPES)
 * @returns {HTMLElement} - Container khung ảnh
 */
function createFrameContainer(frameType) {
    const frameContainer = document.createElement('div');
    frameContainer.className = `photo-frame ${frameType}`;
    
    // Thêm phần trang trí
    if (frameType === FRAME_TYPES.VERTICAL_STRIP || frameType === FRAME_TYPES.HORIZONTAL_DOUBLE) {
        addDecoration(frameContainer, 'bunny', 'top-left');
        addDecoration(frameContainer, 'bunny', 'bottom-right');
        addDecoration(frameContainer, 'flower', 'bottom-left');
    } else {
        addDecoration(frameContainer, 'bunny', 'top-right');
        addDecoration(frameContainer, 'flower', 'top-left');
        addDecoration(frameContainer, 'flower', 'bottom-right');
    }
    
    return frameContainer;
}

/**
 * Thêm phần trang trí vào khung ảnh
 * @param {HTMLElement} container - Container khung ảnh
 * @param {string} type - Loại trang trí ('bunny', 'flower')
 * @param {string} position - Vị trí ('top-left', 'top-right', 'bottom-left', 'bottom-right')
 */
function addDecoration(container, type, position) {
    const decoration = document.createElement('div');
    decoration.className = `${type} ${position}`;
    container.appendChild(decoration);
}

/**
 * Tạo slot ảnh trong khung
 * @param {HTMLElement} container - Container khung ảnh
 * @param {number} index - Chỉ số slot (bắt đầu từ 0)
 * @param {boolean} hasRibbon - Có thêm ruy băng không
 * @returns {HTMLElement} - Element slot ảnh
 */
function createPhotoSlot(container, index, hasRibbon = false) {
    const slot = document.createElement('div');
    slot.className = 'photo-slot';
    slot.id = `slot-${index + 1}`;
    
    if (hasRibbon) {
        const ribbon = document.createElement('div');
        ribbon.className = 'ribbon';
        slot.appendChild(ribbon);
    }
    
    container.appendChild(slot);
    return slot;
}

/**
 * Tạo khung ảnh hoàn chỉnh
 * @param {string} frameType - Loại khung ảnh
 * @param {Array} images - Mảng các đường dẫn hoặc DataURL của ảnh
 * @returns {HTMLElement} - Khung ảnh hoàn chỉnh
 */
function createCompleteFrame(frameType, images) {
    const container = createFrameContainer(frameType);
    let slotCount;
    
    switch(frameType) {
        case FRAME_TYPES.VERTICAL_STRIP:
        case FRAME_TYPES.GRID_2X2:
            slotCount = 4;
            break;
        case FRAME_TYPES.HORIZONTAL_DOUBLE:
            slotCount = 2;
            break;
        case FRAME_TYPES.SINGLE:
            slotCount = 1;
            break;
        default:
            slotCount = 1;
    }
    
    // Tạo các slot ảnh và chèn ảnh vào
    for (let i = 0; i < slotCount; i++) {
        const hasRibbon = (i === 1 && slotCount > 1) || (i === 0 && slotCount === 1);
        const slot = createPhotoSlot(container, i, hasRibbon);
        
        if (images && images[i]) {
            addImageToSlot(slot, images[i]);
        }
    }
    
    return container;
}

/**
 * Thêm ảnh vào slot
 * @param {HTMLElement} slot - Element slot ảnh
 * @param {string} imageSrc - Đường dẫn hoặc DataURL của ảnh
 */
function addImageToSlot(slot, imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Photo';
    
    // Xóa ảnh cũ nếu có
    const existingImg = slot.querySelector('img');
    if (existingImg) {
        slot.removeChild(existingImg);
    }
    
    slot.appendChild(img);
}

/**
 * Tạo preview cho danh sách khung ảnh
 * @param {HTMLElement} container - Container để hiển thị preview
 * @param {Function} onSelect - Callback khi khung ảnh được chọn
 */
function createFramePreview(container, onSelect) {
    container.innerHTML = '';
    container.className = 'frame-preview-container';
    
    FRAME_INFO.forEach((frame, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'frame-preview';
        previewItem.dataset.frameId = frame.id;
        previewItem.dataset.frameIndex = index;
        
        const img = document.createElement('img');
        img.src = frame.previewSrc;
        img.alt = frame.name;
        previewItem.appendChild(img);
        
        previewItem.addEventListener('click', () => {
            // Xóa active class từ tất cả các preview
            container.querySelectorAll('.frame-preview').forEach(item => {
                item.classList.remove('active');
            });
            
            // Thêm active class cho preview được chọn
            previewItem.classList.add('active');
            
            // Gọi callback với thông tin khung ảnh
            if (typeof onSelect === 'function') {
                onSelect(frame, index);
            }
        });
        
        container.appendChild(previewItem);
    });
    
    // Set preview đầu tiên là active mặc định
    const firstPreview = container.querySelector('.frame-preview');
    if (firstPreview) {
        firstPreview.classList.add('active');
    }
}

/**
 * Chuyển đổi ảnh thành canvas
 * @param {HTMLCanvasElement} canvas - Canvas để vẽ ảnh
 * @param {string} frameType - Loại khung ảnh
 * @param {Array} images - Mảng các ảnh (DataURL)
 */
function renderToCanvas(canvas, frameType, images) {
    const ctx = canvas.getContext('2d');
    
    // Set kích thước canvas theo khung ảnh
    let width, height;
    switch(frameType) {
        case FRAME_TYPES.VERTICAL_STRIP:
            width = 300;
            height = 800;
            break;
        case FRAME_TYPES.GRID_2X2:
            width = 600;
            height = 600;
            break;
        case FRAME_TYPES.HORIZONTAL_DOUBLE:
            width = 600;
            height = 300;
            break;
        case FRAME_TYPES.SINGLE:
            width = 400;
            height = 400;
            break;
        default:
            width = 400;
            height = 400;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Vẽ nền
    ctx.fillStyle = '#fff0f3';
    ctx.fillRect(0, 0, width, height);
    
    // Vẽ viền
    ctx.strokeStyle = '#ffb6c1';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);
    
    // Vẽ viền ren ở trên
    const laceBorder = new Image();
    laceBorder.src = 'frame-templates/assets/lace-border.svg';
    
    // Vẽ logo
    const logo = new Image();
    logo.src = 'frame-templates/assets/logo.svg';
    
    // Vẽ các ảnh vào canvas theo loại khung
    if (images && images.length > 0) {
        switch(frameType) {
            case FRAME_TYPES.VERTICAL_STRIP:
                // Vẽ 4 ảnh dọc
                for (let i = 0; i < 4; i++) {
                    if (images[i]) {
                        const img = new Image();
                        img.src = images[i];
                        const imgY = i * (height / 4);
                        ctx.drawImage(img, 20, imgY + 25, width - 40, (height / 4) - 30);
                    }
                }
                break;
                
            case FRAME_TYPES.GRID_2X2:
                // Vẽ 4 ảnh dạng lưới 2x2
                for (let i = 0; i < 4; i++) {
                    if (images[i]) {
                        const img = new Image();
                        img.src = images[i];
                        const row = Math.floor(i / 2);
                        const col = i % 2;
                        const imgX = col * (width / 2);
                        const imgY = row * (height / 2);
                        ctx.drawImage(img, imgX + 20, imgY + 25, (width / 2) - 40, (height / 2) - 40);
                    }
                }
                break;
                
            case FRAME_TYPES.HORIZONTAL_DOUBLE:
                // Vẽ 2 ảnh ngang
                for (let i = 0; i < 2; i++) {
                    if (images[i]) {
                        const img = new Image();
                        img.src = images[i];
                        const imgX = i * (width / 2);
                        ctx.drawImage(img, imgX + 20, 25, (width / 2) - 40, height - 60);
                    }
                }
                break;
                
            case FRAME_TYPES.SINGLE:
                // Vẽ 1 ảnh đơn
                if (images[0]) {
                    const img = new Image();
                    img.src = images[0];
                    ctx.drawImage(img, 20, 25, width - 40, height - 60);
                }
                break;
        }
    }
    
    // Vẽ viền ren
    laceBorder.onload = () => {
        ctx.drawImage(laceBorder, 0, 0, width, 20);
    };
    
    // Vẽ logo
    logo.onload = () => {
        ctx.drawImage(logo, width - 120, height - 40, 100, 30);
    };
    
    // Thêm thỏ trang trí vào góc
    const bunny = new Image();
    bunny.src = 'frame-templates/assets/bunny.svg';
    bunny.onload = () => {
        ctx.drawImage(bunny, 10, 30, 50, 50);
    };
    
    // Thêm hoa trang trí
    const flower = new Image();
    flower.src = 'frame-templates/assets/flower.svg';
    flower.onload = () => {
        ctx.drawImage(flower, width - 40, height - 80, 30, 30);
    };
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(canvas);
        }, 800); // Đợi 800ms để ảnh load
    });
}

// Export các hàm và hằng số cần thiết
window.CuteFrames = {
    FRAME_TYPES,
    FRAME_INFO,
    createFramePreview,
    createCompleteFrame,
    renderToCanvas
}; 