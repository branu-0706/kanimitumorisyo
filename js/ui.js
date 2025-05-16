'use strict';

console.log('ui.js loading...');

// --- タブ切り替え関数 ---
window.switchTab = function(tabId) {
    console.log(`Switching to tab: ${tabId}`);
    
    // タブとコンテンツを取得
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (!tabs || !tabContents) {
        console.error("Tab elements not found");
        return;
    }
    
    // アクティブクラスを削除
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // 選択されたタブとコンテンツをアクティブにする
    const selectedTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(`${tabId}Tab`);
    
    if (selectedTab) {
        selectedTab.classList.add('active');
    } else {
        console.error(`Tab with data-tab="${tabId}" not found`);
    }
    
    if (selectedContent) {
        selectedContent.classList.add('active');
        
        // プレビュータブが選択された場合、見積書プレビューを生成
        if (tabId === 'preview' && typeof window.generatePreview === 'function') {
            window.generatePreview();
        }
    } else {
        console.error(`Tab content with id="${tabId}Tab" not found`);
    }
    
    if (typeof window.debugLog === 'function') {
        window.debugLog(`Tab switched to ${tabId}`, 'info');
    }
};

// --- 明細行追加関数 ---
window.addItemRow = function() {
    const itemTableBody = document.getElementById('itemTableBody');
    if (!itemTableBody) {
        console.error("itemTableBody element not found");
        return;
    }
    
    // 新しい行の作成
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" name="description[]" placeholder="摘要"></td>
        <td><input type="number" name="quantity[]" min="0" step="0.01" value="1"></td>
        <td>
            <select name="unit[]">
                <option value="式">式</option>
                <option value="個">個</option>
                <option value="時間">時間</option>
                <option value="日">日</option>
                <option value="本">本</option>
                <option value="ヶ月">ヶ月</option>
            </select>
        </td>
        <td><input type="number" name="cost[]" min="0" step="1" value="0"></td>
        <td><input type="number" name="markupRate[]" min="0" step="0.01" value="1"></td>
        <td><input type="text" name="amount[]" readonly></td>
        <td><button type="button" class="delete-row-btn">×</button></td>
    `;
    
    // 行を追加
    itemTableBody.appendChild(newRow);
    
    // 削除ボタンのイベントリスナーを追加
    const deleteBtn = newRow.querySelector('.delete-row-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            if (typeof window.deleteItemRow === 'function') {
                window.deleteItemRow(this);
            } else {
                // フォールバック実装
                const row = this.closest('tr');
                if (row && row.parentNode) {
                    row.parentNode.removeChild(row);
                    if (typeof window.updateAmounts === 'function') {
                        window.updateAmounts();
                    }
                    if (typeof window.updateDeleteButtons === 'function') {
                        window.updateDeleteButtons();
                    }
                }
            }
        });
    }
    
    // 入力イベントリスナーの設定
    const inputs = newRow.querySelectorAll('input[name="quantity[]"], input[name="cost[]"], input[name="markupRate[]"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (typeof window.updateAmounts === 'function') {
                window.updateAmounts();
            }
        });
        
        input.addEventListener('change', function() {
            if (typeof window.updateAmounts === 'function') {
                window.updateAmounts();
            }
        });
    });
    
    // フォーカスを新しい行の摘要欄に設定
    const descInput = newRow.querySelector('input[name="description[]"]');
    if (descInput) {
        descInput.focus();
    }
    
    // 削除ボタンの表示状態を更新
    if (typeof window.updateDeleteButtons === 'function') {
        window.updateDeleteButtons();
    }
    
    // 金額の再計算
    if (typeof window.updateAmounts === 'function') {
        window.updateAmounts();
    }
    
    if (typeof window.debugLog === 'function') {
        window.debugLog('Item row added', 'info');
    }
};

// --- 明細行削除関数 ---
window.deleteItemRow = function(button) {
    const row = button.closest('tr');
    if (!row || !row.parentNode) {
        console.error("Row element not found");
        return;
    }
    
    // 行を削除
    row.parentNode.removeChild(row);
    
    // 金額の再計算
    if (typeof window.updateAmounts === 'function') {
        window.updateAmounts();
    }
    
    // 削除ボタンの表示状態を更新
    if (typeof window.updateDeleteButtons === 'function') {
        window.updateDeleteButtons();
    }
    
    if (typeof window.debugLog === 'function') {
        window.debugLog('Item row deleted', 'info');
    }
};

// --- 削除ボタンの状態更新関数 ---
window.updateDeleteButtons = function() {
    const itemTableBody = document.getElementById('itemTableBody');
    if (!itemTableBody) {
        console.error("itemTableBody element not found");
        return;
    }
    
    const rows = itemTableBody.rows;
    const deleteButtons = itemTableBody.querySelectorAll('.delete-row-btn');
    
    // 行が1つだけなら削除ボタンを非表示にする（最低1行は必要）
    if (rows.length <= 1) {
        deleteButtons.forEach(btn => btn.style.display = 'none');
    } else {
        deleteButtons.forEach(btn => btn.style.display = 'inline-block');
    }
};

// --- 見積書プレビュー生成関数 ---
window.generatePreview = function() {
    const pdfEstimateSheet = document.getElementById('pdfEstimateSheet');
    if (!pdfEstimateSheet) {
        console.error("pdfEstimateSheet element not found");
        return;
    }
    
    // フォームから基本情報を取得
    const estimateNumber = document.getElementById('estimateNumber');
    const estimateDate = document.getElementById('estimateDate');
    const client = document.getElementById('client');
    const project = document.getElementById('project');
    
    if (!estimateNumber || !estimateDate || !client || !project) {
        console.error("Required form elements not found");
        return;
    }
    
    // 基本情報の値を取得
    const estimateNumberValue = estimateNumber.value || 'N/A';
    let estimateDateValue = '';
    if (estimateDate.value) {
        if (typeof window.formatDateJP === 'function') {
            estimateDateValue = window.formatDateJP(estimateDate.value);
        } else {
            estimateDateValue = new Date(estimateDate.value).toLocaleDateString('ja-JP');
        }
    }
    const clientValue = client.value || 'N/A';
    const projectValue = project.value || 'N/A';
    
    // 会社情報
    const companyName = window.companyInfo ? window.companyInfo.name || '' : '';
    const companyPostal = window.companyInfo ? window.companyInfo.postal || '' : '';
    const companyAddress = window.companyInfo ? window.companyInfo.address || '' : '';
    const companyPhone = window.companyInfo ? window.companyInfo.phone || '' : '';
    const companyFax = window.companyInfo ? window.companyInfo.fax || '' : '';
    const companyLogo = window.companyInfo ? window.companyInfo.logo || '' : '';
    const companyStamp = window.companyInfo ? window.companyInfo.stamp || '' : '';
    
    // 見積書HTML構築
    let html = `
        <div class="estimate-header">
            <div class="doc-title">御見積書</div>
            <div class="doc-info">
                <div>No. ${estimateNumberValue}</div>
                <div>見積日: ${estimateDateValue}</div>
            </div>
        </div>
        
        <div class="client-info">
            <div class="client-name">${clientValue} 御中</div>
            <div class="project">${projectValue}</div>
        </div>
        
        <div class="company-info">
            <div class="company-details">
                ${companyName ? `<div class="company-name">${companyName}</div>` : ''}
                ${companyPostal ? `<div>${companyPostal}</div>` : ''}
                ${companyAddress ? `<div>${companyAddress}</div>` : ''}
                ${companyPhone ? `<div>TEL: ${companyPhone}</div>` : ''}
                ${companyFax ? `<div>FAX: ${companyFax}</div>` : ''}
            </div>
            <div class="company-stamp">
                ${companyStamp ? `<img src="${companyStamp}" alt="社印" class="stamp-image">` : ''}
            </div>
            <div class="company-logo">
                ${companyLogo ? `<img src="${companyLogo}" alt="会社ロゴ" class="logo-image">` : ''}
            </div>
        </div>
        
        <table class="estimate-table">
            <thead>
                <tr>
                    <th class="item-no">No.</th>
                    <th class="item-desc">摘要</th>
                    <th class="item-quantity">数量</th>
                    <th class="item-unit">単位</th>
                    <th class="item-price">単価</th>
                    <th class="item-amount">金額</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // 明細行を追加
    if (window.currentItems && window.currentItems.length > 0) {
        window.currentItems.forEach(item => {
            const price = item.cost * item.markupRate;
            html += `
                <tr>
                    <td class="item-no">${item.no}</td>
                    <td class="item-desc">${item.description}</td>
                    <td class="item-quantity">${item.quantity}</td>
                    <td class="item-unit">${item.unit}</td>
                    <td class="item-price">${typeof window.formatCurrency === 'function' ? window.formatCurrency(price) : price.toLocaleString()}</td>
                    <td class="item-amount">${typeof window.formatCurrency === 'function' ? window.formatCurrency(item.amount) : item.amount.toLocaleString()}</td>
                </tr>
            `;
        });
    } else {
        // 明細データがない場合
        html += `
            <tr>
                <td colspan="6" class="no-data">明細データがありません。「計算する」ボタンを押して明細を生成してください。</td>
            </tr>
        `;
    }
    
    // 合計行
    const resultSubtotal = document.getElementById('resultSubtotal');
    const resultTotal = document.getElementById('resultTotal');
    const subtotalValue = resultSubtotal ? resultSubtotal.textContent : '¥0';
    const totalValue = resultTotal ? resultTotal.textContent : '¥0';
    
    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" rowspan="2"></td>
                    <td>小計</td>
                    <td>${subtotalValue}</td>
                </tr>
                <tr>
                    <td>消費税</td>
                    <td>10%</td>
                </tr>
                <tr>
                    <td colspan="4"></td>
                    <td>合計</td>
                    <td class="total-amount">${totalValue}</td>
                </tr>
            </tfoot>
        </table>
        
        <div class="estimate-notes">
            <h4>備考</h4>
            <div class="note-items">
                <div>・有効期限: 発行日より1ヶ月</div>
                <div>・お支払い条件: 検収月の翌月末日までにお振込みください</div>
            </div>
        </div>
    `;
    
    // HTMLをプレビュー領域に設定
    pdfEstimateSheet.innerHTML = html;
    
    if (typeof window.debugLog === 'function') {
        window.debugLog('Preview generated', 'info');
    }
};

// --- ローディングスピナー表示/非表示関数 ---
window.showLoadingSpinner = function(message = 'PDFを生成中...') {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const loadingSpinnerText = document.querySelector('#loadingSpinner .spinner-text');
    const cancelPdfBtn = document.getElementById('cancelPdfBtn');
    
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
    
    if (loadingSpinnerText) {
        loadingSpinnerText.textContent = message;
    }
    
    if (cancelPdfBtn) {
        cancelPdfBtn.textContent = 'キャンセル';
    }
    
    window.pdfGenerationCancelled = false;
    
    if (typeof window.debugLog === 'function') {
        window.debugLog('Loading spinner shown: ' + message, 'info');
    }
};

window.hideLoadingSpinner = function() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
    
    if (window.pdfGenerationTimeout) {
        clearTimeout(window.pdfGenerationTimeout);
        window.pdfGenerationTimeout = null;
    }
    
    if (typeof window.debugLog === 'function') {
        window.debugLog('Loading spinner hidden', 'info');
    }
};

window.showLoadingError = function(message = 'PDF生成中にエラーが発生しました。') {
    const loadingSpinnerText = document.querySelector('#loadingSpinner .spinner-text');
    const cancelPdfBtn = document.getElementById('cancelPdfBtn');
    const alternativePdfBtn = document.getElementById('alternativePdfBtn');
    
    if (loadingSpinnerText) {
        loadingSpinnerText.textContent = message;
        loadingSpinnerText.classList.add('error');
    }
    
    if (cancelPdfBtn) {
        cancelPdfBtn.textContent = '閉じる';
    }
    
    if (alternativePdfBtn) {
        alternativePdfBtn.style.display = 'inline-block';
    }
    
    if (typeof window.debugLog === 'function') {
        window.debugLog('Loading error shown: ' + message, 'error');
    }
};

console.log('ui.js loaded successfully!');
