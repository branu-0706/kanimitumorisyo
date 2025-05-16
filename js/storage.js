'use strict';

// --- 計算関連の関数を window オブジェクトに追加 ---
window.updateAmounts = function() {
    console.log("updateAmounts called"); // デバッグログ追加
    if (!window.itemTableBody) {
        console.error("itemTableBody element not found");
        return;
    }
    
    const rows = window.itemTableBody.rows;
    let subtotal = 0;

    for (let i = 0; i < rows.length; i++) {
        const qtyInput = rows[i].querySelector('input[name="quantity[]"]');
        const costInput = rows[i].querySelector('input[name="cost[]"]');
        const markupRateInput = rows[i].querySelector('input[name="markupRate[]"]');
        const amountInput = rows[i].querySelector('input[name="amount[]"]');

        if (!qtyInput || !costInput || !markupRateInput || !amountInput) {
            console.error("Row", i, "has missing inputs");
            continue;
        }

        const qty = parseFloat(qtyInput.value) || 0;
        const cost = parseFloat(costInput.value) || 0;
        const markupRate = parseFloat(markupRateInput.value) || 0;

        // 金額計算: 数量 × 原価 × 掛け率
        const amount = qty * cost * markupRate;
        console.log(`Row ${i}: qty=${qty}, cost=${cost}, rate=${markupRate}, amount=${amount}`);

        amountInput.value = window.formatCurrency(amount);
        subtotal += amount;
    }

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    console.log(`Subtotal: ${subtotal}, Tax: ${tax}, Total: ${total}`);

    if (window.subtotalElement) window.subtotalElement.textContent = window.formatCurrency(Math.round(subtotal));
    if (window.taxElement) window.taxElement.textContent = window.formatCurrency(Math.round(tax));
    if (window.totalElement) window.totalElement.textContent = window.formatCurrency(Math.round(total));
};

