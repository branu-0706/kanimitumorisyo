/**
 * 自動見積作成システム - UI操作JavaScriptファイル
 * ユーザーインターフェースの操作や表示の更新を担当
 */
'use strict';

/**
 * UI操作関連の関数
 */

/**
 * タブの切り替え
 * @param {string} targetTabId - 切り替え先のタブID
 */
function switchTab(targetTabId) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    const activeTab = document.querySelector(`.tab[data-tab="${targetTabId}"]`);
    const activeContent = document.getElementById(targetTabId + 'Tab');
    
    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.add('active');
        window.app.debugLog(`タブを切り替えました: ${targetTabId}`, 'info');
        window.scrollTo(0, 0);
        
        if (targetTabId === 'preview' && document.getElementById('calculateBtn').dataset.calculated === 'true') {
            updatePreview();
        }
    } else {
        console.error(`タブまたはタブコンテンツが見つかりません: ${targetTabId}`);
        window.app.debugLog(`タブ切り替え失敗: ${targetTabId}のタブまたはコンテンツが見つかりません`, 'error');
    }
}

/**
 * 明細行の追加
 */
function addItemRow() {
    const itemTableBody = document.getElementById('itemTableBody');
    const rowCount = itemTableBody.rows.length;
    const row = itemTableBody.insertRow();
    
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td><input type="text" name="description[]" placeholder="商品/サービス名" required></td>
        <td><input type="number" name="quantity[]" value="1" min="1" step="0.01" required></td>
        <td>
            <select name="unit[]">
                <option value="式">式</option><option value="基">基</option><option value="組">組</option>
                <option value="枚">枚</option><option value="本">本</option><option value="個">個</option>
                <option value="台">台</option><option value="m">m</option><option value="m2">m2</option>
                <option value="m3">m3</option><option value="kg">kg</option><option value="t">t</option>
                <option value="箇所">箇所</option><option value="時間">時間</option><option value="日">日</option>
                <option value="ヶ月">ヶ月</option>
            </select>
        </td>
        <td><input type="number" name="cost[]" placeholder="原価" step="any" required></td>
        <td><input type="number" name="markupRate[]" value="1.0" step="0.01" required></td>
        <td><input type="text" name="amount[]" readonly></td>
        <td><button type="button" class="delete-btn">×</button></td>
    `;
    
    row.querySelector('.delete-btn').addEventListener('click', function() {
        if (itemTableBody.rows.length > 1) {
            row.remove();
            renumberRows();
            updateAmounts();
            updateDeleteButtons();
        }
    });
    
    row.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]')
       .forEach(input => input.addEventListener('input', updateAmounts));
    
    updateDeleteButtons();
    row.querySelector('input[name="description[]"]').focus();
    window.app.debugLog('明細行を追加しました', 'info');
}

/**
 * データ付きの明細行を追加（保存済み見積の読み込み用）
 * @param {Object} item - 明細データ
 */
function addItemRowWithData(item) {
    const itemTableBody = document.getElementById('itemTableBody');
    const rowCount = itemTableBody.rows.length;
    const row = itemTableBody.insertRow();
    
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td><input type="text" name="description[]" placeholder="商品/サービス名" required value="${escapeHTML(item.description)}"></td>
        <td><input type="number" name="quantity[]" value="${item.quantity}" min="1" step="0.01" required></td>
        <td>
            <select name="unit[]">
                <option value="式">式</option><option value="基">基</option><option value="組">組</option>
                <option value="枚">枚</option><option value="本">本</option><option value="個">個</option>
                <option value="台">台</option><option value="m">m</option><option value="m2">m2</option>
                <option value="m3">m3</option><option value="kg">kg</option><option value="t">t</option>
                <option value="箇所">箇所</option><option value="時間">時間</option><option value="日">日</option>
                <option value="ヶ月">ヶ月</option>
            </select>
        </td>
        <td><input type="number" name="cost[]" placeholder="原価" step="any" required value="${item.cost}"></td>
        <td><input type="number" name="markupRate[]" value="${item.markupRate}" step="0.01" required></td>
        <td><input type="text" name="amount[]" readonly value="${window.app.formatCurrency(item.amount)}"></td>
        <td><button type="button" class="delete-btn">×</button></td>
    `;
    
    // unitの選択値を設定
    row.querySelector('select[name="unit[]"]').value = item.unit;
    
    row.querySelector('.delete-btn').addEventListener('click', function() {
        if (itemTableBody.rows.length > 1) {
            row.remove();
            renumberRows();
            updateAmounts();
            updateDeleteButtons();
        }
    });
    
    row.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]')
       .forEach(input => input.addEventListener('input', updateAmounts));
    
    updateDeleteButtons();
}

