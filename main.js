/**
 * 自動見積作成システム - メインJavaScriptファイル
 * メインロジック、初期化処理、データ管理を担当
 */
'use strict';

/**
 * グローバル変数・定数
 */
// ストレージキー
const DEBUG_KEY = 'estimateAppDebugMode';
const TIMEOUT_KEY = 'estimateAppPdfTimeout';
const COMPANY_INFO_KEY = 'estimateAppCompanyInfo';
const SAVED_ESTIMATES_KEY = 'estimateAppSavedEstimates';
const VERSION_KEY = 'estimateAppVersion';

// アプリケーションバージョン
const APP_VERSION = '1.1.0';

// デフォルト値
const DEFAULT_TIMEOUT = 15;

// グローバル変数
let pdfGenerationTimeout = null;
let pdfTimeoutValue = DEFAULT_TIMEOUT;
let pdfGenerationCancelled = false;
let currentTotalCost = 0;
let currentItems = [];
let companyInfo = { 
    name: '', 
    postal: '', 
    address: '', 
    phone: '', 
    fax: '', 
    logo: '', 
    stamp: '' 
};
let savedEstimates = [];
let storageAvailable = false;
let isDebugMode = false;

/**
 * アプリケーション初期化
 */
function initialize() {
    debugLog('アプリケーション初期化開始', 'info');
    
    // Copyright年の設定
    document.getElementById('copyrightYear').textContent = new Date().getFullYear();
    
    // LocalStorageが使用可能かチェック
    checkStorage();
    
    // 設定をロード
    loadSettings();
    
    // 保存済み見積をロード
    loadSavedEstimates();
    
    // デバッグパネルの初期表示設定
    const debugPanel = document.getElementById('debugPanel');
    debugPanel.style.display = isDebugMode ? 'block' : 'none';
    document.getElementById('debugMode').checked = isDebugMode;
    
    // PDFタイムアウト値の初期設定
    document.getElementById('pdfTimeout').value = pdfTimeoutValue;
    
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
    
    debugLog('アプリケーション初期化完了', 'info');
}

/**
 * ストレージの可用性チェック
 */
function checkStorage() {
    try {
        localStorage.setItem('__test_storage__', 'test');
        localStorage.removeItem('__test_storage__');
        storageAvailable = true;
        debugLog('LocalStorage は使用可能です', 'info');
    } catch (e) {
        storageAvailable = false;
        document.getElementById('storageWarning').classList.remove('hidden');
        console.warn('LocalStorage は使用できません', e);
        debugLog('LocalStorage は使用できません: ' + e.message, 'warn');
    }
}

/**
 * 設定のロード
 */
function loadSettings() {
    if (!storageAvailable) {
        isDebugMode = false;
        pdfTimeoutValue = DEFAULT_TIMEOUT;
        companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        return;
    }
    
    // バージョンチェックとアップグレード処理
    const savedVersion = localStorage.getItem(VERSION_KEY);
    if (savedVersion !== APP_VERSION) {
        debugLog(`バージョン更新を検出: ${savedVersion || 'なし'} -> ${APP_VERSION}`, 'info');
        localStorage.setItem(VERSION_KEY, APP_VERSION);
        // 将来的なデータ構造の更新処理をここに追加
    }
    
    // デバッグモード設定の読み込み
    isDebugMode = localStorage.getItem(DEBUG_KEY) === 'true';
    
    // PDFタイムアウト設定の読み込み
    const storedTimeout = localStorage.getItem(TIMEOUT_KEY);
    pdfTimeoutValue = storedTimeout ? parseInt(storedTimeout, 10) : DEFAULT_TIMEOUT;
    if (isNaN(pdfTimeoutValue) || pdfTimeoutValue < 5 || pdfTimeoutValue > 120) {
        pdfTimeoutValue = DEFAULT_TIMEOUT;
    }
    
    // 会社情報の読み込み
    const storedInfo = localStorage.getItem(COMPANY_INFO_KEY);
    if (storedInfo) {
        try {
            companyInfo = JSON.parse(storedInfo);
            for (const key in companyInfo) {
                if (companyInfo[key] == null) {
                    companyInfo[key] = '';
                }
            }
        } catch (e) {
            console.error('会社情報の解析に失敗しました', e);
            companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        }
    } else {
        companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
    }
    
    debugLog('設定を読み込みました', 'info');
}

