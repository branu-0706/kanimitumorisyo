/**
 * 自動見積作成システム - 計算ロジックJavaScriptファイル
 * 見積金額、消費税、粗利率などの計算処理を担当
 */
'use strict';

/**
 * 見積計算の実行
 * フォームから明細データを収集し、合計金額と粗利率を計算
 */
function calculateEstimate() {
    window.currentItems = [];
    const rows = document.getElementById('itemTableBody').rows;
    let totalCostSum = 0;
    let estimateSubtotal = 0;
    
    // 各明細行のデータ収集と計算
    for (let i = 0; i < rows.length; i++) {
        const description = rows[i].querySelector('input[name="description[]"]').value.trim();
        const quantity = parseFloat(rows[i].querySelector('input[name="quantity[]"]').value) || 0;
        const unit = rows[i].querySelector('select[name="unit[]"]').value;
        const cost = parseFloat(rows[i].querySelector('input[name="cost[]"]').value) || 0;
        const markupRate = parseFloat(rows[i].querySelector('input[name="markupRate[]"]').value) || 0;
        
        const itemAmount = quantity * cost * markupRate;
        const itemCostSum = quantity * cost;
        
        window.currentItems.push({ 
            no: i + 1, 
            description, 
            quantity, 
            unit, 
            cost, 
            markupRate, 
            amount: itemAmount 
        });
        totalCostSum += itemCostSum;
        estimateSubtotal += itemAmount;
    }
    
    window.currentTotalCost = totalCostSum;
    
    const tax = estimateSubtotal * 0.1;
    const total = estimateSubtotal + tax;
    
    // 粗利率の計算
    let grossMarginPercent = 0;
    if (estimateSubtotal !== 0) {
        grossMarginPercent = ((estimateSubtotal - totalCostSum) / Math.abs(estimateSubtotal)) * 100;
    } else if (totalCostSum === 0) {
        grossMarginPercent = 0;
    } else {
        grossMarginPercent = NaN;
    }
    
    // 結果の表示
    document.getElementById('resultSubtotal').textContent = window.app.formatCurrency(Math.round(estimateSubtotal));
    document.getElementById('resultTotal').textContent = window.app.formatCurrency(Math.round(total));
    document.getElementById('resultTotalCost').textContent = window.app.formatCurrency(Math.round(totalCostSum));
    
    const grossMarginElement = document.getElementById('resultGrossMarginPercent');
    if (isNaN(grossMarginPercent)) {
        grossMarginElement.textContent = '---';
    } else if (!isFinite(grossMarginPercent)) {
        grossMarginElement.textContent = (grossMarginPercent > 0 ? '+' : '-') + '∞ %';
    } else {
        grossMarginElement.textContent = `${grossMarginPercent.toFixed(1)}%`;
    }
    
    window.app.debugLog(`見積を計算しました。原価合計: ${totalCostSum}, 見積小計: ${estimateSubtotal}, 粗利率: ${isNaN(grossMarginPercent) ? 'N/A' : grossMarginPercent.toFixed(1)}%`, 'info');
    
    // 結果エリアの表示とスクロール
    document.getElementById('estimateResult').classList.remove('hidden');
    document.getElementById('estimateResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('calculateBtn').dataset.calculated = 'true';
}

/**
 * 見積書HTMLの生成
 * @returns {string} - 見積書のHTML
 */
function generateEstimateHTML() {
    try {
        // 基本情報の取得
        const client = document.getElementById('client').value;
        const project = document.getElementById('project').value;
        let estimateNumber = document.getElementById('estimateNumber').value.trim();
        
        if (!estimateNumber) {
            estimateNumber = window.app.generateEstimateNumber();
            document.getElementById('estimateNumber').value = estimateNumber;
        }
        
        const estimateDate = document.getElementById('estimateDate').value;
        const formattedDate = window.app.formatDate(estimateDate);
        
        // 有効期限の計算
        const expiryDays = parseInt(document.getElementById('expiryDays').value) || 30;
        let formattedExpiryDate = '';
        if (estimateDate) {
            const expiryDate = new Date(estimateDate);
            if (!isNaN(expiryDate.getTime())) {
                expiryDate.setDate(expiryDate.getDate() + expiryDays);
                formattedExpiryDate = window.app.formatDate(expiryDate.toISOString().split('T')[0]);
            }
        }
        
        // 備考の処理
        const notes = document.getElementById('notes').value;
        const noteItems = notes.split('\n').filter(note => note.trim() !== '');
        
        // 金額計算
        let estimateSubtotal = 0;
        window.currentItems.forEach(item => { estimateSubtotal += item.amount; });
        const roundedSubtotal = Math.round(estimateSubtotal);
        const tax = Math.round(roundedSubtotal * 0.1);
        const total = roundedSubtotal + tax;
        
        // 明細行のHTML生成
        let itemsHTML = '';
        window.currentItems.forEach(item => {
            const displayPrice = (item.cost || 0) * (item.markupRate || 0);
            itemsHTML += `
                <tr>
                    <td style="text-align: center;">${item.no}</td>
                    <td class="long-text">${window.ui.escapeHTML(item.description)}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: center;">${item.unit}</td>
                    <td style="text-align: right;">${window.app.formatCurrency(displayPrice, false)}</td>
                    <td style="text-align: right;">${window.app.formatCurrency(Math.round(item.amount), false)}</td>
                </tr>
            `;
        });
        
        // 備考欄のHTML生成
        let notesHTML = '';
        if (noteItems.length > 0) {
            notesHTML = `<div class="estimate-notes">
                <div class="notes-title">備考</div>
                ${noteItems.map(note => `<div class="note-item">${note.startsWith('※') ? window.ui.escapeHTML(note) : '※ ' + window.ui.escapeHTML(note)}</div>`).join('')}
            </div>`;
        }
        
        // 会社情報
        const companyInfoHTML = window.app.companyInfo.name ? 
            `<div class="company-info">
                ${window.app.companyInfo.name ? `<div>${window.ui.escapeHTML(window.app.companyInfo.name)}</div>` : ''}
                ${window.app.companyInfo.postal ? `<div>〒${window.ui.escapeHTML(window.app.companyInfo.postal)}</div>` : ''}
                ${window.app.companyInfo.address ? `<div>${window.ui.escapeHTML(window.app.companyInfo.address)}</div>` : ''}
                ${window.app.companyInfo.phone ? `<div>TEL: ${window.ui.escapeHTML(window.app.companyInfo.phone)}</div>` : ''}
                ${window.app.companyInfo.fax ? `<div>FAX: ${window.ui.escapeHTML(window.app.companyInfo.fax)}</div>` : ''}
                ${window.app.companyInfo.stamp ? `<img src="${window.app.companyInfo.stamp}" class="company-stamp" alt="印影" style="position: absolute; top: -15px; right: -5px;">` : ''}
            </div>` : '';
        
        // 完全な見積書HTML
        const html = `
            <div class="estimate-sheet">
                <div class="estimate-header">
                    <div class="estimate-title">御見積書</div>
                    <div class="client-info"><div class="client-name">${window.ui.escapeHTML(client)} 御中</div></div>
                    ${companyInfoHTML}
                </div>
                <div style="margin-bottom: 10px;">下記の通り御見積もり申し上げます。</div>
                <div class="estimate-info">
                    <table style="width: 100%;"><tr><td style="width: 15%;">件名</td><td style="width: 85%;">${window.ui.escapeHTML(project)}</td></tr></table>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div style="flex: 1;"></div>
                    <div style="width: 220px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 3px 0;">見積日</td><td style="padding: 3px 0;">${formattedDate}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 3px 0;">見積番号</td><td style="padding: 3px 0;">${estimateNumber}</td></tr>
                            <tr><td style="padding: 3px 0;">有効期限</td><td style="padding: 3px 0;">${formattedExpiryDate}</td></tr>
                        </table>
                    </div>
                </div>
                <div class="estimate-amount">見積金額 ${window.app.formatCurrency(total)}</div>
                <table class="estimate-detail">
                    <thead><tr>
                        <th style="width: 5%;">No.</th>
                        <th style="width: 45%;">摘要</th>
                        <th style="width: 10%;">数量</th>
                        <th style="width: 10%;">単位</th>
                        <th style="width: 15%;">単価</th>
                        <th style="width: 15%;">金額</th>
                    </tr></thead>
                    <tbody>${itemsHTML}</tbody>
                </table>
                <div style="width: 100%; display: flex; justify-content: flex-end;">
                    <table class="estimate-totals">
                        <tr><td>小計</td><td>${window.app.formatCurrency(roundedSubtotal)}</td></tr>
                        <tr><td>消費税</td><td>${window.app.formatCurrency(tax)}</td></tr>
                        <tr><td>合計</td><td>${window.app.formatCurrency(total)}</td></tr>
                    </table>
                </div>
                ${notesHTML}
            </div>`;
        
        return html;
    } catch (e) {
        window.app.debugLog('見積書HTML生成エラー: ' + e.message, 'error');
        console.error('見積書HTML生成エラー:', e);
        return `<div class="alert alert-danger">見積書HTMLの生成中にエラーが発生しました: ${e.message}</div>`;
    }
}

/**
 * 税率の計算
 * @param {number} amount - 税抜金額
 * @param {number} rate - 税率 (0.1 = 10%)
 * @returns {number} - 税額
 */
function calculateTax(amount, rate = 0.1) {
    if (typeof amount !== 'number' || !isFinite(amount)) {
        return 0;
    }
    return Math.round(amount * rate);
}

/**
 * 粗利率の計算
 * @param {number} salePrice - 販売価格
 * @param {number} cost - 原価
 * @returns {number} - 粗利率（%）
 */
function calculateGrossMarginPercent(salePrice, cost) {
    if (typeof salePrice !== 'number' || typeof cost !== 'number' || !isFinite(salePrice) || !isFinite(cost)) {
        return NaN;
    }
    
    if (salePrice === 0) {
        return cost === 0 ? 0 : (cost > 0 ? -Infinity : Infinity);
    }
    
    const grossMargin = salePrice - cost;
    return (grossMargin / Math.abs(salePrice)) * 100;
}

/**
 * 金額の検証
 * @param {number} amount - 検証する金額
 * @returns {Object} - 検証結果と調整値
 */
function validateAmount(amount) {
    if (typeof amount !== 'number') {
        return { valid: false, value: 0 };
    }
    
    if (!isFinite(amount)) {
        return { valid: false, value: 0 };
    }
    
    if (Math.abs(amount) > 999999999) { // 10億円未満に制限
        return { 
            valid: false, 
            value: Math.sign(amount) * 999999999,
            message: '金額が大きすぎます (999,999,999円以下にしてください)'
        };
    }
    
    return { valid: true, value: amount };
}

/**
 * 複数明細の合計計算
 * @param {Array} items - 明細配列
 * @returns {Object} - 計算結果
 */
function calculateTotals(items) {
    if (!Array.isArray(items)) {
        return { subtotal: 0, tax: 0, total: 0, totalCost: 0, grossMargin: 0 };
    }
    
    let subtotal = 0;
    let totalCost = 0;
    
    items.forEach(item => {
        const itemAmount = (item.quantity || 0) * (item.cost || 0) * (item.markupRate || 0);
        const itemCost = (item.quantity || 0) * (item.cost || 0);
        
        subtotal += itemAmount;
        totalCost += itemCost;
    });
    
    // 金額を整数に丸める
    const roundedSubtotal = Math.round(subtotal);
    const tax = calculateTax(roundedSubtotal);
    const total = roundedSubtotal + tax;
    const grossMargin = calculateGrossMarginPercent(roundedSubtotal, totalCost);
    
    return {
        subtotal: roundedSubtotal,
        tax,
        total,
        totalCost,
        grossMargin: isNaN(grossMargin) ? null : grossMargin
    };
}

// グローバル関数のエクスポート（他のjsファイルから利用可能に）
window.calc = {
    calculateEstimate,
    generateEstimateHTML,
    calculateTax,
    calculateGrossMarginPercent,
    validateAmount,
    calculateTotals
};
