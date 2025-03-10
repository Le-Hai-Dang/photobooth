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
            new faceapi.TinyFaceDetectorOptions({scoreThreshold: 0.6})
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
            
            // Hiển thị vùng xử lý của khuôn mặt
            for (const detection of resizedDetections) {
                try {
                    const landmarks = detection.landmarks;
                    
                    // Lấy các nhóm điểm quan trọng
                    const jawPositions = landmarks.getJawOutline();
                    const leftEyeBrowPositions = landmarks.getLeftEyeBrow();
                    const rightEyeBrowPositions = landmarks.getRightEyeBrow();
                    
                    // Tìm điểm cao nhất của lông mày
                    let minY = Number.MAX_VALUE;
                    for (const pos of [...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
                        if (pos.y < minY) {
                            minY = pos.y;
                        }
                    }
                    
                    // Lấy điểm ngoài cùng của lông mày
                    const leftMostEyeBrow = leftEyeBrowPositions[0];
                    const rightMostEyeBrow = rightEyeBrowPositions[rightEyeBrowPositions.length - 1];
                    
                    // Tính khoảng cách từ lông mày đến jawline để ước tính chiều cao trán
                    const faceHeight = jawPositions[8].y - minY; // Từ giữa cằm đến lông mày
                    const foreheadHeight = faceHeight * 0.6; // Mở rộng lên 0.6 để trán cao hơn
                    
                    // Vị trí cao nhất của trán
                    const foreheadTopY = minY - foreheadHeight;
                    
                    // Vẽ đường viền khuôn mặt
                    overlayCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                    overlayCtx.lineWidth = 2;
                    overlayCtx.beginPath();
                    
                    // Bắt đầu từ điểm jawline bên trái
                    overlayCtx.moveTo(jawPositions[0].x, jawPositions[0].y);
                    
                    // Vẽ đường lên tới trán bên trái
                    overlayCtx.lineTo(foreheadLeftX, foreheadTopY);
                    
                    // Vẽ đường trán với đường cong rộng hơn và cao hơn
                    overlayCtx.quadraticCurveTo(
                        (foreheadLeftX + foreheadRightX) / 2, 
                        foreheadTopY - 20, // Đỉnh của đường cong cao hơn nhiều
                        foreheadRightX, 
                        foreheadTopY
                    );
                    
                    // Vẽ đường xuống tới jawline bên phải
                    overlayCtx.lineTo(jawPositions[jawPositions.length - 1].x, jawPositions[jawPositions.length - 1].y);
                    
                    // Vẽ đường jawline
                    for (let i = jawPositions.length - 2; i >= 0; i--) {
                        overlayCtx.lineTo(jawPositions[i].x, jawPositions[i].y);
                    }
                    
                    // Đóng đường
                    overlayCtx.closePath();
                    overlayCtx.stroke();
                    
                    // Hiển thị vùng trán để debug (tùy chọn)
                    // overlayCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                    // overlayCtx.fill();
                } catch (error) {
                    console.error("Lỗi khi vẽ đường viền khuôn mặt:", error);
                }
            }
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
            // Lấy các điểm landmark
            const landmarks = detection.landmarks;
            
            // Lấy các nhóm điểm quan trọng
            const jawPositions = landmarks.getJawOutline();
            const leftEyeBrowPositions = landmarks.getLeftEyeBrow();
            const rightEyeBrowPositions = landmarks.getRightEyeBrow();
            const leftEyePositions = landmarks.getLeftEye();
            const rightEyePositions = landmarks.getRightEye();
            const nosePositions = landmarks.getNose();
            const mouthPositions = landmarks.getMouth();
            
            // Tìm điểm cao nhất của lông mày
            let minY = Number.MAX_VALUE;
            for (const pos of [...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
                if (pos.y < minY) {
                    minY = pos.y;
                }
            }
            
            // Tìm điểm thấp nhất của cằm
            let maxY = 0;
            for (const pos of jawPositions) {
                if (pos.y > maxY) {
                    maxY = pos.y;
                }
            }
            
            // Tìm điểm trái nhất và phải nhất
            let minX = Number.MAX_VALUE, maxX = 0;
            for (const pos of [...jawPositions, ...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
                if (pos.x < minX) minX = pos.x;
                if (pos.x > maxX) maxX = pos.x;
            }
            
            // Tính khoảng cách từ lông mày đến jawline để ước tính chiều cao trán
            const faceHeight = maxY - minY; // Từ giữa cằm đến lông mày
            const foreheadHeight = faceHeight * 0.6; // Mở rộng trán lên 0.6
            
            // Vị trí cao nhất của trán
            const foreheadTopY = minY - foreheadHeight;
            
            // Mở rộng vùng trán sang hai bên (đặc biệt là phần có tóc)
            const leftMostEyeBrow = leftEyeBrowPositions[0];
            const rightMostEyeBrow = rightEyeBrowPositions[rightEyeBrowPositions.length - 1];
            
            // Xác định vùng xử lý - hình chữ nhật bao quanh khuôn mặt + trán
            const padding = 25; // Tăng padding để đảm bảo bao quanh khuôn mặt
            const boxX = Math.max(0, Math.floor(minX - padding));
            const boxY = Math.max(0, Math.floor(foreheadTopY - 30)); // Mở rộng lên thêm 30px
            const boxWidth = Math.min(Math.floor(maxX - minX + padding * 2), imageData.width - boxX);
            const boxHeight = Math.min(Math.floor(maxY - boxY + padding), imageData.height - boxY);
            
            // Áp dụng bộ lọc Gaussian Blur chỉ cho vùng khuôn mặt
            applyGaussianBlur(tempImageData, boxX, boxY, boxWidth, boxHeight, 3);
            
            // Áp dụng kết quả vào ảnh gốc với mức độ blend
            for (let y = boxY; y < boxY + boxHeight; y++) {
                for (let x = boxX; x < boxX + boxWidth; x++) {
                    // Kiểm tra xem điểm có thuộc vùng khuôn mặt và là màu da không
                    if (isInFaceRegion(x, y, detection) && isSkinTone(imageData, x, y)) {
                        const idx = (y * imageData.width + x) * 4;
                        
                        // Áp dụng độ mịn khác nhau dựa vào vị trí trên khuôn mặt
                        let blendFactor;
                        
                        // Kiểm tra vùng trán rộng hơn
                        const isUpperForehead = (y < minY - foreheadHeight * 0.3 && y >= foreheadTopY - 30);
                        const isLowerForehead = (y < minY && y >= minY - foreheadHeight * 0.3);
                        
                        // Kiểm tra xem điểm có thuộc vùng mắt không
                        let isEyeRegion = false;
                        for (const pos of [...leftEyePositions, ...rightEyePositions]) {
                            if (Math.abs(x - pos.x) < 15 && Math.abs(y - pos.y) < 10) {
                                isEyeRegion = true;
                                break;
                            }
                        }
                        
                        // Kiểm tra xem điểm có thuộc vùng lông mày không
                        let isEyebrowRegion = false;
                        for (const pos of [...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
                            if (Math.abs(x - pos.x) < 10 && Math.abs(y - pos.y) < 5) {
                                isEyebrowRegion = true;
                                break;
                            }
                        }
                        
                        // Vùng mắt và lông mày - ít làm mịn nhất
                        if (isEyeRegion || isEyebrowRegion) {
                            blendFactor = 0.9; // 90% ảnh gốc, 10% đã làm mịn
                        }
                        // Vùng trán cao (gần chân tóc) - làm mịn nhiều hơn
                        else if (isUpperForehead) {
                            blendFactor = 0.7; // 70% ảnh gốc, 30% đã làm mịn
                        }
                        // Vùng trán thấp (gần lông mày) - làm mịn vừa phải
                        else if (isLowerForehead) {
                            blendFactor = 0.75; // 75% ảnh gốc, 25% đã làm mịn
                        }
                        // Kiểm tra vùng mũi và miệng - làm mịn vừa phải
                        else {
                            let isNoseMouthRegion = false;
                            for (const pos of [...nosePositions, ...mouthPositions]) {
                                if (Math.abs(x - pos.x) < 20 && Math.abs(y - pos.y) < 15) {
                                    isNoseMouthRegion = true;
                                    break;
                                }
                            }
                            
                            if (isNoseMouthRegion) {
                                blendFactor = 0.8; // 80% ảnh gốc, 20% đã làm mịn
                            } 
                            // Vùng má và các bên - làm mịn nhiều nhất
                            else {
                                blendFactor = 0.7; // 70% ảnh gốc, 30% đã làm mịn
                            }
                        }
                        
                        // Blend với tỷ lệ thích hợp
                        imageData.data[idx] = Math.round(imageData.data[idx] * blendFactor + tempImageData.data[idx] * (1 - blendFactor));
                        imageData.data[idx + 1] = Math.round(imageData.data[idx + 1] * blendFactor + tempImageData.data[idx + 1] * (1 - blendFactor));
                        imageData.data[idx + 2] = Math.round(imageData.data[idx + 2] * blendFactor + tempImageData.data[idx + 2] * (1 - blendFactor));
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
        // Lấy các điểm landmark
        const landmarks = detection.landmarks;
        
        // Lấy các nhóm điểm quan trọng
        const jawPositions = landmarks.getJawOutline();
        const leftEyeBrowPositions = landmarks.getLeftEyeBrow();
        const rightEyeBrowPositions = landmarks.getRightEyeBrow();
        
        // Tìm điểm cao nhất của lông mày
        let minY = Number.MAX_VALUE;
        for (const pos of [...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
            if (pos.y < minY) {
                minY = pos.y;
            }
        }
        
        // Lấy điểm ngoài cùng của lông mày
        const leftMostEyeBrow = leftEyeBrowPositions[0];
        const rightMostEyeBrow = rightEyeBrowPositions[rightEyeBrowPositions.length - 1];
        
        // Tính khoảng cách từ lông mày đến jawline để ước tính chiều cao trán
        const faceHeight = jawPositions[8].y - minY; // Từ giữa cằm đến lông mày
        const foreheadHeight = faceHeight * 0.6; // Mở rộng lên 0.6 để trán cao hơn
        
        // Vị trí cao nhất của trán
        const foreheadTopY = minY - foreheadHeight;
        
        // Tạo đa giác khuôn mặt từ các điểm landmark thực tế
        const facePolygon = [];
        
        // Thêm các điểm jawline từ trái sang phải
        for (const jawPos of jawPositions) {
            facePolygon.push([jawPos.x, jawPos.y]);
        }
        
        // Thêm điểm trán bên phải
        const foreheadRightX = rightMostEyeBrow.x + 20; // Mở rộng sang phải
        facePolygon.push([foreheadRightX, foreheadTopY]);
        
        // Thêm điểm giữa trán
        facePolygon.push([(leftMostEyeBrow.x + rightMostEyeBrow.x) / 2, foreheadTopY - 20]); // Đỉnh trán cao hơn
        
        // Thêm điểm trán bên trái
        const foreheadLeftX = leftMostEyeBrow.x - 20; // Mở rộng sang trái
        facePolygon.push([foreheadLeftX, foreheadTopY]);
        
        // Kiểm tra nhanh - nếu điểm nằm ngoài hình chữ nhật bao quanh khuôn mặt
        const padding = 20; // Tăng padding để đảm bảo bao quanh đủ
        let minX = Number.MAX_VALUE, maxX = 0, maxY = 0;
        
        for (const [px, py] of facePolygon) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
        }
        
        // Thêm padding
        minX -= padding;
        maxX += padding;
        const minYPadded = foreheadTopY - 30; // Mở rộng trán lên thêm 30px
        maxY += padding;
        
        // Kiểm tra nhanh với hình chữ nhật bao quanh
        if (x < minX || x > maxX || y < minYPadded || y > maxY) {
            return false;
        }
        
        // Kiểm tra đặc biệt cho vùng trán cao
        if (y < minY && y >= foreheadTopY - 30 && 
            x >= leftMostEyeBrow.x - 30 && x <= rightMostEyeBrow.x + 30) {
            return true;
        }
        
        // Kiểm tra chi tiết xem điểm có nằm trong đa giác không
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
            // Lấy các điểm landmark
            const landmarks = detection.landmarks;
            
            // Lấy các nhóm điểm quan trọng
            const jawPositions = landmarks.getJawOutline();
            const leftEyeBrowPositions = landmarks.getLeftEyeBrow();
            const rightEyeBrowPositions = landmarks.getRightEyeBrow();
            const leftEyePositions = landmarks.getLeftEye();
            const rightEyePositions = landmarks.getRightEye();
            const nosePositions = landmarks.getNose();
            const mouthPositions = landmarks.getMouth();
            
            // Tìm điểm cao nhất của lông mày
            let minY = Number.MAX_VALUE;
            for (const pos of [...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
                if (pos.y < minY) {
                    minY = pos.y;
                }
            }
            
            // Tìm điểm thấp nhất của cằm
            let maxY = 0;
            for (const pos of jawPositions) {
                if (pos.y > maxY) {
                    maxY = pos.y;
                }
            }
            
            // Tìm điểm trái nhất và phải nhất
            let minX = Number.MAX_VALUE, maxX = 0;
            for (const pos of [...jawPositions, ...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
                if (pos.x < minX) minX = pos.x;
                if (pos.x > maxX) maxX = pos.x;
            }
            
            // Tính khoảng cách từ lông mày đến jawline để ước tính chiều cao trán
            const faceHeight = maxY - minY; // Từ giữa cằm đến lông mày
            const foreheadHeight = faceHeight * 0.6; // Trán mở rộng lên 0.6
            
            // Vị trí cao nhất của trán
            const foreheadTopY = minY - foreheadHeight;
            
            // Mở rộng vùng trán sang hai bên (đặc biệt là phần có tóc)
            const leftMostEyeBrow = leftEyeBrowPositions[0];
            const rightMostEyeBrow = rightEyeBrowPositions[rightEyeBrowPositions.length - 1];
            
            // Xác định vùng xử lý - hình chữ nhật bao quanh khuôn mặt + trán
            const padding = 25; // Tăng padding để đảm bảo bao quanh khuôn mặt
            const boxX = Math.max(0, Math.floor(minX - padding));
            const boxY = Math.max(0, Math.floor(foreheadTopY - 30)); // Mở rộng lên thêm 30px
            const boxWidth = Math.min(Math.floor(maxX - minX + padding * 2), imageData.width - boxX);
            const boxHeight = Math.min(Math.floor(maxY - boxY + padding), imageData.height - boxY);
            
            // Áp dụng làm sáng và tăng tương phản
            for (let y = boxY; y < boxY + boxHeight; y++) {
                for (let x = boxX; x < boxX + boxWidth; x++) {
                    // Kiểm tra xem điểm có thuộc vùng khuôn mặt và là màu da không
                    if (isInFaceRegion(x, y, detection) && isSkinTone(imageData, x, y)) {
                        const idx = (y * imageData.width + x) * 4;
                        
                        // Điều chỉnh độ sáng khác nhau dựa vào vị trí trên khuôn mặt
                        let brightnessFactor;
                        let contrastFactor;
                        
                        // Kiểm tra vùng trán rộng hơn
                        const isUpperForehead = (y < minY - foreheadHeight * 0.3 && y >= foreheadTopY - 30);
                        const isLowerForehead = (y < minY && y >= minY - foreheadHeight * 0.3);
                        
                        // Kiểm tra xem điểm có thuộc vùng mắt không
                        let isEyeRegion = false;
                        for (const pos of [...leftEyePositions, ...rightEyePositions]) {
                            if (Math.abs(x - pos.x) < 15 && Math.abs(y - pos.y) < 10) {
                                isEyeRegion = true;
                                break;
                            }
                        }
                        
                        // Kiểm tra xem điểm có thuộc vùng lông mày không
                        let isEyebrowRegion = false;
                        for (const pos of [...leftEyeBrowPositions, ...rightEyeBrowPositions]) {
                            if (Math.abs(x - pos.x) < 10 && Math.abs(y - pos.y) < 5) {
                                isEyebrowRegion = true;
                                break;
                            }
                        }
                        
                        // Vùng mắt và lông mày - ít làm sáng
                        if (isEyeRegion || isEyebrowRegion) {
                            brightnessFactor = 1.12; // Tăng độ sáng 12%
                            contrastFactor = 1.08; // Tăng độ tương phản 8%
                        }
                        // Vùng trán cao (gần chân tóc) - làm sáng nhiều nhất
                        else if (isUpperForehead) {
                            brightnessFactor = 1.25; // Tăng độ sáng 25%
                            contrastFactor = 1.18; // Tăng độ tương phản 18%
                        }
                        // Vùng trán thấp (gần lông mày) - làm sáng vừa phải
                        else if (isLowerForehead) {
                            brightnessFactor = 1.22; // Tăng độ sáng 22% 
                            contrastFactor = 1.15; // Tăng độ tương phản 15%
                        }
                        // Kiểm tra vùng mũi và miệng
                        else {
                            let isNoseMouthRegion = false;
                            for (const pos of [...nosePositions, ...mouthPositions]) {
                                if (Math.abs(x - pos.x) < 20 && Math.abs(y - pos.y) < 15) {
                                    isNoseMouthRegion = true;
                                    break;
                                }
                            }
                            
                            // Vùng giữa khuôn mặt (mũi, miệng) - làm sáng nhiều hơn
                            if (isNoseMouthRegion) {
                                brightnessFactor = 1.2; // Tăng độ sáng 20%
                                contrastFactor = 1.12; // Tăng độ tương phản 12%
                            } 
                            // Các phần còn lại của khuôn mặt
                            else {
                                brightnessFactor = 1.18; // Tăng độ sáng 18%
                                contrastFactor = 1.1; // Tăng độ tương phản 10%
                            }
                        }
                        
                        const avg = 128; // Giá trị trung bình của thang màu
                        
                        for (let c = 0; c < 3; c++) {
                            // Áp dụng tăng sáng
                            let newValue = imageData.data[idx + c] * brightnessFactor;
                            
                            // Áp dụng tăng tương phản
                            newValue = (newValue - avg) * contrastFactor + avg;
                            
                            // Giới hạn giá trị trong khoảng 0-255
                            imageData.data[idx + c] = Math.max(0, Math.min(255, Math.round(newValue)));
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
    
    // Kiểm tra nhanh cho màu đen, trắng hoặc xám (có thể là tai nghe, phụ kiện)
    const isGrayish = Math.abs(r - g) < 15 && Math.abs(r - b) < 15 && Math.abs(g - b) < 15;
    if (isGrayish && (r < 100 || r > 230)) {
        return false; // Màu đen, trắng hoặc xám đậm - không phải da
    }
    
    // Kiểm tra độ đậm - để loại bỏ tóc, bóng tối
    if (r < 50 && g < 50 && b < 50) {
        return false; // Quá tối - có thể là tóc hoặc bóng
    }
    
    // Chuyển đổi RGB sang không gian màu YCbCr
    const Y = 0.299 * r + 0.587 * g + 0.114 * b;
    const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    
    // Kiểm tra điều kiện YCbCr cho màu da (được điều chỉnh chặt chẽ hơn)
    const ycbcrCondition = (Y > 80 && Y < 240) && 
                          (Cb > 85 && Cb < 125) && 
                          (Cr > 135 && Cr < 170);
    
    // Kiểm tra điều kiện RGB
    const rgbCondition = (r > 95 && g > 40 && b > 20) && 
                         (r > g && r > b) &&
                         (Math.max(r, g, b) - Math.min(r, g, b) > 15);
    
    // Tính HSV
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const v = max / 255;
    const s = (max === 0) ? 0 : delta / max;
    
    // Tính hue
    let h = 0;
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h = h * 60;
        if (h < 0) h += 360;
    }
    
    // Điều kiện HSV cho màu da (chặt chẽ hơn)
    const hsvCondition = (h >= 0 && h <= 40) && 
                        (s >= 0.1 && s <= 0.6) && 
                        (v >= 0.4 && v <= 0.95);
    
    // Áp dụng ngưỡng cao hơn - phải thỏa mãn ít nhất 2 điều kiện
    const numConditionsMet = 
        (ycbcrCondition ? 1 : 0) + 
        (rgbCondition ? 1 : 0) + 
        (hsvCondition ? 1 : 0);
    
    return numConditionsMet >= 2;
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