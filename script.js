// Biến toàn cục
let videoStream = null;
let capturedImage = null;
let isFaceDetectionModelLoaded = false;
let isProcessing = false;

// DOM Elements
const video = document.getElementById('video');
const videoOverlay = document.getElementById('video-overlay');
const photoCanvas = document.getElementById('photo');
const captureBtn = document.getElementById('capture-btn');
const beautifyBtn = document.getElementById('beautify-btn');
const downloadBtn = document.getElementById('download-btn');
const retryBtn = document.getElementById('retry-btn');
const statusMsg = document.getElementById('status-message');
const loadingElement = document.getElementById('loading');

// Canvas Contexts
const photoCtx = photoCanvas.getContext('2d');
const overlayCtx = videoOverlay.getContext('2d');

// Khởi tạo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showStatus('Đang tải các model AI...', false);
        
        // Tải các models cho face-api.js
        await loadFaceDetectionModels();
        
        isFaceDetectionModelLoaded = true;
        showStatus('Các model AI đã được tải thành công!', false);
        
        // Khởi tạo webcam
        await setupWebcam();
        
        // Thiết lập event listeners
        setupEventListeners();
        
        // Bắt đầu phát hiện khuôn mặt
        detectFaces();
        
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        showStatus('Không thể khởi tạo: ' + error.message, true);
    }
});

// Tải models cho face-api.js
async function loadFaceDetectionModels() {
    try {
        // Cấu hình đường dẫn tới thư mục chứa models
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights');
        console.log('Face detection models loaded');
    } catch (error) {
        throw new Error('Không thể tải models AI: ' + error.message);
    }
}

// Khởi tạo webcam
async function setupWebcam() {
    try {
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = videoStream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                // Thiết lập kích thước canvas phù hợp với video
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                
                video.width = videoWidth;
                video.height = videoHeight;
                
                photoCanvas.width = videoWidth;
                photoCanvas.height = videoHeight;
                
                videoOverlay.width = videoWidth;
                videoOverlay.height = videoHeight;
                
                resolve();
            };
        });
    } catch (error) {
        throw new Error('Không thể truy cập webcam: ' + error.message);
    }
}

// Thiết lập event listeners
function setupEventListeners() {
    captureBtn.addEventListener('click', capturePhoto);
    beautifyBtn.addEventListener('click', beautifyPhoto);
    downloadBtn.addEventListener('click', downloadPhoto);
    retryBtn.addEventListener('click', resetPhoto);
}

// Hiển thị thông báo trạng thái
function showStatus(message, isError = false) {
    statusMsg.textContent = message;
    statusMsg.className = 'status-message' + (isError ? ' error' : '');
}

// Phát hiện khuôn mặt trong video stream
async function detectFaces() {
    if (!isFaceDetectionModelLoaded || !video.srcObject) return;
    
    try {
        const detections = await faceapi.detectAllFaces(
            video, 
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();
        
        // Xóa canvas overlay
        overlayCtx.clearRect(0, 0, videoOverlay.width, videoOverlay.height);
        
        // Vẽ kết quả nhận diện lên overlay canvas
        if (detections.length > 0) {
            // Điều chỉnh kích thước kết quả theo kích thước hiển thị
            const displaySize = { width: video.width, height: video.height };
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            
            // Vẽ landmark khuôn mặt
            faceapi.draw.drawFaceLandmarks(videoOverlay, resizedDetections);
        }
    } catch (error) {
        console.error('Lỗi phát hiện khuôn mặt:', error);
    }
    
    // Tiếp tục phát hiện trong frame tiếp theo
    requestAnimationFrame(detectFaces);
}

// Chụp ảnh từ webcam
function capturePhoto() {
    try {
        // Vẽ frame hiện tại từ video lên canvas
        photoCtx.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);
        
        // Lưu ảnh đã chụp
        capturedImage = photoCtx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
        
        // Kích hoạt các nút
        beautifyBtn.disabled = false;
        retryBtn.disabled = false;
        
        showStatus('Đã chụp ảnh! Bạn có thể làm đẹp bằng AI.', false);
    } catch (error) {
        console.error('Lỗi khi chụp ảnh:', error);
        showStatus('Không thể chụp ảnh: ' + error.message, true);
    }
}

