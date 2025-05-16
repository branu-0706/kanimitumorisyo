'use strict';

console.log('storage.js loading...');

// --- グローバル定数 ---
window.DEFAULT_TIMEOUT = 15; // PDFタイムアウトデフォルト値（秒）
window.DEBUG_KEY = 'estimateAppDebugMode';
window.TIMEOUT_KEY = 'estimateAppPdfTimeout';
window.COMPANY_INFO_KEY = 'estimateAppCompanyInfo';

// --- グローバル変数 ---
window.pdfGenerationTimeout = null;
window.pdfTimeoutValue = window.DEFAULT_TIMEOUT;
window.pdfGenerationCancelled = false;
window.currentTotalCost = 0; // 原価合計
window.currentItems = []; // 明細データ
window.companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
window.storageAvailable = false;
window.isDebugMode = false;

// --- ストレージ関数 ---
window.checkStorage = function() {
    try {
        localStorage.setItem('__test_storage__', 'test');
        localStorage.removeItem('__test_storage__');
        window.storageAvailable = true;
        console.log('[INFO] LocalStorage is available.');
    } catch (e) {
        window.storageAvailable = false;
        const storageWarning = document.getElementById('storageWarning');
        if (storageWarning) storageWarning.classList.remove('hidden');
        console.warn('LocalStorage is not available.', e);
    }
};

// --- 設定関数 ---
window.loadSettings = function() {
    if (!window.storageAvailable) return;

    // デバッグモードの設定をロード
    const debugMode = localStorage.getItem(window.DEBUG_KEY);
    window.isDebugMode = debugMode === 'true';

    // PDFタイムアウト値をロード
    const timeout = localStorage.getItem(window.TIMEOUT_KEY);
    if (timeout) {
        const value = parseInt(timeout, 10);
        window.pdfTimeoutValue = (!isNaN(value) && value >= 5 && value <= 120) ? value : window.DEFAULT_TIMEOUT;
    }
    console.log(`[INFO] Settings loaded - Debug Mode: ${window.isDebugMode}, PDF Timeout: ${window.pdfTimeoutValue}s`);
};

// --- 会社情報関数 ---
window.loadCompanyInfo = function() {
    if (!window.storageAvailable) return;

    const savedInfo = localStorage.getItem(window.COMPANY_INFO_KEY);
    if (savedInfo) {
        try {
            const info = JSON.parse(savedInfo);
            window.companyInfo = Object.assign({}, window.companyInfo, info);
            
            // フォームに値をセット
            const companySettingsForm = document.getElementById('companySettingsForm');
            if (companySettingsForm) {
                const nameInput = companySettingsForm.querySelector('#companyName');
                const postalInput = companySettingsForm.querySelector('#companyPostal');
                const addressInput = companySettingsForm.querySelector('#companyAddress');
                const phoneInput = companySettingsForm.querySelector('#companyPhone');
                const faxInput = companySettingsForm.querySelector('#companyFax');
                
                if (nameInput) nameInput.value = window.companyInfo.name || '';
                if (postalInput) postalInput.value = window.companyInfo.postal || '';
                if (addressInput) addressInput.value = window.companyInfo.address || '';
                if (phoneInput) phoneInput.value = window.companyInfo.phone || '';
                if (faxInput) faxInput.value = window.companyInfo.fax || '';
                
                // ロゴとスタンプの画像を設定
                const companyLogoPreview = document.getElementById('companyLogoPreview');
                const removeLogoBtn = document.getElementById('removeLogoBtn');
                const companyStampPreview = document.getElementById('companyStampPreview');
                const removeStampBtn = document.getElementById('removeStampBtn');
                
                if (window.companyInfo.logo && companyLogoPreview) {
                    companyLogoPreview.src = window.companyInfo.logo;
                    companyLogoPreview.style.display = 'block';
                    if (removeLogoBtn) removeLogoBtn.style.display = 'inline-block';
                }
                
                if (window.companyInfo.stamp && companyStampPreview) {
                    companyStampPreview.src = window.companyInfo.stamp;
                    companyStampPreview.style.display = 'block';
                    if (removeStampBtn) removeStampBtn.style.display = 'inline-block';
                }
            }
            
            console.log('[INFO] Company information loaded.');
        } catch (e) {
            console.error('Failed to parse company information.', e);
        }
    }
};

