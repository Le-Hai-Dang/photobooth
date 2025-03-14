// Biến toàn cục
let videoStream = null;
let capturedImage = null;
let isFaceDetectionModelLoaded = false;
let isProcessing = false;
let currentScreen = 'welcome'; // 'welcome', 'capture', 'edit', 'result'
let countdownInterval = null;
let currentPhotoIndex = 0;
let capturedPhotos = [null, null, null, null];
let selectedFrameIndex = 0;
let autoResetTimeout = null;
let isBeautifyEnabled = false;
let webhookEnabled = false;
let webhookUrl = '';
let apiUrl = 'https://photobooth-app.org/api';
let apiFrameStatus = document.getElementById('api-frame-status');

// Thêm biến cho khung ảnh dễ thương
let selectedCuteFrameType = null;
let useCuteFrame = false;
let cuteFrameSelector = null;

// DOM Elements
const video = document.getElementById('video');
const videoOverlay = document.getElementById('video-overlay');
const statusMsg = document.getElementById('status-message');
const loadingElement = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const countdownElement = document.getElementById('countdown');
const currentPhotoElement = document.getElementById('current-photo');

// Screens
const welcomeScreen = document.getElementById('welcome-screen');
const captureScreen = document.getElementById('capture-screen');
const editScreen = document.getElementById('edit-screen');
const resultScreen = document.getElementById('result-screen');

// Buttons
const startBtn = document.getElementById('start-btn');
const captureBtn = document.getElementById('capture-btn');
const retakeBtn = document.getElementById('retake-btn');
const continueBtn = document.getElementById('continue-btn');
const backToCaptureBtn = document.getElementById('back-to-capture-btn');
const saveBtn = document.getElementById('save-btn');
const downloadBtn = document.getElementById('download-btn');
const newSessionBtn = document.getElementById('new-session-btn');

// Canvas
const photoPreviewCanvas = document.getElementById('photo-preview');
const finalPhotoCanvas = document.getElementById('final-photo');
const thumbnailCanvas = [
    document.createElement('canvas'),
    document.createElement('canvas'),
    document.createElement('canvas'),
    document.createElement('canvas')
];

// Canvas Contexts
const previewCtx = photoPreviewCanvas.getContext('2d');
const finalCtx = finalPhotoCanvas.getContext('2d');
const overlayCtx = videoOverlay.getContext('2d');
const thumbnailCtx = thumbnailCanvas.map(canvas => canvas.getContext('2d'));

// Audio
const countdownSound = document.getElementById('countdown-sound');
const shutterSound = document.getElementById('shutter-sound');
const backgroundMusic = document.getElementById('background-music');
let isMusicPlaying = false;

// Khung ảnh
const frameOptions = document.querySelectorAll('.frame-option');
const beautifyToggle = document.getElementById('beautify-toggle');

// Frames (sẽ được tải sau)
const frames = [
    { name: 'new-year', src: 'frames/new-year.png', image: null },
    { name: 'photo-story', src: 'frames/photo-story.png', image: null },
    { name: 'friendship', src: 'frames/friendship.png', image: null },
    { name: 'wellness', src: 'frames/wellness.png', image: null }
];

// Thêm DOM Elements mới
const settingsBtn = document.getElementById('settings-btn');
const settingsScreen = document.getElementById('settings-screen');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const backFromSettingsBtn = document.getElementById('back-from-settings-btn');
const webhookUrlInput = document.getElementById('webhook-url');
const enableWebhookCheckbox = document.getElementById('enable-webhook');
const apiUrlInput = document.getElementById('api-url');
const testApiBtn = document.getElementById('test-api-btn');
const apiStatusText = document.getElementById('api-status-text');
const loadApiFramesBtn = document.getElementById('load-api-frames');
const musicControlBtn = document.getElementById('music-control');

// Thông tin về các khung ảnh
const FRAME_INFO = [
    {
        id: 'pink-vertical-strip',
        name: 'Dải dọc hồng',
        type: FRAME_TYPES.VERTICAL_STRIP,
        previewSrc: 'frame-templates/assets/lace-border.svg',
        slots: 4
    },
    // ... existing code ...
];

