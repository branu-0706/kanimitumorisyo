'use strict';

// --- 定数定義 ---
const DEFAULT_TIMEOUT = 15; // PDFタイムアウトデフォルト値（秒）
const DEBUG_KEY = 'estimateAppDebugMode';
const TIMEOUT_KEY = 'estimateAppPdfTimeout';
const COMPANY_INFO_KEY = 'estimateAppCompanyInfo';

// --- ストレージ関連の関数 ---
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

function loadSettings() {
    if (!storageAvailable) {
        isDebugMode = false;
        pdfTimeoutValue = DEFAULT_TIMEOUT;
        companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        return;
    }

    isDebugMode = localStorage.getItem(DEBUG_KEY) === 'true';
    const storedTimeout = localStorage.getItem(TIMEOUT_KEY);
    pdfTimeoutValue = storedTimeout ? parseInt(storedTimeout, 10) : DEFAULT_TIMEOUT;
    if (isNaN(pdfTimeoutValue) || pdfTimeoutValue < 5 || pdfTimeoutValue > 120) {
        pdfTimeoutValue = DEFAULT_TIMEOUT;
    }
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
            console.error('Failed to parse company info from localStorage', e);
            companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        }
    } else {
        companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
    }
    debugLog('Settings loaded from localStorage.', 'info');
}

function saveCompanyInfo() {
    companyInfo.name = document.getElementById('companyName').value.trim();
    companyInfo.postal = document.getElementById('companyPostal').value.trim();
    companyInfo.address = document.getElementById('companyAddress').value.trim();
    companyInfo.phone = document.getElementById('companyPhone').value.trim();
    companyInfo.fax = document.getElementById('companyFax').value.trim();
    companyInfo.logo = companyLogoPreview.classList.contains('hidden') ? '' : companyLogoPreview.src;
    companyInfo.stamp = companyStampPreview.classList.contains('hidden') ? '' : companyStampPreview.src;

    if (storageAvailable) {
        try {
            localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(companyInfo));
            alert('会社情報を保存しました。');
            debugLog('Company information saved.', 'info');
        } catch (e) {
            console.error('Failed to save company info to localStorage', e);
            alert('会社情報の保存に失敗しました。ブラウザのストレージ容量を確認してください。');
            debugLog('Failed to save company info: ' + e.message, 'error');
        }
    } else {
        alert('LocalStorageが利用できないため、設定は保存されませんでした。\nページを閉じると入力内容は失われます。');
        debugLog('Company info not saved because storage is unavailable.', 'warn');
    }
}

function loadCompanyInfo() {
    document.getElementById('companyName').value = companyInfo.name || '';
    document.getElementById('companyPostal').value = companyInfo.postal || '';
    document.getElementById('companyAddress').value = companyInfo.address || '';
    document.getElementById('companyPhone').value = companyInfo.phone || '';
    document.getElementById('companyFax').value = companyInfo.fax || '';

    [
        { infoKey: 'logo', preview: companyLogoPreview, removeBtn: removeLogoBtn },
        { infoKey: 'stamp', preview: companyStampPreview, removeBtn: removeStampBtn }
    ].forEach(({ infoKey, preview, removeBtn }) => {
        if (companyInfo[infoKey]) {
            preview.src = companyInfo[infoKey];
            preview.classList.remove('hidden');
            removeBtn.classList.remove('hidden');
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            removeBtn.classList.add('hidden');
        }
    });
    debugLog('Company info populated into the form.', 'info');
}

function clearAllSettings() {
    if (confirm('本当にすべての会社情報と設定をリセットしますか？\n保存されている情報が完全に削除され、元に戻すことはできません。')) {
        if (storageAvailable) {
            try {
                localStorage.removeItem(COMPANY_INFO_KEY);
                localStorage.removeItem(DEBUG_KEY);
                localStorage.removeItem(TIMEOUT_KEY);
                debugLog('All settings cleared from localStorage.', 'warn');
            } catch (e) {
                console.error('Failed to clear settings from localStorage', e);
                debugLog('Failed to clear settings: ' + e.message, 'error');
            }
        }
        companyInfo = { name: '', postal: '', address: '', phone: '', fax: '', logo: '', stamp: '' };
        isDebugMode = false;
        pdfTimeoutValue = DEFAULT_TIMEOUT;
        loadCompanyInfo();
        debugModeCheckbox.checked = isDebugMode;
        pdfTimeoutInput.value = pdfTimeoutValue;
        debugPanel.style.display = 'none';
        alert('設定をリセットしました。');
    }
}

function handleImageUpload(inputElement, previewElement, removeBtn) {
    const file = inputElement.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます (5MB以下にしてください)');
        inputElement.value = ''; return;
    }
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        alert('PNG, JPG, GIF形式の画像を選択してください。');
        inputElement.value = ''; return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        previewElement.src = e.target.result;
        previewElement.classList.remove('hidden');
        removeBtn.classList.remove('hidden');
    }
    reader.onerror = function(e) {
        console.error("File reading error:", e);
        alert('ファイルの読み込みに失敗しました。');
        inputElement.value = '';
    }
    reader.readAsDataURL(file);
}

function removeImage(previewElement, removeBtn, inputElement, infoKey) {
    previewElement.src = '';
    previewElement.classList.add('hidden');
    removeBtn.classList.add('hidden');
    inputElement.value = '';
    alert((infoKey === 'logo' ? 'ロゴ' : '印影') + '画像をプレビューから削除しました。「設定を保存」ボタンで変更を確定してください。');
}