/**
 * 行番号の振り直し
 */
function renumberRows() {
    const rows = document.getElementById('itemTableBody').rows;
    for (let i = 0; i < rows.length; i++) {
        rows[i].cells[0].textContent = i + 1;
    }
}

/**
 * 削除ボタンの状態更新
 */
function updateDeleteButtons() {
    const rows = document.getElementById('itemTableBody').rows;
    const canDelete = rows.length > 1;
    rows.forEach(row => {
        const btn = row.querySelector('.delete-btn');
        if (btn) btn.disabled = !canDelete;
    });
}

/**
 * 金額の更新計算
 */
function updateAmounts() {
    const rows = document.getElementById('itemTableBody').rows;
    let subtotal = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const qtyInput = rows[i].querySelector('input[name="quantity[]"]');
        const costInput = rows[i].querySelector('input[name="cost[]"]');
        const markupRateInput = rows[i].querySelector('input[name="markupRate[]"]');
        const amountInput = rows[i].querySelector('input[name="amount[]"]');
        
        const qty = parseFloat(qtyInput.value) || 0;
        const cost = parseFloat(costInput.value) || 0;
        const markupRate = parseFloat(markupRateInput.value) || 0;
        
        const amount = qty * cost * markupRate;
        
        amountInput.value = window.app.formatCurrency(amount);
        subtotal += amount;
    }
    
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = window.app.formatCurrency(Math.round(subtotal));
    document.getElementById('tax').textContent = window.app.formatCurrency(Math.round(tax));
    document.getElementById('total').textContent = window.app.formatCurrency(Math.round(total));
}

/**
 * フォームのバリデーション
 * @returns {boolean} - 検証結果（有効な場合はtrue）
 */
function validateForm() {
    const client = document.getElementById('client').value.trim();
    const project = document.getElementById('project').value.trim();
    
    if (!client) { 
        alert('見積提出先を入力してください'); 
        document.getElementById('client').focus(); 
        return false; 
    }
    
    if (!project) { 
        alert('件名を入力してください'); 
        document.getElementById('project').focus(); 
        return false; 
    }
    
    const rows = document.getElementById('itemTableBody').rows;
    if (rows.length === 0) { 
        alert('明細行を1行以上入力してください'); 
        return false;
    }
    
    for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 1;
        const descriptionInput = rows[i].querySelector('input[name="description[]"]');
        const quantityInput = rows[i].querySelector('input[name="quantity[]"]');
        const costInput = rows[i].querySelector('input[name="cost[]"]');
        const markupRateInput = rows[i].querySelector('input[name="markupRate[]"]');
        
        const description = descriptionInput.value.trim();
        const quantity = quantityInput.value;
        const cost = costInput.value;
        const markupRate = markupRateInput.value;
        
        if (!description) { 
            alert(`${rowNum}行目の摘要を入力してください`); 
            descriptionInput.focus(); 
            return false; 
        }
        
        if (quantity === '' || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
            alert(`${rowNum}行目の数量を正しく入力してください (0より大きい数値)`); 
            quantityInput.focus(); 
            return false;
        }
        
        if (cost === '' || isNaN(parseFloat(cost))) {
            alert(`${rowNum}行目の原価を数値で入力してください`); 
            costInput.focus(); 
            return false;
        }
        
        if (markupRate === '' || isNaN(parseFloat(markupRate))) {
            alert(`${rowNum}行目の掛け率を数値で入力してください`); 
            markupRateInput.focus(); 
            return false;
        }
        
        if (parseFloat(markupRate) <= 0 && cost !== '0' && parseFloat(cost) !== 0) {
            if (!confirm(`${rowNum}行目の掛け率が0以下です。この明細の金額が0またはマイナスになりますが、よろしいですか？`)) {
                markupRateInput.focus(); 
                return false;
            }
        }
        
        if (parseFloat(cost) < 0) {
            if (!confirm(`${rowNum}行目の原価がマイナスです。よろしいですか？`)) {
                costInput.focus(); 
                return false;
            }
        }
    }
    
    return true;
}

