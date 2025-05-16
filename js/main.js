// main.js の修正版
'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // --- 定数定義 ---
    // storage.js で定義済みのため、再定義は不要
    // DEBUG_KEY, TIMEOUT_KEY, COMPANY_INFO_KEY は storage.js 側で定義

    // --- グローバル変数 ---
    window.pdfGenerationTimeout = null;
    window.pdfGenerationCancelled = false; // 重複定義を削除
    window.currentTotalCost = 0; // 原価合計
    window.currentItems = []; // 明細データ
    
    // --- 要素の取得 ---
    window.estimateForm = document.getElementById('estimateForm');
    window.estimateResult = document.getElementById('estimateResult');
    window.itemTableBody = document.getElementById('itemTableBody');
    window.addRowBtn = document.getElementById('addRowBtn');
    window.subtotalElement = document.getElementById('subtotal');
    window.taxElement = document.getElementById('tax');
    window.totalElement = document.getElementById('total');
    window.calculateBtn = document.getElementById('calculateBtn');
    window.previewBtn = document.getElementById('previewBtn');
    window.downloadBtn = document.getElementById('downloadBtn');
    window.printBtn = document.getElementById('printBtn');
    window.tabs = document.querySelectorAll('.tab');
    window.tabContents = document.querySelectorAll('.tab-content');
    window.previewContainer = document.getElementById('previewContainer');
    window.previewButtons = document.getElementById('previewButtons');
    window.previewDownloadBtn = document.getElementById('previewDownloadBtn');
    window.previewPrintBtn = document.getElementById('previewPrintBtn');
    window.companySettingsForm = document.getElementById('companySettingsForm');
    window.companyLogoInput = document.getElementById('companyLogo');
    window.companyLogoPreview = document.getElementById('companyLogoPreview');
    window.removeLogoBtn = document.getElementById('removeLogoBtn');
    window.companyStampInput = document.getElementById('companyStamp');
    window.companyStampPreview = document.getElementById('companyStampPreview');
    window.removeStampBtn = document.getElementById('removeStampBtn');
    window.pdfContent = document.getElementById('pdfContent');
    window.pdfEstimateSheet = document.getElementById('pdfEstimateSheet');
    window.loadingSpinner = document.getElementById('loadingSpinner');
    window.loadingSpinnerText = loadingSpinner.querySelector('.spinner-text');
    window.spinnerActions = document.getElementById('spinnerActions');
    window.cancelPdfBtn = document.getElementById('cancelPdfBtn');
    window.alternativePdfBtn = document.getElementById('alternativePdfBtn');
    window.debugModeCheckbox = document.getElementById('debugMode');
    window.debugPanel = document.getElementById('debugPanel');
    window.debugLogs = document.getElementById('debugLogs');
    window.pdfTimeoutInput = document.getElementById('pdfTimeout');
    window.storageWarning = document.getElementById('storageWarning');
    window.clearStorageBtn = document.getElementById('clearStorageBtn');

    // --- デバッグログ関数（必要な場合に追加） ---
    if (typeof debugLog !== 'function') {
        window.debugLog = function(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}][${type.toUpperCase()}] ${message}`);

            if (window.isDebugMode && window.debugPanel && window.debugPanel.style.display !== 'none') {
                const logElement = document.createElement('div');
                logElement.className = `debug-log debug-${type}`;
                logElement.textContent = `[${timestamp}] ${message}`;
                window.debugLogs.insertBefore(logElement, window.debugLogs.firstChild);
                while (window.debugLogs.children.length > 101) {
                    window.debugLogs.removeChild(window.debugLogs.lastChild);
                }
            }
        };
    }

    // --- 初期化処理 ---
    initialize();

    function initialize() {
        // Copyright年の設定
        document.getElementById('copyrightYear').textContent = new Date().getFullYear();

        // LocalStorageが使用可能かチェック
        if (typeof checkStorage === 'function') {
            checkStorage();
        } else {
            console.error("checkStorage function is not defined. Check if storage.js is loaded properly.");
            window.storageAvailable = false;
            if (window.storageWarning) window.storageWarning.classList.remove('hidden');
        }

        // 設定をロード
        if (typeof loadSettings === 'function') {
            loadSettings();
        } else {
            console.error("loadSettings function is not defined. Check if storage.js is loaded properly.");
            window.isDebugMode = false;
            window.pdfTimeoutValue = DEFAULT_TIMEOUT || 15;
            window.companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        }

        // デバッグパネルの初期表示設定
        if (window.debugPanel) {
            window.debugPanel.style.display = window.isDebugMode ? 'block' : 'none';
        }
        if (window.debugModeCheckbox) {
            window.debugModeCheckbox.checked = window.isDebugMode;
        }

        // PDFタイムアウト値の初期設定
        if (window.pdfTimeoutInput) {
            window.pdfTimeoutInput.value = window.pdfTimeoutValue;
        }

        // 会社情報をフォームに反映
        if (typeof loadCompanyInfo === 'function') {
            loadCompanyInfo();
        } else {
            console.error("loadCompanyInfo function is not defined. Check if storage.js is loaded properly.");
        }

        // イベントリスナーを設定
        setupEventListeners();

        // 現在の日付を見積日フィールドに設定
        const estimateDateField = document.getElementById('estimateDate');
        if (estimateDateField) {
            estimateDateField.valueAsDate = new Date();
        }

        // 初期明細行の計算を実行
        if (typeof updateAmounts === 'function') {
            updateAmounts();
        } else {
            console.error("updateAmounts function is not defined. Check if calculation.js is loaded properly.");
        }

        // 初期行の削除ボタンの状態更新
        if (typeof updateDeleteButtons === 'function') {
            updateDeleteButtons();
        } else {
            console.error("updateDeleteButtons function is not defined. Check if ui.js is loaded properly.");
        }

        console.log('Application initialized');
        if (typeof debugLog === 'function') {
            debugLog('Application initialized', 'info');
        }
    }

    // --- イベントリスナー設定 ---
    function setupEventListeners() {
        // タブ切り替え
        if (window.tabs) {
            window.tabs.forEach(tab => tab.addEventListener('click', () => {
                if (typeof switchTab === 'function') {
                    switchTab(tab.dataset.tab);
                } else {
                    console.error("switchTab function is not defined. Check if ui.js is loaded properly.");
                }
            }));
        }
        
        // 明細行追加
        if (window.addRowBtn) {
            window.addRowBtn.addEventListener('click', () => {
                if (typeof addItemRow === 'function') {
                    addItemRow();
                } else {
                    console.error("addItemRow function is not defined. Check if ui.js is loaded properly.");
                }
            });
        }
        
        // 見積計算
        if (window.estimateForm) {
            window.estimateForm.addEventListener('submit', function(e) {
                e.preventDefault();
                if (typeof validateForm === 'function' && typeof calculateEstimate === 'function') {
                    if (validateForm()) calculateEstimate();
                } else {
                    console.error("validateForm or calculateEstimate function is not defined. Check if calculation.js is loaded properly.");
                }
            });
        }
        
        // プレビュー・印刷・PDF
        if (window.previewBtn) {
            window.previewBtn.addEventListener('click', () => {
                if (typeof switchTab === 'function') {
                    switchTab('preview');
                } else {
                    console.error("switchTab function is not defined. Check if ui.js is loaded properly.");
                }
            });
        }
        
        if (window.downloadBtn) {
            window.downloadBtn.addEventListener('click', () => {
                if (typeof generatePDF === 'function') {
                    generatePDF();
                } else {
                    console.error("generatePDF function is not defined. Check if pdf-generator.js is loaded properly.");
                }
            });
        }
        
        if (window.printBtn) {
            window.printBtn.addEventListener('click', () => {
                if (typeof printEstimate === 'function') {
                    printEstimate();
                } else {
                    console.error("printEstimate function is not defined. Check if pdf-generator.js is loaded properly.");
                }
            });
        }
        
        if (window.previewDownloadBtn) {
            window.previewDownloadBtn.addEventListener('click', () => {
                if (typeof generatePDF === 'function') {
                    generatePDF();
                } else {
                    console.error("generatePDF function is not defined. Check if pdf-generator.js is loaded properly.");
                }
            });
        }
        
        if (window.previewPrintBtn) {
            window.previewPrintBtn.addEventListener('click', () => {
                if (typeof printEstimate === 'function') {
                    printEstimate();
                } else {
                    console.error("printEstimate function is not defined. Check if pdf-generator.js is loaded properly.");
                }
            });
        }
        
        // 会社情報設定
        if (window.companySettingsForm) {
            window.companySettingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                if (typeof saveCompanyInfo === 'function') {
                    saveCompanyInfo();
                } else {
                    console.error("saveCompanyInfo function is not defined. Check if storage.js is loaded properly.");
                }
            });
        }
        
        // 画像アップロード
        if (window.companyLogoInput && window.companyLogoPreview && window.removeLogoBtn) {
            window.companyLogoInput.addEventListener('change', () => {
                if (typeof handleImageUpload === 'function') {
                    handleImageUpload(window.companyLogoInput, window.companyLogoPreview, window.removeLogoBtn);
                } else {
                    console.error("handleImageUpload function is not defined. Check if storage.js is loaded properly.");
                }
            });
        }
        
        if (window.companyStampInput && window.companyStampPreview && window.removeStampBtn) {
            window.companyStampInput.addEventListener('change', () => {
                if (typeof handleImageUpload === 'function') {
                    handleImageUpload(window.companyStampInput, window.companyStampPreview, window.removeStampBtn);
                } else {
                    console.error("handleImageUpload function is not defined. Check if storage.js is loaded properly.");
                }
            });
        }
        
        // 画像削除
        if (window.removeLogoBtn && window.companyLogoPreview && window.companyLogoInput) {
            window.removeLogoBtn.addEventListener('click', () => {
                if (typeof removeImage === 'function') {
                    removeImage(window.companyLogoPreview, window.removeLogoBtn, window.companyLogoInput, 'logo');
                } else {
                    console.error("removeImage function is not defined. Check if storage.js is loaded properly.");
                }
            });
        }
        
        if (window.removeStampBtn && window.companyStampPreview && window.companyStampInput) {
            window.removeStampBtn.addEventListener('click', () => {
                if (typeof removeImage === 'function') {
                    removeImage(window.companyStampPreview, window.removeStampBtn, window.companyStampInput, 'stamp');
                } else {
                    console.error("removeImage function is not defined. Check if storage.js is loaded properly.");
                }
            });
        }
        
        // デバッグモード
        if (window.debugModeCheckbox && window.debugPanel) {
            window.debugModeCheckbox.addEventListener('change', function() {
                window.isDebugMode = this.checked;
                window.debugPanel.style.display = window.isDebugMode ? 'block' : 'none';
                if (window.storageAvailable && typeof DEBUG_KEY !== 'undefined') {
                    localStorage.setItem(DEBUG_KEY, window.isDebugMode);
                }
                if (window.isDebugMode && typeof debugLog === 'function') {
                    debugLog('Debug mode enabled.', 'warn');
                } else {
                    console.log('[INFO] Debug mode disabled.');
                }
            });
        }
        
        // PDF生成タイムアウト
        if (window.pdfTimeoutInput) {
            window.pdfTimeoutInput.addEventListener('change', function() {
                let value = parseInt(this.value, 10);
                if (isNaN(value) || value < 5 || value > 120) {
                    value = DEFAULT_TIMEOUT || 15;
                    this.value = value;
                }
                window.pdfTimeoutValue = value;
                if (window.storageAvailable && typeof TIMEOUT_KEY !== 'undefined') {
                    localStorage.setItem(TIMEOUT_KEY, window.pdfTimeoutValue);
                }
                if (typeof debugLog === 'function') {
                    debugLog(`PDF timeout set to ${window.pdfTimeoutValue} seconds.`, 'info');
                } else {
                    console.log(`PDF timeout set to ${window.pdfTimeoutValue} seconds.`);
                }
            });
        }
        
        // 設定リセット
        if (window.clearStorageBtn) {
            window.clearStorageBtn.addEventListener('click', () => {
                if (typeof clearAllSettings === 'function') {
                    clearAllSettings();
                } else {
                    console.error("clearAllSettings function is not defined. Check if storage.js is loaded properly.");
                }
            });
        }
        
        // PDFキャンセル/閉じる
        if (window.cancelPdfBtn) {
            window.cancelPdfBtn.addEventListener('click', function() {
                if (window.cancelPdfBtn.textContent === '閉じる') {
                    if (typeof hideLoadingSpinner === 'function') {
                        hideLoadingSpinner();
                    } else {
                        console.error("hideLoadingSpinner function is not defined. Check if ui.js is loaded properly.");
                    }
                } else {
                    window.pdfGenerationCancelled = true;
                    if (typeof hideLoadingSpinner === 'function') {
                        hideLoadingSpinner();
                    } else {
                        console.error("hideLoadingSpinner function is not defined. Check if ui.js is loaded properly.");
                    }
                    if (typeof debugLog === 'function') {
                        debugLog('PDF generation cancelled by user.', 'warn');
                    } else {
                        console.log('PDF generation cancelled by user.');
                    }
                }
            });
        }
        
        // 代替手段（印刷）
        if (window.alternativePdfBtn) {
            window.alternativePdfBtn.addEventListener('click', function() {
                if (typeof hideLoadingSpinner === 'function' && typeof printEstimate === 'function') {
                    hideLoadingSpinner();
                    printEstimate();
                    if (typeof debugLog === 'function') {
                        debugLog('Alternative action (print) triggered.', 'info');
                    } else {
                        console.log('Alternative action (print) triggered.');
                    }
                } else {
                    console.error("hideLoadingSpinner or printEstimate function is not defined. Check if ui.js and pdf-generator.js are loaded properly.");
                }
            });
        }
        
        // 明細行の金額計算イベント - 強化版
        setupItemRowListeners();
    }
    
    // 明細行の入力イベントリスナー設定（追加）
    function setupItemRowListeners() {
        console.log("Setting up item row listeners");
        if (!window.itemTableBody) {
            console.error("itemTableBody element not found");
            return;
        }
        
        const inputs = window.itemTableBody.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]');
        console.log("Found", inputs.length, "inputs to listen to");
        
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                console.log("Input event triggered on", this.name);
                if (typeof updateAmounts === 'function') {
                    updateAmounts();
                } else {
                    console.error("updateAmounts function is not defined. Check if calculation.js is loaded properly.");
                }
            });
            
            input.addEventListener('change', function() {
                console.log("Change event triggered on", this.name);
                if (typeof updateAmounts === 'function') {
                    updateAmounts();
                } else {
                    console.error("updateAmounts function is not defined. Check if calculation.js is loaded properly.");
                }
            });
        });
    }
});
