// storage.js の修正版
'use strict';

// --- 定数定義 --- (グローバルスコープに定義)
window.DEFAULT_TIMEOUT = 15; // PDFタイムアウトデフォルト値（秒）
window.DEBUG_KEY = 'estimateAppDebugMode';
window.TIMEOUT_KEY = 'estimateAppPdfTimeout';
window.COMPANY_INFO_KEY = 'estimateAppCompanyInfo';

document.addEventListener('DOMContentLoaded', function() {
    // --- グローバル変数 ---
    window.pdfGenerationTimeout = null;
    window.pdfTimeoutValue = window.DEFAULT_TIMEOUT;
    window.pdfGenerationCancelled = false;
    window.currentTotalCost = 0; // 原価合計
    window.currentItems = []; // 明細データ
    window.companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
    window.storageAvailable = false;
    window.isDebugMode = false;

    // --- ストレージ関連の関数 ---
    window.checkStorage = function() {
        try {
            localStorage.setItem('__test_storage__', 'test');
            localStorage.removeItem('__test_storage__');
            window.storageAvailable = true;
            if (typeof window.debugLog === 'function') {
                window.debugLog('LocalStorage is available.', 'info');
            } else {
                console.log('[INFO] LocalStorage is available.');
            }
        } catch (e) {
            window.storageAvailable = false;
            if (window.storageWarning) window.storageWarning.classList.remove('hidden');
            console.warn('LocalStorage is not available.', e);
            if (typeof window.debugLog === 'function') {
                window.debugLog('LocalStorage is not available.', 'warn');
            }
        }
    };

    // 設定をロードする関数
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

        // デバッグログ出力
        if (typeof window.debugLog === 'function') {
            window.debugLog(`Settings loaded - Debug Mode: ${window.isDebugMode}, PDF Timeout: ${window.pdfTimeoutValue}s`, 'info');
        } else {
            console.log(`[INFO] Settings loaded - Debug Mode: ${window.isDebugMode}, PDF Timeout: ${window.pdfTimeoutValue}s`);
        }
    };

    // 会社情報をロードする関数
    window.loadCompanyInfo = function() {
        if (!window.storageAvailable) return;

        const savedInfo = localStorage.getItem(window.COMPANY_INFO_KEY);
        if (savedInfo) {
            try {
                const info = JSON.parse(savedInfo);
                window.companyInfo = Object.assign({}, window.companyInfo, info);
                
                // フォームに値をセット
                if (window.companySettingsForm) {
                    window.companySettingsForm.querySelector('#companyName').value = window.companyInfo.name || '';
                    window.companySettingsForm.querySelector('#companyPostal').value = window.companyInfo.postal || '';
                    window.companySettingsForm.querySelector('#companyAddress').value = window.companyInfo.address || '';
                    window.companySettingsForm.querySelector('#companyPhone').value = window.companyInfo.phone || '';
                    window.companySettingsForm.querySelector('#companyFax').value = window.companyInfo.fax || '';
                    
                    // ロゴとスタンプの画像を設定
                    if (window.companyInfo.logo && window.companyLogoPreview) {
                        window.companyLogoPreview.src = window.companyInfo.logo;
                        window.companyLogoPreview.style.display = 'block';
                        if (window.removeLogoBtn) window.removeLogoBtn.style.display = 'inline-block';
                    }
                    
                    if (window.companyInfo.stamp && window.companyStampPreview) {
                        window.companyStampPreview.src = window.companyInfo.stamp;
                        window.companyStampPreview.style.display = 'block';
                        if (window.removeStampBtn) window.removeStampBtn.style.display = 'inline-block';
                    }
                }
                
                if (typeof window.debugLog === 'function') {
                    window.debugLog('Company information loaded.', 'info');
                } else {
                    console.log('[INFO] Company information loaded.');
                }
            } catch (e) {
                console.error('Failed to parse company information.', e);
                if (typeof window.debugLog === 'function') {
                    window.debugLog('Failed to parse company information: ' + e.message, 'error');
                }
            }
        }
    };

    // 会社情報を保存する関数
    window.saveCompanyInfo = function() {
        if (!window.storageAvailable || !window.companySettingsForm) return;
        
        const form = window.companySettingsForm;
        window.companyInfo.name = form.querySelector('#companyName').value.trim();
        window.companyInfo.postal = form.querySelector('#companyPostal').value.trim();
        window.companyInfo.address = form.querySelector('#companyAddress').value.trim();
        window.companyInfo.phone = form.querySelector('#companyPhone').value.trim();
        window.companyInfo.fax = form.querySelector('#companyFax').value.trim();
        
        // ローカルストレージに保存
        localStorage.setItem(window.COMPANY_INFO_KEY, JSON.stringify(window.companyInfo));
        
        if (typeof window.debugLog === 'function') {
            window.debugLog('Company information saved.', 'info');
        } else {
            console.log('[INFO] Company information saved.');
        }
        
        // 成功メッセージを表示
        alert('会社情報を保存しました。');
    };

    // 画像アップロード処理
    window.handleImageUpload = function(input, preview, removeBtn) {
        if (!input.files || !input.files[0]) return;
        
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imageType = input.id === 'companyLogo' ? 'logo' : 'stamp';
            window.companyInfo[imageType] = e.target.result;
            preview.src = e.target.result;
            preview.style.display = 'block';
            removeBtn.style.display = 'inline-block';
            
            if (window.storageAvailable) {
                localStorage.setItem(window.COMPANY_INFO_KEY, JSON.stringify(window.companyInfo));
                if (typeof window.debugLog === 'function') {
                    window.debugLog(`Company ${imageType} updated.`, 'info');
                } else {
                    console.log(`[INFO] Company ${imageType} updated.`);
                }
            }
        };
        
        reader.readAsDataURL(file);
    };

    // 画像削除処理
    window.removeImage = function(preview, removeBtn, input, type) {
        preview.src = '';
        preview.style.display = 'none';
        removeBtn.style.display = 'none';
        input.value = '';
        
        window.companyInfo[type] = '';
        if (window.storageAvailable) {
            localStorage.setItem(window.COMPANY_INFO_KEY, JSON.stringify(window.companyInfo));
            if (typeof window.debugLog === 'function') {
                window.debugLog(`Company ${type} removed.`, 'info');
            } else {
                console.log(`[INFO] Company ${type} removed.`);
            }
        }
    };

    // 設定をクリアする関数
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
            if (window.debugPanel) window.debugPanel.style.display = 'none';
            if (window.debugModeCheckbox) window.debugModeCheckbox.checked = false;
            if (window.pdfTimeoutInput) window.pdfTimeoutInput.value = window.DEFAULT_TIMEOUT;
            
            // 会社情報フォームをクリア
            if (window.companySettingsForm) {
                window.companySettingsForm.reset();
                if (window.companyLogoPreview) {
                    window.companyLogoPreview.src = '';
                    window.companyLogoPreview.style.display = 'none';
                }
                if (window.removeLogoBtn) window.removeLogoBtn.style.display = 'none';
                if (window.companyStampPreview) {
                    window.companyStampPreview.src = '';
                    window.companyStampPreview.style.display = 'none';
                }
                if (window.removeStampBtn) window.removeStampBtn.style.display = 'none';
            }
            
            if (typeof window.debugLog === 'function') {
                window.debugLog('All settings cleared.', 'warn');
            } else {
                console.log('[WARN] All settings cleared.');
            }
            
            alert('設定を初期化しました。');
        }
    };
});