/**
 * 画像アップロードの処理
 * @param {HTMLElement} inputElement - ファイル入力要素
 * @param {HTMLElement} previewElement - プレビュー表示要素
 * @param {HTMLElement} removeBtn - 削除ボタン要素
 */
function handleImageUpload(inputElement, previewElement, removeBtn) {
    const file = inputElement.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます (5MB以下にしてください)');
        inputElement.value = ''; 
        return;
    }
    
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        alert('PNG, JPG, GIF形式の画像を選択してください。');
        inputElement.value = ''; 
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        previewElement.src = e.target.result;
        previewElement.classList.remove('hidden');
        removeBtn.classList.remove('hidden');
    };
    
    reader.onerror = function(e) {
        console.error("ファイル読み込みエラー:", e);
        alert('ファイルの読み込みに失敗しました。');
        inputElement.value = '';
    };
    
    reader.readAsDataURL(file);
}

/**
 * 画像の削除
 * @param {HTMLElement} previewElement - プレビュー表示要素
 * @param {HTMLElement} removeBtn - 削除ボタン要素
 * @param {HTMLElement} inputElement - ファイル入力要素
 * @param {string} infoKey - 情報キー（'logo'または'stamp'）
 */
function removeImage(previewElement, removeBtn, inputElement, infoKey) {
    previewElement.src = '';
    previewElement.classList.add('hidden');
    removeBtn.classList.add('hidden');
    inputElement.value = '';
    alert((infoKey === 'logo' ? 'ロゴ' : '印影') + '画像をプレビューから削除しました。「設定を保存」ボタンで変更を確定してください。');
}

/**
 * ローディングスピナーの表示
 * @param {string} message - 表示するメッセージ
 */
function showLoadingSpinner(message = '処理中...') {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const loadingSpinnerText = loadingSpinner.querySelector('.spinner-text');
    const spinnerActions = document.getElementById('spinnerActions');
    
    loadingSpinnerText.textContent = message;
    loadingSpinner.style.display = 'flex';
    spinnerActions.style.display = 'none';
    document.getElementById('cancelPdfBtn').textContent = 'キャンセル';
    document.getElementById('alternativePdfBtn').style.display = 'none';
    setupLoadingTimeout();
}

/**
 * ローディングスピナーの非表示
 */
function hideLoadingSpinner() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const spinnerActions = document.getElementById('spinnerActions');
    
    loadingSpinner.style.display = 'none';
    spinnerActions.style.display = 'none';
    
    if (window.pdfGenerationTimeout) { 
        clearTimeout(window.pdfGenerationTimeout); 
        window.pdfGenerationTimeout = null; 
    }
}

/**
 * ローディングタイムアウトの設定
 */
function setupLoadingTimeout() {
    if (window.pdfGenerationTimeout) clearTimeout(window.pdfGenerationTimeout);
    
    const actionTimer = setTimeout(() => {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const spinnerActions = document.getElementById('spinnerActions');
        
        if (loadingSpinner.style.display === 'flex' && !window.pdfGenerationCancelled) {
            spinnerActions.style.display = 'flex';
            document.getElementById('alternativePdfBtn').style.display = 'inline-block';
            window.app.debugLog('処理に8秒以上かかっています', 'warn');
        }
    }, 8000);
    
    window.pdfGenerationTimeout = setTimeout(() => {
        clearTimeout(actionTimer);
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        if (loadingSpinner.style.display === 'flex' && !window.pdfGenerationCancelled) {
            hideLoadingSpinner();
            alert(`処理がタイムアウトしました (${window.app.pdfTimeoutValue}秒)。\nネットワーク接続を確認するか、設定でタイムアウト時間を延長してください。\n問題が解決しない場合は、ブラウザの印刷機能をお試しください。`);
            window.app.debugLog('処理がタイムアウトしました', 'error');
        }
    }, window.app.pdfTimeoutValue * 1000);
}

/**
 * HTMLエスケープ
 * @param {string} text - エスケープするテキスト
 * @returns {string} - エスケープされたテキスト
 */
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * プレビューの更新
 */