// Làm đẹp ảnh bằng AI
async function beautifyPhoto() {
    if (isProcessing || !capturedImage) return;
    
    try {
        isProcessing = true;
        showLoading(true);
        
        // Lấy khuôn mặt từ ảnh đã chụp
        const detections = await faceapi.detectAllFaces(
            photoCanvas, 
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();
        
        if (detections.length === 0) {
            showStatus('Không phát hiện khuôn mặt trong ảnh', true);
            isProcessing = false;
            showLoading(false);
            return;
        }
        
        // Clone ảnh gốc để xử lý
        const processedImageData = new ImageData(
            new Uint8ClampedArray(capturedImage.data),
            capturedImage.width,
            capturedImage.height
        );
        
        // Áp dụng các hiệu ứng làm đẹp
        smoothSkin(processedImageData, detections);
        brightenSkin(processedImageData, detections);
        
        // Hiển thị ảnh đã xử lý
        photoCtx.putImageData(processedImageData, 0, 0);
        
        // Kích hoạt nút tải xuống
        downloadBtn.disabled = false;
        
        showStatus('Đã làm đẹp ảnh!', false);
    } catch (error) {
        console.error('Lỗi khi làm đẹp ảnh:', error);
        showStatus('Không thể làm đẹp ảnh: ' + error.message, true);
    } finally {
        isProcessing = false;
        showLoading(false);
    }
}

// Làm mịn da (hiệu ứng làm đẹp)
function smoothSkin(imageData, detections) {
    // Chuyển đổi phát hiện về đúng kích thước
    const resizedDetections = faceapi.resizeResults(detections, {
        width: imageData.width,
        height: imageData.height
    });
    
    // Clone dữ liệu ảnh để xử lý
    const tempImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );
    
    for (const detection of resizedDetections) {
        try {
            // Lấy boundingBox để có vùng xử lý rộng hơn
            const box = detection.detection.box;
            const boxX = Math.max(0, Math.floor(box.x - box.width * 0.1));
            const boxY = Math.max(0, Math.floor(box.y - box.height * 0.1));
            const boxWidth = Math.min(Math.floor(box.width * 1.2), imageData.width - boxX);
            const boxHeight = Math.min(Math.floor(box.height * 1.2), imageData.height - boxY);
            
            // Áp dụng bộ lọc Gaussian Blur cho toàn bộ vùng khuôn mặt
            applyGaussianBlur(tempImageData, boxX, boxY, boxWidth, boxHeight, 3);
            
            // Áp dụng kết quả vào ảnh gốc với mức độ blend
            for (let y = boxY; y < boxY + boxHeight; y++) {
                for (let x = boxX; x < boxX + boxWidth; x++) {
                    if (isInFaceRegion(x, y, detection) && isSkinTone(imageData, x, y)) {
                        const idx = (y * imageData.width + x) * 4;
                        
                        // Blend với tỷ lệ 70/30 (giữ chi tiết nhưng vẫn mịn)
                        imageData.data[idx] = imageData.data[idx] * 0.7 + tempImageData.data[idx] * 0.3;
                        imageData.data[idx + 1] = imageData.data[idx + 1] * 0.7 + tempImageData.data[idx + 1] * 0.3;
                        imageData.data[idx + 2] = imageData.data[idx + 2] * 0.7 + tempImageData.data[idx + 2] * 0.3;
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi làm mịn da:", error);
        }
    }
}

// Áp dụng bộ lọc Gaussian Blur
function applyGaussianBlur(imageData, startX, startY, width, height, radius) {
    // Tạo kernel Gaussian
    const kernel = createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const halfKernelSize = Math.floor(kernelSize / 2);
    
    // Tạo bản sao để tính toán
    const tempData = new Uint8ClampedArray(imageData.data.length);
    
    // Áp dụng blur theo chiều ngang
    for (let y = startY; y < startY + height; y++) {
        for (let x = startX; x < startX + width; x++) {
            let r = 0, g = 0, b = 0;
            let weightSum = 0;
            
            for (let i = -halfKernelSize; i <= halfKernelSize; i++) {
                const pixelX = x + i;
                if (pixelX >= 0 && pixelX < imageData.width) {
                    const kernelValue = kernel[i + halfKernelSize];
                    const idx = (y * imageData.width + pixelX) * 4;
                    
                    r += imageData.data[idx] * kernelValue;
                    g += imageData.data[idx + 1] * kernelValue;
                    b += imageData.data[idx + 2] * kernelValue;
                    weightSum += kernelValue;
                }
            }
            
            const outIdx = (y * imageData.width + x) * 4;
            tempData[outIdx] = r / weightSum;
            tempData[outIdx + 1] = g / weightSum;
            tempData[outIdx + 2] = b / weightSum;
            tempData[outIdx + 3] = imageData.data[outIdx + 3]; // Giữ nguyên alpha
        }
    }
    
    // Áp dụng blur theo chiều dọc
    for (let y = startY; y < startY + height; y++) {
        for (let x = startX; x < startX + width; x++) {
            let r = 0, g = 0, b = 0;
            let weightSum = 0;
            
            for (let j = -halfKernelSize; j <= halfKernelSize; j++) {
                const pixelY = y + j;
                if (pixelY >= 0 && pixelY < imageData.height) {
                    const kernelValue = kernel[j + halfKernelSize];
                    const idx = (pixelY * imageData.width + x) * 4;
                    
                    r += tempData[idx] * kernelValue;
                    g += tempData[idx + 1] * kernelValue;
                    b += tempData[idx + 2] * kernelValue;
                    weightSum += kernelValue;
                }
            }
            
            const outIdx = (y * imageData.width + x) * 4;
            imageData.data[outIdx] = r / weightSum;
            imageData.data[outIdx + 1] = g / weightSum;
            imageData.data[outIdx + 2] = b / weightSum;
        }
    }
}

// Tạo kernel Gaussian
function createGaussianKernel(radius) {
    const size = radius * 2 + 1;
    const kernel = new Array(size);
    const sigma = radius / 3;
    let sum = 0;
    
    for (let i = 0; i < size; i++) {
        const x = i - radius;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }
    
    // Chuẩn hóa kernel
    for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
    }
    
    return kernel;
}

// Kiểm tra xem điểm có nằm trong vùng khuôn mặt không
function isInFaceRegion(x, y, detection) {
    try {
        // Lấy bounding box
        const box = detection.detection.box;
        
        // Kiểm tra trước nếu điểm nằm ngoài box, trả về false ngay
        if (x < box.x || x > box.x + box.width || 
            y < box.y || y > box.y + box.height) {
            return false;
        }
        
        // Lấy điểm landmark khuôn mặt
        const landmarks = detection.landmarks;
        const positions = landmarks.positions;
        
        // Tạo một đa giác từ các điểm viền khuôn mặt
        const facePolygon = [];
        
        // Thêm các điểm viền khuôn mặt (jawOutline)
        for (let i = 0; i <= 16; i++) {
            facePolygon.push([positions[i].x, positions[i].y]);
        }
        
        // Thêm điểm trán
        facePolygon.push([positions[19].x, positions[19].y]);
        facePolygon.push([positions[24].x, positions[24].y]);
        
        // Kiểm tra xem điểm có nằm trong đa giác hay không
        return isPointInPolygon(x, y, facePolygon);
    } catch (error) {
        console.error("Lỗi khi kiểm tra vùng khuôn mặt:", error);
        // Nếu có lỗi, trả về false để an toàn
        return false;
    }
}

// Kiểm tra một điểm có nằm trong đa giác hay không
function isPointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Làm sáng da
function brightenSkin(imageData, detections) {
    // Chuyển đổi phát hiện về đúng kích thước
    const resizedDetections = faceapi.resizeResults(detections, {
        width: imageData.width,
        height: imageData.height
    });
    
    for (const detection of resizedDetections) {
        try {
            // Lấy bounding box để có vùng xử lý rộng hơn
            const box = detection.detection.box;
            const boxX = Math.max(0, Math.floor(box.x - box.width * 0.1));
            const boxY = Math.max(0, Math.floor(box.y - box.height * 0.1));
            const boxWidth = Math.min(Math.floor(box.width * 1.2), imageData.width - boxX);
            const boxHeight = Math.min(Math.floor(box.height * 1.2), imageData.height - boxY);
            
            // Áp dụng làm sáng và tăng tương phản
            for (let y = boxY; y < boxY + boxHeight; y++) {
                for (let x = boxX; x < boxX + boxWidth; x++) {
                    if (isInFaceRegion(x, y, detection) && isSkinTone(imageData, x, y)) {
                        const idx = (y * imageData.width + x) * 4;
                        
                        // Tăng độ sáng (khoảng 15-20%)
                        const brightnessFactor = 1.18;
                        
                        // Tăng tương phản
                        const contrastFactor = 1.1;
                        const avg = 128; // Giá trị trung bình của thang màu
                        
                        for (let c = 0; c < 3; c++) {
                            // Áp dụng tăng sáng
                            let newValue = imageData.data[idx + c] * brightnessFactor;
                            
                            // Áp dụng tăng tương phản
                            newValue = (newValue - avg) * contrastFactor + avg;
                            
                            // Giới hạn giá trị trong khoảng 0-255
                            imageData.data[idx + c] = Math.max(0, Math.min(255, newValue));
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi làm sáng da:", error);
        }
    }
}

// Kiểm tra xem pixel có phải là tông màu da hay không
function isSkinTone(imageData, x, y) {
    const idx = (y * imageData.width + x) * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];
    
    // Chuyển đổi RGB sang nhiều không gian màu
    
    // 1. YCbCr - tách độ sáng và màu sắc
    const Y = 0.299 * r + 0.587 * g + 0.114 * b;
    const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    
    // 2. HSV - Hue, Saturation, Value
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const v = max / 255;
    const s = (max === 0) ? 0 : delta / max;
    
    // Điều kiện kết hợp để phát hiện màu da
    // Các điều kiện này được tinh chỉnh để phát hiện nhiều tông màu da khác nhau
    
    // Điều kiện YCbCr - phổ biến cho phát hiện màu da
    const ycbcrCondition = (Y > 80) && 
                           (Cb > 77 && Cb < 127) && 
                           (Cr > 133 && Cr < 173);
    
    // Điều kiện RGB đơn giản
    const rgbCondition = (r > 95 && g > 40 && b > 20) && 
                         (r > g && r > b) && 
                         (r - Math.min(g, b) > 15);
    
    // Điều kiện HSV
    const hsvCondition = (v > 0.15) && (s > 0.1) && (s < 0.9);
    
    // Kết hợp các điều kiện
    return ycbcrCondition || (rgbCondition && hsvCondition);
}

// Giữ nguyên function isImprovedSkinPixel để tránh lỗi với code cũ
function isImprovedSkinPixel(imageData, x, y) {
    return isSkinTone(imageData, x, y);
}

// Giữ nguyên function isSkinPixel hiện tại để các phần khác của code không bị ảnh hưởng
function isSkinPixel(imageData, x, y) {
    return isSkinTone(imageData, x, y);
}

// Lấy màu trung bình của các pixel xung quanh
function getAverageColor(imageData, x, y, radius) {
    let totalR = 0, totalG = 0, totalB = 0;
    let count = 0;
    
    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            const px = x + j;
            const py = y + i;
            
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
                const idx = (py * imageData.width + px) * 4;
                totalR += imageData.data[idx];
                totalG += imageData.data[idx + 1];
                totalB += imageData.data[idx + 2];
                count++;
            }
        }
    }
    
    return {
        r: Math.round(totalR / count),
        g: Math.round(totalG / count),
        b: Math.round(totalB / count)
    };
}

// Tải ảnh xuống
function downloadPhoto() {
    try {
        const link = document.createElement('a');
        link.download = 'photo-booth-ai-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
        link.href = photoCanvas.toDataURL('image/png');
        link.click();
        
        showStatus('Ảnh đã được tải xuống!', false);
    } catch (error) {
        console.error('Lỗi khi tải ảnh xuống:', error);
        showStatus('Không thể tải ảnh xuống: ' + error.message, true);
    }
}

// Reset về trạng thái ban đầu
function resetPhoto() {
    photoCtx.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
    capturedImage = null;
    
    beautifyBtn.disabled = true;
    downloadBtn.disabled = true;
    retryBtn.disabled = true;
    
    showStatus('Sẵn sàng chụp ảnh mới', false);
}

// Hiển thị/ẩn màn hình loading
function showLoading(show) {
    loadingElement.style.display = show ? 'flex' : 'none';
}

// Dọn dẹp khi người dùng rời trang
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
}); 