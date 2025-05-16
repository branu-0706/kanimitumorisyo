'use strict';

console.log('main.js loading...');
console.log('DEFAULT_TIMEOUT defined:', typeof window.DEFAULT_TIMEOUT !== 'undefined');
console.log('checkStorage function defined:', typeof window.checkStorage === 'function');
console.log('loadSettings function defined:', typeof window.loadSettings === 'function');
console.log('updateAmounts function defined:', typeof window.updateAmounts === 'function');

document.addEventListener('DOMContentLoaded', function() {
    console.log('main.js: DOMContentLoaded event fired');
    
    // --- アプリケーション初期化 ---
    initializeApp();
    
    // --- UIイベントリスナー設定 ---
    setupEventListeners();
    
    // --- 初期明細行リスナー設定 ---
    setupItemRowListeners();
    
    console.log('main.js initialization complete');
});

// --- 初期化関数 ---
function initializeApp() {
    console.log('Initializing application...');
    
    // Copyright年の設定
    const copyrightYearElement = document.getElementById('copyrightYear');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }

    // LocalStorageが使用可能かチェック
    if (typeof window.checkStorage === 'function') {
        window.checkStorage();
    } else {
        console.error("checkStorage function is not defined. Check if storage.js is loaded properly.");
        window.storageAvailable = false;
        const storageWarning = document.getElementById('storageWarning');
        if (storageWarning) storageWarning.classList.remove('hidden');
    }

    // 設定をロード
    if (typeof window.loadSettings === 'function') {
        window.loadSettings();
    } else {
        console.error("loadSettings function is not defined. Check if storage.js is loaded properly.");
        window.isDebugMode = false;
        window.pdfTimeoutValue = window.DEFAULT_TIMEOUT || 15;
        window.companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
    }

    // デバッグパネルの初期表示設定
    const debugPanel = document.getElementById('debugPanel');
    const debugModeCheckbox = document.getElementById('debugMode');
    if (debugPanel) {
        debugPanel.style.display = window.isDebugMode ? 'block' : 'none';
    }
    if (debugModeCheckbox) {
        debugModeCheckbox.checked = window.isDebugMode;
    }

    // PDFタイムアウト値の初期設定
    const pdfTimeoutInput = document.getElementById('pdfTimeout');
    if (pdfTimeoutInput) {
        pdfTimeoutInput.value = window.pdfTimeoutValue;
    }

    // 会社情報をフォームに反映
    if (typeof window.loadCompanyInfo === 'function') {
        window.loadCompanyInfo();
    } else {
        console.error("loadCompanyInfo function is not defined. Check if storage.js is loaded properly.");
    }

    // 現在の日付を見積日フィールドに設定
    const estimateDateField = document.getElementById('estimateDate');
    if (estimateDateField) {
        estimateDateField.valueAsDate = new Date();
    }

    // 初期明細行の計算を実行
    if (typeof window.updateAmounts === 'function') {
        window.updateAmounts();
    } else {
        console.error("updateAmounts function is not defined. Check if calculation.js is loaded properly.");
    }

    // 初期行の削除ボタンの状態更新
    if (typeof window.updateDeleteButtons === 'function') {
        window.updateDeleteButtons();
    } else {
        console.error("updateDeleteButtons function is not defined. Check if ui.js is loaded properly.");
    }

    console.log('Application initialized');
    if (typeof window.debugLog === 'function') {
        window.debugLog('Application initialized', 'info');
    }
}