/**
 * 会社情報の保存
 */
function saveCompanyInfo() {
    companyInfo.name = document.getElementById('companyName').value.trim();
    companyInfo.postal = document.getElementById('companyPostal').value.trim();
    companyInfo.address = document.getElementById('companyAddress').value.trim();
    companyInfo.phone = document.getElementById('companyPhone').value.trim();
    companyInfo.fax = document.getElementById('companyFax').value.trim();
    
    const companyLogoPreview = document.getElementById('companyLogoPreview');
    const companyStampPreview = document.getElementById('companyStampPreview');
    
    companyInfo.logo = companyLogoPreview.classList.contains('hidden') ? '' : companyLogoPreview.src;
    companyInfo.stamp = companyStampPreview.classList.contains('hidden') ? '' : companyStampPreview.src;
    
    if (storageAvailable) {
        try {
            localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(companyInfo));
            alert('会社情報を保存しました。');
            debugLog('会社情報を保存しました', 'info');
        } catch (e) {
            console.error('会社情報の保存に失敗しました', e);
            alert('会社情報の保存に失敗しました。ブラウザのストレージ容量を確認してください。');
            debugLog('会社情報の保存に失敗: ' + e.message, 'error');
        }
    } else {
        alert('LocalStorageが利用できないため、設定は保存されませんでした。\nページを閉じると入力内容は失われます。');
        debugLog('ストレージが利用できないため、会社情報は保存されませんでした', 'warn');
    }
}

/**
 * 会社情報のフォームへの反映
 */
function loadCompanyInfo() {
    document.getElementById('companyName').value = companyInfo.name || '';
    document.getElementById('companyPostal').value = companyInfo.postal || '';
    document.getElementById('companyAddress').value = companyInfo.address || '';
    document.getElementById('companyPhone').value = companyInfo.phone || '';
    document.getElementById('companyFax').value = companyInfo.fax || '';
    
    const companyLogoPreview = document.getElementById('companyLogoPreview');
    const companyStampPreview = document.getElementById('companyStampPreview');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const removeStampBtn = document.getElementById('removeStampBtn');
    
    if (companyInfo.logo) {
        companyLogoPreview.src = companyInfo.logo;
        companyLogoPreview.classList.remove('hidden');
        removeLogoBtn.classList.remove('hidden');
    } else {
        companyLogoPreview.src = '';
        companyLogoPreview.classList.add('hidden');
        removeLogoBtn.classList.add('hidden');
    }
    
    if (companyInfo.stamp) {
        companyStampPreview.src = companyInfo.stamp;
        companyStampPreview.classList.remove('hidden');
        removeStampBtn.classList.remove('hidden');
    } else {
        companyStampPreview.src = '';
        companyStampPreview.classList.add('hidden');
        removeStampBtn.classList.add('hidden');
    }
    
    debugLog('会社情報をフォームに反映しました', 'info');
}

/**
 * 保存済み見積の読み込み
 */
function loadSavedEstimates() {
    if (!storageAvailable) {
        savedEstimates = [];
        return;
    }
    
    const storedEstimates = localStorage.getItem(SAVED_ESTIMATES_KEY);
    if (storedEstimates) {
        try {
            savedEstimates = JSON.parse(storedEstimates);
            debugLog(`${savedEstimates.length}件の保存済み見積を読み込みました`, 'info');
        } catch (e) {
            console.error('保存済み見積の解析に失敗しました', e);
            savedEstimates = [];
            debugLog('保存済み見積の解析エラー: ' + e.message, 'error');
        }
    } else {
        savedEstimates = [];
    }
}

/**
 * 保存済み見積の保存
 */