window.calculateEstimate = function() {
    console.log("calculateEstimate called");
    
    window.currentItems = [];
    if (!window.itemTableBody) {
        console.error("itemTableBody element not found");
        return;
    }
    
    const rows = window.itemTableBody.rows;
    let totalCostSum = 0;
    let estimateSubtotal = 0;

    console.log(`Processing ${rows.length} rows`);

    for (let i = 0; i < rows.length; i++) {
        const descriptionInput = rows[i].querySelector('input[name="description[]"]');
        const quantityInput = rows[i].querySelector('input[name="quantity[]"]');
        const unitSelect = rows[i].querySelector('select[name="unit[]"]');
        const costInput = rows[i].querySelector('input[name="cost[]"]');
        const markupRateInput = rows[i].querySelector('input[name="markupRate[]"]');

        if (!descriptionInput || !quantityInput || !unitSelect || !costInput || !markupRateInput) {
            console.error("Row", i, "has missing inputs");
            continue;
        }

        const description = descriptionInput.value.trim();
        const quantity = parseFloat(quantityInput.value) || 0;
        const unit = unitSelect.value;
        const cost = parseFloat(costInput.value) || 0;
        const markupRate = parseFloat(markupRateInput.value) || 0;

        console.log(`Row ${i}: description=${description}, quantity=${quantity}, unit=${unit}, cost=${cost}, markupRate=${markupRate}`);

        // 明細金額: 数量 × 原価 × 掛け率
        const itemAmount = quantity * cost * markupRate;
        // 原価合計: 数量 × 原価
        const itemCostSum = quantity * cost;

        console.log(`Row ${i}: itemAmount=${itemAmount}, itemCostSum=${itemCostSum}`);

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

    console.log(`Total cost sum: ${totalCostSum}, Estimate subtotal: ${estimateSubtotal}`);
    
    window.currentTotalCost = totalCostSum;

    const tax = estimateSubtotal * 0.1;
    const total = estimateSubtotal + tax;

    // 粗利と粗利率の計算
    const grossProfit = estimateSubtotal - totalCostSum;
    let grossMarginPercent = 0;

    console.log(`Gross profit: ${grossProfit}`);

    if (estimateSubtotal > 0) {
        grossMarginPercent = (grossProfit / estimateSubtotal) * 100;
    } else if (totalCostSum === 0) {
        grossMarginPercent = 0;
    } else {
        grossMarginPercent = -100;
    }

    console.log(`Calculated gross margin: ${grossMarginPercent}%`);

    // 結果の表示
    const resultSubtotalElement = document.getElementById('resultSubtotal');
    const resultTotalElement = document.getElementById('resultTotal');
    const resultTotalCostElement = document.getElementById('resultTotalCost');
    const grossMarginElement = document.getElementById('resultGrossMarginPercent');

    if (resultSubtotalElement) resultSubtotalElement.textContent = window.formatCurrency(Math.round(estimateSubtotal));
    if (resultTotalElement) resultTotalElement.textContent = window.formatCurrency(Math.round(total));
    if (resultTotalCostElement) resultTotalCostElement.textContent = window.formatCurrency(Math.round(totalCostSum));

    if (grossMarginElement) {
        if (isNaN(grossMarginPercent)) {
            grossMarginElement.textContent = '---';
        } else if (!isFinite(grossMarginPercent)) {
            grossMarginElement.textContent = (grossMarginPercent > 0 ? '+' : '-') + '∞ %';
        } else {
            grossMarginElement.textContent = `${grossMarginPercent.toFixed(1)}%`;
        }
    }

    console.log(`Final results - Subtotal: ${window.formatCurrency(Math.round(estimateSubtotal))}, Total: ${window.formatCurrency(Math.round(total))}, Cost: ${window.formatCurrency(Math.round(totalCostSum))}, Margin: ${isNaN(grossMarginPercent) ? 'N/A' : grossMarginPercent.toFixed(1)}%`);

    if (typeof window.debugLog === 'function') {
        window.debugLog(`Estimate calculated. Raw Total Cost: ${totalCostSum}, Raw Estimate Subtotal: ${estimateSubtotal}, Gross Margin: ${isNaN(grossMarginPercent) ? 'N/A' : grossMarginPercent.toFixed(1)}%`, 'info');
    }

    if (window.estimateResult) {
        window.estimateResult.classList.remove('hidden');
        window.estimateResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    if (window.calculateBtn) {
        window.calculateBtn.dataset.calculated = 'true';
    }
};

window.validateForm = function() {
    const client = document.getElementById('client').value.trim();
    const project = document.getElementById('project').value.trim();
    if (!client) { alert('見積提出先を入力してください'); document.getElementById('client').focus(); return false; }
    if (!project) { alert('件名を入力してください'); document.getElementById('project').focus(); return false; }

    if (!window.itemTableBody) {
        console.error("itemTableBody element not found");
        return false;
    }
    
    const rows = window.itemTableBody.rows;
    if (rows.length === 0) { alert('明細行を1行以上入力してください'); return false;}

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

        if (!description) { alert(`${rowNum}行目の摘要を入力してください`); descriptionInput.focus(); return false; }
        if (quantity === '' || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
            alert(`${rowNum}行目の数量を正しく入力してください (0より大きい数値)`); quantityInput.focus(); return false;
        }
        if (cost === '' || isNaN(parseFloat(cost))) {
            alert(`${rowNum}行目の原価を数値で入力してください`); costInput.focus(); return false;
        }
        if (markupRate === '' || isNaN(parseFloat(markupRate))) {
            alert(`${rowNum}行目の掛け率を数値で入力してください`); markupRateInput.focus(); return false;
        }
        if (parseFloat(markupRate) <= 0 && cost !== '0' && parseFloat(cost) !== 0) {
            if (!confirm(`${rowNum}行目の掛け率が0以下です。この明細の金額が0またはマイナスになりますが、よろしいですか？`)) {
                markupRateInput.focus(); return false;
            }
        }
        if (parseFloat(cost) < 0) {
            if (!confirm(`${rowNum}行目の原価がマイナスです。よろしいですか？`)) {
                costInput.focus(); return false;
            }
        }
    }
    return true;
};

window.formatCurrency = function(amount, withSymbol = true) {
    if (typeof amount !== 'number' || !isFinite(amount)) {
        return withSymbol ? '¥---' : '---';
    }
    const num = Math.round(amount);
    const formattedAmount = num.toLocaleString();
    return withSymbol ? `¥${formattedAmount}` : formattedAmount;
};

window.formatDateJP = function(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}年${month}月${day}日`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '';
    }
};

window.generateEstimateNumber = function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `Q-${year}${month}${day}-${random}`;
};