// --- イベントリスナー設定 ---
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // タブ切り替え
    const tabs = document.querySelectorAll('.tab');
    if (tabs && tabs.length > 0) {
        tabs.forEach(tab => tab.addEventListener('click', () => {
            if (typeof window.switchTab === 'function') {
                window.switchTab(tab.dataset.tab);
            } else {
                console.error("switchTab function is not defined. Check if ui.js is loaded properly.");
            }
        }));
    }
    
    // 明細行追加
    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            if (typeof window.addItemRow === 'function') {
                window.addItemRow();
            } else {
                console.error("addItemRow function is not defined. Check if ui.js is loaded properly.");
            }
        });
    }
    
    // 見積計算
    const estimateForm = document.getElementById('estimateForm');
    if (estimateForm) {
        estimateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (typeof window.validateForm === 'function' && typeof window.calculateEstimate === 'function') {
                if (window.validateForm()) window.calculateEstimate();
            } else {
                console.error("validateForm or calculateEstimate function is not defined. Check if calculation.js is loaded properly.");
            }
        });
    }
    
    // プレビュー・印刷・PDF
    const previewBtn = document.getElementById('previewBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const printBtn = document.getElementById('printBtn');
    const previewDownloadBtn = document.getElementById('previewDownloadBtn');
    const previewPrintBtn = document.getElementById('previewPrintBtn');
    
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            if (typeof window.switchTab === 'function') {
                window.switchTab('preview');
            } else {
                console.error("switchTab function is not defined. Check if ui.js is loaded properly.");
            }
        });
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (typeof window.generatePDF === 'function') {
                window.generatePDF();
            } else {
                console.error("generatePDF function is not defined. Check if pdf-generator.js is loaded properly.");
            }
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (typeof window.printEstimate === 'function') {
                window.printEstimate();
            } else {
                console.error("printEstimate function is not defined. Check if pdf-generator.js is loaded properly.");
            }
        });
    }
    
    if (previewDownloadBtn) {
        previewDownloadBtn.addEventListener('click', () => {
            if (typeof window.generatePDF === 'function') {
                window.generatePDF();
            } else {
                console.error("generatePDF function is not defined. Check if pdf-generator.js is loaded properly.");
            }
        });
    }
    
    if (previewPrintBtn) {
        previewPrintBtn.addEventListener('click', () => {
            if (typeof window.printEstimate === 'function') {
                window.printEstimate();
            } else {
                console.error("printEstimate function is not defined. Check if pdf-generator.js is loaded properly.");
            }
        });
    }
    
    // 会社情報設定
    const companySettingsForm = document.getElementById('companySettingsForm');
    if (companySettingsForm) {
        companySettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (typeof window.saveCompanyInfo === 'function') {
                window.saveCompanyInfo();
            } else {
                console.error("saveCompanyInfo function is not defined. Check if storage.js is loaded properly.");
            }
        });
    }
    
    // 画像アップロード
    const companyLogoInput = document.getElementById('companyLogo');
    const companyLogoPreview = document.getElementById('companyLogoPreview');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const companyStampInput = document.getElementById('companyStamp');
    const companyStampPreview = document.getElementById('companyStampPreview');
    const removeStampBtn = document.getElementById('removeStampBtn');
    
    if (companyLogoInput && companyLogoPreview && removeLogoBtn) {
        companyLogoInput.addEventListener('change', () => {
            if (typeof window.handleImageUpload === 'function') {
                window.handleImageUpload(companyLogoInput, companyLogoPreview, removeLogoBtn);
            } else {
                console.error("handleImageUpload function is not defined. Check if storage.js is loaded properly.");
            }
        });
    }
    
    if (companyStampInput && companyStampPreview && removeStampBtn) {
        companyStampInput.addEventListener('change', () => {
            if (typeof window.handleImageUpload === 'function') {
                window.handleImageUpload(companyStampInput, companyStampPreview, removeStampBtn);
            } else {
                console.error("handleImageUpload function is not defined. Check if storage.js is loaded properly.");
            }
        });
    }
    
    // 画像削除
    if (removeLogoBtn && companyLogoPreview && companyLogoInput) {
        removeLogoBtn.addEventListener('click', () => {
            if (typeof window.removeImage === 'function') {
                window.removeImage(companyLogoPreview, removeLogoBtn, companyLogoInput, 'logo');
            } else {
                console.error("removeImage function is not defined. Check if storage.js is loaded properly.");
            }
        });
    }
    
    if (removeStampBtn && companyStampPreview && companyStampInput) {
        removeStampBtn.addEventListener('click', () => {
            if (typeof window.removeImage === 'function') {
                window.removeImage(companyStampPreview, removeStampBtn, companyStampInput, 'stamp');
            } else {
                console.error("removeImage function is not defined. Check if storage.js is loaded properly.");
            }
        });
    }
    
    // デバッグモード
    const debugModeCheckbox = document.getElementById('debugMode');
    const debugPanel = document.getElementById('debugPanel');
    if (debugModeCheckbox && debugPanel) {
        debugModeCheckbox.addEventListener('change', function() {
            window.isDebugMode = this.checked;
            debugPanel.style.display = window.isDebugMode ? 'block' : 'none';
            if (window.storageAvailable && typeof window.DEBUG_KEY !== 'undefined') {
                localStorage.setItem(window.DEBUG_KEY, window.isDebugMode);
            }
            if (window.isDebugMode && typeof window.debugLog === 'function') {
                window.debugLog('Debug mode enabled.', 'warn');
            } else {
                console.log('[INFO] Debug mode disabled.');
            }
        });
    }
    
    // PDF生成タイムアウト
    const pdfTimeoutInput = document.getElementById('pdfTimeout');
    if (pdfTimeoutInput) {
        pdfTimeoutInput.addEventListener('change', function() {
            let value = parseInt(this.value, 10);
            if (isNaN(value) || value < 5 || value > 120) {
                value = window.DEFAULT_TIMEOUT || 15;
                this.value = value;
            }
            window.pdfTimeoutValue = value;
            if (window.storageAvailable && typeof window.TIMEOUT_KEY !== 'undefined') {
                localStorage.setItem(window.TIMEOUT_KEY, window.pdfTimeoutValue);
            }
            if (typeof window.debugLog === 'function') {
                window.debugLog(`PDF timeout set to ${window.pdfTimeoutValue} seconds.`, 'info');
            } else {
                console.log(`PDF timeout set to ${window.pdfTimeoutValue} seconds.`);
            }
        });
    }
    
    // 設定リセット
    const clearStorageBtn = document.getElementById('clearStorageBtn');
    if (clearStorageBtn) {
        clearStorageBtn.addEventListener('click', () => {
            if (typeof window.clearAllSettings === 'function') {
                window.clearAllSettings();
            } else {
                console.error("clearAllSettings function is not defined. Check if storage.js is loaded properly.");
            }
        });
    }
    
    // PDFキャンセル/閉じる
    const cancelPdfBtn = document.getElementById('cancelPdfBtn');
    if (cancelPdfBtn) {
        cancelPdfBtn.addEventListener('click', function() {
            if (cancelPdfBtn.textContent === '閉じる') {
                if (typeof window.hideLoadingSpinner === 'function') {
                    window.hideLoadingSpinner();
                } else {
                    console.error("hideLoadingSpinner function is not defined. Check if ui.js is loaded properly.");
                }
            } else {
                window.pdfGenerationCancelled = true;
                if (typeof window.hideLoadingSpinner === 'function') {
                    window.hideLoadingSpinner();
                } else {
                    console.error("hideLoadingSpinner function is not defined. Check if ui.js is loaded properly.");
                }
                if (typeof window.debugLog === 'function') {
                    window.debugLog('PDF generation cancelled by user.', 'warn');
                } else {
                    console.log('PDF generation cancelled by user.');
                }
            }
        });
    }
    
    // 代替手段（印刷）
    const alternativePdfBtn = document.getElementById('alternativePdfBtn');
    if (alternativePdfBtn) {
        alternativePdfBtn.addEventListener('click', function() {
            if (typeof window.hideLoadingSpinner === 'function' && typeof window.printEstimate === 'function') {
                window.hideLoadingSpinner();
                window.printEstimate();
                if (typeof window.debugLog === 'function') {
                    window.debugLog('Alternative action (print) triggered.', 'info');
                } else {
                    console.log('Alternative action (print) triggered.');
                }
            } else {
                console.error("hideLoadingSpinner or printEstimate function is not defined. Check if ui.js and pdf-generator.js are loaded properly.");
            }
        });
    }
}

// 明細行の入力イベントリスナー設定
function setupItemRowListeners() {
    console.log("Setting up item row listeners");
    const itemTableBody = document.getElementById('itemTableBody');
    if (!itemTableBody) {
        console.error("itemTableBody element not found");
        return;
    }
    
    const inputs = itemTableBody.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]');
    console.log("Found", inputs.length, "inputs to listen to");
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            console.log("Input event triggered on", this.name);
            if (typeof window.updateAmounts === 'function') {
                window.updateAmounts();
            } else {
                console.error("updateAmounts function is not defined. Check if calculation.js is loaded properly.");
            }
        });
        
        input.addEventListener('change', function() {
            console.log("Change event triggered on", this.name);
            if (typeof window.updateAmounts === 'function') {
                window.updateAmounts();
            } else {
                console.error("updateAmounts function is not defined. Check if calculation.js is loaded properly.");
            }
        });
    });
}

console.log('main.js loaded successfully!');