function saveSavedEstimates() {
    if (!storageAvailable) {
        debugLog('ストレージが使用できないため、見積を保存できません', 'warn');
        return false;
    }
    
    try {
        localStorage.setItem(SAVED_ESTIMATES_KEY, JSON.stringify(savedEstimates));
        debugLog(`${savedEstimates.length}件の見積を保存しました`, 'info');
        return true;
    } catch (e) {
        console.error('見積の保存に失敗しました', e);
        debugLog('見積の保存エラー: ' + e.message, 'error');
        return false;
    }
}

/**
 * 新しい見積の保存
 * @param {string} name - 見積名
 * @returns {boolean} - 保存成功時はtrue
 */
function saveNewEstimate(name) {
    if (!document.getElementById('calculateBtn').dataset.calculated) {
        alert('先に見積を計算してください。');
        return false;
    }
    
    // フォームからデータを収集
    const formData = collectFormData();
    
    // 見積オブジェクトを作成
    const estimate = {
        id: generateUniqueId(),
        name: name || formData.client + ' 見積書',
        date: new Date().toISOString(),
        data: formData,
        items: currentItems,
        totals: {
            subtotal: parseFloat(document.getElementById('resultSubtotal').textContent.replace(/[¥,]/g, '')),
            tax: parseFloat(document.getElementById('resultTotal').textContent.replace(/[¥,]/g, '')) - 
                parseFloat(document.getElementById('resultSubtotal').textContent.replace(/[¥,]/g, '')),
            total: parseFloat(document.getElementById('resultTotal').textContent.replace(/[¥,]/g, '')),
            totalCost: currentTotalCost,
            grossMargin: document.getElementById('resultGrossMarginPercent').textContent
        }
    };
    
    // 既存の見積配列に追加
    savedEstimates.push(estimate);
    
    // ストレージに保存
    const success = saveSavedEstimates();
    
    if (success) {
        alert('見積を保存しました。');
        return true;
    } else {
        alert('見積の保存に失敗しました。ブラウザのストレージ容量を確認してください。');
        return false;
    }
}

/**
 * フォームデータの収集
 * @returns {Object} フォームデータオブジェクト
 */
function collectFormData() {
    return {
        client: document.getElementById('client').value,
        project: document.getElementById('project').value,
        estimateNumber: document.getElementById('estimateNumber').value,
        estimateDate: document.getElementById('estimateDate').value,
        expiryDays: document.getElementById('expiryDays').value,
        notes: document.getElementById('notes').value
    };
}

/**
 * 保存済み見積の読み込み
 * @param {string} id - 見積ID
 */
function loadSavedEstimate(id) {
    const estimate = savedEstimates.find(e => e.id === id);
    if (!estimate) {
        alert('見積が見つかりませんでした。');
        return;
    }
    
    // フォームにデータを設定
    document.getElementById('client').value = estimate.data.client || '';
    document.getElementById('project').value = estimate.data.project || '';
    document.getElementById('estimateNumber').value = estimate.data.estimateNumber || '';
    document.getElementById('estimateDate').value = estimate.data.estimateDate || '';
    document.getElementById('expiryDays').value = estimate.data.expiryDays || '30';
    document.getElementById('notes').value = estimate.data.notes || '';
    
    // 明細行を設定
    const itemTableBody = document.getElementById('itemTableBody');
    itemTableBody.innerHTML = '';  // 既存の行をクリア
    
    // 明細行を追加
    estimate.items.forEach(item => {
        addItemRowWithData(item);
    });
    
    // 明細が無い場合は1行追加
    if (estimate.items.length === 0) {
        addItemRow();
    }
    
    // 金額を更新して計算
    updateAmounts();
    
    // 削除ボタンの状態を更新
    updateDeleteButtons();
    
    // 計算ボタンを自動クリックして結果を表示
    document.getElementById('calculateBtn').click();
    
    // プレビュータブに切り替え
    switchTab('preview');
    
    alert(`「${estimate.name}」を読み込みました。`);
    debugLog(`保存済み見積「${estimate.name}」を読み込みました`, 'info');
}

/**
 * データをJSONファイルとしてエクスポート
 */