// Cập nhật hiển thị số ảnh đã chụp
function updatePhotoCounter() {
    if (currentPhotoElement) {
        currentPhotoElement.textContent = currentPhotoIndex.toString();
    }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Thiết lập canvas cho các thumbnail
        for (let i = 0; i < 4; i++) {
            const thumbnail = document.getElementById(`thumbnail-${i + 1}`);
            thumbnailCanvas[i].width = 300;
            thumbnailCanvas[i].height = 400;
            thumbnail.appendChild(thumbnailCanvas[i]);
        }
        
        // Thiết lập canvas cho preview và final
        photoPreviewCanvas.width = 600;
        photoPreviewCanvas.height = 800;
        finalPhotoCanvas.width = 600;
        finalPhotoCanvas.height = 800;
        
        showStatus('Đang tải các model AI...', false);
        
        // Tải các models cho face-api.js
        await loadFaceDetectionModels();
        
        // Tiền tải hình ảnh khung
        await preloadFrames();
        
        // Khởi tạo API listener
        initApiListener();
        
        // Tải cài đặt từ localStorage
        loadSettings();
        
        isFaceDetectionModelLoaded = true;
        showStatus('Các model AI đã được tải thành công!', false);
        
        // Thiết lập event listeners
        setupEventListeners();
        
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

// Tiền tải các khung ảnh
async function preloadFrames() {
    // Không cần tải khung ảnh mặc định nữa vì chúng ta chỉ sử dụng khung CSS
    console.log('Bỏ qua việc tải khung ảnh mặc định, chỉ sử dụng khung CSS');
    
    // Trả về Promise đã hoàn thành để chuỗi Promise không bị gián đoạn
    return Promise.resolve();
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
    // Nút chuyển màn hình
    startBtn.addEventListener('click', startCaptureSession);
    continueBtn.addEventListener('click', showEditScreen);
    backToCaptureBtn.addEventListener('click', showCaptureScreen);
    saveBtn.addEventListener('click', savePhoto);
    downloadBtn.addEventListener('click', downloadPhoto);
    newSessionBtn.addEventListener('click', startNewSession);
    
    // Nút chức năng
    captureBtn.addEventListener('click', startCountdown);
    retakeBtn.addEventListener('click', retakePhotos);
    
    // Nút điều khiển nhạc nền
    if (musicControlBtn) {
        musicControlBtn.addEventListener('click', () => {
            try {
                toggleBackgroundMusic();
                // Thêm/xóa class muted để thay đổi style
                if (isMusicPlaying) {
                    musicControlBtn.classList.remove('muted');
                } else {
                    musicControlBtn.classList.add('muted');
                }
            } catch (error) {
                console.warn('Không thể điều khiển nhạc:', error);
            }
        });
    }
    
    // Lựa chọn khung
    frameOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
            // Chọn khung ảnh thông thường
            useCuteFrame = false;
            selectFrame(index);
            
            // Xóa active từ các khung ảnh dễ thương
            document.querySelectorAll('#cute-frame-selector .frame-preview').forEach(item => {
                item.classList.remove('active');
            });
        });
    });
    
    // Toggle làm đẹp
    beautifyToggle.addEventListener('change', () => {
        isBeautifyEnabled = beautifyToggle.checked;
        if (currentScreen === 'edit') {
            renderPreviewPhoto();
        }
    });

    // Khởi tạo khung ảnh dễ thương
    initCuteFrames();

    // Thêm sự kiện cho các phần tử mới
    loadApiFramesBtn.addEventListener('click', loadFramesFromAPI);
    settingsBtn.addEventListener('click', showSettingsScreen);
    saveSettingsBtn.addEventListener('click', saveSettings);
    backFromSettingsBtn.addEventListener('click', hideSettingsScreen);
    testApiBtn.addEventListener('click', testApiConnection);
}

// Hiển thị thông báo trạng thái
function showStatus(message, isError = false) {
    statusMsg.textContent = message;
    statusMsg.className = 'status-message' + (isError ? ' error' : '');
}

// Chuyển màn hình
function showScreen(screenName) {
    // Ẩn tất cả màn hình
    welcomeScreen.classList.remove('active');
    captureScreen.classList.remove('active');
    editScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    settingsScreen.classList.remove('active');
    
    // Hiển thị màn hình được chọn
    switch (screenName) {
        case 'welcome':
            welcomeScreen.classList.add('active');
            break;
        case 'capture':
            captureScreen.classList.add('active');
            break;
        case 'edit':
            editScreen.classList.add('active');
            break;
        case 'result':
            resultScreen.classList.add('active');
            break;
        case 'settings':
            settingsScreen.classList.add('active');
            break;
    }
    
    currentScreen = screenName;
    
    // Thiết lập auto reset cho màn hình kết quả
    if (screenName === 'result') {
        if (autoResetTimeout) {
            clearTimeout(autoResetTimeout);
        }
        autoResetTimeout = setTimeout(() => {
            startNewSession();
        }, 10000); // Tự động reset sau 10 giây
    } else if (autoResetTimeout) {
        clearTimeout(autoResetTimeout);
    }
}

// Bắt đầu phiên chụp
async function startCaptureSession() {
    try {
        showStatus('Đang khởi tạo camera...', false);
        await setupWebcam();
        showScreen('capture'); // Thêm dòng này để chuyển sang màn hình chụp
        showStatus('', false);
        
        // Phát nhạc nền khi bắt đầu phiên chụp nếu có
        if (backgroundMusic && !isMusicPlaying) {
            try {
                toggleBackgroundMusic();
            } catch (error) {
                console.warn('Không thể phát nhạc nền:', error);
            }
        }
        
        // Reset các biến
        currentPhotoIndex = 0;
        thumbnailCanvas.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        
        // Cập nhật UI
        updatePhotoCounter();
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('filled', 'active');
        });
        
        retakeBtn.classList.add('hidden');
        continueBtn.classList.add('hidden');
        
    } catch (error) {
        console.error('Lỗi khi khởi tạo phiên chụp:', error);
        showStatus('Không thể khởi tạo camera. Vui lòng thử lại.', true);
    }
}

// Phát hiện khuôn mặt trong video stream
async function detectFaces() {
    if (!isFaceDetectionModelLoaded || !video.srcObject || currentScreen !== 'capture') return;
    
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
        }
    } catch (error) {
        console.error('Lỗi phát hiện khuôn mặt:', error);
    }
    
    // Tiếp tục phát hiện trong frame tiếp theo nếu đang ở màn hình chụp
    if (currentScreen === 'capture') {
        requestAnimationFrame(detectFaces);
    }
}

