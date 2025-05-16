'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // --- 定数定義 ---
    const DEFAULT_TIMEOUT = 15; // PDFタイムアウトデフォルト値（秒）
    const DEBUG_KEY = 'estimateAppDebugMode';
    const TIMEOUT_KEY = 'estimateAppPdfTimeout';
    const COMPANY_INFO_KEY = 'estimateAppCompanyInfo';

    // --- グローバル変数 ---
    window.pdfGenerationTimeout = null;
    window.pdfTimeoutValue = DEFAULT_TIMEOUT;
    window.pdfGenerationCancelled = false;
    window.currentTotalCost = 0; // 原価合計
    window.currentItems = []; // 明細データ
    window.companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
    window.storageAvailable = false;
    window.isDebugMode = false;

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

    // --- 初期化処理 ---
    initialize();

    // --- ストレージ関連の関数（storage.jsから移動） ---
    function checkStorage() {
        try {
            localStorage.setItem('__test_storage__', 'test');
            localStorage.removeItem('__test_storage__');
            storageAvailable = true;
            debugLog('LocalStorage is available.', 'info');
        } catch (e) {
            storageAvailable = false;
            if (storageWarning) storageWarning.classList.remove('hidden');
            console.warn('LocalStorage is not available.', e);
            debugLog('LocalStorage is not available.', 'warn');
        }
    }

    function initialize() {
        // Copyright年の設定
        document.getElementById('copyrightYear').textContent = new Date().getFullYear();

        // LocalStorageが使用可能かチェック
        checkStorage();

        // 設定をロード
        loadSettings();

        // デバッグパネルの初期表示設定
        debugPanel.style.display = isDebugMode ? 'block' : 'none';
        debugModeCheckbox.checked = isDebugMode;

        // PDFタイムアウト値の初期設定
        pdfTimeoutInput.value = pdfTimeoutValue;

        // 会社情報をフォームに反映
        loadCompanyInfo();

        // イベントリスナーを設定
        setupEventListeners();

        // 現在の日付を見積日フィールドに設定
        document.getElementById('estimateDate').valueAsDate = new Date();

        // 初期明細行の計算を実行
        updateAmounts();

        // 初期行の削除ボタンの状態更新
        updateDeleteButtons();

        debugLog('Application initialized', 'info');
    }

    // --- イベントリスナー設定 ---
    function setupEventListeners() {
        // タブ切り替え
        tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
        
        // 明細行追加
        addRowBtn.addEventListener('click', addItemRow);
        
        // 見積計算
        estimateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm()) calculateEstimate();
        });
        
        // プレビュー・印刷・PDF
        previewBtn.addEventListener('click', () => switchTab('preview'));
        downloadBtn.addEventListener('click', generatePDF);
        printBtn.addEventListener('click', printEstimate);
        previewDownloadBtn.addEventListener('click', generatePDF);
        previewPrintBtn.addEventListener('click', printEstimate);
        
        // 会社情報設定
        companySettingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCompanyInfo();
        });
        
        // 画像アップロード
        companyLogoInput.addEventListener('change', () => 
            handleImageUpload(companyLogoInput, companyLogoPreview, removeLogoBtn));
        companyStampInput.addEventListener('change', () => 
            handleImageUpload(companyStampInput, companyStampPreview, removeStampBtn));
        
        // 画像削除
        removeLogoBtn.addEventListener('click', () => 
            removeImage(companyLogoPreview, removeLogoBtn, companyLogoInput, 'logo'));
        removeStampBtn.addEventListener('click', () => 
            removeImage(companyStampPreview, removeStampBtn, companyStampInput, 'stamp'));
        
        // デバッグモード
        debugModeCheckbox.addEventListener('change', function() {
            isDebugMode = this.checked;
            debugPanel.style.display = isDebugMode ? 'block' : 'none';
            if (storageAvailable) localStorage.setItem(DEBUG_KEY, isDebugMode);
            if (isDebugMode) debugLog('Debug mode enabled.', 'warn');
            else console.log('[INFO] Debug mode disabled.');
        });
        
        // PDF生成タイムアウト
        pdfTimeoutInput.addEventListener('change', function() {
            let value = parseInt(this.value, 10);
            if (isNaN(value) || value < 5 || value > 120) {
                value = DEFAULT_TIMEOUT;
                this.value = value;
            }
            pdfTimeoutValue = value;
            if (storageAvailable) localStorage.setItem(TIMEOUT_KEY, pdfTimeoutValue);
            debugLog(`PDF timeout set to ${pdfTimeoutValue} seconds.`, 'info');
        });
        
        // 設定リセット
        clearStorageBtn.addEventListener('click', clearAllSettings);
        
        // PDFキャンセル/閉じる
        cancelPdfBtn.addEventListener('click', function() {
            if (cancelPdfBtn.textContent === '閉じる') {
                hideLoadingSpinner();
            } else {
                pdfGenerationCancelled = true;
                hideLoadingSpinner();
                debugLog('PDF generation cancelled by user.', 'warn');
            }
        });
        
        // 代替手段（印刷）
        alternativePdfBtn.addEventListener('click', function() {
            hideLoadingSpinner();
            printEstimate();
            debugLog('Alternative action (print) triggered.', 'info');
        });
        
        // 明細行の金額計算イベント
        setupItemRowListeners();
    }
    
    // 明細行の入力イベントリスナー設定（追加）
    function setupItemRowListeners() {
        console.log("Setting up item row listeners");
        const inputs = document.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]');
        console.log("Found", inputs.length, "inputs to listen to");
        
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                console.log("Input event triggered on", this.name);
                updateAmounts();
            });
            input.addEventListener('change', function() {
                console.log("Change event triggered on", this.name);
                updateAmounts();
            });
        });
    }
});