function exportData() {
    try {
        const exportData = {
            version: APP_VERSION,
            timestamp: new Date().toISOString(),
            companyInfo: companyInfo,
            savedEstimates: savedEstimates,
            settings: {
                debugMode: isDebugMode,
                pdfTimeout: pdfTimeoutValue
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const dataURL = URL.createObjectURL(dataBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = dataURL;
        downloadLink.download = `見積作成システム_エクスポート_${formatDateForFilename(new Date())}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        debugLog('データをエクスポートしました', 'info');
    } catch (e) {
        console.error('データのエクスポートに失敗しました', e);
        alert('データのエクスポートに失敗しました: ' + e.message);
        debugLog('データエクスポートエラー: ' + e.message, 'error');
    }
}

/**
 * JSONファイルからデータをインポート
 * @param {File} file - インポートするJSONファイル
 */
function importData(file) {
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // バージョンチェック (将来的な互換性のため)
            if (!importedData.version) {
                throw new Error('インポートデータにバージョン情報がありません');
            }
            
            // 必要なデータがあるか確認
            if (!importedData.companyInfo && !importedData.savedEstimates) {
                throw new Error('インポートデータに必要な情報が含まれていません');
            }
            
            // データの適用確認
            if (!confirm('次のデータをインポートします:\n\n' + 
                         (importedData.companyInfo ? '- 会社情報\n' : '') + 
                         (importedData.savedEstimates ? `- 保存済み見積 (${importedData.savedEstimates.length}件)\n` : '') + 
                         (importedData.settings ? '- アプリケーション設定\n' : '') + 
                         '\n現在のデータは上書きされます。続行しますか？')) {
                return;
            }
            
            // データの適用
            let message = 'インポート完了:';
            
            // 会社情報
            if (importedData.companyInfo) {
                companyInfo = importedData.companyInfo;
                localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(companyInfo));
                loadCompanyInfo();
                message += '\n- 会社情報';
            }
            
            // 保存済み見積
            if (importedData.savedEstimates) {
                savedEstimates = importedData.savedEstimates;
                localStorage.setItem(SAVED_ESTIMATES_KEY, JSON.stringify(savedEstimates));
                message += `\n- 保存済み見積 (${savedEstimates.length}件)`;
            }
            
            // 設定
            if (importedData.settings) {
                if (importedData.settings.debugMode !== undefined) {
                    isDebugMode = importedData.settings.debugMode;
                    localStorage.setItem(DEBUG_KEY, isDebugMode);
                    document.getElementById('debugMode').checked = isDebugMode;
                    document.getElementById('debugPanel').style.display = isDebugMode ? 'block' : 'none';
                }
                
                if (importedData.settings.pdfTimeout !== undefined) {
                    pdfTimeoutValue = importedData.settings.pdfTimeout;
                    localStorage.setItem(TIMEOUT_KEY, pdfTimeoutValue);
                    document.getElementById('pdfTimeout').value = pdfTimeoutValue;
                }
                
                message += '\n- アプリケーション設定';
            }
            
            alert(message);
            debugLog('データをインポートしました', 'info');
            
        } catch (e) {
            console.error('データのインポートに失敗しました', e);
            alert('データのインポートに失敗しました: ' + e.message);
            debugLog('インポートエラー: ' + e.message, 'error');
        }
    };
    
    reader.onerror = function() {
        alert('ファイルの読み込みに失敗しました');
        debugLog('ファイル読み込みエラー', 'error');
    };
    
    reader.readAsText(file);
}

/**
 * 保存済み見積リストの更新
 */
function updateSavedEstimatesList() {
    const container = document.getElementById('savedEstimatesList');
    
    if (savedEstimates.length === 0) {
        container.innerHTML = '<p>保存された見積はありません。</p>';
        return;
    }
    
    let html = '';
    
    // 新しい順にソート
    const sortedEstimates = [...savedEstimates].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    sortedEstimates.forEach(estimate => {
        const date = new Date(estimate.date);
        html += `
            <div class="saved-estimate-item" data-id="${estimate.id}">
                <div class="saved-estimate-info">
                    <div class="saved-estimate-name">${escapeHTML(estimate.name)}</div>
                    <div class="saved-estimate-date">${formatDate(date)} - ${formatCurrency(estimate.totals.total)}</div>
                </div>
                <div class="saved-estimate-actions">
                    <button class="secondary small-btn load-estimate-btn" data-id="${estimate.id}">読み込む</button>
                    <button class="danger small-btn delete-estimate-btn" data-id="${estimate.id}">削除</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // イベントリスナーを追加
    container.querySelectorAll('.load-estimate-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            document.getElementById('savedEstimatesModal').style.display = 'none';
            loadSavedEstimate(id);
        });
    });
    
    container.querySelectorAll('.delete-estimate-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            if (confirm('この見積を削除してもよろしいですか？')) {
                deleteSavedEstimate(id);
            }
        });
    });
}