// Bắt đầu đếm ngược
function startCountdown() {
    if (isProcessing) return;
    
    let count = 3;
    countdownElement.textContent = count.toString();
    countdownElement.classList.add('active');
    
    // Phát âm thanh đếm ngược
    countdownSound.currentTime = 0;
    countdownSound.play();
    
    isProcessing = true;
    countdownInterval = setInterval(() => {
        count--;
        
        if (count > 0) {
            countdownElement.textContent = count.toString();
            countdownSound.currentTime = 0;
            countdownSound.play();
        } else {
            clearInterval(countdownInterval);
            countdownElement.textContent = '';
            countdownElement.classList.remove('active');
            
            // Phát âm thanh chụp
            shutterSound.currentTime = 0;
            shutterSound.play();
            
            // Hiệu ứng flash
            const flash = document.createElement('div');
            flash.style.position = 'absolute';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100%';
            flash.style.height = '100%';
            flash.style.backgroundColor = 'white';
            flash.style.opacity = '0.8';
            flash.style.transition = 'opacity 0.5s';
            flash.style.pointerEvents = 'none';
            flash.style.zIndex = '5';
            
            const videoContainer = document.querySelector('.video-container');
            videoContainer.appendChild(flash);
            
            setTimeout(() => {
                flash.style.opacity = '0';
                setTimeout(() => {
                    videoContainer.removeChild(flash);
                    // Chụp ảnh sau hiệu ứng flash
                    capturePhoto();
                }, 500);
            }, 100);
        }
    }, 1000);
}

// Chụp ảnh từ webcam
function capturePhoto() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Vẽ frame hiện tại từ video lên canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Lưu ảnh đã chụp
        capturedPhotos[currentPhotoIndex] = canvas.toDataURL('image/png');
        
        // Cập nhật thumbnail
        const aspect = thumbnailCanvas[currentPhotoIndex].height / thumbnailCanvas[currentPhotoIndex].width;
        const thumbHeight = canvas.width * aspect;
        const thumbY = (canvas.height - thumbHeight) / 2;
        
        // Vẽ ảnh lên thumbnail
        thumbnailCtx[currentPhotoIndex].drawImage(
            canvas, 
            0, thumbY, canvas.width, thumbHeight,
            0, 0, thumbnailCanvas[currentPhotoIndex].width, thumbnailCanvas[currentPhotoIndex].height
        );
        
        // Hiển thị thumbnail
        const thumbnail = document.getElementById(`thumbnail-${currentPhotoIndex + 1}`);
        thumbnail.classList.add('filled');
        thumbnail.classList.add('active');
        
        // Đánh dấu các thumbnail trước là đã chụp nhưng không active
        for (let i = 0; i < currentPhotoIndex; i++) {
            const prevThumbnail = document.getElementById(`thumbnail-${i + 1}`);
            prevThumbnail.classList.remove('active');
        }
        
        // Tăng chỉ số ảnh hiện tại
        currentPhotoIndex++;
        currentPhotoElement.textContent = currentPhotoIndex.toString();
        
        // Kiểm tra xem đã chụp đủ 4 ảnh chưa
        if (currentPhotoIndex >= 4) {
            showStatus('Bạn đã chụp đủ 4 ảnh!', false);
            captureBtn.classList.add('hidden');
            retakeBtn.classList.remove('hidden');
            continueBtn.classList.remove('hidden');
        } else {
            showStatus(`Đã chụp ${currentPhotoIndex}/4 ảnh. Hãy tạo dáng cho ảnh tiếp theo!`, false);
            
            // Cho phép chụp ảnh tiếp theo
            isProcessing = false;
        }
                } catch (error) {
        console.error('Lỗi khi chụp ảnh:', error);
        showStatus('Không thể chụp ảnh: ' + error.message, true);
        isProcessing = false;
    }
}

// Chụp lại ảnh
function retakePhotos() {
    currentPhotoIndex = 0;
    capturedPhotos = [null, null, null, null];
    currentPhotoElement.textContent = currentPhotoIndex.toString();
    
    // Xóa nội dung các thumbnail
    for (let i = 0; i < 4; i++) {
        const thumbnail = document.getElementById(`thumbnail-${i + 1}`);
        thumbnail.classList.remove('filled');
        thumbnail.classList.remove('active');
        thumbnailCtx[i].clearRect(0, 0, thumbnailCanvas[i].width, thumbnailCanvas[i].height);
    }
    
    // Cập nhật giao diện nút
    captureBtn.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    continueBtn.classList.add('hidden');
    
    showStatus('Hãy tạo dáng và nhấn nút "Chụp ảnh"', false);
    isProcessing = false;
}