function updatePreview() {
    const calculateBtn = document.getElementById('calculateBtn');
    const previewContainer = document.getElementById('previewContainer');
    const previewButtons = document.getElementById('previewButtons');
    
    if (!calculateBtn.dataset.calculated) {
        previewContainer.innerHTML = '<p>見積入力タブで情報を入力し、「見積を計算する」ボタンをクリックしてください。</p>';
        previewButtons.classList.add('hidden');
        return;
    }
    
    try {
        previewContainer.innerHTML = generateEstimateHTML();
        previewButtons.classList.remove('hidden');
        window.app.debugLog('プレビューを更新しました', 'info');
    } catch (e) {
        previewContainer.innerHTML = `<div class="alert alert-danger">プレビューの生成中にエラーが発生しました: ${e.message}</div>`;
        previewButtons.classList.add('hidden');
        window.app.debugLog('プレビュー生成エラー: ' + e.message, 'error');
    }
}

/**
 * UI関連のイベントリスナー設定
 */
function setupUIEventListeners() {
    // タブ切り替え
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // 明細行の追加ボタン
    document.getElementById('addRowBtn').addEventListener('click', addItemRow);
    
    // プレビューボタン
    document.getElementById('previewBtn').addEventListener('click', () => switchTab('preview'));
    
    // 印刷ボタン
    document.getElementById('printBtn').addEventListener('click', printEstimate);
    document.getElementById('previewPrintBtn').addEventListener('click', printEstimate);
    
    // ロゴ処理
    const companyLogoInput = document.getElementById('companyLogo');
    const companyLogoPreview = document.getElementById('companyLogoPreview');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    
    companyLogoInput.addEventListener('change', () => 
        handleImageUpload(companyLogoInput, companyLogoPreview, removeLogoBtn)
    );
    
    removeLogoBtn.addEventListener('click', () => 
        removeImage(companyLogoPreview, removeLogoBtn, companyLogoInput, 'logo')
    );
    
    // 印影処理
    const companyStampInput = document.getElementById('companyStamp');
    const companyStampPreview = document.getElementById('companyStampPreview');
    const removeStampBtn = document.getElementById('removeStampBtn');
    
    companyStampInput.addEventListener('change', () => 
        handleImageUpload(companyStampInput, companyStampPreview, removeStampBtn)
    );
    
    removeStampBtn.addEventListener('click', () => 
        removeImage(companyStampPreview, removeStampBtn, companyStampInput, 'stamp')
    );
    
    // PDFキャンセルボタン
    document.getElementById('cancelPdfBtn').addEventListener('click', function() {
        if (this.textContent === '閉じる') { 
            hideLoadingSpinner(); 
        } else { 
            window.pdfGenerationCancelled = true; 
            hideLoadingSpinner(); 
            window.app.debugLog('PDF生成がキャンセルされました', 'warn'); 
        }
    });
    
    // 代替手段ボタン
    document.getElementById('alternativePdfBtn').addEventListener('click', function() { 
        hideLoadingSpinner(); 
        printEstimate(); 
        window.app.debugLog('代替手段（印刷）が選択されました', 'info'); 
    });
    
    // 見積計算フォームの送信
    document.getElementById('estimateForm').addEventListener('submit', function(e) { 
        e.preventDefault(); 
        if (validateForm()) {
            calculateEstimate();
        }
    });
    
    // 会社設定フォームの送信
    document.getElementById('companySettingsForm').addEventListener('submit', function(e) { 
        e.preventDefault(); 
        window.app.saveCompanyInfo(); 
    });
    
    // 明細行の入力フィールドに変更リスナーを追加
    document.getElementById('itemTableBody').querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]')
        .forEach(input => input.addEventListener('input', updateAmounts));
}

// DOMContentLoaded イベントリスナー
document.addEventListener('DOMContentLoaded', setupUIEventListeners);

// グローバル関数のエクスポート（他のjsファイルから利用可能に）
window.ui = {
    // UI操作
    switchTab,
    showLoadingSpinner,
    hideLoadingSpinner,
    updatePreview,
    
    // 明細行操作
    addItemRow,
    addItemRowWithData,
    updateDeleteButtons,
    updateAmounts,
    
    // バリデーション
    validateForm,
    
    // ユーティリティ
    escapeHTML
};