/**
 * 保存済み見積の削除
 * @param {string} id - 見積ID
 */
function deleteSavedEstimate(id) {
    const index = savedEstimates.findIndex(e => e.id === id);
    if (index === -1) return;
    
    const estimateName = savedEstimates[index].name;
    savedEstimates.splice(index, 1);
    
    if (saveSavedEstimates()) {
        updateSavedEstimatesList();
        debugLog(`見積「${estimateName}」を削除しました`, 'info');
    }
}

/**
 * すべての設定をリセット
 */
function clearAllSettings() {
    if (confirm('本当にすべての会社情報と設定をリセットしますか？\n保存されている情報が完全に削除され、元に戻すことはできません。')) {
        if (storageAvailable) {
            try {
                localStorage.removeItem(COMPANY_INFO_KEY);
                localStorage.removeItem(DEBUG_KEY);
                localStorage.removeItem(TIMEOUT_KEY);
                localStorage.removeItem(SAVED_ESTIMATES_KEY);
                debugLog('すべての設定を削除しました', 'warn');
            } catch (e) {
                console.error('設定の削除に失敗しました', e);
                debugLog('設定削除エラー: ' + e.message, 'error');
            }
        }
        
        companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        savedEstimates = [];
        isDebugMode = false;
        pdfTimeoutValue = DEFAULT_TIMEOUT;
        
        loadCompanyInfo();
        document.getElementById('debugMode').checked = isDebugMode;
        document.getElementById('pdfTimeout').value = pdfTimeoutValue;
        document.getElementById('debugPanel').style.display = 'none';
        
        alert('設定をリセットしました。');
    }
}

/**
 * 一意のIDを生成
 * @returns {string} - UUIDv4形式のID
 */
function generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * ファイル名用の日付フォーマット
 * @param {Date} date - フォーマットする日付
 * @returns {string} - YYYYMMDD形式の日付文字列
 */
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * HTMLエスケープ
 * @param {string} text - エスケープするテキスト
 * @returns {string} - エスケープされたテキスト
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * メインのイベントリスナー設定
 */