// Hiển thị màn hình chỉnh sửa
function showEditScreen() {
    try {
        console.log('Chuyển sang màn hình chỉnh sửa');
        
        // Kiểm tra xem có ảnh nào không
        let hasAnyImage = false;
        for (let i = 0; i < 4; i++) {
            if (capturedPhotos[i]) {
                hasAnyImage = true;
                break;
            }
        }
        
        if (!hasAnyImage) {
            console.error('Không có ảnh nào để chỉnh sửa');
            showStatus('Không có ảnh nào để chỉnh sửa. Vui lòng chụp ảnh trước.', true);
            return;
        }
        
        showLoading(true, 'Đang chuẩn bị ảnh...');
        
        // Dừng nhạc nền khi kết thúc phiên chụp
        if (backgroundMusic && isMusicPlaying) {
            try {
                toggleBackgroundMusic();
                if (musicControlBtn) {
                    musicControlBtn.classList.add('muted');
                }
            } catch (error) {
                console.warn('Không thể dừng nhạc nền:', error);
            }
        }
        
        // Dừng webcam
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        
        // Hiển thị màn hình chỉnh sửa
        showScreen('edit-screen');
        
        // Đặt khung ảnh mặc định
        try {
            if (window.CuteFrames && window.CuteFrames.FRAME_TYPES) {
                useCuteFrame = true;
                selectedCuteFrameType = window.CuteFrames.FRAME_TYPES.GRID_2X2;
                
                // Cập nhật UI
                const framePreviewItems = document.querySelectorAll('#cute-frame-selector .frame-preview');
                if (framePreviewItems && framePreviewItems.length > 0) {
                    framePreviewItems.forEach((item, index) => {
                        if (index === 0) {
                            item.classList.add('active');
                        } else {
                            item.classList.remove('active');
                        }
                    });
                }
                
                // Bỏ active từ khung ảnh thông thường
                const frameOptions = document.querySelectorAll('.frame-selector .frame-option');
                if (frameOptions && frameOptions.length > 0) {
                    frameOptions.forEach(option => {
                        option.classList.remove('active');
                    });
                }
            } else {
                // Nếu CuteFrames không tồn tại, sử dụng khung thông thường
                useCuteFrame = false;
                selectedFrameIndex = 0;
                
                // Cập nhật UI
                const frameOptions = document.querySelectorAll('.frame-selector .frame-option');
                if (frameOptions && frameOptions.length > 0) {
                    frameOptions.forEach((option, index) => {
                        if (index === 0) {
                            option.classList.add('active');
                        } else {
                            option.classList.remove('active');
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi khi thiết lập khung ảnh mặc định:', error);
            // Nếu lỗi, sử dụng khung thông thường
            useCuteFrame = false;
            selectedFrameIndex = 0;
        }
        
        console.log('Render ảnh preview');
        // Render ảnh preview
        setTimeout(() => {
            try {
                renderPreviewPhoto();
                showLoading(false);
            } catch (error) {
                console.error('Lỗi khi render ảnh preview:', error);
                showLoading(false);
                showStatus('Có lỗi khi hiển thị ảnh preview', true);
            }
        }, 500);
    } catch (error) {
        console.error('Lỗi khi chuyển sang màn hình chỉnh sửa:', error);
        showLoading(false);
        showStatus('Lỗi khi chuyển sang màn hình chỉnh sửa: ' + error.message, true);
    }
}

// Hiển thị màn hình chụp
function showCaptureScreen() {
    showScreen('capture');
}

// Chọn khung ảnh
function selectFrame(index) {
    // Cập nhật trạng thái
    selectedFrameIndex = index;
    
    // Nếu là chọn từ frames CSS cute
    if (window.CuteFrames && window.CuteFrames.FRAME_INFO && index < window.CuteFrames.FRAME_INFO.length) {
        useCuteFrame = true;
        selectedCuteFrameType = window.CuteFrames.FRAME_INFO[index].type;
    }
    
    // Cập nhật UI
    document.querySelectorAll('.frame-option').forEach((option, i) => {
        if (i === index) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Render lại preview
    renderPreviewPhoto();
}

// Render ảnh với khung đã chọn
function renderPreviewPhoto() {
    if (!capturedPhotos[0]) {
        console.warn('Không có ảnh nào để hiển thị trong preview');
        return;
    }
    
    try {
        console.log('Đang render ảnh preview với các ảnh đã chụp:', capturedPhotos.length);
        
        // Xóa canvas
        previewCtx.clearRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
        
        // Đảm bảo canvas có kích thước đúng
        photoPreviewCanvas.width = 600;
        photoPreviewCanvas.height = 800;
        
        // Vẽ nền trắng
        previewCtx.fillStyle = '#ffffff';
        previewCtx.fillRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
        
        // Kiểm tra CuteFrames đã tải chưa
        if (useCuteFrame && selectedCuteFrameType && window.CuteFrames) {
            console.log('Sử dụng khung CuteFrames với loại:', selectedCuteFrameType);
            
            try {
                // Tạo collage trước
                createCollage().then(collageImg => {
                    try {
                        // Nếu không dùng được CuteFrames, sẽ dùng phương pháp thông thường
                        if (!window.CuteFrames.renderToCanvas) {
                            console.warn('Không tìm thấy phương thức renderToCanvas, dùng render thông thường');
                            // Vẽ ảnh ghép lên canvas
                            previewCtx.drawImage(collageImg, 0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
                            return;
                        }
                        
                        // Sử dụng phương thức renderToCanvas của CuteFrames
                        window.CuteFrames.renderToCanvas(photoPreviewCanvas, selectedCuteFrameType, capturedPhotos)
                            .then(() => {
                                console.log('Khung ảnh dễ thương đã được render thành công');
                            })
                            .catch(error => {
                                console.error('Lỗi khi render khung ảnh dễ thương:', error);
                                // Fallback về render thông thường khi có lỗi
                                previewCtx.drawImage(collageImg, 0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
                            });
                    } catch (error) {
                        console.error('Lỗi khi render với CuteFrames:', error);
                        // Fallback về render thông thường khi có lỗi
                        previewCtx.drawImage(collageImg, 0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
                    }
                }).catch(error => {
                    console.error('Lỗi khi tạo collage:', error);
                    // Vẽ thông báo lỗi lên canvas
                    previewCtx.fillStyle = '#ffeeee';
                    previewCtx.fillRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
                    previewCtx.fillStyle = '#ff0000';
                    previewCtx.font = '24px Arial';
                    previewCtx.textAlign = 'center';
                    previewCtx.fillText('Lỗi khi tạo ảnh ghép', photoPreviewCanvas.width/2, photoPreviewCanvas.height/2);
                });
            } catch (error) {
                console.error('Lỗi khi render preview với CuteFrames:', error);
                // Fallback về cách render thông thường
                renderNormalFrame();
            }
        } else {
            console.log('Sử dụng khung ảnh thông thường');
            // Sử dụng khung ảnh thông thường
            renderNormalFrame();
        }
    } catch (error) {
        console.error('Lỗi trong renderPreviewPhoto:', error);
        showStatus('Có lỗi khi hiển thị ảnh preview', true);
        
        // Vẽ thông báo lỗi lên canvas
        previewCtx.fillStyle = '#ffeeee';
        previewCtx.fillRect(0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
        previewCtx.fillStyle = '#ff0000';
        previewCtx.font = '24px Arial';
        previewCtx.textAlign = 'center';
        previewCtx.fillText('Lỗi khi hiển thị ảnh preview', photoPreviewCanvas.width/2, photoPreviewCanvas.height/2);
    }
}

// Render khung ảnh thông thường
function renderNormalFrame() {
    // Tạo ảnh chính từ 4 ảnh đã chụp
    createCollage().then(collageImg => {
        // Vẽ ảnh lên canvas
        previewCtx.drawImage(collageImg, 0, 0, photoPreviewCanvas.width, photoPreviewCanvas.height);
        
        // Vẽ khung ảnh nếu đã tải thành công
        if (frames[selectedFrameIndex].image) {
            previewCtx.drawImage(
                frames[selectedFrameIndex].image,
                0, 0,
                photoPreviewCanvas.width, photoPreviewCanvas.height
            );
        }
    });
}

// Tạo ảnh ghép từ 4 ảnh đã chụp
async function createCollage() {
    return new Promise((resolve) => {
        try {
            const collageCanvas = document.createElement('canvas');
            collageCanvas.width = photoPreviewCanvas.width;
            collageCanvas.height = photoPreviewCanvas.height;
            const ctx = collageCanvas.getContext('2d');
            
            // Vẽ nền
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, collageCanvas.width, collageCanvas.height);
            
            // Chia canvas thành 4 phần
            const cellWidth = collageCanvas.width / 2;
            const cellHeight = collageCanvas.height / 2;
            
            // Kiểm tra xem có ảnh nào không
            let hasAnyImage = false;
            for (let i = 0; i < 4; i++) {
                if (capturedPhotos[i]) {
                    hasAnyImage = true;
                    break;
                }
            }
            
            if (!hasAnyImage) {
                console.error('Không có ảnh nào để tạo collage');
                // Vẽ nền trắng và thông báo
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, collageCanvas.width, collageCanvas.height);
                ctx.fillStyle = '#ff0000';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Không có ảnh nào để hiển thị', collageCanvas.width/2, collageCanvas.height/2);
                resolve(collageCanvas);
                return;
            }
            
            // Vị trí của 4 ảnh
            const positions = [
                { x: 0, y: 0 },
                { x: cellWidth, y: 0 },
                { x: 0, y: cellHeight },
                { x: cellWidth, y: cellHeight }
            ];
            
            let loadedImages = 0;
            const totalImages = capturedPhotos.filter(img => img !== null).length;
            
            // Vẽ các ô trước
            for (let i = 0; i < 4; i++) {
                const pos = positions[i];
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(pos.x, pos.y, cellWidth, cellHeight);
                ctx.strokeStyle = '#cccccc';
                ctx.strokeRect(pos.x, pos.y, cellWidth, cellHeight);
            }
            
            // Nếu không có ảnh nào, trả về canvas ngay
            if (totalImages === 0) {
                resolve(collageCanvas);
                return;
            }
            
            // Tải và vẽ từng ảnh
            for (let i = 0; i < 4; i++) {
                if (capturedPhotos[i]) {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            const pos = positions[i];
                            
                            // Tính toán tỷ lệ khung hình
                            const imgAspect = img.height / img.width;
                            const cellAspect = cellHeight / cellWidth;
                            
                            let sw, sh, sx, sy;
                            
                            if (imgAspect > cellAspect) {
                                // Ảnh cao hơn, cắt trên dưới
                                sw = img.width;
                                sh = img.width * cellAspect;
                                sx = 0;
                                sy = (img.height - sh) / 2;
                            } else {
                                // Ảnh rộng hơn, cắt trái phải
                                sh = img.height;
                                sw = img.height / cellAspect;
                                sx = (img.width - sw) / 2;
                                sy = 0;
                            }
                            
                            // Vẽ ảnh đã cắt
                            ctx.drawImage(
                                img,
                                sx, sy, sw, sh,
                                pos.x, pos.y, cellWidth, cellHeight
                            );
                        } catch (error) {
                            console.error(`Lỗi khi vẽ ảnh thứ ${i+1}:`, error);
                            // Vẽ ô lỗi
                            const pos = positions[i];
                            ctx.fillStyle = '#ffeeee';
                            ctx.fillRect(pos.x, pos.y, cellWidth, cellHeight);
                            ctx.fillStyle = '#ff0000';
                            ctx.font = '16px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText('Lỗi ảnh', pos.x + cellWidth/2, pos.y + cellHeight/2);
                        }
                        
                        loadedImages++;
                        if (loadedImages === totalImages) {
                            resolve(collageCanvas);
                        }
                    };
                    
                    img.onerror = () => {
                        console.error(`Lỗi khi tải ảnh thứ ${i+1}`);
                        // Vẽ ô lỗi
                        const pos = positions[i];
                        ctx.fillStyle = '#ffeeee';
                        ctx.fillRect(pos.x, pos.y, cellWidth, cellHeight);
                        ctx.fillStyle = '#ff0000';
                        ctx.font = '16px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('Lỗi ảnh', pos.x + cellWidth/2, pos.y + cellHeight/2);
                        
                        loadedImages++;
                        if (loadedImages === totalImages) {
                            resolve(collageCanvas);
                        }
                    };
                    
                    img.src = capturedPhotos[i];
                }
            }
            
            // Phòng trường hợp tất cả ảnh đều lỗi, đảm bảo sẽ resolve
            setTimeout(() => {
                if (loadedImages < totalImages) {
                    console.warn('Một số ảnh không tải được, trả về collage không đầy đủ');
                    resolve(collageCanvas);
                }
            }, 3000);
        } catch (error) {
            console.error('Lỗi trong createCollage:', error);
            // Tạo canvas lỗi để trả về
            const errorCanvas = document.createElement('canvas');
            errorCanvas.width = photoPreviewCanvas.width;
            errorCanvas.height = photoPreviewCanvas.height;
            const ctx = errorCanvas.getContext('2d');
            
            // Vẽ nền lỗi
            ctx.fillStyle = '#ffeeee';
            ctx.fillRect(0, 0, errorCanvas.width, errorCanvas.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Lỗi khi tạo collage', errorCanvas.width/2, errorCanvas.height/2);
            
            resolve(errorCanvas);
        }
    });
}

// Bộ lọc làm đẹp cơ bản
function applyBeautyFilter(imageData) {
    const data = imageData.data;
    
    // Tăng độ sáng và độ tương phản cho từng pixel
    for (let i = 0; i < data.length; i += 4) {
        // Tăng độ sáng
        data[i] = Math.min(255, data[i] * 1.1);        // R
        data[i + 1] = Math.min(255, data[i + 1] * 1.1); // G
        data[i + 2] = Math.min(255, data[i + 2] * 1.1); // B
        
        // Tăng độ tương phản
        data[i] = Math.min(255, ((data[i] / 255 - 0.5) * 1.2 + 0.5) * 255);
        data[i + 1] = Math.min(255, ((data[i + 1] / 255 - 0.5) * 1.2 + 0.5) * 255);
        data[i + 2] = Math.min(255, ((data[i + 2] / 255 - 0.5) * 1.2 + 0.5) * 255);
    }
    
    return imageData;
}

// Lưu ảnh đã chỉnh sửa
async function savePhoto() {
    if (!capturedPhotos[0]) {
        showStatus('Chưa có ảnh để lưu', true);
        return;
    }
    
    try {
        showLoading(true, 'Đang xử lý ảnh...');
        
        // Lấy kích thước của canvas
        const width = finalPhotoCanvas.width;
        const height = finalPhotoCanvas.height;
        
        // Xóa canvas
        const finalCtx = finalPhotoCanvas.getContext('2d');
        finalCtx.clearRect(0, 0, width, height);
        
        // Dùng khung ảnh dễ thương CSS
        if (useCuteFrame && selectedCuteFrameType) {
            await window.CuteFrames.renderToCanvas(
                finalPhotoCanvas, 
                selectedCuteFrameType, 
                capturedPhotos
            );
            console.log('Đã render khung ảnh dễ thương css');
        } else {
            // Fallback: render theo cách thông thường
            createCollage().then(collageImg => {
                finalCtx.drawImage(collageImg, 0, 0, width, height);
            });
        }
        
        // Hiển thị màn hình kết quả
        showScreen('result');
        showLoading(false);
        showStatus('Ảnh đã được lưu thành công!', false);
    } catch (error) {
        console.error('Lỗi khi lưu ảnh:', error);
        showLoading(false);
        showStatus('Không thể lưu ảnh: ' + error.message, true);
    }
}

// Tải xuống ảnh
function downloadPhoto() {
    try {
        const dataUrl = finalPhotoCanvas.toDataURL('image/png');
        
        // Tạo tên file dựa trên ngày giờ hiện tại
        const date = new Date();
        const fileName = `photobooth_${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}.png`;
        
        // Tạo link tải xuống
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.click();
        
        // Gửi thông báo webhook
        sendWebhookNotification(dataUrl, { fileName });
        
        showStatus('Ảnh đã được tải xuống!', false);
    } catch (error) {
        console.error('Lỗi khi tải xuống ảnh:', error);
        showStatus('Không thể tải xuống ảnh: ' + error.message, true);
    }
}

// Bắt đầu phiên mới
function startNewSession() {
    currentPhotoIndex = 0;
    capturedPhotos = [null, null, null, null];
    
    // Hiện lại màn hình chào mừng
    showScreen('welcome');
    
    // Dừng webcam nếu đang hoạt động
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        video.srcObject = null;
    }
}

// Hiển thị/ẩn loading
function showLoading(show, message = 'Đang xử lý...') {
    loadingElement.style.display = show ? 'flex' : 'none';
    loadingText.textContent = message;
}

// Làm đẹp ảnh (sử dụng lại chức năng hiện có)
async function beautifyPhoto(imageData, detections) {
    // Chức năng hiện có
    smoothSkin(imageData, detections);
    brightenSkin(imageData, detections);
    
    return imageData;
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

// Dọn dẹp khi người dùng rời trang
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
}); 

// Hàm hiển thị màn hình cài đặt
function showSettingsScreen() {
    // Tải cài đặt đã lưu
    loadSettings();
    
    // Hiển thị màn hình cài đặt
    showScreen('settings');
}

// Hàm ẩn màn hình cài đặt
function hideSettingsScreen() {
    showScreen('welcome');
}

// Hàm lưu cài đặt
function saveSettings() {
    // Lấy giá trị từ form
    webhookUrl = webhookUrlInput.value.trim();
    webhookEnabled = enableWebhookCheckbox.checked;
    
    // Lưu vào localStorage
    localStorage.setItem('webhookUrl', webhookUrl);
    localStorage.setItem('webhookEnabled', webhookEnabled.toString());
    
    showStatus('Đã lưu cài đặt', false);
    setTimeout(() => {
        hideSettingsScreen();
    }, 1000);
}

// Hàm tải cài đặt đã lưu
function loadSettings() {
    // Tải từ localStorage
    webhookUrl = localStorage.getItem('webhookUrl') || '';
    webhookEnabled = localStorage.getItem('webhookEnabled') === 'true';
    
    // Cập nhật UI
    webhookUrlInput.value = webhookUrl;
    enableWebhookCheckbox.checked = webhookEnabled;
}

// Hàm kiểm tra kết nối API
async function testApiConnection() {
    try {
        apiStatusText.textContent = 'Đang kiểm tra...';
        apiStatusText.className = '';
        
        // Vì đây là API demo, chúng ta sẽ giả lập kết nối thành công
        setTimeout(() => {
            apiStatusText.textContent = 'Đã kết nối thành công';
            apiStatusText.className = 'connected';
        }, 1500);
        
        /*
        // Trong môi trường thực tế, bạn sẽ gọi API thực sự
        const response = await fetch(apiUrl + '/status', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            apiStatusText.textContent = 'Đã kết nối thành công';
            apiStatusText.className = 'connected';
        } else {
            apiStatusText.textContent = 'Lỗi: ' + response.status;
            apiStatusText.className = 'error';
        }
        */
    } catch (error) {
        apiStatusText.textContent = 'Lỗi: ' + error.message;
        apiStatusText.className = 'error';
    }
}

// Hàm tải khung hình từ API
async function loadFramesFromAPI() {
    if (apiFrameStatus) {
        apiFrameStatus.textContent = 'Đang tải khung hình...';
    }
    
    try {
        showLoading(true, 'Đang tải khung hình từ API...');
        
        // Vì đây là demo, chúng ta sẽ giả lập việc tải khung hình
        // Trong môi trường thực tế, bạn sẽ gọi API thực sự
        
        // Chờ 2 giây để giả lập việc tải
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Khung hình giả định từ API
        const apiFrames = [
            { name: 'api-new-year', src: 'frames/new-year.png', title: 'Năm mới (API)' },
            { name: 'api-flower', src: 'frames/photo-story.png', title: 'Hoa (API)' },
            { name: 'api-birthday', src: 'frames/friendship.png', title: 'Sinh nhật (API)' }
        ];
        
        let newFramesCount = 0;
        
        // Thêm khung hình mới vào mảng frames
        for (const apiFrame of apiFrames) {
            // Kiểm tra xem khung hình đã tồn tại chưa
            const exists = frames.some(frame => frame.name === apiFrame.name);
            if (!exists) {
                frames.push({
                    name: apiFrame.name,
                    src: apiFrame.src,
                    image: null,
                    title: apiFrame.title
                });
                newFramesCount++;
            }
        }
        
        if (newFramesCount > 0) {
            // Tải trước các khung hình mới
            await preloadFrames();
            
            // Cập nhật giao diện người dùng
            updateFrameSelector();
            
            if (apiFrameStatus) {
                apiFrameStatus.textContent = `Đã tải thêm ${newFramesCount} khung hình mới`;
            }
            showStatus(`Đã tải thêm ${newFramesCount} khung hình mới`, false);
        } else {
            if (apiFrameStatus) {
                apiFrameStatus.textContent = 'Không có khung hình mới để tải';
            }
            showStatus('Không có khung hình mới để tải', false);
        }
    } catch (error) {
        console.error('Lỗi khi tải khung hình từ API:', error);
        if (apiFrameStatus) {
            apiFrameStatus.textContent = `Lỗi: ${error.message}`;
        }
        showStatus(`Không thể tải khung hình: ${error.message}`, true);
    } finally {
        showLoading(false);
    }
}

// Cập nhật giao diện bộ chọn khung hình
function updateFrameSelector() {
    const frameSelector = document.querySelector('.frame-selector');
    
    // Xóa tất cả nút khung hình hiện tại
    while (frameSelector.firstChild) {
        frameSelector.removeChild(frameSelector.firstChild);
    }
    
    // Thêm nút cho mỗi khung hình
    frames.forEach((frame, index) => {
        const option = document.createElement('button');
        option.className = 'frame-option' + (index === selectedFrameIndex ? ' active' : '');
        option.setAttribute('data-frame', frame.name);
        
        const img = document.createElement('img');
        img.src = frame.src;
        img.alt = frame.title || frame.name;
        
        option.appendChild(img);
        
        // Thêm sự kiện click
        option.addEventListener('click', () => selectFrame(index));
        
        frameSelector.appendChild(option);
    });
}

// Gửi thông báo webhook khi có ảnh mới
async function sendWebhookNotification(imageUrl, metadata = {}) {
    // Kiểm tra xem webhook có được bật không
    if (!webhookEnabled || !webhookUrl) {
        console.log('Webhook không được bật hoặc URL chưa được cấu hình');
        return;
    }
    
    try {
        console.log('Gửi thông báo webhook đến:', webhookUrl);
        console.log('Dữ liệu:', {
            event: 'photo_captured',
            timestamp: new Date().toISOString(),
            imageUrl: imageUrl.substring(0, 50) + '...',
            ...metadata
        });
        
        // Trong môi trường thực tế, bạn sẽ gửi yêu cầu thực sự
        /*
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: 'photo_captured',
                timestamp: new Date().toISOString(),
                imageUrl: imageUrl,
                ...metadata
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        */
        
        console.log('Webhook notification sent successfully');
    } catch (error) {
        console.error('Failed to send webhook notification:', error);
    }
}

// Khởi tạo API listener
function initApiListener() {
    // Lắng nghe tin nhắn từ cửa sổ cha (khi được nhúng trong iframe)
    window.addEventListener('message', (event) => {
        // Xử lý lệnh từ xa
        handleRemoteCommand(event.data);
    });
    
    // Lắng nghe yêu cầu API thông qua localStorage events
    window.addEventListener('storage', (event) => {
        if (event.key === 'photobooth_api_command') {
            try {
                const command = JSON.parse(event.newValue);
                handleRemoteCommand(command);
            } catch (error) {
                console.error('Invalid API command format:', error);
            }
        }
    });
    
    console.log('API listener initialized');
}

// Xử lý lệnh từ xa
function handleRemoteCommand(command) {
    if (!command || typeof command !== 'object') return;
    
    console.log('Received remote command:', command);
    
    switch (command.action) {
        case 'capture':
            if (currentScreen === 'capture' && !isProcessing) {
                startCountdown();
            }
            break;
            
        case 'retake':
            if (currentScreen === 'capture') {
                retakePhotos();
            }
            break;
            
        case 'continue':
            if (currentScreen === 'capture' && currentPhotoIndex === 4) {
                showEditScreen();
            }
            break;
            
        case 'selectFrame':
            if (currentScreen === 'edit' && typeof command.frameIndex === 'number') {
                selectFrame(command.frameIndex);
            }
            break;
            
        case 'toggleBeautify':
            if (currentScreen === 'edit' && typeof command.enabled === 'boolean') {
                beautifyToggle.checked = command.enabled;
                isBeautifyEnabled = command.enabled;
                renderPreviewPhoto();
            }
            break;
            
        case 'savePhoto':
            if (currentScreen === 'edit') {
                savePhoto();
            }
            break;
            
        case 'downloadPhoto':
            if (currentScreen === 'result') {
                downloadPhoto();
            }
            break;
            
        case 'newSession':
            startNewSession();
            break;
            
        case 'setWebhookUrl':
            if (command.url) {
                localStorage.setItem('webhookUrl', command.url);
                webhookUrl = command.url;
                if (webhookUrlInput) {
                    webhookUrlInput.value = command.url;
                }
                console.log('Webhook URL updated:', command.url);
            }
            break;
            
        default:
            console.warn('Unknown remote command:', command.action);
    }
}

// Thêm hàm kiểm tra trạng thái khung ảnh
function checkFrameStatus() {
    try {
        console.log('Đang kiểm tra trạng thái khung ảnh');
        
        showStatus('Chỉ sử dụng khung ảnh CSS dễ thương, bỏ qua khung ảnh từ API', false);
        
        // Load preset trước khi render
        useCuteFrame = true;
        if (window.CuteFrames && window.CuteFrames.FRAME_TYPES) {
            selectedCuteFrameType = window.CuteFrames.FRAME_TYPES.GRID_2X2;
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái khung ảnh:', error);
    }
}

// Cập nhật initCuteFrames để thêm kiểm tra
function initCuteFrames() {
    try {
        console.log('Đang khởi tạo khung ảnh dễ thương');
        
        // Kiểm tra nếu CuteFrames đã tải
        if (window.CuteFrames) {
            cuteFrameSelector = document.getElementById('cute-frame-selector');
            if (cuteFrameSelector) {
                try {
                    // Tạo preview cho các kiểu khung
                    window.CuteFrames.createFramePreview(cuteFrameSelector, (frame, index) => {
                        // Callback khi chọn khung ảnh
                        selectedCuteFrameType = frame.type;
                        useCuteFrame = true;
                        
                        // Bỏ trạng thái active từ khung ảnh thông thường
                        document.querySelectorAll('.frame-selector .frame-option').forEach(option => {
                            option.classList.remove('active');
                        });
                        
                        // Render lại ảnh với khung mới
                        renderPreviewPhoto();
                    });
                    
                    // Chọn khung ảnh CSS mặc định
                    useCuteFrame = true;
                    selectedCuteFrameType = window.CuteFrames.FRAME_TYPES.GRID_2X2;
                    
                    // Kiểm tra trạng thái khung ảnh
                    checkFrameStatus();
                } catch (error) {
                    console.error('Lỗi khi tạo preview khung ảnh:', error);
                }
            } else {
                console.warn('Không tìm thấy phần tử cute-frame-selector');
            }
        } else {
            console.warn('CuteFrames chưa được tải.');
        }
    } catch (error) {
        console.error('Lỗi khi khởi tạo khung ảnh dễ thương:', error);
    }
}

// Hàm điều khiển nhạc nền
function toggleBackgroundMusic() {
    if (isMusicPlaying) {
        backgroundMusic.pause();
        isMusicPlaying = false;
    } else {
        backgroundMusic.play();
        isMusicPlaying = true;
    }
}
   