window.saveCompanyInfo = function() {
    if (!window.storageAvailable) return;
    
    const companySettingsForm = document.getElementById('companySettingsForm');
    if (!companySettingsForm) return;
    
    const nameInput = companySettingsForm.querySelector('#companyName');
    const postalInput = companySettingsForm.querySelector('#companyPostal');
    const addressInput = companySettingsForm.querySelector('#companyAddress');
    const phoneInput = companySettingsForm.querySelector('#companyPhone');
    const faxInput = companySettingsForm.querySelector('#companyFax');
    
    if (nameInput) window.companyInfo.name = nameInput.value.trim();
    if (postalInput) window.companyInfo.postal = postalInput.value.trim();
    if (addressInput) window.companyInfo.address = addressInput.value.trim();
    if (phoneInput) window.companyInfo.phone = phoneInput.value.trim();
    if (faxInput) window.companyInfo.fax = faxInput.value.trim();
    
    // ローカルストレージに保存
    localStorage.setItem(window.COMPANY_INFO_KEY, JSON.stringify(window.companyInfo));
    console.log('[INFO] Company information saved.');
    
    // 成功メッセージを表示
    alert('会社情報を保存しました。');
};

window.handleImageUpload = function(input, preview, removeBtn) {
    if (!input || !input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageType = input.id === 'companyLogo' ? 'logo' : 'stamp';
        window.companyInfo[imageType] = e.target.result;
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        if (removeBtn) {
            removeBtn.style.display = 'inline-block';
        }
        
        if (window.storageAvailable) {
            localStorage.setItem(window.COMPANY_INFO_KEY, JSON.stringify(window.companyInfo));
            console.log(`[INFO] Company ${imageType} updated.`);
        }
    };
    
    reader.readAsDataURL(file);
};

window.removeImage = function(preview, removeBtn, input, type) {
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    if (removeBtn) {
        removeBtn.style.display = 'none';
    }
    if (input) {
        input.value = '';
    }
    
    if (type && window.companyInfo[type] !== undefined) {
        window.companyInfo[type] = '';
        if (window.storageAvailable) {
            localStorage.setItem(window.COMPANY_INFO_KEY, JSON.stringify(window.companyInfo));
            console.log(`[INFO] Company ${type} removed.`);
        }
    }
};

window.clearAllSettings = function() {
    if (!window.storageAvailable) return;
    
    if (confirm('すべての設定と会社情報を削除しますか？この操作は元に戻せません。')) {
        localStorage.removeItem(window.DEBUG_KEY);
        localStorage.removeItem(window.TIMEOUT_KEY);
        localStorage.removeItem(window.COMPANY_INFO_KEY);
        
        // デフォルト値に戻す
        window.isDebugMode = false;
        window.pdfTimeoutValue = window.DEFAULT_TIMEOUT;
        window.companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        
        // UI更新
        const debugPanel = document.getElementById('debugPanel');
        const debugModeCheckbox = document.getElementById('debugMode');
        const pdfTimeoutInput = document.getElementById('pdfTimeout');
        const companySettingsForm = document.getElementById('companySettingsForm');
        const companyLogoPreview = document.getElementById('companyLogoPreview');
        const removeLogoBtn = document.getElementById('removeLogoBtn');
        const companyStampPreview = document.getElementById('companyStampPreview');
        const removeStampBtn = document.getElementById('removeStampBtn');
        
        if (debugPanel) debugPanel.style.display = 'none';
        if (debugModeCheckbox) debugModeCheckbox.checked = false;
        if (pdfTimeoutInput) pdfTimeoutInput.value = window.DEFAULT_TIMEOUT;
        
        // 会社情報フォームをクリア
        if (companySettingsForm) {
            companySettingsForm.reset();
        }
        if (companyLogoPreview) {
            companyLogoPreview.src = '';
            companyLogoPreview.style.display = 'none';
        }
        if (removeLogoBtn) {
            removeLogoBtn.style.display = 'none';
        }
        if (companyStampPreview) {
            companyStampPreview.src = '';
            companyStampPreview.style.display = 'none';
        }
        if (removeStampBtn) {
            removeStampBtn.style.display = 'none';
        }
        
        console.log('[WARN] All settings cleared.');
        alert('設定を初期化しました。');
    }
};

// デバッグログ関数
window.debugLog = function(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}][${type.toUpperCase()}] ${message}`);

    const debugPanel = document.getElementById('debugPanel');
    const debugLogs = document.getElementById('debugLogs');
    if (window.isDebugMode && debugPanel && debugPanel.style.display !== 'none' && debugLogs) {
        const logElement = document.createElement('div');
        logElement.className = `debug-log debug-${type}`;
        logElement.textContent = `[${timestamp}] ${message}`;
        debugLogs.insertBefore(logElement, debugLogs.firstChild);
        while (debugLogs.children.length > 101) {
            debugLogs.removeChild(debugLogs.lastChild);
        }
    }
};

console.log('storage.js loaded successfully!');