function setupEventListeners() {
    // ヘッダーボタン
    document.getElementById('dataExportBtn').addEventListener('click', exportData);
    document.getElementById('dataImport').addEventListener('change', function() {
        if (this.files.length > 0) {
            importData(this.files[0]);
            this.value = ''; // 同じファイルを連続で選択できるようにリセット
        }
    });
    
    // 保存関連
    document.getElementById('saveEstimateBtn').addEventListener('click', function() {
        const modal = document.getElementById('saveEstimateModal');
        modal.style.display = 'block';
        document.getElementById('estimateName').value = document.getElementById('client').value + ' 見積書';
        document.getElementById('estimateName').focus();
    });
    
    document.getElementById('confirmSaveEstimateBtn').addEventListener('click', function() {
        const name = document.getElementById('estimateName').value.trim();
        if (!name) {
            alert('見積名を入力してください');
            return;
        }
        
        if (saveNewEstimate(name)) {
            document.getElementById('saveEstimateModal').style.display = 'none';
        }
    });
    
    document.getElementById('cancelSaveEstimateBtn').addEventListener('click', function() {
        document.getElementById('saveEstimateModal').style.display = 'none';
    });
    
    // 保存済み見積一覧
    document.getElementById('openSavedEstimatesBtn').addEventListener('click', function() {
        updateSavedEstimatesList();
        document.getElementById('savedEstimatesModal').style.display = 'block';
    });
    
    // モーダル閉じるボタン
    document.querySelectorAll('.modal .close').forEach(element => {
        element.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // モーダルの外側クリックで閉じる
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 設定関連
    document.getElementById('clearStorageBtn').addEventListener('click', clearAllSettings);
    document.getElementById('debugMode').addEventListener('change', function() {
        isDebugMode = this.checked;
        document.getElementById('debugPanel').style.display = isDebugMode ? 'block' : 'none';
        if (storageAvailable) localStorage.setItem(DEBUG_KEY, isDebugMode);
        if (isDebugMode) {
            debugLog('デバッグモードが有効になりました', 'warn');
        } else {
            console.log('[INFO] デバッグモードが無効になりました');
        }
    });
    
    document.getElementById('pdfTimeout').addEventListener('change', function() {
        let value = parseInt(this.value, 10);
        if (isNaN(value) || value < 5 || value > 120) {
            value = DEFAULT_TIMEOUT;
            this.value = value;
        }
        pdfTimeoutValue = value;
        if (storageAvailable) localStorage.setItem(TIMEOUT_KEY, pdfTimeoutValue);
        debugLog(`PDFタイムアウトを${pdfTimeoutValue}秒に設定しました`, 'info');
    });
    
    // グローバルキーボードショートカット
    document.addEventListener('keydown', function(e) {
        // ESCキーでモーダルを閉じる
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

/**
 * デバッグログ出力
 * @param {string} message - ログメッセージ
 * @param {string} type - ログタイプ (info/warn/error)
 */
function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}][${type.toUpperCase()}] ${message}`);
    
    if (isDebugMode && document.getElementById('debugPanel').style.display !== 'none') {
        const debugLogs = document.getElementById('debugLogs');
        const logElement = document.createElement('div');
function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}][${type.toUpperCase()}] ${message}`);
    
    if (isDebugMode && document.getElementById('debugPanel').style.display !== 'none') {
        const debugLogs = document.getElementById('debugLogs');
        const logElement = document.createElement('div');
        logElement.className = `debug-log debug-${type}`;
        logElement.textContent = `[${timestamp}] ${message}`;
        debugLogs.insertBefore(logElement, debugLogs.firstChild);
        
        // ログの最大数を制限
        while (debugLogs.children.length > 101) { // 100件 + ヘッダー
            debugLogs.removeChild(debugLogs.lastChild);
        }
    }
}

/**
 * 日本語形式の日付フォーマット
 * @param {Date|string} dateStr - フォーマットする日付
 * @returns {string} - yyyy年MM月dd日形式の日付文字列
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    try {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    } catch (e) {
        console.error("日付のフォーマットエラー:", dateStr, e);
        return '';
    }
}

/**
 * 通貨表示フォーマット
 * @param {number} amount - 金額
 * @param {boolean} withSymbol - 通貨記号を表示するか
 * @returns {string} - フォーマットされた金額
 */
function formatCurrency(amount, withSymbol = true) {
    if (typeof amount !== 'number' || !isFinite(amount)) {
        return withSymbol ? '¥---' : '---';
    }
    
    const num = Math.round(amount);
    const formattedAmount = num.toLocaleString();
    return withSymbol ? `¥${formattedAmount}` : formattedAmount;
}

/**
 * 見積番号の自動生成
 * @returns {string} - 自動生成された見積番号
 */
function generateEstimateNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `Q-${year}${month}${day}-${random}`;
}

// DOMContentLoaded イベントリスナー
document.addEventListener('DOMContentLoaded', initialize);

// グローバル関数のエクスポート（他のjsファイルから利用可能に）
window.app = {
    // ユーティリティ
    formatCurrency,
    formatDate,
    debugLog,
    generateEstimateNumber,
    generateUniqueId,
    
    // データ
    companyInfo,
    currentItems,
    currentTotalCost,
    savedEstimates,
    isDebugMode,
    pdfTimeoutValue,
    
    // 設定関連
    loadSettings,
    saveCompanyInfo,
    clearAllSettings,
    
    // 見積関連
    saveNewEstimate,
    loadSavedEstimate,
    deleteSavedEstimate,
    
    // エクスポート/インポート
    exportData,
    importData
};
